import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { shortDate, todayLocal } from "@/lib/dates";
import { eraChecks, getHome, listAreas, openFindingCounts } from "@/lib/house";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Walkthrough" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WalkPage />
    </Suspense>
  );
}

async function WalkPage() {
  await requireUser();
  const [h, areas, openCounts] = await Promise.all([getHome(), listAreas(), openFindingCounts()]);
  const today = todayLocal();
  const toWalk = areas.filter((a) => a.present !== "no");
  const walked = toWalk.filter((a) => a.lastWalkedAt).length;
  const checks = eraChecks(h?.yearBuilt ?? null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Walkthrough"
        subtitle={`${walked} of ${toWalk.length} areas walked. Pick an area, note what you see, then mark it done.`}
      />

      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-teal-600" style={{ width: `${toWalk.length ? (walked / toWalk.length) * 100 : 0}%` }} />
      </div>

      {checks.length > 0 ? (
        <Card className="bg-amber-50/60 ring-amber-200">
          <CardTitle>Also look for, given the house&apos;s age</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
            {checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(["indoor", "outdoor"] as const).map((kind) => (
        <Card key={kind}>
          <CardTitle>{kind === "indoor" ? "Inside" : "Outside"}</CardTitle>
          <ul className="divide-y divide-stone-100">
            {toWalk
              .filter((a) => a.kind === kind)
              .map((a) => (
                <li key={a.id}>
                  <Link href={`/walk/${a.id}`} className="flex items-center justify-between gap-2 py-3 hover:bg-stone-50">
                    <span className="flex items-center gap-2">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-xs ${a.lastWalkedAt ? "bg-teal-600 text-white" : "ring-1 ring-stone-300"}`}
                        aria-hidden
                      >
                        {a.lastWalkedAt ? "✓" : ""}
                      </span>
                      <span className="text-stone-800">{a.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-stone-500">
                      {a.present === "unknown" ? <Badge>Not confirmed</Badge> : null}
                      {openCounts.get(a.id) ? <Badge tone="bg-amber-50 text-amber-900 ring-amber-200">{openCounts.get(a.id)} open</Badge> : null}
                      {a.lastWalkedAt ? <span>{shortDate(todayLocal(a.lastWalkedAt), today)}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
