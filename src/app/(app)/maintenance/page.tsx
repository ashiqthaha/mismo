import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardTitle, Field, PageHeader, btnPrimary, btnSecondary, input } from "@/components/ui";
import { addDays, monthName, relativeDay, shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, system } from "@/lib/db/schema";
import { PRESENCE, WHO, intervalLabel } from "@/lib/format";
import { listPlans, type PlanRow } from "@/lib/maintenance";
import { requireUser } from "@/lib/session";
import { createPlan, markDoneToday, setLastDone } from "./actions";

export const metadata: Metadata = { title: "Upkeep" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MaintenancePage />
    </Suspense>
  );
}

function PlanItem({ p, today }: { p: PlanRow; today: string }) {
  const late = p.nextDue && p.nextDue < today;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link href={`/maintenance/${p.id}`} className="min-w-0 flex-1">
        <span className="block text-sand-900 hover:underline">{p.title}</span>
        <span className="mt-0.5 block text-xs text-sand-500">
          {p.targetName ? `${p.targetName} · ` : ""}
          {intervalLabel(p.intervalMonths)} · {WHO[p.who]}
        </span>
      </Link>
      {p.nextDue ? (
        <span className={`shrink-0 text-right text-xs ${late ? "font-medium text-sindoor-700" : "text-sand-600"}`}>
          {shortDate(p.nextDue, today)}
          <br />
          {relativeDay(p.nextDue, today)}
        </span>
      ) : null}
      <form action={markDoneToday.bind(null, p.id)} className="shrink-0">
        <SubmitButton className={`${btnSecondary} px-2.5 py-1 text-sm`} pendingText="…">Done</SubmitButton>
      </form>
    </li>
  );
}

async function MaintenancePage() {
  await requireUser();
  const [plans, systems, areas] = await Promise.all([
    listPlans(),
    db.select({ id: system.id, name: system.name }).from(system).orderBy(asc(system.name)),
    db.select({ id: area.id, name: area.name }).from(area).orderBy(asc(area.name)),
  ]);
  const today = todayLocal();
  const in30 = addDays(today, 30);
  const active = plans.filter((p) => p.active);
  const overdue = active.filter((p) => p.nextDue && p.nextDue < today).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const soon = active.filter((p) => p.nextDue && p.nextDue >= today && p.nextDue <= in30).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const later = active.filter((p) => p.nextDue && p.nextDue > in30).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const unscheduled = active.filter((p) => !p.nextDue);
  const paused = plans.filter((p) => !p.active);

  // Later jobs grouped by month, as an agenda.
  const byMonth = new Map<string, PlanRow[]>();
  for (const p of later) {
    const key = p.nextDue!.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Upkeep" subtitle={`${active.length} recurring jobs. Reminders go out 7 days before each is due.`} />

      {overdue.length > 0 ? (
        <Card className="ring-sindoor-200">
          <CardTitle>Overdue ({overdue.length})</CardTitle>
          <ul className="divide-y divide-sand-100">{overdue.map((p) => <PlanItem key={p.id} p={p} today={today} />)}</ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Next 30 days ({soon.length})</CardTitle>
        {soon.length === 0 ? <p className="text-sm text-sand-500">Nothing due.</p> : <ul className="divide-y divide-sand-100">{soon.map((p) => <PlanItem key={p.id} p={p} today={today} />)}</ul>}
      </Card>

      {unscheduled.length > 0 ? (
        <Card>
          <CardTitle>When were these last done?</CardTitle>
          <p className="mb-2 text-sm text-sand-600">These repeat every few years. Enter the last time, and the next date follows. A guess is fine.</p>
          <ul className="divide-y divide-sand-100">
            {unscheduled.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link href={`/maintenance/${p.id}`} className="min-w-0 flex-1 text-sand-900 hover:underline">
                  {p.title}
                  <span className="ml-2 text-xs text-sand-500">{intervalLabel(p.intervalMonths)}</span>
                </Link>
                <form action={setLastDone.bind(null, p.id)} className="flex gap-2">
                  <input name="lastDone" type="date" max={today} required className={`${input} w-auto py-1`} aria-label={`Last done: ${p.title}`} />
                  <SubmitButton className={`${btnSecondary} px-2.5 py-1 text-sm`}>Set</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {byMonth.size > 0 ? (
        <Card>
          <CardTitle>Later</CardTitle>
          <div className="space-y-4">
            {[...byMonth.entries()].map(([ym, list]) => (
              <div key={ym}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-sand-500">
                  {monthName(Number(ym.slice(5, 7)))} {ym.slice(0, 4)}
                </h3>
                <ul className="divide-y divide-sand-100">{list.map((p) => <PlanItem key={p.id} p={p} today={today} />)}</ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {paused.length > 0 ? (
        <Card>
          <details>
            <summary className="cursor-pointer font-medium text-sand-700">Paused ({paused.length})</summary>
            <p className="mt-2 text-sm text-sand-600">No reminders for these: either they&apos;re turned off, or their equipment or area isn&apos;t confirmed in the house yet.</p>
            <ul className="mt-2 divide-y divide-sand-100 text-sm">
              {paused.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/maintenance/${p.id}`} className="hover:underline">{p.title}</Link>
                  {!p.enabled ? (
                    <Badge>Turned off</Badge>
                  ) : p.targetHref ? (
                    <Link href={p.targetHref} className="text-xs text-brand-700 hover:underline">{p.targetName}: {PRESENCE[p.targetPresent].toLowerCase()}</Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        </Card>
      ) : null}

      <Card>
        <details>
          <summary className="cursor-pointer font-medium text-brand-700">Add a recurring job</summary>
          <form action={createPlan} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Job"><input name="title" required placeholder="e.g. Clean dehumidifier filter" className={input} /></Field></div>
            <Field label="For">
              <select name="target" defaultValue="" className={input}>
                <option value="">The whole house</option>
                <optgroup label="Systems">
                  {systems.map((s) => (
                    <option key={s.id} value={`s:${s.id}`}>{s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Areas">
                  {areas.map((a) => (
                    <option key={a.id} value={`a:${a.id}`}>{a.name}</option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <Field label="Every (months)"><input name="intervalMonths" required inputMode="numeric" defaultValue="12" className={input} /></Field>
            <Field label="Who">
              <select name="who" defaultValue="diy" className={input}>
                {Object.entries(WHO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium text-sand-700">Best months (optional)</legend>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <label key={m} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm ring-1 ring-sand-300">
                    <input type="checkbox" name="bestMonths" value={m} className="accent-brand-700" /> {monthName(m)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div><SubmitButton className={btnPrimary}>Add job</SubmitButton></div>
          </form>
        </details>
      </Card>
    </div>
  );
}
