import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { removeFile } from "@/app/(app)/actions";
import { BirdBadge } from "@/components/birds";
import { MarkDoneForm } from "@/components/mark-done";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardTitle, Fact, Field, PageHeader, btnDanger, input } from "@/components/ui";
import { monthName, relativeDay, shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { file, maintenanceLog, user } from "@/lib/db/schema";
import { PRESENCE, WHO, intervalLabel, money } from "@/lib/format";
import { listPlans } from "@/lib/maintenance";
import { displayName, listPeople } from "@/lib/people";
import { requireUser } from "@/lib/session";
import { deleteLog, deletePlan, updatePlan } from "../actions";

export default function Page({ params }: PageProps<"/maintenance/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlanPage params={params} />
    </Suspense>
  );
}

async function PlanPage({ params }: Pick<PageProps<"/maintenance/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const p = (await listPlans()).find((x) => x.id === id);
  if (!p) notFound();

  const [logs, people] = await Promise.all([
    db
      .select({ l: maintenanceLog, name: user.name, email: user.email, bird: user.bird })
      .from(maintenanceLog)
      .leftJoin(user, eq(user.id, maintenanceLog.doneBy))
      .where(eq(maintenanceLog.planId, id))
      .orderBy(desc(maintenanceLog.doneOn), desc(maintenanceLog.createdAt)),
    listPeople(),
  ]);
  const logIds = logs.map((r) => r.l.id);
  const photos = logIds.length
    ? await db.select().from(file).where(and(eq(file.ownerType, "maintenance_log"), inArray(file.ownerId, logIds)))
    : [];
  const today = todayLocal();
  const assignee = people.find((x) => x.id === p.assigneeId);

  return (
    <div className="space-y-4">
      <PageHeader
        title={p.title}
        subtitle={
          <>
            {p.targetHref ? <Link href={p.targetHref} className="text-brand-700 hover:underline">{p.targetName}</Link> : "Whole house"}
            {` · ${intervalLabel(p.intervalMonths)} · ${WHO[p.who]}`}
          </>
        }
        back={{ href: "/maintenance", label: "Upkeep" }}
      />

      {!p.active ? (
        <Card className="bg-saffron-50/60 ring-saffron-200">
          <p className="text-sm text-sand-700">
            Paused: {!p.enabled ? "this job is turned off." : `${p.targetName} is marked "${PRESENCE[p.targetPresent].toLowerCase()}". Confirm it on its page to start reminders.`}
          </p>
        </Card>
      ) : null}

      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Fact label="Next due">{p.nextDue ? `${shortDate(p.nextDue, today)} (${relativeDay(p.nextDue, today)})` : "Not scheduled"}</Fact>
          <Fact label="Last done">{shortDate(p.lastDone, today)}</Fact>
          <Fact label="Best months">{p.bestMonths.length ? p.bestMonths.map(monthName).join(", ") : "Any"}</Fact>
          <Fact label="Reminders go to">
            {assignee ? (
              <span className="flex items-center gap-1.5"><BirdBadge bird={assignee.bird} name={displayName(assignee)} />{displayName(assignee)}</span>
            ) : (
              "Everyone"
            )}
          </Fact>
        </dl>
        {p.howTo ? <p className="mt-3 rounded-lg bg-sand-50 p-3 text-sm text-sand-700">{p.howTo}</p> : null}
      </Card>

      <Card>
        <CardTitle>Mark it done</CardTitle>
        <MarkDoneForm planId={p.id} today={today} />
      </Card>

      <Card>
        <CardTitle>History</CardTitle>
        {logs.length === 0 ? (
          <p className="text-sm text-sand-500">Not done in Mismo yet.</p>
        ) : (
          <ul className="space-y-3">
            {logs.map(({ l, name, email, bird }) => (
              <li key={l.id} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-x-1">
                    <BirdBadge bird={bird} name={displayName({ name, email })} />
                    <span className="ml-1 font-medium text-sand-900">{shortDate(l.doneOn, today)}</span>
                    <span className="text-sand-500"> · {displayName({ name, email })}</span>
                    {l.costCents ? <Badge tone="ml-2 bg-sand-100 text-sand-700 ring-sand-200">{money(l.costCents)}</Badge> : null}
                  </p>
                  <form action={deleteLog.bind(null, l.id)}>
                    <button type="submit" className="text-xs text-sand-400 hover:text-sindoor-700">Delete</button>
                  </form>
                </div>
                {l.note ? <p className="text-sand-700">{l.note}</p> : null}
                <div className="mt-1 flex flex-wrap gap-2">
                  {photos
                    .filter((ph) => ph.ownerId === l.id && ph.kind === "photo")
                    .map((ph) => (
                      <span key={ph.id} className="relative">
                        <a href={`/api/files/${ph.id}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- private files served by our own route */}
                          <img src={`/api/files/${ph.id}?thumb=1`} alt="" className="h-16 w-16 rounded object-cover" />
                        </a>
                        <form action={removeFile.bind(null, ph.id)} className="absolute right-0.5 top-0.5">
                          <button type="submit" className="rounded bg-white/90 px-1 text-[10px] text-sindoor-700" aria-label="Delete photo">✕</button>
                        </form>
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit this job</summary>
          <form action={updatePlan.bind(null, p.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Job"><input name="title" required defaultValue={p.title} className={input} /></Field></div>
            <Field label="Every (months)"><input name="intervalMonths" required inputMode="numeric" defaultValue={p.intervalMonths} className={input} /></Field>
            <Field label="Who">
              <select name="who" defaultValue={p.who} className={input}>
                {Object.entries(WHO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Next due" hint="Change it to move this one occurrence">
              <input name="nextDue" type="date" defaultValue={p.nextDue ?? ""} className={input} />
            </Field>
            <Field label="Remind">
              <select name="assigneeId" defaultValue={p.assigneeId ?? ""} className={input}>
                <option value="">Everyone</option>
                {people.map((x) => (
                  <option key={x.id} value={x.id}>{displayName(x)}</option>
                ))}
              </select>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium text-sand-700">Best months</legend>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <label key={m} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm ring-1 ring-sand-300">
                    <input type="checkbox" name="bestMonths" value={m} defaultChecked={p.bestMonths.includes(m)} className="accent-brand-700" /> {monthName(m)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-2"><Field label="How to"><textarea name="howTo" rows={2} defaultValue={p.howTo ?? ""} className={input} /></Field></div>
            <label className="flex items-center gap-2 text-sm text-sand-700 sm:col-span-2">
              <input type="checkbox" name="enabled" defaultChecked={p.enabled} className="h-4 w-4 accent-brand-700" /> Send reminders for this job
            </label>
            <div><SubmitButton>Save</SubmitButton></div>
          </form>
          <form action={deletePlan.bind(null, p.id)} className="mt-6 border-t border-sand-100 pt-4">
            <SubmitButton className={btnDanger} pendingText="Deleting…">Delete this job</SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}
