import Link from "next/link";
import type { ReactNode } from "react";
import type { FindingStatus, Severity } from "@/lib/db/schema";
import { FINDING_STATUS, SEVERITY } from "@/lib/format";
import { BirdsOnBranch } from "./birds";

// Buttons and fields are at least 44px tall on phones, so they're easy to tap.
export const btn =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed sm:min-h-9";
export const btnPrimary = `${btn} bg-brand-700 text-white shadow-sm hover:bg-brand-800`;
export const btnSecondary = `${btn} bg-white text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50`;
export const btnDanger = `${btn} bg-white text-sindoor-700 ring-1 ring-sindoor-200 hover:bg-sindoor-50`;
export const btnGhost = `${btn} text-sand-700 hover:bg-sand-100`;
export const input =
  "min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sand-900 sm:min-h-9 placeholder:text-sand-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Two background or ring colours on one element don't reliably override each other, so a passed-in one replaces the default.
  const bg = /(^|\s)bg-/.test(className) ? "" : "bg-white";
  const ring = /(^|\s)ring-[a-z]+-\d/.test(className) ? "" : "ring-sand-200";
  return <section className={`rounded-2xl p-4 shadow-sm ring-1 ${bg} ${ring} ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-semibold text-sand-900">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-4">
      {back ? (
        <Link href={back.href} className="mb-1 inline-block text-sm text-brand-700 hover:underline">
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] leading-tight font-medium text-brand-800">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-sand-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-sand-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-sand-500">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = "bg-sand-100 text-sand-700 ring-sand-200" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const tone =
    status === "fixed"
      ? "bg-shamrock-50 text-shamrock-800 ring-shamrock-200"
      : status === "in_project"
        ? "bg-brand-50 text-brand-800 ring-brand-200"
        : status === "wont_do"
          ? "bg-sand-100 text-sand-500 ring-sand-200"
          : "bg-sand-100 text-sand-700 ring-sand-200";
  return <Badge tone={tone}>{FINDING_STATUS[status]}</Badge>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-4 py-6 text-center">
      <BirdsOnBranch className="mx-auto mb-2 w-40" />
      <p className="font-display text-lg font-medium text-sand-800">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-sand-600">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A labeled value in a small grid of facts. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-sand-500">{label}</dt>
      <dd className="mt-0.5 text-sand-900">{children || <span className="text-sand-400">Not set</span>}</dd>
    </div>
  );
}

export function ListLink({ href, children, right }: { href: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-sand-50">
      <div className="min-w-0 flex-1">{children}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </Link>
  );
}
