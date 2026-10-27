import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { account, invite, session, user, verification, type Role } from "./db/schema";
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

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function googleEnabled(): boolean {
  return googleConfigured;
}

export const auth = betterAuth({
  appName: "Mismo",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "family", input: false },
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
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        // Not invited: send nothing, and say nothing different to the person asking.
        if (!(await allowedRole(email))) return;
        await sendEmail({
          to: email,
          subject: "Your Mismo sign-in link",
          text: `Open this link to sign in to Mismo. It works once and expires in 15 minutes.\n\n${url}`,
          html: emailHtml(
            "Sign in to Mismo",
            "Tap the button to sign in. The link works once and expires in 15 minutes.",
            { label: "Sign in", url },
          ),
        });
      },
    }),
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
