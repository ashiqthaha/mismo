import Link from "next/link";
import type { ReactNode } from "react";
import type { FindingStatus, Severity } from "@/lib/db/schema";
import { FINDING_STATUS, SEVERITY } from "@/lib/format";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
export const btnPrimary = `${btn} bg-teal-700 text-white hover:bg-teal-800`;
export const btnSecondary = `${btn} bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-100`;
export const btnDanger = `${btn} bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50`;
export const btnGhost = `${btn} text-stone-700 hover:bg-stone-100`;
export const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-semibold text-stone-900">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-4">
      {back ? (
        <Link href={back.href} className="mb-1 inline-block text-sm text-teal-700 hover:underline">
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-stone-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = "bg-stone-100 text-stone-700 ring-stone-200" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const tone =
    status === "fixed"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "in_project"
        ? "bg-teal-50 text-teal-800 ring-teal-200"
        : status === "wont_do"
          ? "bg-stone-100 text-stone-500 ring-stone-200"
          : "bg-stone-100 text-stone-700 ring-stone-200";
  return <Badge tone={tone}>{FINDING_STATUS[status]}</Badge>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center">
      <p className="font-medium text-stone-800">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A labeled value in a small grid of facts. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-stone-900">{children || <span className="text-stone-400">Not set</span>}</dd>
    </div>
  );
}

export function ListLink({ href, children, right }: { href: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-stone-50">
      <div className="min-w-0 flex-1">{children}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </Link>
  );
}
