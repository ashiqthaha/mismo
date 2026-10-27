import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, Field, PageHeader, btnPrimary, input } from "@/components/ui";
import { shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { project } from "@/lib/db/schema";
import { DOER, PRIORITY, PROJECT_STATUS, PROJECT_STATUS_ORDER, money } from "@/lib/format";
import { budgetBar, spentByProject, taskCountsByProject } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import { createProject } from "./actions";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectsPage />
    </Suspense>
  );
}

async function ProjectsPage() {
  await requireUser();
  const [projects, spent, tasks] = await Promise.all([
    db.select().from(project).orderBy(desc(project.createdAt)),
    spentByProject(),
    taskCountsByProject(),
  ]);
  const today = todayLocal();
  const columns = PROJECT_STATUS_ORDER.filter((s) => s !== "done");
  const done = projects.filter((p) => p.status === "done");

  return (
    <div className="space-y-4">
      <PageHeader title="Projects" subtitle="Work that fixes or upgrades something, from idea to done." />

      <Card>
        <details>
          <summary className="cursor-pointer font-medium text-teal-700">New project</summary>
          <form action={createProject} className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2"><Field label="Name"><input name="title" required placeholder="e.g. Replace basement carpet" className={input} /></Field></div>
            <Field label="Budget ($)"><input name="budget" inputMode="decimal" placeholder="Optional" className={input} /></Field>
            <Field label="Who does it">
              <select name="doer" defaultValue="diy" className={input}>
                {Object.entries(DOER).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <div><SubmitButton className={btnPrimary}>Create</SubmitButton></div>
          </form>
          <p className="mt-2 text-xs text-stone-500">Tip: you can also select findings on the Findings page and turn them into a project.</p>
        </details>
      </Card>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" body="Walk the house first, then group findings into projects." action={<Link href="/findings" className={btnPrimary}>See findings</Link>} />
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {columns.map((status) => {
            const list = projects.filter((p) => p.status === status);
            return (
              <section key={status} className="w-72 shrink-0 snap-start">
                <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-stone-700">
                  {PROJECT_STATUS[status]}
                  <span className="text-xs font-normal text-stone-500">{list.length}</span>
                </h2>
                <div className="space-y-2">
                  {list.map((p) => {
                    const s = spent.get(p.id) ?? 0;
                    const bar = budgetBar(s, p.budgetCents);
                    const t = tasks.get(p.id);
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-200 hover:ring-teal-400">
                        <p className="font-medium text-stone-900">{p.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-stone-500">
                          {p.priority === "high" ? <Badge tone="bg-red-50 text-red-800 ring-red-200">{PRIORITY.high} priority</Badge> : null}
                          <span>{DOER[p.doer]}</span>
                          {t ? <span>· {t.done}/{t.total} tasks</span> : null}
                          {p.targetEnd ? <span>· by {shortDate(p.targetEnd, today)}</span> : null}
                        </div>
                        {p.budgetCents ? (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                              <div className={`h-full ${bar.tone}`} style={{ width: `${bar.pct}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-stone-500">{money(s)} of {money(p.budgetCents)}</p>
                          </div>
                        ) : s ? (
                          <p className="mt-2 text-xs text-stone-500">{money(s)} spent</p>
                        ) : null}
                      </Link>
                    );
                  })}
                  {list.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 p-3 text-center text-xs text-stone-400">None</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {done.length > 0 ? (
        <Card>
          <details>
            <summary className="cursor-pointer font-medium text-stone-700">Done ({done.length})</summary>
            <ul className="mt-2 divide-y divide-stone-100 text-sm">
              {done.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex justify-between gap-2 py-2 hover:bg-stone-50">
                    <span>{p.title}</span>
                    <span className="text-xs text-stone-500">{money(spent.get(p.id) ?? 0)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      ) : null}
    </div>
  );
}
