import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardTitle, Fact, Field, PageHeader, btnSecondary, input } from "@/components/ui";
import { todayLocal } from "@/lib/dates";
import { PRESENCE } from "@/lib/format";
import { eraChecks, getHome, listAreas, listSystems, openFindingCounts, systemAge } from "@/lib/house";
import { requireUser } from "@/lib/session";
import { createArea, createSystem, updateHome } from "./actions";

export const metadata: Metadata = { title: "House" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HousePage />
    </Suspense>
  );
}

async function HousePage() {
  await requireUser();
  const [h, areas, systems, openCounts] = await Promise.all([getHome(), listAreas(), listSystems(), openFindingCounts()]);
  const year = Number(todayLocal().slice(0, 4));
  const checks = eraChecks(h?.yearBuilt ?? null);
  const indoor = areas.filter((a) => a.kind === "indoor");
  const outdoor = areas.filter((a) => a.kind === "outdoor");
  const baths = h?.fullBaths != null ? `${h.fullBaths} full${h.halfBaths ? `, ${h.halfBaths} half` : ""}` : "";

  return (
    <div className="space-y-4">
      <PageHeader title={h?.name ?? "The house"} subtitle={h?.address ?? undefined} />

      {h ? (
        <Card>
          <CardTitle>Details</CardTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="Type">{h.homeType}</Fact>
            <Fact label="Built">{h.yearBuilt ? `${h.yearBuilt} (${year - h.yearBuilt} yrs)` : ""}</Fact>
            <Fact label="Above grade">{h.aboveGradeSqft ? `${h.aboveGradeSqft.toLocaleString()} sq ft` : ""}</Fact>
            <Fact label="Finished basement">{h.basementSqft ? `${h.basementSqft.toLocaleString()} sq ft` : ""}</Fact>
            <Fact label="Lot">{h.lotSqft ? `${h.lotSqft.toLocaleString()} sq ft` : ""}</Fact>
            <Fact label="Stories">{h.stories ? String(h.stories) : ""}</Fact>
            <Fact label="Bathrooms">{baths}</Fact>
            <Fact label="Exterior">{h.exterior}</Fact>
          </dl>
          {h.notes ? <p className="mt-3 text-sm text-sand-600">{h.notes}</p> : null}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit details</summary>
            <form action={updateHome.bind(null, h.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Name"><input name="name" defaultValue={h.name} className={input} /></Field>
              <Field label="Address"><input name="address" defaultValue={h.address ?? ""} className={input} /></Field>
              <Field label="Type"><input name="homeType" defaultValue={h.homeType ?? ""} className={input} /></Field>
              <Field label="Subdivision"><input name="subdivision" defaultValue={h.subdivision ?? ""} className={input} /></Field>
              <Field label="Year built"><input name="yearBuilt" inputMode="numeric" defaultValue={h.yearBuilt ?? ""} className={input} /></Field>
              <Field label="Stories"><input name="stories" inputMode="numeric" defaultValue={h.stories ?? ""} className={input} /></Field>
              <Field label="Above-grade sq ft"><input name="aboveGradeSqft" inputMode="numeric" defaultValue={h.aboveGradeSqft ?? ""} className={input} /></Field>
              <Field label="Finished basement sq ft"><input name="basementSqft" inputMode="numeric" defaultValue={h.basementSqft ?? ""} className={input} /></Field>
              <Field label="Lot sq ft"><input name="lotSqft" inputMode="numeric" defaultValue={h.lotSqft ?? ""} className={input} /></Field>
              <Field label="Exterior"><input name="exterior" defaultValue={h.exterior ?? ""} className={input} /></Field>
              <Field label="Full baths"><input name="fullBaths" inputMode="numeric" defaultValue={h.fullBaths ?? ""} className={input} /></Field>
              <Field label="Half baths"><input name="halfBaths" inputMode="numeric" defaultValue={h.halfBaths ?? ""} className={input} /></Field>
              <div className="sm:col-span-2">
                <Field label="Notes"><textarea name="notes" rows={2} defaultValue={h.notes ?? ""} className={input} /></Field>
              </div>
              <div><SubmitButton>Save details</SubmitButton></div>
            </form>
          </details>
        </Card>
      ) : null}

      {checks.length > 0 ? (
        <Card className="bg-saffron-50/60 ring-saffron-200">
          <CardTitle>Worth checking in a house this age</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sand-700">
            {checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[{ title: "Inside", list: indoor }, { title: "Outside", list: outdoor }].map(({ title, list }) => (
          <Card key={title}>
            <CardTitle>{title}</CardTitle>
            <ul className="divide-y divide-sand-100">
              {list.map((a) => (
                <li key={a.id}>
                  <Link href={`/home/areas/${a.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-sand-50">
                    <span className={a.present === "no" ? "text-sand-400 line-through" : "text-sand-800"}>{a.name}</span>
                    <span className="flex items-center gap-1.5">
                      {a.present === "unknown" ? <Badge>{PRESENCE.unknown}</Badge> : null}
                      {openCounts.get(a.id) ? (
                        <Badge tone="bg-saffron-50 text-saffron-900 ring-saffron-200">{openCounts.get(a.id)} open</Badge>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Systems and equipment</CardTitle>
        <ul className="divide-y divide-sand-100">
          {systems.map(({ s, areaName }) => {
            const age = systemAge(s.installYear, s.expectedLifeYears, year);
            return (
              <li key={s.id}>
                <Link href={`/home/systems/${s.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-sand-50">
                  <span className="min-w-0">
                    <span className={s.present === "no" ? "text-sand-400 line-through" : "text-sand-800"}>{s.name}</span>
                    {areaName ? <span className="ml-2 text-xs text-sand-500">{areaName}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    {s.present === "unknown" ? <Badge>{PRESENCE.unknown}</Badge> : null}
                    <span className={age.tone}>{age.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Add an area</CardTitle>
          <form action={createArea} className="flex flex-col gap-2 sm:flex-row">
            <input name="name" required placeholder="e.g. Sunroom" className={input} />
            <select name="kind" className={`${input} sm:w-32`} defaultValue="indoor">
              <option value="indoor">Inside</option>
              <option value="outdoor">Outside</option>
            </select>
            <SubmitButton className={btnSecondary}>Add</SubmitButton>
          </form>
        </Card>
        <Card>
          <CardTitle>Add a system or appliance</CardTitle>
          <form action={createSystem} className="grid gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="e.g. Dehumidifier" className={input} />
            <select name="areaId" className={input} defaultValue="">
              <option value="">No area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input name="category" placeholder="Category (optional)" className={input} />
            <input name="expectedLifeYears" inputMode="numeric" placeholder="Expected life, years" className={input} />
            <div><SubmitButton className={btnSecondary}>Add</SubmitButton></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
