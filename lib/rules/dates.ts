// Learner-local calendar dates as "YYYY-MM-DD" strings. Every rule works in
// the learner's own dates, so "today" depends on their time zone (A5).

export type LocalDate = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMidnight(date: LocalDate): number {
  if (!DATE_RE.test(date)) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** The calendar date at `instant` in `timeZone` (an IANA name like "Europe/Helsinki"). */
export function localDate(instant: Date, timeZone: string): LocalDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtcMidnight(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday, matching profiles.weekly_recap_day. */
export function weekday(date: LocalDate): number {
  return new Date(toUtcMidnight(date)).getUTCDay();
}
