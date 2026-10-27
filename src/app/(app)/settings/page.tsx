import { asc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PushToggle } from "@/components/push-toggle";
import { SignOutButton } from "@/components/sign-out";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardTitle, Field, PageHeader, btnSecondary, input } from "@/components/ui";
import { db } from "@/lib/db";
import { invite, notificationPref, user } from "@/lib/db/schema";
import { emailEnabled } from "@/lib/email";
import { EVENTS } from "@/lib/notify";
import { displayName } from "@/lib/people";
import { vapidPublicKey } from "@/lib/push";
import { requireUser } from "@/lib/session";
import { invitePerson, removePerson, revokeInvite, savePrefs, updateMyName } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}

async function SettingsPage() {
  const me = await requireUser();
  const [prefs, people, invites] = await Promise.all([
    db.select().from(notificationPref).where(eq(notificationPref.userId, me.id)),
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(invite).where(isNull(invite.acceptedAt)).orderBy(asc(invite.email)),
  ]);
  const pref = (event: string) => prefs.find((p) => p.event === event) ?? { email: true, push: true };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle={`Signed in as ${me.email}${me.role === "owner" ? " (owner)" : ""}`} action={<SignOutButton />} />

      <Card>
        <CardTitle>Your name</CardTitle>
        <form action={updateMyName} className="flex flex-col gap-2 sm:flex-row">
          <input name="name" required defaultValue={people.find((p) => p.id === me.id)?.name ?? ""} placeholder="What others see" className={input} />
          <SubmitButton className={btnSecondary}>Save</SubmitButton>
        </form>
      </Card>

      <Card>
        <CardTitle>Alerts on this phone or computer</CardTitle>
        <PushToggle publicKey={vapidPublicKey()} />
      </Card>

      <Card>
        <CardTitle>What to tell you about</CardTitle>
        {!emailEnabled() ? (
          <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Email isn&apos;t set up on this server yet, so emails are only written to the server log.</p>
        ) : null}
        <form action={savePrefs}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="pb-2 font-medium">Event</th>
                <th className="w-16 pb-2 text-center font-medium">Email</th>
                <th className="w-16 pb-2 text-center font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {EVENTS.map(({ event, label }) => (
                <tr key={event}>
                  <td className="py-2 pr-2 text-stone-800">{label}</td>
                  <td className="text-center">
                    <input type="checkbox" name={`${event}:email`} defaultChecked={pref(event).email} className="h-4 w-4 accent-teal-700" aria-label={`Email: ${label}`} />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" name={`${event}:push`} defaultChecked={pref(event).push} className="h-4 w-4 accent-teal-700" aria-label={`Phone: ${label}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-stone-500">Nothing is sent between 9 p.m. and 7 a.m. Eastern; it waits until morning.</p>
          <div className="mt-3"><SubmitButton className={btnSecondary}>Save choices</SubmitButton></div>
        </form>
      </Card>

      <Card>
        <CardTitle>People</CardTitle>
        <ul className="divide-y divide-stone-100">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="text-stone-900">{displayName(p)}</span>
                <span className="ml-2 text-xs text-stone-500">{p.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge>{p.role === "owner" ? "Owner" : "Family"}</Badge>
                {me.role === "owner" && p.id !== me.id ? (
                  <form action={removePerson.bind(null, p.id)}>
                    <button type="submit" className="text-xs text-red-700 hover:underline">Remove</button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-stone-600">{i.email}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone="bg-amber-50 text-amber-900 ring-amber-200">Invited</Badge>
                {me.role === "owner" ? (
                  <form action={revokeInvite.bind(null, i.id)}>
                    <button type="submit" className="text-xs text-red-700 hover:underline">Cancel</button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {me.role === "owner" ? (
          <form action={invitePerson} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Field label="Invite by email"><input name="email" type="email" required placeholder="name@example.com" className={input} /></Field>
            <Field label="Role">
              <select name="role" defaultValue="family" className={input}>
                <option value="family">Family</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <div className="self-end"><SubmitButton className={btnSecondary} pendingText="Sending…">Send invite</SubmitButton></div>
          </form>
        ) : null}
        <p className="mt-3 text-xs text-stone-500">Family members can do everything except invite or remove people.</p>
      </Card>
    </div>
  );
}
