import { asc, count, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "./db";
import { area, finding, home, system } from "./db/schema";

export async function getHome() {
  const [h] = await db.select().from(home).limit(1);
  return h ?? null;
}

export async function listAreas() {
  return db.select().from(area).orderBy(asc(area.kind), asc(area.sortOrder), asc(area.name));
}

export async function listSystems() {
  return db
    .select({ s: system, areaName: area.name })
    .from(system)
    .leftJoin(area, eq(area.id, system.areaId))
    .orderBy(asc(system.sortOrder), asc(system.name));
}

/** Open (not fixed, not won't-do) findings per area id. */
export async function openFindingCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ areaId: finding.areaId, n: count() })
    .from(finding)
    .where(notInArray(finding.status, ["fixed", "wont_do"]))
    .groupBy(finding.areaId);
  return new Map(rows.filter((r) => r.areaId).map((r) => [r.areaId!, r.n]));
}

export async function systemsInAreas(areaIds: string[]) {
  if (areaIds.length === 0) return [];
  return db.select().from(system).where(inArray(system.areaId, areaIds)).orderBy(asc(system.sortOrder));
}

export type AgeInfo = { label: string; tone: string; pct: number | null };

/** How far through its expected life a system is, e.g. "12 of 12 yrs". */
export function systemAge(installYear: number | null, expectedLife: number | null, currentYear: number): AgeInfo {
  if (!installYear) return { label: "Age unknown", tone: "text-sand-400", pct: null };
  const age = Math.max(0, currentYear - installYear);
  if (!expectedLife) return { label: `${age} yrs old`, tone: "text-sand-600", pct: null };
  const pct = age / expectedLife;
  const tone = pct >= 1 ? "text-sindoor-700" : pct >= 0.8 ? "text-saffron-700" : "text-sand-600";
  return { label: `${age} of ${expectedLife} yrs`, tone, pct };
}

/** Era-specific things to check, from the spec: houses built roughly 1978–1995. */
export function eraChecks(yearBuilt: number | null): string[] {
  if (!yearBuilt) return [];
  const checks: string[] = [];
  if (yearBuilt >= 1978 && yearBuilt <= 1995) {
    checks.push("Polybutylene water pipes: gray plastic supply lines from that era, prone to leaks.");
  }
  if (yearBuilt <= 1990) {
    checks.push("A Federal Pacific or Zinsco electrical panel: breakers from those brands can fail to trip.");
  }
  checks.push(`Anything still original from ${yearBuilt}: windows, insulation or ductwork that old is past its expected life.`);
  return checks;
}
