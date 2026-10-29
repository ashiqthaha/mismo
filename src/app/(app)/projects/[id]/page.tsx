import { asc, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Attachments, LogSection } from "@/components/attachments";
import { BirdBadge } from "@/components/birds";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, Fact, Field, PageHeader, SeverityBadge, btnDanger, btnSecondary, input } from "@/components/ui";
import { relativeDay, shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, expense, finding, project, task } from "@/lib/db/schema";
import { DOER, PRIORITY, PROJECT_STATUS, PROJECT_STATUS_ORDER, money } from "@/lib/format";
import { displayName, listPeople } from "@/lib/people";
import { budgetBar } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import {
  addExpense,
  addTask,
  deleteExpense,
  deleteProject,
  deleteTask,
  setProjectStatus,
  toggleTask,
  unlinkFinding,
  updateProject,
  updateTask,
} from "../actions";

export default function Page({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectPage params={params} />
    </Suspense>
  );
}

async function ProjectPage({ params }: Pick<PageProps<"/projects/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const [p] = await db.select().from(project).where(eq(project.id, id)).limit(1);
  if (!p) notFound();

  const [findings, tasks, expenses, people] = await Promise.all([
    db
      .select({ f: finding, areaName: area.name })
      .from(finding)
      .leftJoin(area, eq(area.id, finding.areaId))
      .where(eq(finding.projectId, id))
      .orderBy(desc(finding.createdAt)),
    db
      .select()
      .from(task)
      .where(eq(task.projectId, id))
      .orderBy(asc(task.done), sql`${task.dueDate} asc nulls last`, asc(task.createdAt)),
    db.select().from(expense).where(eq(expense.projectId, id)).orderBy(desc(expense.spentOn), desc(expense.createdAt)),
    listPeople(),
  ]);
  const today = todayLocal();
  const spent = expenses.reduce((s, e) => s + e.amountCents, 0);
  const bar = budgetBar(spent, p.budgetCents);
  const person = (uid: string | null) => people.find((x) => x.id === uid);

  return (
    <div className="space-y-4">
      <PageHeader title={p.title} back={{ href: "/projects", label: "Projects" }} />

      <Card>
        <form action={setProjectStatus.bind(null, p.id)} className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-sand-700" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={p.status} className={`${input} w-auto`}>
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS[s]}</option>
            ))}
          </select>
          <SubmitButton className={btnSecondary}>Update</SubmitButton>
          {p.status !== "done" ? <span className="text-xs text-sand-500">Marking it Done closes its findings as fixed.</span> : null}
        </form>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Fact label="Priority">{PRIORITY[p.priority]}</Fact>
          <Fact label="Who does it">{DOER[p.doer]}</Fact>
          <Fact label="Start">{shortDate(p.targetStart, today)}</Fact>
          <Fact label="Finish by">{shortDate(p.targetEnd, today)}</Fact>
        </dl>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-sand-800">{money(spent)} spent</span>
            <span className="text-sand-500">{p.budgetCents ? `of ${money(p.budgetCents)} budget` : "No budget set"}</span>
          </div>
          {p.budgetCents ? (
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-100">
              <div className={`h-full ${bar.tone}`} style={{ width: `${bar.pct}%` }} />
            </div>
          ) : null}
        </div>
        {p.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-sand-700">{p.description}</p> : null}
      </Card>

      <Card>
        <CardTitle action={<Link href="/findings" className="text-sm text-brand-700 hover:underline">Add from findings</Link>}>Findings covered</CardTitle>
        {findings.length === 0 ? (
          <p className="text-sm text-sand-500">None linked.</p>
        ) : (
          <ul className="divide-y divide-sand-100">
            {findings.map(({ f, areaName }) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/findings/${f.id}`} className="min-w-0 hover:underline">
                  <span className="text-sand-800">{f.title}</span>
                  {areaName ? <span className="ml-2 text-xs text-sand-500">{areaName}</span> : null}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  {f.status === "in_project" ? (
                    <form action={unlinkFinding.bind(null, f.id)}>
                      <button type="submit" className="text-xs text-sand-500 hover:text-sindoor-700" aria-label="Remove from project">Remove</button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Tasks</CardTitle>
        <ul className="mb-3 divide-y divide-sand-100">
          {tasks.map((t) => {
            const who = person(t.assigneeId);
            const late = !t.done && t.dueDate && t.dueDate < today;
            return (
              <li key={t.id} className="py-2">
                <div className="flex items-start gap-3">
                  <form action={toggleTask.bind(null, t.id)}>
                    <button
                      type="submit"
                      className={`mt-0.5 grid h-5 w-5 place-items-center rounded border text-xs ${t.done ? "border-brand-600 bg-brand-600 text-white" : "border-sand-400 bg-white"}`}
                      aria-label={t.done ? "Mark not done" : "Mark done"}
                    >
                      {t.done ? "✓" : ""}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={t.done ? "text-sand-400 line-through" : "text-sand-900"}>{t.title}</p>
                    <p className="flex flex-wrap items-center gap-x-1 text-xs text-sand-500">
                      {who ? <BirdBadge bird={who.bird} name={displayName(who)} /> : null}
                      {who ? displayName(who) : "Unassigned"}
                      {t.dueDate ? <span className={late ? "text-sindoor-700" : ""}> · due {shortDate(t.dueDate, today)} ({relativeDay(t.dueDate, today)})</span> : null}
                    </p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-brand-700">Edit</summary>
                      <form action={updateTask.bind(null, t.id)} className="mt-2 grid gap-2 sm:grid-cols-4">
                        <input name="title" required defaultValue={t.title} className={`${input} sm:col-span-2`} />
                        <select name="assigneeId" defaultValue={t.assigneeId ?? ""} className={input}>
                          <option value="">Unassigned</option>
                          {people.map((x) => (
                            <option key={x.id} value={x.id}>{displayName(x)}</option>
                          ))}
                        </select>
                        <input name="dueDate" type="date" defaultValue={t.dueDate ?? ""} className={input} />
                        <div className="flex gap-2 sm:col-span-4">
                          <SubmitButton className={btnSecondary}>Save</SubmitButton>
                          <button formAction={deleteTask.bind(null, t.id)} className="text-sm text-sindoor-700 hover:underline">Delete</button>
                        </div>
                      </form>
                    </details>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <form action={addTask.bind(null, p.id)} className="grid gap-2 sm:grid-cols-4">
          <input name="title" required placeholder="Add a task" className={`${input} sm:col-span-2`} />
          <select name="assigneeId" defaultValue="" className={input} aria-label="Assign to">
            <option value="">Unassigned</option>
            {people.map((x) => (
              <option key={x.id} value={x.id}>{displayName(x)}</option>
            ))}
          </select>
          <input name="dueDate" type="date" className={input} aria-label="Due date" />
          <div><SubmitButton className={btnSecondary}>Add task</SubmitButton></div>
        </form>
      </Card>

      <Card>
        <CardTitle>Spending</CardTitle>
        {expenses.length === 0 ? (
          <p className="mb-3 text-sm text-sand-500">Nothing spent yet.</p>
        ) : (
          <ul className="mb-3 divide-y divide-sand-100 text-sm">
            {expenses.map((e) => {
              const by = person(e.createdBy);
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {by ? <BirdBadge bird={by.bird} name={displayName(by)} /> : null}
                    <span className="text-sand-900">{e.vendor || e.category || "Expense"}</span>
                    <span className="text-xs text-sand-500">
                      {shortDate(e.spentOn, today)}
                      {e.category && e.vendor ? ` · ${e.category}` : ""}
                      {e.note ? ` · ${e.note}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-medium">{money(e.amountCents)}</span>
                    <form action={deleteExpense.bind(null, e.id)}>
                      <button type="submit" className="text-xs text-sand-400 hover:text-sindoor-700" aria-label="Delete expense">✕</button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <form action={addExpense.bind(null, p.id)} className="grid gap-2 sm:grid-cols-5">
          <input name="amount" required inputMode="decimal" placeholder="Amount ($)" className={input} />
          <input name="spentOn" required type="date" defaultValue={today} className={input} aria-label="Date" />
          <input name="vendor" placeholder="Where (e.g. Home Depot)" className={input} />
          <input name="category" placeholder="Category (e.g. Materials)" className={input} />
          <SubmitButton className={btnSecondary}>Add</SubmitButton>
          <input name="note" placeholder="Note (optional)" className={`${input} sm:col-span-5`} />
        </form>
        <p className="mt-2 text-xs text-sand-500">Snap receipts into the photos below.</p>
      </Card>

      <Attachments ownerType="project" ownerId={p.id} title="Photos and documents" phases />
      <LogSection ownerType="project" ownerId={p.id} title="Log: visits, changes, decisions" />

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit or delete project</summary>
          <form action={updateProject.bind(null, p.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Name"><input name="title" required defaultValue={p.title} className={input} /></Field></div>
            <Field label="Priority">
              <select name="priority" defaultValue={p.priority} className={input}>
                {Object.entries(PRIORITY).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Who does it">
              <select name="doer" defaultValue={p.doer} className={input}>
                {Object.entries(DOER).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Start"><input name="targetStart" type="date" defaultValue={p.targetStart ?? ""} className={input} /></Field>
            <Field label="Finish by"><input name="targetEnd" type="date" defaultValue={p.targetEnd ?? ""} className={input} /></Field>
            <Field label="Budget ($)"><input name="budget" inputMode="decimal" defaultValue={p.budgetCents != null ? String(p.budgetCents / 100) : ""} className={input} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea name="description" rows={3} defaultValue={p.description ?? ""} className={input} /></Field></div>
            <div><SubmitButton>Save</SubmitButton></div>
          </form>
          <form action={deleteProject.bind(null, p.id)} className="mt-6 border-t border-sand-100 pt-4">
            <p className="mb-2 text-sm text-sand-600">Deleting removes its tasks, spending and files. Its findings go back to the open list.</p>
            <SubmitButton className={btnDanger} pendingText="Deleting…">Delete project</SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}
