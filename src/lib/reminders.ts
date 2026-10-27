import fs from "node:fs/promises";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { addDays, daysBetween, relativeDay, shortDate, todayLocal } from "./dates";
import { db } from "./db";
import { project, system, task, user } from "./db/schema";
import { listPlans } from "./maintenance";
import { enqueueOnce, householdIds } from "./notify";

/**
 * Queues every reminder that is due. Safe to run as often as you like: each
 * reminder has a key, and a key is only ever queued once.
 */
export async function runReminders(today = todayLocal()): Promise<void> {
  const everyone = await householdIds();
  if (everyone.length === 0) return;
  const owners = (await db.select({ id: user.id }).from(user).where(eq(user.role, "owner"))).map((u) => u.id);

  // Maintenance: 7 days before, on the day, then weekly while overdue.
  for (const p of await listPlans()) {
    if (!p.active || !p.nextDue) continue;
    const due = p.nextDue;
    const to = p.assigneeId ? [p.assigneeId] : everyone;
    const where = p.targetName ? ` (${p.targetName})` : "";
    const url = `/maintenance/${p.id}`;
    const days = daysBetween(today, due);

    if (days > 0 && days <= 7) {
      await enqueueOnce(`plan:${p.id}:${due}:week`, to, {
        event: "maintenance_due",
        title: `Coming up: ${p.title}`,
        body: `Due ${shortDate(due, today)}, ${relativeDay(due, today)}${where}.`,
        url,
      });
    } else if (days <= 0 && days > -7) {
      await enqueueOnce(`plan:${p.id}:${due}:day`, to, {
        event: "maintenance_due",
        title: days === 0 ? `Due today: ${p.title}` : `Due now: ${p.title}`,
        body: `Due ${shortDate(due, today)}${where}. Mark it done in Mismo when it's finished.`,
        url,
      });
    } else if (days <= -7) {
      const weeks = Math.floor(-days / 7);
      await enqueueOnce(`plan:${p.id}:${due}:over:${weeks}`, to, {
        event: "maintenance_overdue",
        title: `Overdue: ${p.title}`,
        body: `It was due ${shortDate(due, today)}, ${weeks} week${weeks === 1 ? "" : "s"} ago${where}.`,
        url,
      });
    }
  }

  // Tasks: the day before they're due (or as soon as we notice, if later).
  const dueTasks = await db
    .select({ t: task, projectTitle: project.title })
    .from(task)
    .leftJoin(project, eq(project.id, task.projectId))
    .where(and(eq(task.done, false), isNotNull(task.dueDate), lte(task.dueDate, addDays(today, 1))));
  for (const { t, projectTitle } of dueTasks) {
    await enqueueOnce(`task:${t.id}:${t.dueDate}`, t.assigneeId ? [t.assigneeId] : everyone, {
      event: "task_due",
      title: `Task due ${relativeDay(t.dueDate!, today)}: ${t.title}`,
      body: projectTitle ? `Part of "${projectTitle}".` : "Open Mismo to see it.",
      url: t.projectId ? `/projects/${t.projectId}` : "/",
    });
  }

  // Warranties ending in the next 30 days.
  const ending = await db
    .select()
    .from(system)
    .where(and(isNotNull(system.warrantyEnd), gte(system.warrantyEnd, today), lte(system.warrantyEnd, addDays(today, 30))));
  for (const s of ending) {
    await enqueueOnce(`warranty:${s.id}:${s.warrantyEnd}`, owners, {
      event: "warranty_ending",
      title: `Warranty ending: ${s.name}`,
      body: `The warranty ends ${shortDate(s.warrantyEnd, today)}. Book any covered repairs before then.`,
      url: `/home/systems/${s.id}`,
    });
  }

  await checkBackup(owners, today);
}

/**
 * The nightly backup script touches BACKUP_STATUS_FILE when it succeeds. If that
 * file is missing or more than 30 hours old, tell the owners (once a day).
 */
async function checkBackup(owners: string[], today: string): Promise<void> {
  const statusFile = process.env.BACKUP_STATUS_FILE;
  if (!statusFile) return;
  let ageHours = Infinity;
  try {
    ageHours = (Date.now() - (await fs.stat(statusFile)).mtimeMs) / 3_600_000;
  } catch {
    // Missing file: no backup has ever succeeded.
  }
  if (ageHours <= 30) return;
  await enqueueOnce(`backup-stale:${today}`, owners, {
    event: "backup_stale",
    title: "Mismo's nightly backup didn't run",
    body: Number.isFinite(ageHours)
      ? `The last good backup was ${Math.round(ageHours)} hours ago. Check the backup log on the server.`
      : "No successful backup has been recorded yet. Check the backup setup on the server.",
    url: "/settings",
  });
}
