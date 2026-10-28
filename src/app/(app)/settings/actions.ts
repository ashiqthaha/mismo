"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { invite, notificationPref, user, type Role } from "@/lib/db/schema";
import { emailHtml, sendEmail } from "@/lib/email";
import { str } from "@/lib/format";
import { EVENTS } from "@/lib/notify";
import { requireOwner, requireUser } from "@/lib/session";

export async function updateMyName(formData: FormData) {
  const me = await requireUser();
  const name = str(formData.get("name"));
  if (!name) return;
  await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, me.id));
  await audit(me.id, "update", "user", me.id, { name });
  refresh();
}

export async function savePrefs(formData: FormData) {
  const me = await requireUser();
  for (const { event } of EVENTS) {
    const email = formData.get(`${event}:email`) === "on";
    const push = formData.get(`${event}:push`) === "on";
    await db
      .insert(notificationPref)
      .values({ userId: me.id, event, email, push })
      .onConflictDoUpdate({ target: [notificationPref.userId, notificationPref.event], set: { email, push } });
  }
  await audit(me.id, "update", "notification_pref", me.id);
  refresh();
}

export async function invitePerson(formData: FormData) {
  const me = await requireOwner();
  const email = str(formData.get("email"))?.toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  const role: Role = formData.get("role") === "owner" ? "owner" : "family";
  await db
    .insert(invite)
    .values({ email, role, invitedBy: me.id })
    .onConflictDoUpdate({ target: invite.email, set: { role, invitedBy: me.id } });
  await audit(me.id, "create", "invite", email, { role });
  const url = new URL("/login", process.env.BETTER_AUTH_URL || "http://localhost:3000").toString();
  await sendEmail({
    to: email,
    subject: `${me.name || "Someone"} invited you to Mismo`,
    text: `You're invited to Mismo, where we track the work on the house. Sign in with this email address:\n\n${url}`,
    html: emailHtml(
      "You're invited to Mismo",
      `${me.name || "Someone"} invited you to Mismo, where we keep track of repairs, projects and upkeep for the house. Sign in with this email address.`,
      { label: "Open Mismo", url },
    ),
    replyTo: me.email,
  });
  refresh();
}

export async function revokeInvite(inviteId: string) {
  const me = await requireOwner();
  await db.delete(invite).where(eq(invite.id, inviteId));
  await audit(me.id, "delete", "invite", inviteId);
  refresh();
}

export async function removePerson(userId: string) {
  const me = await requireOwner();
  if (userId === me.id) return;
  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!u) return;
  await db.delete(invite).where(eq(invite.email, u.email));
  await db.delete(user).where(eq(user.id, userId));
  await audit(me.id, "delete", "user", userId);
  refresh();
}
