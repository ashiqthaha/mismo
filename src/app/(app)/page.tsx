import { and, eq, gte, inArray, isNotNull, lte, ne, sum } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { markDoneToday } from "@/app/(app)/maintenance/actions";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, EmptyState, PageHeader, SeverityBadge, btnPrimary, btnSecondary } from "@/components/ui";
import { addDays, localHour, longDate, relativeDay, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, expense, finding, project, system, task } from "@/lib/db/schema";
import { PROJECT_STATUS, money } from "@/lib/format";
import { listAreas, systemAge } from "@/lib/house";
import { listPlans } from "@/lib/maintenance";
import { budgetBar, spentByProject } from "@/lib/projects";
import { requireUser } from "@/lib/session";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TodayPage />
    </Suspense>
  );
}

type DueItem = { key: string; date: string; title: string; detail: string; href: string; planId?: string };

async function TodayPage() {
  const me = await requireUser();
  const today = todayLocal();
  const in14 = addDays(today, 14);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [plans, tasks, safety, projects, spent, monthSpend, areas, systems] = await Promise.all([
    listPlans(),
    db
      .select({ t: task, projectTitle: project.title })
      .from(task)
      .leftJoin(project, eq(project.id, task.projectId))
      .where(and(eq(task.done, false), isNotNull(task.dueDate), lte(task.dueDate, in14))),
    db
      .select({ f: finding, areaName: area.name })
      .from(finding)
      .leftJoin(area, eq(area.id, finding.areaId))
      .where(and(eq(finding.severity, "safety"), inArray(finding.status, ["new", "triaged", "in_project"]))),
    db.select().from(project).where(inArray(project.status, ["planning", "getting_quotes", "scheduled", "in_progress"])),
    spentByProject(),
    db.select({ total: sum(expense.amountCents) }).from(expense).where(and(gte(expense.spentOn, monthStart), lte(expense.spentOn, today))),
    listAreas(),
    db.select().from(system).where(ne(system.present, "no")),
  ]);

  const due: DueItem[] = [
    ...plans
      .filter((p) => p.active && p.nextDue && p.nextDue <= in14)
      .map((p) => ({ key: `p${p.id}`, date: p.nextDue!, title: p.title, detail: p.targetName ?? "Upkeep", href: `/maintenance/${p.id}`, planId: p.id })),
    ...tasks.map(({ t, projectTitle }) => ({
      key: `t${t.id}`,
      date: t.dueDate!,
      title: t.title,
      detail: projectTitle ? `Task · ${projectTitle}` : "Task",
      href: t.projectId ? `/projects/${t.projectId}` : "/projects",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const toWalk = areas.filter((a) => a.present !== "no");
  const walked = toWalk.filter((a) => a.lastWalkedAt).length;
  const year = Number(today.slice(0, 4));
  const aging = systems
    .map((s) => ({ s, age: systemAge(s.installYear, s.expectedLifeYears, year) }))
    .filter((x) => x.age.pct != null && x.age.pct >= 0.8)
    .sort((a, b) => (b.age.pct ?? 0) - (a.age.pct ?? 0));
  const unknownAges = systems.filter((s) => s.present === "yes" && !s.installYear && s.expectedLifeYears).length;
  const hour = localHour();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = me.name?.split(" ")[0];

  return (
    <div className="space-y-4">
      <PageHeader title={`${greeting}${firstName ? `, ${firstName}` : ""}`} subtitle={`${longDate(today)} · ${money(Number(monthSpend[0]?.total ?? 0))} spent this month`} />

      {walked < toWalk.length ? (
        <Card className="bg-teal-50/60 ring-teal-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-teal-900">Walkthrough: {walked} of {toWalk.length} areas done</p>
              <p className="text-sm text-teal-900/80">Go room by room and note what needs doing. It builds your list of findings.</p>
            </div>
            <Link href="/walk" className={btnPrimary}>{walked === 0 ? "Start walking" : "Keep going"}</Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle action={<Link href="/maintenance" className="text-sm text-teal-700 hover:underline">All upkeep</Link>}>Next 14 days</CardTitle>
        {due.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing due. Nice.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {due.map((d) => {
              const late = d.date < today;
              return (
                <li key={d.key} className="flex items-center gap-3 py-2.5">
                  <Link href={d.href} className="min-w-0 flex-1">
                    <span className="block text-stone-900 hover:underline">{d.title}</span>
                    <span className="block text-xs text-stone-500">{d.detail}</span>
                  </Link>
                  <span className={`shrink-0 text-right text-xs ${late ? "font-medium text-red-700" : "text-stone-600"}`}>
                    {relativeDay(d.date, today)}
                  </span>
                  {d.planId ? (
                    <form action={markDoneToday.bind(null, d.planId)}>
                      <SubmitButton className={`${btnSecondary} px-2.5 py-1 text-sm`} pendingText="…">Done</SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {safety.length > 0 ? (
        <Card className="ring-red-200">
          <CardTitle>Open safety issues</CardTitle>
          <ul className="divide-y divide-stone-100">
            {safety.map(({ f, areaName }) => (
              <li key={f.id}>
                <Link href={`/findings/${f.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-stone-50">
                  <span className="min-w-0 truncate">
                    {f.title}
                    {areaName ? <span className="ml-2 text-xs text-stone-500">{areaName}</span> : null}
                  </span>
                  <SeverityBadge severity={f.severity} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle action={<Link href="/projects" className="text-sm text-teal-700 hover:underline">All projects</Link>}>Active projects</CardTitle>
        {projects.length === 0 ? (
          <EmptyState title="No active projects" body="Group findings into a project when you're ready to plan the work." />
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => {
              const s = spent.get(p.id) ?? 0;
              const bar = budgetBar(s, p.budgetCents);
              return (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="block hover:opacity-80">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-stone-900">{p.title}</span>
                      <span className="shrink-0 text-xs text-stone-500">{PROJECT_STATUS[p.status]}</span>
                    </div>
                    {p.budgetCents ? (
                      <>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div className={`h-full ${bar.tone}`} style={{ width: `${bar.pct}%` }} />
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">{money(s)} of {money(p.budgetCents)}</p>
                      </>
                    ) : s ? (
                      <p className="text-xs text-stone-500">{money(s)} spent</p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {aging.length > 0 || unknownAges > 0 ? (
        <Card>
          <CardTitle>Equipment age</CardTitle>
          {aging.length > 0 ? (
            <ul className="mb-2 divide-y divide-stone-100 text-sm">
              {aging.map(({ s, age }) => (
                <li key={s.id}>
                  <Link href={`/home/systems/${s.id}`} className="flex justify-between gap-2 py-2 hover:bg-stone-50">
                    <span>{s.name}</span>
                    <span className={age.tone}>{age.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {unknownAges > 0 ? (
            <p className="text-sm text-stone-600">
              {unknownAges} system{unknownAges === 1 ? " has" : "s have"} no install year yet. Add them from the labels to see what&apos;s near the end of its life.{" "}
              <Link href="/home" className="text-teal-700 hover:underline">Go to House</Link>
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
