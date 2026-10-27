import fs from "node:fs";
import path from "node:path";
import { initialDue, todayLocal } from "./dates";
import { db } from "./db";
import { area, home, maintenancePlan, system } from "./db/schema";
import { SEED_AREAS, SEED_PLANS, SEED_SYSTEMS } from "./seed-data";

type HomeProfile = Partial<typeof home.$inferInsert>;

/** House details kept outside the public repo (data/home.local.json, or HOME_PROFILE_PATH). */
function readHomeProfile(): HomeProfile {
  const file = process.env.HOME_PROFILE_PATH || path.join(process.cwd(), "data", "home.local.json");
  try {
    return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as HomeProfile;
  } catch {
    return {};
  }
}

/** Fills an empty database with the home profile and the starter areas, systems and maintenance plans. */
export async function seedIfEmpty(): Promise<boolean> {
  const [anyHome] = await db.select({ id: home.id }).from(home).limit(1);
  if (!anyHome) {
    await db.insert(home).values({ name: "Home", ...readHomeProfile() });
  }

  const [anyArea] = await db.select({ id: area.id }).from(area).limit(1);
  if (anyArea) return false;

  const today = todayLocal();
  await db.transaction(async (tx) => {
    const areas = await tx
      .insert(area)
      .values(SEED_AREAS.map((a, i) => ({ name: a.name, kind: a.kind, present: a.present ?? "yes", sortOrder: i })))
      .returning({ id: area.id, name: area.name });
    const areaId = new Map(areas.map((a) => [a.name, a.id]));

    const systems = await tx
      .insert(system)
      .values(
        SEED_SYSTEMS.map((s, i) => ({
          name: s.name,
          areaId: areaId.get(s.area) ?? null,
          category: s.category,
          expectedLifeYears: s.expectedLifeYears ?? null,
          present: s.present ?? "yes",
          sortOrder: i,
        })),
      )
      .returning({ id: system.id, name: system.name });
    const systemId = new Map(systems.map((s) => [s.name, s.id]));

    await tx.insert(maintenancePlan).values(
      SEED_PLANS.map((p, i) => ({
        title: p.title,
        systemId: p.system ? (systemId.get(p.system) ?? null) : null,
        areaId: p.area ? (areaId.get(p.area) ?? null) : null,
        intervalMonths: p.intervalMonths,
        bestMonths: p.bestMonths ?? [],
        who: p.who,
        howTo: p.howTo ?? null,
        nextDue: initialDue(today, p.intervalMonths, p.bestMonths ?? [], i),
        sortOrder: i,
      })),
    );
  });
  return true;
}
