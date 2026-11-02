"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { audit } from "@/lib/audit";
import { sendSignInLink } from "@/lib/auth";
import { db } from "@/lib/db";
import { invite, notificationPref, passkey, user, type Bird, type Role } from "@/lib/db/schema";
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

export async function updateMyBird(formData: FormData) {
  const me = await requireUser();
  const value = formData.get("bird");
  const bird: Bird | null = value === "owl" || value === "cardinal" ? value : null;
  await db.update(user).set({ bird, updatedAt: new Date() }).where(eq(user.id, me.id));
  await audit(me.id, "update", "user", me.id, { bird });
  refresh();
}

export async function removeMyPasskey(passkeyId: string) {
  const me = await requireUser();
  await db.delete(passkey).where(and(eq(passkey.id, passkeyId), eq(passkey.userId, me.id)));
  await audit(me.id, "delete", "passkey", passkeyId);
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
  await sendSignInLink(email, { name: me.name, email: me.email, invite: true });
  refresh();
}

/** Emails a waiting invite again, with a fresh link. */
export async function resendInvite(inviteId: string) {
  const me = await requireOwner();
  const [inv] = await db.select({ email: invite.email }).from(invite).where(eq(invite.id, inviteId));
  if (!inv) return;
  await sendSignInLink(inv.email, { name: me.name, email: me.email, invite: true });
  await audit(me.id, "create", "sign_in_link", inviteId, { invite: true });
}

/** Emails someone in the household a one-time sign-in link, for a new phone or computer. */
export async function sendLinkTo(userId: string) {
  const me = await requireOwner();
  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!u) return;
  await sendSignInLink(u.email, { name: me.name, email: me.email, invite: false });
  await audit(me.id, "create", "sign_in_link", userId);
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
