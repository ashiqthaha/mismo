"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { area, finding, project, type FindingStatus, type Severity } from "@/lib/db/schema";
import { deleteFilesFor } from "@/lib/files";
import { parseInt0, str } from "@/lib/format";
import { enqueue, householdIds, kickDispatch } from "@/lib/notify";
import { requireUser } from "@/lib/session";

const SEVERITIES: Severity[] = ["safety", "fix", "nice"];
const STATUSES: FindingStatus[] = ["new", "triaged", "in_project", "wont_do", "fixed"];
const severityOf = (v: FormDataEntryValue | null): Severity =>
  SEVERITIES.includes(String(v) as Severity) ? (String(v) as Severity) : "fix";

/** Logs a finding. Returns its id so the caller can attach photos. */
export async function createFinding(formData: FormData): Promise<{ id: string }> {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) throw new Error("Give the finding a short title");
  const severity = severityOf(formData.get("severity"));
  const areaId = str(formData.get("areaId"));
  const [row] = await db
    .insert(finding)
    .values({
      title,
      severity,
      areaId,
      systemId: str(formData.get("systemId")),
      note: str(formData.get("note")),
      costLow: parseInt0(formData.get("costLow")),
      costHigh: parseInt0(formData.get("costHigh")),
      createdBy: me.id,
    })
    .returning({ id: finding.id });
  await audit(me.id, "create", "finding", row.id, { title, severity });

  if (severity === "safety") {
    const [a] = areaId ? await db.select({ name: area.name }).from(area).where(eq(area.id, areaId)) : [];
    const others = (await householdIds()).filter((id) => id !== me.id);
    await enqueue(others, {
      event: "safety_finding",
      title: `Safety issue: ${title}`,
      body: `${me.name || "Someone"} logged a safety issue${a ? ` in ${a.name}` : ""}.`,
      url: `/findings/${row.id}`,
      replyTo: me.email,
    });
    kickDispatch();
  }
  return { id: row.id };
}

export async function updateFinding(findingId: string, formData: FormData) {
  const me = await requireUser();
  const title = str(formData.get("title"));
  if (!title) return;
  await db
    .update(finding)
    .set({
      title,
      severity: severityOf(formData.get("severity")),
      areaId: str(formData.get("areaId")),
      systemId: str(formData.get("systemId")),
      note: str(formData.get("note")),
      costLow: parseInt0(formData.get("costLow")),
      costHigh: parseInt0(formData.get("costHigh")),
    })
    .where(eq(finding.id, findingId));
  await audit(me.id, "update", "finding", findingId);
  refresh();
}

export async function setFindingStatus(findingId: string, status: FindingStatus) {
  const me = await requireUser();
  if (!STATUSES.includes(status)) return;
  const closed = status === "fixed" || status === "wont_do";
  await db
    .update(finding)
    .set({ status, resolvedAt: closed ? new Date() : null, ...(status === "in_project" ? {} : { projectId: null }) })
    .where(eq(finding.id, findingId));
  await audit(me.id, "update", "finding", findingId, { status });
  refresh();
}

export async function addFindingToProject(findingId: string, formData: FormData) {
  const me = await requireUser();
  const projectId = str(formData.get("projectId"));
  if (!projectId) return;
  await db.update(finding).set({ projectId, status: "in_project", resolvedAt: null }).where(eq(finding.id, findingId));
  await audit(me.id, "link", "finding", findingId, { projectId });
  refresh();
}

export async function deleteFinding(findingId: string) {
  const me = await requireUser();
  await deleteFilesFor("finding", findingId);
  await db.delete(finding).where(eq(finding.id, findingId));
  await audit(me.id, "delete", "finding", findingId);
  redirect("/findings");
}

/** Groups the selected findings into a new project and opens it. */
export async function createProjectFromFindings(formData: FormData) {
  const me = await requireUser();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const picked = await db.select({ id: finding.id, title: finding.title }).from(finding).where(inArray(finding.id, ids));
  if (picked.length === 0) return;
  const title = str(formData.get("title")) ?? (picked.length === 1 ? picked[0].title : `${picked[0].title} and ${picked.length - 1} more`);
  const [p] = await db.insert(project).values({ title, status: "planning", createdBy: me.id }).returning({ id: project.id });
  await db.update(finding).set({ projectId: p.id, status: "in_project", resolvedAt: null }).where(inArray(finding.id, picked.map((f) => f.id)));
  await audit(me.id, "create", "project", p.id, { title, fromFindings: picked.length });
  redirect(`/projects/${p.id}`);
}
