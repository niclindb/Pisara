// Settings (A5, A10, B3, D6, D9) and the email preferences page that opens
// from any email without signing in.

import { readEmailSettingsToken } from "../email/unsubscribe";
import { AuthorError } from "../rules/authoring";
import { localDate, type LocalDate } from "../rules/dates";
import { cleanDisplayName, isValidTimeZone } from "../rules/onboarding";
import { settingsProblems, type SettingsChange } from "../rules/settings";
import type { Sql } from "./postgres-store";

/** A settings change the learner can fix, with what to fix. */
export class SettingsError extends AuthorError {}

export interface SettingsView {
  email: string;
  displayName: string | null;
  timeZone: string;
  weeklyRecapDay: number;
  emailsEnabled: boolean;
  /** Only while the pause hasn't ended. */
  pausedUntil: LocalDate | null;
  today: LocalDate;
}

export async function loadSettings(sql: Sql, userId: string, now: Date): Promise<SettingsView | null> {
  const [p] = await sql`
    select email, display_name, time_zone, weekly_recap_day, emails_enabled, paused_until::text as paused_until
    from public.profiles where id = ${userId}`;
  if (!p) return null;
  const today = localDate(now, p.time_zone);
  return {
    email: p.email,
    displayName: p.display_name,
    timeZone: p.time_zone,
    weeklyRecapDay: p.weekly_recap_day,
    emailsEnabled: p.emails_enabled,
    pausedUntil: p.paused_until && p.paused_until >= today ? p.paused_until : null,
    today,
  };
}

/** Saves only the fields given. A pause is a date in the learner's own time zone. */
export async function updateSettings(sql: Sql, userId: string, change: SettingsChange, now: Date): Promise<SettingsView> {
  return sql.begin(async (tx) => {
    const [p] = await tx`select time_zone from public.profiles where id = ${userId} for update`;
    if (!p) throw new SettingsError("No such learner.");
    const zone = change.timeZone && isValidTimeZone(change.timeZone) ? change.timeZone : p.time_zone;
    const today = localDate(now, zone);
    const problems = settingsProblems(change, today);
    if (problems.length) throw new SettingsError(problems[0]!, problems);
    await tx`
      update public.profiles set
        display_name = ${"displayName" in change ? cleanDisplayName(change.displayName) : tx`display_name`},
        time_zone = ${change.timeZone ?? tx`time_zone`},
        weekly_recap_day = ${change.weeklyRecapDay ?? tx`weekly_recap_day`},
        emails_enabled = ${change.emailsEnabled ?? tx`emails_enabled`},
        paused_until = ${"pausedUntil" in change ? (change.pausedUntil ?? null) : tx`paused_until`}
      where id = ${userId}`;
    return (await loadSettings(tx as unknown as Sql, userId, now))!;
  });
}

export type EmailPreferences = Pick<SettingsView, "email" | "emailsEnabled" | "pausedUntil" | "today">;

/**
 * What the email settings page shows (B3, D6). Opening the link changes
 * nothing: mail scanners open every link in an email, so only a button press
 * turns emails off or pauses them. Null for a link that isn't genuine.
 */
export async function loadEmailPreferences(sql: Sql, token: string, secret: string, now: Date): Promise<EmailPreferences | null> {
  const userId = readEmailSettingsToken(token, secret);
  if (!userId) return null;
  return emailPreferences(sql, userId, now);
}

/** Turn emails off or back on, or pause until a date: buttons on the email settings page. */
export async function updateEmailPreferences(
  sql: Sql,
  token: string,
  secret: string,
  change: Pick<SettingsChange, "emailsEnabled" | "pausedUntil">,
  now: Date,
): Promise<EmailPreferences | null> {
  const userId = readEmailSettingsToken(token, secret);
  if (!userId) return null;
  const { emailsEnabled, pausedUntil } = change;
  await updateSettings(sql, userId, { emailsEnabled, ...("pausedUntil" in change ? { pausedUntil } : {}) }, now);
  return emailPreferences(sql, userId, now);
}

async function emailPreferences(sql: Sql, userId: string, now: Date): Promise<EmailPreferences | null> {
  const s = await loadSettings(sql, userId, now);
  return s && { email: s.email, emailsEnabled: s.emailsEnabled, pausedUntil: s.pausedUntil, today: s.today };
}

/**
 * Deletes the account and all learner data (D9): the sign-in user, and through
 * it the profile, topics, deliveries, answers, review items, recaps and
 * milestones. The page asks for confirmation first and signs the user out after.
 */
export async function deleteAccount(sql: Sql, userId: string): Promise<boolean> {
  const r = await sql`delete from auth.users where id = ${userId}`;
  return r.count > 0;
}
