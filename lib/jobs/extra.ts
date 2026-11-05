// Lessons outside the daily run: an extra lesson when the learner asks (B7),
// either from a topic they pick (the next lesson in its path) or "Surprise me"
// (the same weighted pick as the daily lesson), and the first lesson right
// after onboarding (A6). Neither sends an email: the learner is on the site.

import { EXTRA_LESSONS_PER_DAY, INBOX_LIMIT } from "../rules/constants";
import { localDate } from "../rules/dates";
import { pickTopic } from "../rules/picking";
import { postgresStore, type Sql } from "./postgres-store";
import type { Learner } from "./types";

export type ExtraLessonResult =
  | { ok: true; lessonId: string; topicId: string }
  | {
      ok: false;
      reason:
        /** 3 lessons are already waiting: read one first. */
        | "inbox_full"
        /** Already had the day's extra lessons (2): more tomorrow. */
        | "daily_limit"
        /** The picked topic has no lessons left for this learner. */
        | "topic_finished"
        /** The picked topic isn't open to learners. */
        | "topic_unavailable"
        /** "Surprise me" found no turned-on topic with lessons left. */
        | "nothing_left";
    };

async function loadLearner(sql: Sql, userId: string): Promise<Learner | null> {
  const [r] = await sql`
    select id, email, display_name, time_zone, weekly_recap_day, emails_enabled,
           paused_until::text as paused_until, last_active_at,
           waiting_reminders_sent, waiting_reminder_sent_on::text as waiting_reminder_sent_on
    from public.profiles where id = ${userId}`;
  return r
    ? {
        id: r.id,
        email: r.email,
        displayName: r.display_name,
        timeZone: r.time_zone,
        weeklyRecapDay: r.weekly_recap_day,
        emailsEnabled: r.emails_enabled,
        pausedUntil: r.paused_until,
        lastActiveAt: r.last_active_at,
        waitingRemindersSent: r.waiting_reminders_sent,
        waitingReminderSentOn: r.waiting_reminder_sent_on,
      }
    : null;
}

/**
 * Delivers an extra lesson now (B7). With `topicId`, it's the next lesson in
 * that topic's path; the topic doesn't have to be turned on. Without it, it's
 * "Surprise me". Extra lessons count toward the 3-lesson inbox, but not toward
 * the daily "no 3 days in a row" rule. At most 2 a day: a lesson counts as read
 * the moment it opens, so without a limit a learner could read a whole path in
 * one sitting, which is reading ahead by another name.
 */
export async function getExtraLesson(
  sql: Sql,
  userId: string,
  now: Date,
  options: { topicId?: string; random?: () => number } = {},
): Promise<ExtraLessonResult> {
  const learner = await loadLearner(sql, userId);
  if (!learner) throw new Error("No such learner");
  const today = localDate(now, learner.timeZone);
  const day = await postgresStore(sql).loadDay(learner, today);
  if (day.unreadCount >= INBOX_LIMIT) return { ok: false, reason: "inbox_full" };
  if ((await extraLessonsToday(sql, userId, today)) >= EXTRA_LESSONS_PER_DAY) return { ok: false, reason: "daily_limit" };

  let topicId: string;
  let lessonId: string;
  if (options.topicId) {
    const [t] = await sql`select pickable from public.visible_topics where id = ${options.topicId}`;
    if (!t?.pickable) return { ok: false, reason: "topic_unavailable" };
    const [next] = await sql`
      select l.id from public.lessons l
      where l.topic_id = ${options.topicId} and l.status = 'published'
        and not exists (select 1 from public.deliveries d where d.user_id = ${userId} and d.lesson_id = l.id)
      order by l.position limit 1`;
    if (!next) return { ok: false, reason: "topic_finished" };
    topicId = options.topicId;
    lessonId = next.id;
  } else {
    const pick = pickTopic({ candidates: day.topics, today, recentPicks: [], random: options.random ?? Math.random });
    const topic = day.topics.find((t) => t.topicId === pick.topicId);
    if (!topic?.nextLesson) return { ok: false, reason: "nothing_left" };
    topicId = topic.topicId;
    lessonId = topic.nextLesson.id;
  }

  await sql.begin(async (tx) => {
    // A double click lands on the same lesson, so this is harmless.
    await tx`
      insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at)
      values (${userId}, ${lessonId}, 'extra', ${today}, ${now})
      on conflict (user_id, lesson_id) do nothing`;
    await tx`update public.user_topics set last_delivered_at = ${now} where user_id = ${userId} and topic_id = ${topicId}`;
    await tx`update public.profiles set last_active_at = ${now} where id = ${userId}`;
  });
  return { ok: true, lessonId, topicId };
}

/**
 * The first lesson, right after onboarding (A6). It counts as today's daily
 * lesson, so the daily run skips this learner until tomorrow. Does nothing for
 * a learner who already has a lesson; returns the new lesson's id or null.
 */
export async function deliverFirstLesson(sql: Sql, userId: string, now: Date, random: () => number = Math.random): Promise<string | null> {
  const learner = await loadLearner(sql, userId);
  if (!learner) return null;
  const [any] = await sql`select 1 from public.deliveries where user_id = ${userId} limit 1`;
  if (any) return null;
  const today = localDate(now, learner.timeZone);
  const store = postgresStore(sql);
  const day = await store.loadDay(learner, today);
  const pick = pickTopic({ candidates: day.topics, today, recentPicks: day.recentPicks, random });
  const topic = day.topics.find((t) => t.topicId === pick.topicId);
  if (!topic?.nextLesson) return null;
  const created = await store.recordDelivery({ userId, lessonId: topic.nextLesson.id, topicId: topic.topicId, localDate: today, deliveredAt: now });
  return created ? topic.nextLesson.id : null;
}

/** Extra lessons taken on the learner's local date, read or not. */
export async function extraLessonsToday(sql: Sql, userId: string, today: string): Promise<number> {
  const [r] = await sql`
    select count(*)::int as n from public.deliveries
    where user_id = ${userId} and kind = 'extra' and local_date = ${today}`;
  return r!.n;
}
