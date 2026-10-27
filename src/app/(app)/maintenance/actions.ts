"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { initialDue, nextDueAfter, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { expense, maintenanceLog, maintenancePlan, system, type Who } from "@/lib/db/schema";
import { deleteFilesFor } from "@/lib/files";
import { dateStr, parseInt0, parseMoney, str } from "@/lib/format";
import { requireUser } from "@/lib/session";

const WHOS: Who[] = ["diy", "pro", "either"];

function bestMonthsFrom(formData: FormData): number[] {
  return formData
    .getAll("bestMonths")
    .map(Number)
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .sort((a, b) => a - b);
}

/** Records a job as done, logs any cost as spending, and sets the next due date from the day it was done. */
async function recordDone(planId: string, doneOn: string, userId: string, note: string | null, costCents: number | null): Promise<string | null> {
  const [plan] = await db.select().from(maintenancePlan).where(eq(maintenancePlan.id, planId));
  if (!plan) return null;
  const [log] = await db
    .insert(maintenanceLog)
    .values({ planId, doneOn, note, costCents, doneBy: userId })
    .returning({ id: maintenanceLog.id });
  if (costCents) {
    await db.insert(expense).values({
      maintenanceLogId: log.id,
      amountCents: costCents,
      spentOn: doneOn,
      category: "Maintenance",
      note: plan.title,
      createdBy: userId,
    });
  }
  const latest = plan.lastDone && plan.lastDone > doneOn ? plan.lastDone : doneOn;
  await db
    .update(maintenancePlan)
    .set({ lastDone: latest, nextDue: nextDueAfter(latest, plan.intervalMonths, plan.bestMonths) })
    .where(eq(maintenancePlan.id, planId));
  if (plan.systemId) {
    const [s] = await db.select({ lastServiced: system.lastServiced }).from(system).where(eq(system.id, plan.systemId));
    if (!s?.lastServiced || s.lastServiced < doneOn) {
      await db.update(system).set({ lastServiced: doneOn }).where(eq(system.id, plan.systemId));
    }
  }
  await audit(userId, "done", "maintenance_plan", planId, { doneOn, costCents });
  return log.id;
}

/** Full "mark done" from the plan page. Returns the log id so photos can be attached. */
export async function markDone(planId: string, formData: FormData): Promise<{ logId: string | null }> {
  const me = await requireUser();
  const doneOn = dateStr(formData.get("doneOn")) ?? todayLocal();
  const logId = await recordDone(planId, doneOn, me.id, str(formData.get("note")), parseMoney(formData.get("cost")));
  refresh();
  return { logId };
}

/** One-tap "done today" from the list. */
export async function markDoneToday(planId: string) {
  const me = await requireUser();
  await recordDone(planId, todayLocal(), me.id, null, null);
  refresh();
}

/** For jobs with no schedule yet: say when it was last done, and the next date follows. */
export async function setLastDone(planId: string, formData: FormData) {
  const me = await requireUser();
  const lastDone = dateStr(formData.get("lastDone"));
  if (!lastDone) return;
  const [plan] = await db.select().from(maintenancePlan).where(eq(maintenancePlan.id, planId));
  if (!plan) return;
  await db
    .update(maintenancePlan)
    .set({ lastDone, nextDue: nextDueAfter(lastDone, plan.intervalMonths, plan.bestMonths) })
    .where(eq(maintenancePlan.id, planId));
  await audit(me.id, "update", "maintenance_plan", planId, { lastDone });
  refresh();
}

export async function updatePlan(planId: string, formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  const intervalMonths = parseInt0(formData.get("intervalMonths"));
  if (!title || !intervalMonths || intervalMonths < 1) return;
  await db
    .update(maintenancePlan)
    .set({
      title,
      intervalMonths,
      bestMonths: bestMonthsFrom(formData),
      who: WHOS.includes(String(formData.get("who")) as Who) ? (String(formData.get("who")) as Who) : "diy",
      howTo: str(formData.get("howTo")),
      enabled: formData.get("enabled") === "on",
      assigneeId: str(formData.get("assigneeId")),
      nextDue: dateStr(formData.get("nextDue")),
    })
    .where(eq(maintenancePlan.id, planId));
  await audit(me.id, "update", "maintenance_plan", planId);
  refresh();
}

export async function createPlan(formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  const intervalMonths = parseInt0(formData.get("intervalMonths"));
  if (!title || !intervalMonths || intervalMonths < 1) return;
  const target = String(formData.get("target") ?? "");
  const bestMonths = bestMonthsFrom(formData);
  const [p] = await db
    .insert(maintenancePlan)
    .values({
      title,
      intervalMonths,
      bestMonths,
      systemId: target.startsWith("s:") ? target.slice(2) : null,
      areaId: target.startsWith("a:") ? target.slice(2) : null,
      who: WHOS.includes(String(formData.get("who")) as Who) ? (String(formData.get("who")) as Who) : "diy",
      nextDue: initialDue(todayLocal(), intervalMonths, bestMonths, 0),
      sortOrder: 1000,
    })
    .returning({ id: maintenancePlan.id });
  await audit(me.id, "create", "maintenance_plan", p.id, { title });
  redirect(`/maintenance/${p.id}`);
}

export async function deletePlan(planId: string) {
  const me = await requireUser();
  const logs = await db.select({ id: maintenanceLog.id }).from(maintenanceLog).where(eq(maintenanceLog.planId, planId));
  for (const l of logs) await deleteFilesFor("maintenance_log", l.id);
  await db.delete(maintenancePlan).where(eq(maintenancePlan.id, planId));
  await audit(me.id, "delete", "maintenance_plan", planId);
  redirect("/maintenance");
}

export async function deleteLog(logId: string) {
  const me = await requireUser();
  await deleteFilesFor("maintenance_log", logId);
  await db.delete(maintenanceLog).where(eq(maintenanceLog.id, logId));
  await audit(me.id, "delete", "maintenance_log", logId);
  refresh();
}
