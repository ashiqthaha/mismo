"use server";

import { and, eq, sum } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { expense, finding, project, task, user, type Doer, type Priority, type ProjectStatus } from "@/lib/db/schema";
import { deleteFilesFor } from "@/lib/files";
import { PROJECT_STATUS, dateStr, money, parseMoney, str } from "@/lib/format";
import { enqueue, enqueueOnce, kickDispatch } from "@/lib/notify";
import { requireUser } from "@/lib/session";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const DOERS: Doer[] = ["diy", "hired", "mixed"];
const pick = <T extends string>(v: FormDataEntryValue | null, allowed: T[], fallback: T): T =>
  allowed.includes(String(v) as T) ? (String(v) as T) : fallback;

/** Applies a status change; finishing a project closes the findings it covered. */
async function applyStatus(projectId: string, status: ProjectStatus) {
  await db
    .update(project)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(eq(project.id, projectId));
  if (status === "done") {
    await db
      .update(finding)
      .set({ status: "fixed", resolvedAt: new Date() })
      .where(and(eq(finding.projectId, projectId), eq(finding.status, "in_project")));
  }
}

export async function createProject(formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  const [p] = await db
    .insert(project)
    .values({
      title,
      priority: pick(formData.get("priority"), PRIORITIES, "medium"),
      doer: pick(formData.get("doer"), DOERS, "diy"),
      budgetCents: parseMoney(formData.get("budget")),
      createdBy: me.id,
    })
    .returning({ id: project.id });
  await audit(me.id, "create", "project", p.id, { title });
  redirect(`/projects/${p.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  await db
    .update(project)
    .set({
      title,
      description: str(formData.get("description")),
      priority: pick(formData.get("priority"), PRIORITIES, "medium"),
      doer: pick(formData.get("doer"), DOERS, "diy"),
      targetStart: dateStr(formData.get("targetStart")),
      targetEnd: dateStr(formData.get("targetEnd")),
      budgetCents: parseMoney(formData.get("budget")),
    })
    .where(eq(project.id, projectId));
  await audit(me.id, "update", "project", projectId);
  refresh();
}

export async function setProjectStatus(projectId: string, formData: FormData) {
  const me = await requireUser();
  const status = String(formData.get("status")) as ProjectStatus;
  if (!(status in PROJECT_STATUS)) return;
  await applyStatus(projectId, status);
  await audit(me.id, "update", "project", projectId, { status });
  refresh();
}

export async function deleteProject(projectId: string) {
  const me = await requireUser();
  // Findings go back to the open list rather than disappearing with the project.
  await db.update(finding).set({ projectId: null, status: "triaged" }).where(eq(finding.projectId, projectId));
  await deleteFilesFor("project", projectId);
  await db.delete(project).where(eq(project.id, projectId));
  await audit(me.id, "delete", "project", projectId);
  redirect("/projects");
}

export async function unlinkFinding(findingId: string) {
  const me = await requireUser();
  await db.update(finding).set({ projectId: null, status: "triaged" }).where(eq(finding.id, findingId));
  await audit(me.id, "unlink", "finding", findingId);
  refresh();
}

// ---- Tasks ----

async function notifyAssignee(
  assigneeId: string | null,
  me: { id: string; name: string; email: string },
  projectId: string,
  title: string,
) {
  if (!assigneeId || assigneeId === me.id) return;
  const [p] = await db.select({ title: project.title }).from(project).where(eq(project.id, projectId));
  await enqueue([assigneeId], {
    event: "task_assigned",
    title: `New task for you: ${title}`,
    body: `${me.name || "Someone"} assigned you a task${p ? ` on "${p.title}"` : ""}.`,
    url: `/projects/${projectId}`,
    replyTo: me.email,
  });
  kickDispatch();
}

export async function addTask(projectId: string, formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  const assigneeId = str(formData.get("assigneeId"));
  const [t] = await db
    .insert(task)
    .values({ projectId, title, assigneeId, dueDate: dateStr(formData.get("dueDate")), createdBy: me.id })
    .returning({ id: task.id });
  await audit(me.id, "create", "task", t.id, { projectId, title });
  await notifyAssignee(assigneeId, me, projectId, title);
  refresh();
}

export async function updateTask(taskId: string, formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  const [before] = await db.select().from(task).where(eq(task.id, taskId));
  if (!before) return;
  const assigneeId = str(formData.get("assigneeId"));
  await db.update(task).set({ title, assigneeId, dueDate: dateStr(formData.get("dueDate")) }).where(eq(task.id, taskId));
  await audit(me.id, "update", "task", taskId);
  if (assigneeId !== before.assigneeId && before.projectId) await notifyAssignee(assigneeId, me, before.projectId, title);
  refresh();
}

export async function toggleTask(taskId: string) {
  const me = await requireUser();
  const [t] = await db.select({ done: task.done }).from(task).where(eq(task.id, taskId));
  if (!t) return;
  await db.update(task).set({ done: !t.done, doneAt: t.done ? null : new Date() }).where(eq(task.id, taskId));
  await audit(me.id, "update", "task", taskId, { done: !t.done });
  refresh();
}

export async function deleteTask(taskId: string) {
  const me = await requireUser();
  await db.delete(task).where(eq(task.id, taskId));
  await audit(me.id, "delete", "task", taskId);
  refresh();
}

// ---- Spending ----

/** After spending is added, tell the owner the first time a project passes 80% and 100% of budget. */
async function checkBudget(projectId: string) {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p?.budgetCents) return;
  const [{ total }] = await db.select({ total: sum(expense.amountCents) }).from(expense).where(eq(expense.projectId, projectId));
  const spent = Number(total ?? 0);
  const owners = (await db.select({ id: user.id }).from(user).where(eq(user.role, "owner"))).map((u) => u.id);
  for (const pct of [100, 80]) {
    if (spent >= (p.budgetCents * pct) / 100) {
      const queued = await enqueueOnce(`budget:${projectId}:${p.budgetCents}:${pct}`, owners, {
        event: "budget_threshold",
        title: pct === 100 ? `Over budget: ${p.title}` : `80% of budget used: ${p.title}`,
        body: `Spent ${money(spent)} of a ${money(p.budgetCents)} budget.`,
        url: `/projects/${projectId}`,
      });
      if (queued) kickDispatch();
      break;
    }
  }
}

export async function addExpense(projectId: string, formData: FormData) {
  const me = await requireUser();
  const amountCents = parseMoney(formData.get("amount"));
  const spentOn = dateStr(formData.get("spentOn"));
  if (amountCents == null || !spentOn) return;
  const [e] = await db
    .insert(expense)
    .values({
      projectId,
      amountCents,
      spentOn,
      vendor: str(formData.get("vendor")),
      category: str(formData.get("category")),
      note: str(formData.get("note")),
      createdBy: me.id,
    })
    .returning({ id: expense.id });
  await audit(me.id, "create", "expense", e.id, { projectId, amountCents });
  await checkBudget(projectId);
  refresh();
}

export async function deleteExpense(expenseId: string) {
  const me = await requireUser();
  await db.delete(expense).where(eq(expense.id, expenseId));
  await audit(me.id, "delete", "expense", expenseId);
  refresh();
}
