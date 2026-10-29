import type { Doer, FindingStatus, Presence, Priority, ProjectStatus, Severity, Who } from "./db/schema";

export function money(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

/** "$1,200.50" or "1200.5" → 120050 cents; empty → null. */
export function parseMoney(input: FormDataEntryValue | null): number | null {
  const s = String(input ?? "").replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function parseInt0(input: FormDataEntryValue | null): number | null {
  const s = String(input ?? "").replace(/[,\s]/g, "");
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function str(input: FormDataEntryValue | null): string | null {
  const s = String(input ?? "").trim();
  return s ? s : null;
}

/** A "YYYY-MM-DD" date from a date input, or null. */
export function dateStr(input: FormDataEntryValue | null): string | null {
  const s = String(input ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export const SEVERITY: Record<Severity, { label: string; tone: string }> = {
  safety: { label: "Safety", tone: "bg-sindoor-100 text-sindoor-800 ring-sindoor-200" },
  fix: { label: "Needs fixing", tone: "bg-saffron-100 text-saffron-900 ring-saffron-200" },
  nice: { label: "Nice to have", tone: "bg-peacock-100 text-peacock-900 ring-peacock-200" },
};

export const FINDING_STATUS: Record<FindingStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_project: "In a project",
  wont_do: "Won't do",
  fixed: "Fixed",
};

export const PROJECT_STATUS: Record<ProjectStatus, string> = {
  idea: "Idea",
  planning: "Planning",
  getting_quotes: "Getting quotes",
  scheduled: "Scheduled",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "idea",
  "planning",
  "getting_quotes",
  "scheduled",
  "in_progress",
  "on_hold",
  "done",
];

export const PRIORITY: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
export const DOER: Record<Doer, string> = { diy: "DIY", hired: "Hired", mixed: "Mixed" };
export const WHO: Record<Who, string> = { diy: "DIY", pro: "Pro", either: "DIY or pro" };
export const PRESENCE: Record<Presence, string> = { yes: "In the house", unknown: "Not confirmed", no: "Not in the house" };

export function intervalLabel(months: number): string {
  if (months === 1) return "Monthly";
  if (months === 12) return "Yearly";
  if (months % 12 === 0) return `Every ${months / 12} years`;
  return `Every ${months} months`;
}
