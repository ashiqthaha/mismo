import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Attachments, LogSection } from "@/components/attachments";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, Fact, Field, FindingStatusBadge, PageHeader, SeverityBadge, btnDanger, btnSecondary, input } from "@/components/ui";
import { relativeDay, shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, finding, maintenancePlan, system } from "@/lib/db/schema";
import { PRESENCE, intervalLabel } from "@/lib/format";
import { systemAge } from "@/lib/house";
import { requireUser } from "@/lib/session";
import { deleteSystem, setSystemPresence, updateSystem } from "../../actions";

export default function Page({ params }: PageProps<"/home/systems/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SystemPage params={params} />
    </Suspense>
  );
}

async function SystemPage({ params }: Pick<PageProps<"/home/systems/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const [row] = await db
    .select({ s: system, areaName: area.name })
    .from(system)
    .leftJoin(area, eq(area.id, system.areaId))
    .where(eq(system.id, id))
    .limit(1);
  if (!row) notFound();
  const { s, areaName } = row;

  const [areas, plans, findings] = await Promise.all([
    db.select({ id: area.id, name: area.name }).from(area).orderBy(asc(area.name)),
    db.select().from(maintenancePlan).where(eq(maintenancePlan.systemId, id)).orderBy(maintenancePlan.nextDue),
    db.select().from(finding).where(eq(finding.systemId, id)).orderBy(desc(finding.createdAt)),
  ]);
  const today = todayLocal();
  const age = systemAge(s.installYear, s.expectedLifeYears, Number(today.slice(0, 4)));

  return (
    <div className="space-y-4">
      <PageHeader
        title={s.name}
        subtitle={
          <>
            {s.category ?? "System"}
            {s.areaId ? (
              <>
                {" · "}
                <Link href={`/home/areas/${s.areaId}`} className="text-brand-700 hover:underline">{areaName}</Link>
              </>
            ) : null}
          </>
        }
        back={{ href: "/home", label: "House" }}
      />

      {s.present !== "yes" ? (
        <Card className="bg-saffron-50/60 ring-saffron-200">
          <p className="text-sm text-sand-700">
            {s.present === "unknown" ? "Does the house have this?" : "Marked as not in the house."} Its maintenance jobs stay paused until it&apos;s confirmed.
          </p>
          <div className="mt-3 flex gap-2">
            <form action={setSystemPresence.bind(null, s.id, "yes")}><SubmitButton className={btnSecondary}>Yes, we have it</SubmitButton></form>
            {s.present !== "no" ? (
              <form action={setSystemPresence.bind(null, s.id, "no")}><SubmitButton className={btnSecondary}>No</SubmitButton></form>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Fact label="Make">{s.make}</Fact>
          <Fact label="Model">{s.model}</Fact>
          <Fact label="Serial">{s.serial}</Fact>
          <Fact label="Installed">{s.installYear ? String(s.installYear) : ""}</Fact>
          <Fact label="Age">{s.installYear ? <span className={age.tone}>{age.label}</span> : ""}</Fact>
          <Fact label="Expected life">{s.expectedLifeYears ? `${s.expectedLifeYears} yrs` : ""}</Fact>
          <Fact label="Warranty ends">{shortDate(s.warrantyEnd, today)}</Fact>
          <Fact label="Last serviced">{shortDate(s.lastServiced, today)}</Fact>
        </dl>
        {s.notes ? <p className="mt-3 whitespace-pre-wrap text-sm text-sand-600">{s.notes}</p> : null}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit</summary>
          <form action={updateSystem.bind(null, s.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input name="name" required defaultValue={s.name} className={input} /></Field>
            <Field label="Area">
              <select name="areaId" defaultValue={s.areaId ?? ""} className={input}>
                <option value="">No area</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Category"><input name="category" defaultValue={s.category ?? ""} className={input} /></Field>
            <Field label="In the house?">
              <select name="present" defaultValue={s.present} className={input}>
                <option value="yes">{PRESENCE.yes}</option>
                <option value="unknown">{PRESENCE.unknown}</option>
                <option value="no">{PRESENCE.no}</option>
              </select>
            </Field>
            <Field label="Make"><input name="make" defaultValue={s.make ?? ""} className={input} /></Field>
            <Field label="Model"><input name="model" defaultValue={s.model ?? ""} className={input} /></Field>
            <Field label="Serial number"><input name="serial" defaultValue={s.serial ?? ""} className={input} /></Field>
            <Field label="Year installed" hint="Often on the label or the manufacture date in the serial number"><input name="installYear" inputMode="numeric" defaultValue={s.installYear ?? ""} className={input} /></Field>
            <Field label="Expected life (years)"><input name="expectedLifeYears" inputMode="numeric" defaultValue={s.expectedLifeYears ?? ""} className={input} /></Field>
            <Field label="Warranty ends"><input name="warrantyEnd" type="date" defaultValue={s.warrantyEnd ?? ""} className={input} /></Field>
            <Field label="Last serviced"><input name="lastServiced" type="date" defaultValue={s.lastServiced ?? ""} className={input} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><textarea name="notes" rows={2} defaultValue={s.notes ?? ""} className={input} /></Field></div>
            <div><SubmitButton>Save</SubmitButton></div>
          </form>
        </details>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Upkeep</CardTitle>
          {plans.length === 0 ? (
            <p className="text-sm text-sand-500">No recurring jobs.</p>
          ) : (
            <ul className="divide-y divide-sand-100 text-sm">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/maintenance/${p.id}`} className="flex justify-between gap-2 py-2 hover:bg-sand-50">
                    <span>
                      {p.title}
                      <span className="ml-2 text-xs text-sand-500">{intervalLabel(p.intervalMonths)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-sand-500">{p.nextDue ? relativeDay(p.nextDue, today) : "Not scheduled"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Findings</CardTitle>
          {findings.length === 0 ? (
            <p className="text-sm text-sand-500">None.</p>
          ) : (
            <ul className="divide-y divide-sand-100 text-sm">
              {findings.map((f) => (
                <li key={f.id}>
                  <Link href={`/findings/${f.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-sand-50">
                    <span className="truncate">{f.title}</span>
                    <span className="flex shrink-0 gap-1"><SeverityBadge severity={f.severity} /><FindingStatusBadge status={f.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Attachments ownerType="system" ownerId={s.id} title="Photos, manuals and receipts" />
      <LogSection ownerType="system" ownerId={s.id} title="Service history and notes" />

      <Card>
        <form action={deleteSystem.bind(null, s.id)} className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sand-600">Removing this also removes its maintenance jobs and files.</p>
          <SubmitButton className={btnDanger} pendingText="Removing…">Remove</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
