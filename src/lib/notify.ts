import { and, eq, inArray, lte } from "drizzle-orm";
import { localHour } from "./dates";
import { db } from "./db";
import {
  notification,
  notificationPref,
  reminderKey,
  user,
  type NotificationEvent,
} from "./db/schema";
import { emailHtml, sendEmail } from "./email";
import { sendPush } from "./push";

export const EVENTS: { event: NotificationEvent; label: string }[] = [
  { event: "maintenance_due", label: "Maintenance job coming up (7 days before, and on the day)" },
  { event: "maintenance_overdue", label: "Maintenance job overdue (weekly)" },
  { event: "safety_finding", label: "New safety finding" },
  { event: "task_assigned", label: "Task assigned to you" },
  { event: "task_due", label: "Task due tomorrow" },
  { event: "budget_threshold", label: "Project reaches 80% or 100% of budget" },
  { event: "warranty_ending", label: "Warranty ending in 30 days" },
  { event: "backup_stale", label: "Nightly backup didn't run (owners)" },
];

type Message = { event: NotificationEvent; title: string; body: string; url?: string };

/** Everyone in the household (Phase 1 has only owner and family). */
export async function householdIds(): Promise<string[]> {
  return (await db.select({ id: user.id }).from(user)).map((r) => r.id);
}

export async function enqueue(userIds: string[], msg: Message): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notification).values(userIds.map((userId) => ({ userId, ...msg })));
}

/** Queues a reminder only the first time `key` is seen, so repeated checks never double-send. */
export async function enqueueOnce(key: string, userIds: string[], msg: Message): Promise<boolean> {
  const fresh = await db.insert(reminderKey).values({ key }).onConflictDoNothing().returning({ key: reminderKey.key });
  if (fresh.length === 0) return false;
  await enqueue(userIds, msg);
  return true;
}

/** Nothing goes out between 9 p.m. and 7 a.m. Eastern; it waits for morning. */
export function inQuietHours(now = new Date()): boolean {
  const h = localHour(now);
  return h < 7 || h >= 21;
}

function absoluteUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}

/** Sends queued notifications by each person's chosen channels. */
export async function dispatchPending(now = new Date()): Promise<number> {
  if (inQuietHours(now)) return 0;
  const pending = await db
    .select({ n: notification, email: user.email })
    .from(notification)
    .innerJoin(user, eq(user.id, notification.userId))
    .where(and(eq(notification.status, "pending"), lte(notification.sendAfter, now)))
    .limit(200);
  if (pending.length === 0) return 0;

  const prefs = await db
    .select()
    .from(notificationPref)
    .where(inArray(notificationPref.userId, [...new Set(pending.map((p) => p.n.userId))]));
  const prefFor = (userId: string, event: NotificationEvent) =>
    prefs.find((p) => p.userId === userId && p.event === event) ?? { email: true, push: true };

  let sent = 0;
  for (const { n, email } of pending) {
    const pref = prefFor(n.userId, n.event);
    const url = absoluteUrl(n.url);
    try {
      let delivered = false;
      if (pref.email) {
        await sendEmail({
          to: email,
          subject: n.title,
          text: url ? `${n.body}\n\n${url}` : n.body,
          html: emailHtml(n.title, n.body, url ? { label: "Open Mismo", url } : undefined),
        });
        delivered = true;
      }
      if (pref.push) {
        delivered = (await sendPush(n.userId, { title: n.title, body: n.body, url: n.url })) > 0 || delivered;
      }
      await db
        .update(notification)
        .set({ status: delivered ? "sent" : "skipped", sentAt: new Date() })
        .where(eq(notification.id, n.id));
      if (delivered) sent++;
    } catch (err) {
      await db
        .update(notification)
        .set({ status: "failed", error: String(err).slice(0, 500) })
        .where(eq(notification.id, n.id));
    }
  }
  return sent;
}

/** Sends right away (outside quiet hours) without making the caller wait. */
export function kickDispatch(): void {
  void dispatchPending().catch((err) => console.error("[notify] dispatch failed", err));
}
