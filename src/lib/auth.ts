import { passkey as passkeyPlugin } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { account, invite, passkey, session, user, verification, type Role } from "./db/schema";
import { emailHtml, sendEmail } from "./email";

function ownerEmail(): string {
  return (process.env.OWNER_EMAIL || "").trim().toLowerCase();
}

/**
 * The role an email address may sign in with, or null if it isn't allowed.
 * The owner is set by OWNER_EMAIL; everyone else needs an invite.
 */
export async function allowedRole(email: string): Promise<Role | null> {
  const e = email.trim().toLowerCase();
  if (e && e === ownerEmail()) return "owner";
  const [inv] = await db.select({ role: invite.role }).from(invite).where(eq(invite.email, e)).limit(1);
  if (inv) return inv.role;
  const [existing] = await db.select({ role: user.role }).from(user).where(eq(user.email, e)).limit(1);
  return existing?.role ?? null;
}

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function googleEnabled(): boolean {
  return googleConfigured;
}

/** Who a sign-in link is from, and whether it comes with an invite. Passed through Better Auth to sendMagicLink. */
type LinkFrom = { name: string; email: string; invite: boolean };

const LINK_DAYS = 7;

/**
 * Emails a one-time sign-in link: with an invite, or when an owner sends one from Settings
 * for a new phone or computer. The sign-in page can't ask for one; this is the only way.
 */
export async function sendSignInLink(email: string, from: LinkFrom): Promise<void> {
  await auth.api.signInMagicLink({ body: { email, callbackURL: "/welcome", metadata: from }, headers: new Headers() });
}

export const auth = betterAuth({
  appName: "Mismo",
  // Nobody can ask for a sign-in link from the outside; owners send them (sendSignInLink).
  // Local development keeps it, so a link can be requested with curl and read from the console.
  disabledPaths: process.env.NODE_ENV === "development" ? [] : ["/sign-in/magic-link"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, passkey },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "family", input: false },
      bird: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: {
    // Signing in with Google joins the account made by an email link, when the address matches.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  plugins: [
    magicLink({
      // Long enough for an invite to wait in an inbox for a few days. Each link still works only once.
      expiresIn: LINK_DAYS * 24 * 60 * 60,
      sendMagicLink: async ({ email, token, metadata }) => {
        if (!(await allowedRole(email))) return;
        const from = metadata as LinkFrom | undefined;
        const name = from?.name || "Someone";
        // The email points at a page with a Sign in button, not at the link itself, so mail
        // scanners and link previews that open it can't use it up.
        const url = new URL("/login/confirm", baseURL);
        url.searchParams.set("token", token);
        const lasts = `It works once and lasts ${LINK_DAYS} days.`;
        const passkeyTip = "Once you're in, add a passkey and next time it's one tap with Face ID, your fingerprint or Windows Hello.";
        if (from?.invite) {
          await sendEmail({
            to: email,
            subject: `${name} invited you to Mismo`,
            text: `${name} invited you to Mismo, where we keep track of repairs, projects and upkeep for the house. Open this link to join. ${lasts}\n\n${url}\n\n${passkeyTip}`,
            html: emailHtml(
              "You're invited to Mismo",
              `${name} invited you to Mismo, where we keep track of repairs, projects and upkeep for the house. Tap the button to join. ${lasts} ${passkeyTip}`,
              { label: "Join Mismo", url: url.toString() },
            ),
            replyTo: from.email,
          });
          return;
        }
        await sendEmail({
          to: email,
          subject: "Your Mismo sign-in link",
          text: `${name} sent you a link to sign in to Mismo on a new phone or computer. ${lasts}\n\n${url}\n\n${passkeyTip}`,
          html: emailHtml(
            "Sign in to Mismo",
            `${name} sent you a link to sign in to Mismo on a new phone or computer. Open it on that device and tap the button. ${lasts} ${passkeyTip}`,
            { label: "Sign in", url: url.toString() },
          ),
          replyTo: from?.email,
        });
      },
    }),
    // Only someone already signed in can add a passkey, so passkeys never let a new person in.
    passkeyPlugin({ rpName: "Mismo", rpID: new URL(baseURL).hostname, origin: new URL(baseURL).origin }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          const role = await allowedRole(u.email);
          if (!role) return false;
          return { data: { ...u, email: u.email.toLowerCase(), role } };
        },
        after: async (u) => {
          await db.update(invite).set({ acceptedAt: new Date() }).where(eq(invite.email, u.email.toLowerCase()));
        },
      },
    },
  },
});
