import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, EmptyState, FindingStatusBadge, PageHeader, SeverityBadge, btnPrimary, btnSecondary, input } from "@/components/ui";
import { shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, file, finding, type FindingStatus, type Severity } from "@/lib/db/schema";
import { FINDING_STATUS, SEVERITY } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { createProjectFromFindings } from "./actions";

export const metadata: Metadata = { title: "Findings" };

export default function Page({ searchParams }: PageProps<"/findings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FindingsPage searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function FindingsPage({ searchParams }: Pick<PageProps<"/findings">, "searchParams">) {
  await requireUser();
  const sp = await searchParams;
  const status = one(sp.status) || "open";
  const severity = one(sp.severity);
  const areaId = one(sp.area);

  const conds: SQL[] = [];
  if (status === "open") conds.push(inArray(finding.status, ["new", "triaged"]));
  else if (status in FINDING_STATUS) conds.push(eq(finding.status, status as FindingStatus));
  if (severity in SEVERITY) conds.push(eq(finding.severity, severity as Severity));
  if (areaId) conds.push(eq(finding.areaId, areaId));

  const [rows, areas] = await Promise.all([
    db
      .select({ f: finding, areaName: area.name })
      .from(finding)
      .leftJoin(area, eq(area.id, finding.areaId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(sql`case ${finding.severity} when 'safety' then 0 when 'fix' then 1 else 2 end`, desc(finding.createdAt)),
    db.select({ id: area.id, name: area.name }).from(area).orderBy(asc(area.name)),
  ]);
  const ids = rows.map((r) => r.f.id);
  const photoCounts = ids.length
    ? new Map(
        (
          await db
            .select({ ownerId: file.ownerId, n: count() })
            .from(file)
            .where(and(eq(file.ownerType, "finding"), inArray(file.ownerId, ids)))
            .groupBy(file.ownerId)
        ).map((r) => [r.ownerId, r.n]),
      )
    : new Map<string, number>();
  const today = todayLocal();
  const selectable = (s: FindingStatus) => s === "new" || s === "triaged";

  return (
    <div className="space-y-4">
      <PageHeader title="Findings" subtitle="Everything noticed around the house. Select some and turn them into a project." action={<Link href="/walk" className={btnPrimary}>Walk an area</Link>} />

      <form className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <select name="status" defaultValue={status} className={input} aria-label="Status">
          <option value="open">Open (new and triaged)</option>
          <option value="all">All</option>
          {Object.entries(FINDING_STATUS).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select name="severity" defaultValue={severity} className={input} aria-label="Severity">
          <option value="">Any severity</option>
          {Object.entries(SEVERITY).map(([v, s]) => (
            <option key={v} value={v}>{s.label}</option>
          ))}
        </select>
        <select name="area" defaultValue={areaId} className={input} aria-label="Area">
          <option value="">Any area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No findings match" body="Start a walkthrough to log what needs doing, room by room." action={<Link href="/walk" className={btnPrimary}>Start walking</Link>} />
      ) : (
        <form action={createProjectFromFindings} className="space-y-3">
          <Card className="p-0">
            <ul className="divide-y divide-stone-100">
              {rows.map(({ f, areaName }) => (
                <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                  {selectable(f.status) ? (
                    <input type="checkbox" name="ids" value={f.id} className="mt-1 h-5 w-5 accent-teal-700" aria-label={`Select ${f.title}`} />
                  ) : (
                    <span className="mt-1 h-5 w-5 shrink-0" />
                  )}
                  <Link href={`/findings/${f.id}`} className="min-w-0 flex-1">
                    <span className="block font-medium text-stone-900 hover:underline">{f.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                      <SeverityBadge severity={f.severity} />
                      <FindingStatusBadge status={f.status} />
                      {areaName ? <span>{areaName}</span> : null}
                      {photoCounts.get(f.id) ? <span>· {photoCounts.get(f.id)} photo{photoCounts.get(f.id) === 1 ? "" : "s"}</span> : null}
                      <span>· {shortDate(todayLocal(f.createdAt), today)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input name="title" placeholder="Project name (optional)" className={input} />
            <SubmitButton className={`${btnPrimary} shrink-0`} pendingText="Creating…">Make a project from selected</SubmitButton>
          </Card>
        </form>
      )}
    </div>
  );
}
