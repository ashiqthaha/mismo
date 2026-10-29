import { asc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Attachments } from "@/components/attachments";
import { BirdBadge } from "@/components/birds";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, Fact, Field, FindingStatusBadge, PageHeader, SeverityBadge, btnDanger, btnSecondary, input } from "@/components/ui";
import { shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { area, finding, project, system, user } from "@/lib/db/schema";
import { SEVERITY } from "@/lib/format";
import { displayName } from "@/lib/people";
import { requireUser } from "@/lib/session";
import { addFindingToProject, deleteFinding, setFindingStatus, updateFinding } from "../actions";

export default function Page({ params }: PageProps<"/findings/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FindingPage params={params} />
    </Suspense>
  );
}

async function FindingPage({ params }: Pick<PageProps<"/findings/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const [row] = await db
    .select({ f: finding, areaName: area.name, systemName: system.name, projectTitle: project.title, byName: user.name, byEmail: user.email, byBird: user.bird })
    .from(finding)
    .leftJoin(area, eq(area.id, finding.areaId))
    .leftJoin(system, eq(system.id, finding.systemId))
    .leftJoin(project, eq(project.id, finding.projectId))
    .leftJoin(user, eq(user.id, finding.createdBy))
    .where(eq(finding.id, id))
    .limit(1);
  if (!row) notFound();
  const { f } = row;

  const [areas, systems, projects] = await Promise.all([
    db.select({ id: area.id, name: area.name }).from(area).orderBy(asc(area.name)),
    db.select({ id: system.id, name: system.name }).from(system).orderBy(asc(system.name)),
    db.select({ id: project.id, title: project.title }).from(project).where(ne(project.status, "done")).orderBy(asc(project.title)),
  ]);
  const today = todayLocal();
  const cost =
    f.costLow != null || f.costHigh != null
      ? [f.costLow, f.costHigh].filter((v) => v != null).map((v) => `$${v!.toLocaleString()}`).join(" to ")
      : "";

  return (
    <div className="space-y-4">
      <PageHeader title={f.title} back={{ href: "/findings", label: "Findings" }} />
      <div className="-mt-2 flex flex-wrap gap-1.5">
        <SeverityBadge severity={f.severity} />
        <FindingStatusBadge status={f.status} />
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Fact label="Area">{f.areaId ? <Link href={`/home/areas/${f.areaId}`} className="text-brand-700 hover:underline">{row.areaName}</Link> : ""}</Fact>
          <Fact label="System">{f.systemId ? <Link href={`/home/systems/${f.systemId}`} className="text-brand-700 hover:underline">{row.systemName}</Link> : ""}</Fact>
          <Fact label="Rough cost">{cost}</Fact>
          <Fact label="Logged">
            <span className="flex items-center gap-1.5">
              <BirdBadge bird={row.byBird} name={displayName({ name: row.byName, email: row.byEmail })} />
              {`${displayName({ name: row.byName, email: row.byEmail })}, ${shortDate(todayLocal(f.createdAt), today)}`}
            </span>
          </Fact>
          {f.projectId ? (
            <Fact label="Project"><Link href={`/projects/${f.projectId}`} className="text-brand-700 hover:underline">{row.projectTitle}</Link></Fact>
          ) : null}
        </dl>
        {f.note ? <p className="mt-3 whitespace-pre-wrap text-sm text-sand-700">{f.note}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {f.status === "new" ? <form action={setFindingStatus.bind(null, f.id, "triaged")}><SubmitButton className={btnSecondary}>Mark triaged</SubmitButton></form> : null}
          {f.status !== "fixed" ? <form action={setFindingStatus.bind(null, f.id, "fixed")}><SubmitButton className={btnSecondary}>Fixed</SubmitButton></form> : null}
          {f.status !== "wont_do" && f.status !== "fixed" ? <form action={setFindingStatus.bind(null, f.id, "wont_do")}><SubmitButton className={btnSecondary}>Won&apos;t do</SubmitButton></form> : null}
          {f.status === "fixed" || f.status === "wont_do" ? <form action={setFindingStatus.bind(null, f.id, "new")}><SubmitButton className={btnSecondary}>Reopen</SubmitButton></form> : null}
        </div>
      </Card>

      {!f.projectId && f.status !== "fixed" && f.status !== "wont_do" ? (
        <Card>
          <CardTitle>Add to a project</CardTitle>
          {projects.length === 0 ? (
            <p className="text-sm text-sand-600">No open projects yet. Select findings on the Findings page to start one.</p>
          ) : (
            <form action={addFindingToProject.bind(null, f.id)} className="flex flex-col gap-2 sm:flex-row">
              <select name="projectId" required defaultValue="" className={input}>
                <option value="" disabled>Choose a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <SubmitButton className={btnSecondary}>Add</SubmitButton>
            </form>
          )}
        </Card>
      ) : null}

      <Attachments ownerType="finding" ownerId={f.id} title="Photos" documents={false} />

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit or delete</summary>
          <form action={updateFinding.bind(null, f.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Title"><input name="title" required defaultValue={f.title} className={input} /></Field></div>
            <Field label="Severity">
              <select name="severity" defaultValue={f.severity} className={input}>
                {Object.entries(SEVERITY).map(([v, s]) => (
                  <option key={v} value={v}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Area">
              <select name="areaId" defaultValue={f.areaId ?? ""} className={input}>
                <option value="">No area</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="System">
              <select name="systemId" defaultValue={f.systemId ?? ""} className={input}>
                <option value="">None</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cost from ($)"><input name="costLow" inputMode="numeric" defaultValue={f.costLow ?? ""} className={input} /></Field>
              <Field label="to ($)"><input name="costHigh" inputMode="numeric" defaultValue={f.costHigh ?? ""} className={input} /></Field>
            </div>
            <div className="sm:col-span-2"><Field label="Details"><textarea name="note" rows={3} defaultValue={f.note ?? ""} className={input} /></Field></div>
            <div><SubmitButton>Save</SubmitButton></div>
          </form>
          <form action={deleteFinding.bind(null, f.id)} className="mt-6 border-t border-sand-100 pt-4">
            <SubmitButton className={btnDanger} pendingText="Deleting…">Delete finding</SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}
