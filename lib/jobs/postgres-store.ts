// The delivery job's database access, as plain SQL. It connects with the
// database owner's connection string (Supabase: Project Settings → Database →
// Connection string, "Transaction pooler"), so the access rules don't apply.
// Keep that string on the server only.

import postgres from "postgres";
import { MIN_PUBLISHED_LESSONS } from "../rules/constants";
import { addDays, localDate, type LocalDate } from "../rules/dates";
import type { DeliveryStore, Learner, LearnerDay, RecapData } from "./types";

export type Sql = postgres.Sql;

export function connect(databaseUrl: string): Sql {
  // prepare: false is required by Supabase's transaction pooler.
  return postgres(databaseUrl, { prepare: false, max: 1 });
}

export function postgresStore(sql: Sql): DeliveryStore {
  return {
    async listLearners(): Promise<Learner[]> {
      const rows = await sql`
        select id, email, display_name, time_zone, weekly_recap_day, emails_enabled,
               paused_until::text as paused_until, last_active_at,
               waiting_reminders_sent, waiting_reminder_sent_on::text as waiting_reminder_sent_on
        from public.profiles
        order by created_at`;
      return rows.map((r) => ({
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
      }));
    },

    async loadDay(learner: Learner, today: LocalDate): Promise<LearnerDay> {
      const [status] = await sql`
        select
          exists (select 1 from public.deliveries
                  where user_id = ${learner.id} and kind = 'daily' and local_date = ${today}) as delivered_today,
          (select count(*)::int from public.deliveries
           where user_id = ${learner.id} and read_at is null) as unread`;

      const recent = await sql`
        select d.local_date::text as date, l.topic_id
        from public.deliveries d join public.lessons l on l.id = d.lesson_id
        where d.user_id = ${learner.id} and d.kind = 'daily'
          and d.local_date between ${addDays(today, -2)} and ${addDays(today, -1)}`;

      // Turned-on topics that learners can pick (enough published lessons).
      const topics = await sql`
        select t.id, t.name, ut.interest, ut.last_delivered_at
        from public.user_topics ut join public.topics t on t.id = ut.topic_id
        where ut.user_id = ${learner.id} and ut.interest > 0
          and (select count(*) from public.lessons l
               where l.topic_id = t.id and l.status = 'published') >= ${MIN_PUBLISHED_LESSONS}`;

      const topicIds = topics.map((t) => t.id as string);
      const next = topicIds.length
        ? await sql`
            select distinct on (l.topic_id) l.topic_id, l.id, l.title, l.reading_minutes
            from public.lessons l
            where l.topic_id = any(${topicIds}::uuid[]) and l.status = 'published'
              and not exists (select 1 from public.deliveries d
                              where d.user_id = ${learner.id} and d.lesson_id = l.id)
            order by l.topic_id, l.position`
        : [];
      const nextByTopic = new Map(next.map((n) => [n.topic_id as string, n]));

      return {
        deliveredToday: status!.delivered_today,
        unreadCount: status!.unread,
        recentPicks: recent.map((r) => ({ date: r.date, topicId: r.topic_id })),
        topics: topics.map((t) => {
          const n = nextByTopic.get(t.id);
          return {
            topicId: t.id,
            name: t.name,
            interest: t.interest,
            lastDeliveredOn: t.last_delivered_at ? localDate(t.last_delivered_at, learner.timeZone) : null,
            hasNextLesson: Boolean(n),
            nextLesson: n ? { id: n.id, title: n.title, readingMinutes: n.reading_minutes } : null,
          };
        }),
      };
    },

    async recordDelivery({ userId, lessonId, topicId, localDate: date, deliveredAt }) {
      return sql.begin(async (tx) => {
        const inserted = await tx`
          insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at)
          values (${userId}, ${lessonId}, 'daily', ${date}, ${deliveredAt})
          on conflict do nothing
          returning id`;
        if (inserted.length === 0) return false;
        await tx`
          update public.user_topics set last_delivered_at = ${deliveredAt}
          where user_id = ${userId} and topic_id = ${topicId}`;
        return true;
      });
    },

    async setWaitingReminders(userId, sent, sentOn) {
      await sql`
        update public.profiles
        set waiting_reminders_sent = ${sent}, waiting_reminder_sent_on = ${sentOn}
        where id = ${userId}`;
    },

    async loadRecapData(learner: Learner, today: LocalDate): Promise<RecapData> {
      // "This week" = the 7 learner-local days ending today.
      const weekStart = sql`((${addDays(today, -6)}::date)::timestamp at time zone ${learner.timeZone})`;

      const [read] = await sql`
        select count(*)::int as n from public.deliveries
        where user_id = ${learner.id} and read_at >= ${weekStart}`;

      const due = await sql`
        select ri.question_id, ri.due_on::text as due_on, l.topic_id, (l.status = 'published') as published
        from public.review_items ri
        join public.questions q on q.id = ri.question_id
        join public.lessons l on l.id = q.lesson_id
        where ri.user_id = ${learner.id} and ri.due_on <= ${today}`;

      const missed = await sql`
        select question_id from public.answers
        where user_id = ${learner.id} and context = 'lesson' and not correct
          and answered_at >= ${weekStart}
        group by question_id
        order by min(answered_at)`;

      const week = await sql`
        select q.id from public.deliveries d
        join public.questions q on q.lesson_id = d.lesson_id
        where d.user_id = ${learner.id} and d.read_at >= ${weekStart}
        order by d.read_at, q.position`;

      return {
        lessonsReadThisWeek: read!.n,
        dueReview: due.map((r) => ({
          questionId: r.question_id,
          dueOn: r.due_on,
          topicId: r.topic_id,
          lessonPublished: r.published,
        })),
        missedThisWeek: missed.map((r) => r.question_id),
        questionsThisWeek: week.map((r) => r.id),
      };
    },

    async saveRecap(userId, weekStart, questionIds) {
      const inserted = await sql`
        insert into public.weekly_recaps (user_id, week_start, question_ids)
        values (${userId}, ${weekStart}, ${questionIds}::uuid[])
        on conflict (user_id, week_start) do nothing
        returning id`;
      return inserted.length > 0;
    },
  };
}
