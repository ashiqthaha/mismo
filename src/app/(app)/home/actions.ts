"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { area, home, system, type Presence } from "@/lib/db/schema";
import { deleteFilesFor } from "@/lib/files";
import { dateStr, parseInt0, str } from "@/lib/format";
import { requireUser } from "@/lib/session";

const PRESENCE: Presence[] = ["yes", "unknown", "no"];
const presence = (v: FormDataEntryValue | null): Presence =>
  PRESENCE.includes(String(v) as Presence) ? (String(v) as Presence) : "yes";

export async function updateHome(homeId: string, formData: FormData) {
  const me = await requireUser();
  await db
    .update(home)
    .set({
      name: str(formData.get("name")) ?? "Home",
      address: str(formData.get("address")),
      homeType: str(formData.get("homeType")),
      subdivision: str(formData.get("subdivision")),
      yearBuilt: parseInt0(formData.get("yearBuilt")),
      aboveGradeSqft: parseInt0(formData.get("aboveGradeSqft")),
      basementSqft: parseInt0(formData.get("basementSqft")),
      lotSqft: parseInt0(formData.get("lotSqft")),
      stories: parseInt0(formData.get("stories")),
      fullBaths: parseInt0(formData.get("fullBaths")),
      halfBaths: parseInt0(formData.get("halfBaths")),
      exterior: str(formData.get("exterior")),
      notes: str(formData.get("notes")),
      updatedAt: new Date(),
    })
    .where(eq(home.id, homeId));
  await audit(me.id, "update", "home", homeId);
  refresh();
}

// ---- Areas ----

export async function createArea(formData: FormData) {
  const me = await requireUser();
  const name = str(formData.get("name"));
  if (!name) return;
  const kind = formData.get("kind") === "outdoor" ? "outdoor" : "indoor";
  const [row] = await db.insert(area).values({ name, kind, sortOrder: 1000 }).returning({ id: area.id });
  await audit(me.id, "create", "area", row.id, { name });
  refresh();
}

export async function updateArea(areaId: string, formData: FormData) {
  const me = await requireUser();
  const name = str(formData.get("name"));
  if (!name) return;
  await db
    .update(area)
    .set({
      name,
      kind: formData.get("kind") === "outdoor" ? "outdoor" : "indoor",
      level: str(formData.get("level")),
      present: presence(formData.get("present")),
      notes: str(formData.get("notes")),
    })
    .where(eq(area.id, areaId));
  await audit(me.id, "update", "area", areaId);
  refresh();
}

export async function setAreaPresence(areaId: string, value: Presence) {
  const me = await requireUser();
  await db.update(area).set({ present: value }).where(eq(area.id, areaId));
  await audit(me.id, "update", "area", areaId, { present: value });
  refresh();
}

export async function markAreaWalked(areaId: string) {
  const me = await requireUser();
  await db.update(area).set({ lastWalkedAt: new Date(), present: "yes" }).where(eq(area.id, areaId));
  await audit(me.id, "walked", "area", areaId);
  redirect("/walk");
}

export async function deleteArea(areaId: string) {
  const me = await requireUser();
  await deleteFilesFor("area", areaId);
  await db.delete(area).where(eq(area.id, areaId));
  await audit(me.id, "delete", "area", areaId);
  redirect("/home");
}

// ---- Systems ----

export async function createSystem(formData: FormData) {
  const me = await requireUser();
  const name = str(formData.get("name"));
  if (!name) return;
  const [row] = await db
    .insert(system)
    .values({
      name,
      areaId: str(formData.get("areaId")),
      category: str(formData.get("category")),
      expectedLifeYears: parseInt0(formData.get("expectedLifeYears")),
      sortOrder: 1000,
    })
    .returning({ id: system.id });
  await audit(me.id, "create", "system", row.id, { name });
  redirect(`/home/systems/${row.id}`);
}

export async function updateSystem(systemId: string, formData: FormData) {
  const me = await requireUser();
  const name = str(formData.get("name"));
  if (!name) return;
  await db
    .update(system)
    .set({
      name,
      areaId: str(formData.get("areaId")),
      category: str(formData.get("category")),
      present: presence(formData.get("present")),
      make: str(formData.get("make")),
      model: str(formData.get("model")),
      serial: str(formData.get("serial")),
      installYear: parseInt0(formData.get("installYear")),
      expectedLifeYears: parseInt0(formData.get("expectedLifeYears")),
      warrantyEnd: dateStr(formData.get("warrantyEnd")),
      lastServiced: dateStr(formData.get("lastServiced")),
      notes: str(formData.get("notes")),
    })
    .where(eq(system.id, systemId));
  await audit(me.id, "update", "system", systemId);
  refresh();
}

export async function setSystemPresence(systemId: string, value: Presence) {
  const me = await requireUser();
  await db.update(system).set({ present: value }).where(eq(system.id, systemId));
  await audit(me.id, "update", "system", systemId, { present: value });
  refresh();
}

export async function deleteSystem(systemId: string) {
  const me = await requireUser();
  await deleteFilesFor("system", systemId);
  await db.delete(system).where(eq(system.id, systemId));
  await audit(me.id, "delete", "system", systemId);
  redirect("/home");
}
