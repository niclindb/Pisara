// The daily delivery job (design 6). Runs once a day for every learner.
// Safe to run twice: the database allows one daily lesson per local date.

import { INBOX_LIMIT, WAITING_REMINDER_MAX } from "../rules/constants";
import { addDays, localDate } from "../rules/dates";
import { dailyAction } from "../rules/delivery";
import { pickTopic } from "../rules/picking";
import { buildWeeklyRecap } from "../rules/review";
import { dailyLessonEmail, lessonsWaitingEmail, stillHereEmail, type EmailContext } from "../email/templates";
import type { DeliveryStore, Learner, Mailer } from "./types";

export interface DeliveryDeps {
  store: DeliveryStore;
  mailer: Mailer;
  random: () => number;
  baseUrl: string;
  unsubscribeSecret: string;
  log?: (message: string, detail?: unknown) => void;
}

export type LearnerOutcome =
  | { userId: string; outcome: "delivered"; lessonId: string; topicId: string; emailed: boolean; recap: boolean }
  | { userId: string; outcome: "waiting_reminder"; remindersSent: number }
  | { userId: string; outcome: "skipped"; reason: string }
  | { userId: string; outcome: "failed"; error: string };

export interface DeliverySummary {
  ranAt: string;
  learners: number;
  delivered: number;
  reminders: number;
  skipped: number;
  failed: number;
  outcomes: LearnerOutcome[];
}

async function deliverOne(learner: Learner, now: Date, deps: DeliveryDeps): Promise<LearnerOutcome> {
  const { store, mailer } = deps;
  const today = localDate(now, learner.timeZone);
  const day = await store.loadDay(learner, today);
  const action = dailyAction(
    {
      emailsEnabled: learner.emailsEnabled,
      lastActiveOn: learner.lastActiveAt ? localDate(learner.lastActiveAt, learner.timeZone) : null,
      pausedUntil: learner.pausedUntil,
      deliveredToday: day.deliveredToday,
      unreadCount: day.unreadCount,
      waitingRemindersSent: learner.waitingRemindersSent,
      waitingReminderSentOn: learner.waitingReminderSentOn,
    },
    today,
  );
  const ctx: EmailContext = {
    baseUrl: deps.baseUrl,
    unsubscribeSecret: deps.unsubscribeSecret,
    userId: learner.id,
    to: learner.email,
    displayName: learner.displayName,
    now,
  };

  if (action.kind === "skip") return { userId: learner.id, outcome: "skipped", reason: action.reason };

  if (action.kind === "waiting_reminder") {
    // Record first so a crash after sending can't cause a second email.
    await store.setWaitingReminders(learner.id, action.remindersSent, today);
    if (learner.emailsEnabled) {
      const last = action.remindersSent === WAITING_REMINDER_MAX;
      await mailer.send(last ? stillHereEmail(ctx, INBOX_LIMIT) : lessonsWaitingEmail(ctx, INBOX_LIMIT));
    }
    return { userId: learner.id, outcome: "waiting_reminder", remindersSent: action.remindersSent };
  }

  const pick = pickTopic({ candidates: day.topics, today, recentPicks: day.recentPicks, random: deps.random });
  const topic = day.topics.find((t) => t.topicId === pick.topicId);
  if (!topic?.nextLesson) return { userId: learner.id, outcome: "skipped", reason: "nothing_to_pick" };

  const created = await store.recordDelivery({
    userId: learner.id,
    lessonId: topic.nextLesson.id,
    topicId: topic.topicId,
    localDate: today,
    deliveredAt: now,
  });
  if (!created) return { userId: learner.id, outcome: "skipped", reason: "already_delivered" };

  let recap = false;
  const recapData = await store.loadRecapData(learner, today);
  const recapQuestions = buildWeeklyRecap({ ...recapData, today, recapDay: learner.weeklyRecapDay });
  if (recapQuestions) recap = await store.saveRecap(learner.id, addDays(today, -6), recapQuestions);

  if (learner.emailsEnabled) {
    await mailer.send(
      dailyLessonEmail(ctx, { ...topic.nextLesson, topicName: topic.name }, recap),
    );
  }
  return {
    userId: learner.id,
    outcome: "delivered",
    lessonId: topic.nextLesson.id,
    topicId: topic.topicId,
    emailed: learner.emailsEnabled,
    recap,
  };
}

export async function runDailyDelivery(now: Date, deps: DeliveryDeps): Promise<DeliverySummary> {
  const log = deps.log ?? (() => {});
  const learners = await deps.store.listLearners();
  const outcomes: LearnerOutcome[] = [];
  // One learner at a time keeps email sending under provider rate limits and
  // makes failures easy to read. Fine for the MVP's size.
  for (const learner of learners) {
    try {
      outcomes.push(await deliverOne(learner, now, deps));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log(`delivery failed for ${learner.id}`, error);
      outcomes.push({ userId: learner.id, outcome: "failed", error });
    }
  }
  const count = (o: LearnerOutcome["outcome"]) => outcomes.filter((x) => x.outcome === o).length;
  return {
    ranAt: now.toISOString(),
    learners: learners.length,
    delivered: count("delivered"),
    reminders: count("waiting_reminder"),
    skipped: count("skipped"),
    failed: count("failed"),
    outcomes,
  };
}
