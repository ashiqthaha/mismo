import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscription } from "@/lib/db/schema";
import { sendPush } from "@/lib/push";
import { getUser } from "@/lib/session";

type Body = { endpoint?: string; keys?: { p256dh?: string; auth?: string }; test?: boolean };

/** Saves this browser's push subscription for the signed-in user (or sends a test alert). */
export async function POST(req: Request) {
  const me = await getUser();
  if (!me) return new Response("Sign in first", { status: 401 });
  const body = (await req.json()) as Body;

  if (body.test) {
    const n = await sendPush(me.id, { title: "Mismo alerts are on", body: "This is a test alert.", url: "/settings" });
    return Response.json({ delivered: n });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys.auth) return new Response("Bad subscription", { status: 400 });
  await db
    .insert(pushSubscription)
    .values({ userId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: req.headers.get("user-agent") })
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId: me.id, p256dh: keys.p256dh, auth: keys.auth } });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await getUser();
  if (!me) return new Response("Sign in first", { status: 401 });
  const { endpoint } = (await req.json()) as Body;
  if (endpoint) {
    await db.delete(pushSubscription).where(and(eq(pushSubscription.userId, me.id), eq(pushSubscription.endpoint, endpoint)));
  }
  return Response.json({ ok: true });
}
