import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { area, maintenancePlan, system, type Presence } from "./db/schema";

export type PlanRow = typeof maintenancePlan.$inferSelect & {
  targetName: string | null;
  targetHref: string | null;
  targetPresent: Presence;
  /** Reminders go out only for enabled plans whose system or area is confirmed in the house. */
  active: boolean;
};

export async function listPlans(): Promise<PlanRow[]> {
  const rows = await db
    .select({
      plan: maintenancePlan,
      systemName: system.name,
      systemPresent: system.present,
      areaName: area.name,
      areaPresent: area.present,
    })
    .from(maintenancePlan)
    .leftJoin(system, eq(system.id, maintenancePlan.systemId))
    .leftJoin(area, eq(area.id, maintenancePlan.areaId))
    .orderBy(asc(maintenancePlan.sortOrder), asc(maintenancePlan.title));

  return rows.map(({ plan, systemName, systemPresent, areaName, areaPresent }) => {
    const targetPresent: Presence = systemPresent ?? areaPresent ?? "yes";
    return {
      ...plan,
      targetName: systemName ?? areaName ?? null,
      targetHref: plan.systemId ? `/home/systems/${plan.systemId}` : plan.areaId ? `/home/areas/${plan.areaId}` : null,
      targetPresent,
      active: plan.enabled && targetPresent === "yes",
    };
  });
}
