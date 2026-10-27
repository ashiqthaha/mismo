import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "./db";
import { pushSubscription } from "./db/schema";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";

let configured = false;

function setup(): boolean {
  if (!configured && publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return configured;
}

export function vapidPublicKey(): string | null {
  return publicKey ?? null;
}

/** Sends to every phone or browser the user turned alerts on for. Returns how many got it. */
export async function sendPush(userId: string, payload: { title: string; body: string; url?: string | null }): Promise<number> {
  if (!setup()) return 0;
  const subs = await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
  let delivered = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped this subscription, so forget it.
      if (status === 404 || status === 410) {
        await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id));
      } else {
        console.error("[push] send failed", status ?? err);
      }
    }
  }
  return delivered;
}
