import { count, eq, sql, sum } from "drizzle-orm";
import { db } from "./db";
import { expense, task } from "./db/schema";

/** Spent cents per project. */
export async function spentByProject(): Promise<Map<string, number>> {
  const rows = await db
    .select({ projectId: expense.projectId, total: sum(expense.amountCents) })
    .from(expense)
    .groupBy(expense.projectId);
  return new Map(rows.filter((r) => r.projectId).map((r) => [r.projectId!, Number(r.total ?? 0)]));
}

/** Done and total task counts per project. */
export async function taskCountsByProject(): Promise<Map<string, { done: number; total: number }>> {
  const rows = await db
    .select({
      projectId: task.projectId,
      total: count(),
      done: sql<number>`count(*) filter (where ${task.done})`.mapWith(Number),
    })
    .from(task)
    .groupBy(task.projectId);
  return new Map(rows.filter((r) => r.projectId).map((r) => [r.projectId!, { done: r.done, total: r.total }]));
}

export async function spentOnProject(projectId: string): Promise<number> {
  const [r] = await db.select({ total: sum(expense.amountCents) }).from(expense).where(eq(expense.projectId, projectId));
  return Number(r?.total ?? 0);
}

/** Width and color for a spent-vs-budget bar. */
export function budgetBar(spent: number, budget: number | null): { pct: number; tone: string } {
  if (!budget) return { pct: 0, tone: "bg-brand-600" };
  const pct = spent / budget;
  return { pct: Math.min(100, pct * 100), tone: pct >= 1 ? "bg-sindoor-600" : pct >= 0.8 ? "bg-saffron-500" : "bg-brand-600" };
}
