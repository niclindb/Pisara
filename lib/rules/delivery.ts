// What the daily job does for one learner (B6; design 5.2 and 6).

import {
  ACTIVE_WITHOUT_EMAIL_DAYS,
  INBOX_LIMIT,
  WAITING_REMINDER_GAP_DAYS,
  WAITING_REMINDER_MAX,
} from "./constants";
import { daysBetween, type LocalDate } from "./dates";

export interface LearnerState {
  emailsEnabled: boolean;
  /** Learner-local date of their last visit, or null if never. */
  lastActiveOn: LocalDate | null;
  /** Paused through this date (inclusive), or null. */
  pausedUntil: LocalDate | null;
  /** Whether a daily lesson already exists for today. */
  deliveredToday: boolean;
  unreadCount: number;
  /** "Lessons waiting" emails sent since the inbox filled (0–2). */
  waitingRemindersSent: number;
  waitingReminderSentOn: LocalDate | null;
}

export type DailyAction =
  | { kind: "skip"; reason: "inactive" | "paused" | "already_delivered" | "inbox_full_quiet" }
  | { kind: "deliver" }
  | { kind: "waiting_reminder"; remindersSent: number };

export function dailyAction(s: LearnerState, today: LocalDate): DailyAction {
  const recentlyActive =
    s.lastActiveOn !== null && daysBetween(s.lastActiveOn, today) <= ACTIVE_WITHOUT_EMAIL_DAYS;
  if (!s.emailsEnabled && !recentlyActive) return { kind: "skip", reason: "inactive" };
  if (s.pausedUntil !== null && daysBetween(today, s.pausedUntil) >= 0) {
    return { kind: "skip", reason: "paused" };
  }
  if (s.deliveredToday) return { kind: "skip", reason: "already_delivered" };
  if (s.unreadCount < INBOX_LIMIT) return { kind: "deliver" };

  // Inbox full: remind on the first day, once more a week later, then never again.
  const sent = s.waitingRemindersSent;
  const dueAgain =
    sent > 0 &&
    sent < WAITING_REMINDER_MAX &&
    s.waitingReminderSentOn !== null &&
    daysBetween(s.waitingReminderSentOn, today) >= WAITING_REMINDER_GAP_DAYS;
  if (sent === 0 || dueAgain) return { kind: "waiting_reminder", remindersSent: sent + 1 };
  return { kind: "skip", reason: "inbox_full_quiet" };
}

/** Reading a lesson resets the reminders, so a later full inbox starts over. */
export function remindersAfterRead(): { waitingRemindersSent: 0; waitingReminderSentOn: null } {
  return { waitingRemindersSent: 0, waitingReminderSentOn: null };
}

export interface PathLesson {
  id: string;
  position: number;
  level: number;
}

/** The lowest-position published lesson not yet delivered (design 4). */
export function nextLesson<L extends PathLesson>(
  publishedLessons: L[],
  deliveredLessonIds: ReadonlySet<string>,
): L | null {
  return (
    [...publishedLessons]
      .sort((a, b) => a.position - b.position)
      .find((l) => !deliveredLessonIds.has(l.id)) ?? null
  );
}
