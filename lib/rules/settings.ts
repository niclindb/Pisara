// Checks for the settings page and email links (A5, A10, B3, D6).

import { addDays, daysBetween, type LocalDate } from "./dates";
import { displayNameProblem, isValidTimeZone } from "./onboarding";

/** The furthest ahead a pause can go (D6). */
export const MAX_PAUSE_DAYS = 365;

export interface SettingsChange {
  displayName?: string | null;
  timeZone?: string;
  weeklyRecapDay?: number;
  emailsEnabled?: boolean;
  /** The last day with no lessons, in the learner's time zone, or null to resume. */
  pausedUntil?: LocalDate | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function settingsProblems(change: SettingsChange, today: LocalDate): string[] {
  const out: string[] = [];
  const name = displayNameProblem(change.displayName);
  if (name) out.push(name);
  if (change.timeZone !== undefined && !isValidTimeZone(change.timeZone)) out.push("Pick your time zone.");
  if (
    change.weeklyRecapDay !== undefined &&
    !(Number.isInteger(change.weeklyRecapDay) && change.weeklyRecapDay >= 0 && change.weeklyRecapDay <= 6)
  ) {
    out.push("Pick a day for your weekly recap.");
  }
  if (change.pausedUntil) {
    const valid = DATE_RE.test(change.pausedUntil) && !Number.isNaN(Date.parse(change.pausedUntil));
    if (!valid || daysBetween(today, change.pausedUntil) < 0) out.push("Pick a day from today on.");
    else if (daysBetween(today, change.pausedUntil) > MAX_PAUSE_DAYS) {
      out.push(`Pause for up to a year (until ${addDays(today, MAX_PAUSE_DAYS)}).`);
    }
  }
  return out;
}
