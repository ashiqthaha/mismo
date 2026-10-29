import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setAreaPresence, setSystemPresence, markAreaWalked } from "@/app/(app)/home/actions";
import { FindingCapture } from "@/components/finding-capture";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardTitle, FindingStatusBadge, PageHeader, SeverityBadge, btnPrimary, btnSecondary } from "@/components/ui";
import { db } from "@/lib/db";
import { area, finding, system } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

export default function Page({ params }: PageProps<"/walk/[areaId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WalkAreaPage params={params} />
    </Suspense>
  );
}

async function WalkAreaPage({ params }: Pick<PageProps<"/walk/[areaId]">, "params">) {
  await requireUser();
  const { areaId } = await params;
  const [a] = await db.select().from(area).where(eq(area.id, areaId)).limit(1);
  if (!a) notFound();
  const [systems, findings] = await Promise.all([
    db.select().from(system).where(eq(system.areaId, areaId)).orderBy(system.sortOrder),
    db.select().from(finding).where(eq(finding.areaId, areaId)).orderBy(desc(finding.createdAt)),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title={a.name} subtitle="Note anything that needs fixing, is unsafe, or you'd like to change." back={{ href: "/walk", label: "Walkthrough" }} />

      {a.present === "unknown" ? (
        <Card className="bg-saffron-50/60 ring-saffron-200">
          <p className="text-sm text-sand-700">Is this part of the house?</p>
          <div className="mt-2 flex gap-2">
            <form action={setAreaPresence.bind(null, a.id, "yes")}><SubmitButton className={btnSecondary}>Yes</SubmitButton></form>
            <form action={setAreaPresence.bind(null, a.id, "no")}><SubmitButton className={btnSecondary}>No, skip it</SubmitButton></form>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Log a finding</CardTitle>
        <FindingCapture areaId={a.id} systems={systems.filter((s) => s.present !== "no").map((s) => ({ id: s.id, name: s.name }))} />
      </Card>

      {systems.length > 0 ? (
        <Card>
          <CardTitle>Equipment in this area</CardTitle>
          <p className="mb-2 text-sm text-sand-600">Confirm what&apos;s here. Open one to add its make, model and age from the label.</p>
          <ul className="divide-y divide-sand-100">
            {systems.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/home/systems/${s.id}`} className={s.present === "no" ? "text-sand-400 line-through" : "text-brand-800 hover:underline"}>
                  {s.name}
                </Link>
                {s.present === "unknown" ? (
                  <span className="flex gap-1.5">
                    <form action={setSystemPresence.bind(null, s.id, "yes")}><SubmitButton className={`${btnSecondary} px-2.5 py-1 text-sm`}>We have it</SubmitButton></form>
                    <form action={setSystemPresence.bind(null, s.id, "no")}><SubmitButton className={`${btnSecondary} px-2.5 py-1 text-sm`}>No</SubmitButton></form>
                  </span>
                ) : (
                  <span className="text-xs text-sand-500">{s.present === "yes" ? (s.installYear ? `Installed ${s.installYear}` : "Age unknown") : "Not here"}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Logged here ({findings.length})</CardTitle>
        {findings.length === 0 ? (
          <p className="text-sm text-sand-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-sand-100">
            {findings.map((f) => (
              <li key={f.id}>
                <Link href={`/findings/${f.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-sand-50">
                  <span className="truncate">{f.title}</span>
                  <span className="flex shrink-0 gap-1"><SeverityBadge severity={f.severity} /><FindingStatusBadge status={f.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <form action={markAreaWalked.bind(null, a.id)}>
        <SubmitButton className={`${btnPrimary} w-full py-3`} pendingText="Saving…">Done with {a.name}</SubmitButton>
      </form>
    </div>
  );
}
