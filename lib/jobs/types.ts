// What the daily delivery job needs from the database and from email. The
// Postgres store (lib/jobs/postgres-store.ts) and the Resend mailer
// (lib/email/resend.ts) implement these; tests use in-memory fakes.

import type { LocalDate } from "../rules/dates";
import type { RecapInput } from "../rules/review";
import type { TopicCandidate } from "../rules/picking";

export interface Learner {
  id: string;
  email: string;
  displayName: string | null;
  timeZone: string;
  weeklyRecapDay: number;
  emailsEnabled: boolean;
  pausedUntil: LocalDate | null;
  lastActiveAt: Date | null;
  waitingRemindersSent: number;
  waitingReminderSentOn: LocalDate | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  readingMinutes: number;
}

export interface TopicForPick extends TopicCandidate {
  name: string;
  /** The next lesson in this topic's path for this learner, if any. */
  nextLesson: LessonSummary | null;
}

export interface LearnerDay {
  deliveredToday: boolean;
  unreadCount: number;
  /** Turned-on topics that learners can pick (3+ published lessons). */
  topics: TopicForPick[];
  recentPicks: { date: LocalDate; topicId: string }[];
}

export type RecapData = Omit<RecapInput, "today" | "recapDay">;

export interface DeliveryStore {
  listLearners(): Promise<Learner[]>;
  loadDay(learner: Learner, today: LocalDate): Promise<LearnerDay>;
  /** Returns false if a daily delivery already exists for that date. */
  recordDelivery(d: {
    userId: string;
    lessonId: string;
    topicId: string;
    localDate: LocalDate;
    deliveredAt: Date;
  }): Promise<boolean>;
  setWaitingReminders(userId: string, sent: number, sentOn: LocalDate | null): Promise<void>;
  loadRecapData(learner: Learner, today: LocalDate): Promise<RecapData>;
  /** Returns false if this week's recap already exists. */
  saveRecap(userId: string, weekStart: LocalDate, questionIds: string[]): Promise<boolean>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
