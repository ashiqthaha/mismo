// Dates are stored as "YYYY-MM-DD" strings and treated as calendar days in the
// house's time zone, so a job due "today" means today in Maryland.

export const TIME_ZONE = "America/New_York";

export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hour of the day (0-23) in the house's time zone. */
export function localHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

function parse(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, days: number): string {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + days);
  return format(x);
}

export function addMonths(d: string, months: number): string {
  const x = parse(d);
  const dayOfMonth = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(dayOfMonth, lastDay));
  return format(x);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** The first day of the earliest month in `months` (1-12) that falls on or after `from`. */
export function nextMonthStart(from: string, months: number[]): string {
  const start = parse(from);
  for (let i = 0; i < 24; i++) {
    const candidate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    if (months.includes(candidate.getUTCMonth() + 1) && format(candidate) >= from) {
      return format(candidate);
    }
  }
  return from;
}

/**
 * When a recurring job is next due after being done on `doneOn`.
 * Jobs tied to certain months snap to the start of the next such month that is
 * at least half an interval away, so a twice-a-year April/November job done in
 * late November comes back in April, not the following November.
 */
export function nextDueAfter(doneOn: string, intervalMonths: number, bestMonths: number[]): string {
  if (bestMonths.length === 0) return addMonths(doneOn, intervalMonths);
  const earliest = addMonths(doneOn, Math.max(1, Math.floor(intervalMonths / 2)));
  return nextMonthStart(earliest, bestMonths);
}

/**
 * First due date for a job nobody has logged yet. Seasonal jobs are due now if
 * this is their month, otherwise at the start of their next month. Other short
 * jobs are spread over the next four weeks; longer ones over the next three months.
 * Jobs that repeat every 3+ years return null: they need a "last done" date first.
 */
export function initialDue(today: string, intervalMonths: number, bestMonths: number[], index: number): string | null {
  if (bestMonths.length > 0) {
    const month = Number(today.slice(5, 7));
    return bestMonths.includes(month) ? today : nextMonthStart(today, bestMonths);
  }
  if (intervalMonths >= 36) return null;
  if (intervalMonths <= 3) return addDays(today, 7 + (index % 4) * 7);
  return addDays(today, 14 + (index % 12) * 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthName(m: number): string {
  return MONTHS.at(m - 1) ?? "";
}

/** "Oct 26" this year, "Oct 26, 2027" otherwise. */
export function shortDate(d: string | null | undefined, today = todayLocal()): string {
  if (!d) return "";
  const [y, m, dd] = d.split("-").map(Number);
  const base = `${monthName(m)} ${dd}`;
  return y === Number(today.slice(0, 4)) ? base : `${base}, ${y}`;
}

/** "Monday, October 26". */
export function longDate(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "today", "tomorrow", "in 5 days", "3 days ago". */
export function relativeDay(d: string, today = todayLocal()): string {
  const n = daysBetween(today, d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
