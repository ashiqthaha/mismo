import { desc, eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Attachments, LogSection } from "@/components/attachments";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, EmptyState, Field, FindingStatusBadge, PageHeader, SeverityBadge, btnDanger, btnPrimary, btnSecondary, input } from "@/components/ui";
import { relativeDay, shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, finding, maintenancePlan, system } from "@/lib/db/schema";
import { PRESENCE } from "@/lib/format";
import { systemAge } from "@/lib/house";
import { requireUser } from "@/lib/session";
import { deleteArea, setAreaPresence, updateArea } from "../../actions";

export default function Page({ params }: PageProps<"/home/areas/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AreaPage params={params} />
    </Suspense>
  );
}

async function AreaPage({ params }: Pick<PageProps<"/home/areas/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const [a] = await db.select().from(area).where(eq(area.id, id)).limit(1);
  if (!a) notFound();

  const systems = await db.select().from(system).where(eq(system.areaId, id)).orderBy(system.sortOrder);
  const systemIds = systems.map((s) => s.id);
  const [findings, plans] = await Promise.all([
    db.select().from(finding).where(eq(finding.areaId, id)).orderBy(desc(finding.createdAt)),
    db
      .select()
      .from(maintenancePlan)
      .where(systemIds.length ? or(eq(maintenancePlan.areaId, id), inArray(maintenancePlan.systemId, systemIds)) : eq(maintenancePlan.areaId, id))
      .orderBy(maintenancePlan.nextDue),
  ]);
  const today = todayLocal();
  const year = Number(today.slice(0, 4));

  return (
    <div className="space-y-4">
      <PageHeader
        title={a.name}
        subtitle={[a.kind === "indoor" ? "Inside" : "Outside", a.level, a.present !== "yes" ? PRESENCE[a.present] : null].filter(Boolean).join(" · ")}
        back={{ href: "/home", label: "House" }}
        action={<Link href={`/walk/${a.id}`} className={btnPrimary}>Log a finding</Link>}
      />

      {a.present !== "yes" ? (
        <Card className="bg-amber-50/60 ring-amber-200">
          <p className="text-sm text-stone-700">
            {a.present === "unknown" ? "Is this part of the house?" : "Marked as not in the house."} Its maintenance jobs stay paused until it&apos;s confirmed.
          </p>
          <div className="mt-3 flex gap-2">
            <form action={setAreaPresence.bind(null, a.id, "yes")}><SubmitButton className={btnSecondary}>Yes, it&apos;s here</SubmitButton></form>
            {a.present !== "no" ? (
              <form action={setAreaPresence.bind(null, a.id, "no")}><SubmitButton className={btnSecondary}>No</SubmitButton></form>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Findings</CardTitle>
        {findings.length === 0 ? (
          <EmptyState title="Nothing logged here yet" body="Walk this area and note anything that needs fixing or that you'd like to change." />
        ) : (
          <ul className="divide-y divide-stone-100">
            {findings.map((f) => (
              <li key={f.id}>
                <Link href={`/findings/${f.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-stone-50">
                  <span className="min-w-0 truncate text-stone-800">{f.title}</span>
                  <span className="flex shrink-0 gap-1.5">
                    <SeverityBadge severity={f.severity} />
                    <FindingStatusBadge status={f.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Systems here</CardTitle>
          {systems.length === 0 ? (
            <p className="text-sm text-stone-500">None.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {systems.map((s) => {
                const age = systemAge(s.installYear, s.expectedLifeYears, year);
                return (
                  <li key={s.id}>
                    <Link href={`/home/systems/${s.id}`} className="flex justify-between gap-2 py-2 hover:bg-stone-50">
                      <span>{s.name}</span>
                      <span className={`text-xs ${age.tone}`}>{age.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Upkeep</CardTitle>
          {plans.length === 0 ? (
            <p className="text-sm text-stone-500">No recurring jobs.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/maintenance/${p.id}`} className="flex justify-between gap-2 py-2 hover:bg-stone-50">
                    <span>{p.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">{p.nextDue ? `${shortDate(p.nextDue, today)} · ${relativeDay(p.nextDue, today)}` : "Not scheduled"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Attachments ownerType="area" ownerId={a.id} />
      <LogSection ownerType="area" ownerId={a.id} />

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-teal-700">Edit or remove this area</summary>
          <form action={updateArea.bind(null, a.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input name="name" required defaultValue={a.name} className={input} /></Field>
            <Field label="Level" hint="e.g. Main, Upper, Basement"><input name="level" defaultValue={a.level ?? ""} className={input} /></Field>
            <Field label="Inside or outside">
              <select name="kind" defaultValue={a.kind} className={input}>
                <option value="indoor">Inside</option>
                <option value="outdoor">Outside</option>
              </select>
            </Field>
            <Field label="In the house?">
              <select name="present" defaultValue={a.present} className={input}>
                <option value="yes">{PRESENCE.yes}</option>
                <option value="unknown">{PRESENCE.unknown}</option>
                <option value="no">{PRESENCE.no}</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Notes"><textarea name="notes" rows={2} defaultValue={a.notes ?? ""} className={input} /></Field></div>
            <div><SubmitButton>Save</SubmitButton></div>
          </form>
          <form action={deleteArea.bind(null, a.id)} className="mt-6 border-t border-stone-100 pt-4">
            <p className="mb-2 text-sm text-stone-600">Removing an area also removes its maintenance jobs and photos. Its findings and systems stay, without an area.</p>
            <SubmitButton className={btnDanger} pendingText="Removing…">Remove area</SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}
