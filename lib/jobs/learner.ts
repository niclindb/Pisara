// Data for the learner's pages: Home (B5, B6, C7, D6), the lesson page (B4,
// B5, A9), history (D5, C4) and progress (D1, D8, C9). The pages call these
// with the signed-in user's id; signed-out visitors only get the previews.

import { EXTRA_LESSONS_PER_DAY, INBOX_LIMIT } from "../rules/constants";
import { localDate, type LocalDate } from "../rules/dates";
import { goDeeperSuggestions, topicProgress, type TopicProgress } from "../rules/progress";
import { gradeAnswers, QuizError, suggestReread, type GradedAnswer, type SubmittedAnswer } from "../rules/quiz";
import { extraLessonsToday } from "./extra";
import { loadPracticeProblems, markLessonOpened, type PracticeProblem } from "./lessons";
import { loadQuiz, loadRecap, type QuizView } from "./quiz";
import type { Sql } from "./postgres-store";

export interface LessonCard {
  lessonId: string;
  title: string;
  topicId: string;
  topicName: string;
  readingMinutes: number;
  kind: "daily" | "extra";
  deliveredOn: LocalDate;
}

export type HomeState =
  /** Lessons are waiting. */
  | "waiting"
  /** Nothing unread; the next lesson comes with the daily run. */
  | "caught_up"
  /** Every topic that's on has run out of published lessons. */
  | "all_finished"
  /** Lessons are paused until `pausedUntil`. */
  | "paused";

export interface HomeView {
  displayName: string | null;
  state: HomeState;
  /** Newest first; the first one is the current lesson. At most 3. */
  waiting: LessonCard[];
  /** An open weekly recap, shown below the waiting lessons. */
  recap: { recapId: string; questionCount: number } | null;
  pausedUntil: LocalDate | null;
  /** No topic is turned on (they turned everything off after onboarding). */
  noTopicsOn: boolean;
  /** Extra lessons still allowed today (B7): 0 hides Start and "Surprise me" until tomorrow. */
  extrasLeftToday: number;
}

export async function loadHome(sql: Sql, userId: string, now: Date): Promise<HomeView | null> {
  const [p] = await sql`
    select display_name, time_zone, paused_until::text as paused_until from public.profiles where id = ${userId}`;
  if (!p) return null;
  const today = localDate(now, p.time_zone);
  const unread = await sql`
    select d.lesson_id, d.kind, d.local_date::text as local_date, l.title, l.reading_minutes, t.id as topic_id, t.name as topic_name
    from public.deliveries d
    join public.lessons l on l.id = d.lesson_id
    join public.topics t on t.id = l.topic_id
    where d.user_id = ${userId} and d.read_at is null
    order by d.delivered_at desc
    limit ${INBOX_LIMIT}`;
  const [topics] = await sql`
    select count(*)::int as on_count,
           count(*) filter (where exists (
             select 1 from public.lessons l
             where l.topic_id = ut.topic_id and l.status = 'published'
               and not exists (select 1 from public.deliveries d where d.user_id = ut.user_id and d.lesson_id = l.id)
           ))::int as with_lessons_left
    from public.user_topics ut where ut.user_id = ${userId} and ut.interest > 0`;
  const recap = await loadRecap(sql, userId);
  const paused = p.paused_until && p.paused_until >= today ? (p.paused_until as LocalDate) : null;

  const state: HomeState = unread.length
    ? "waiting"
    : paused
      ? "paused"
      : topics!.on_count > 0 && topics!.with_lessons_left === 0
        ? "all_finished"
        : "caught_up";
  return {
    displayName: p.display_name,
    state,
    waiting: unread.map((r) => ({
      lessonId: r.lesson_id,
      title: r.title,
      topicId: r.topic_id,
      topicName: r.topic_name,
      readingMinutes: r.reading_minutes,
      kind: r.kind,
      deliveredOn: r.local_date,
    })),
    recap: recap && recap.questions.length ? { recapId: recap.recapId, questionCount: recap.questions.length } : null,
    pausedUntil: paused,
    noTopicsOn: topics!.on_count === 0,
    extrasLeftToday: Math.max(0, EXTRA_LESSONS_PER_DAY - (await extraLessonsToday(sql, userId, today))),
  };
}

export interface LessonPage {
  id: string;
  title: string;
  /** Markdown. */
  body: string;
  readingMinutes: number;
  level: number;
  topic: { id: string; name: string };
  /** A signed-out visitor (or someone it wasn't delivered to) reading the topic's free preview. */
  preview: boolean;
  problems: PracticeProblem[];
  /** Signed in: the quiz and due review questions. Preview: the lesson's questions only, graded with gradePreviewQuiz and not saved. */
  quiz: QuizView | null;
  /** The lesson is no longer published; it stays readable for learners who have it (E7). */
  unpublished: boolean;
}

/**
 * Opens a lesson. For a learner it was delivered to, this marks it read (B6).
 * Anyone can open a topic's free preview. Returns null for anything else, so
 * there's no reading ahead.
 */
export async function openLessonPage(sql: Sql, userId: string | null, lessonId: string, now: Date): Promise<LessonPage | null> {
  const [l] = await sql`
    select l.id, l.title, l.body, l.reading_minutes, l.level, l.status, t.id as topic_id, t.name as topic_name,
           public.is_preview_lesson(l.id) as is_preview,
           exists (select 1 from public.deliveries d where d.user_id = ${userId} and d.lesson_id = l.id) as delivered
    from public.lessons l join public.topics t on t.id = l.topic_id
    where l.id = ${lessonId}`;
  if (!l || (!l.delivered && !l.is_preview)) return null;

  let quiz: QuizView | null;
  if (l.delivered && userId) {
    await markLessonOpened(sql, userId, lessonId, now);
    quiz = await loadQuiz(sql, userId, lessonId, now);
  } else {
    const qs = await sql`select id, prompt, options from public.questions where lesson_id = ${lessonId} order by position, id`;
    quiz = { lessonQuestions: qs.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })), reviewQuestions: [], completed: false };
  }
  return {
    id: l.id,
    title: l.title,
    body: l.body,
    readingMinutes: l.reading_minutes,
    level: l.level,
    topic: { id: l.topic_id, name: l.topic_name },
    preview: !l.delivered,
    problems: (await loadPracticeProblems(sql, userId, lessonId)) ?? [],
    quiz: quiz && (quiz.lessonQuestions.length || quiz.reviewQuestions.length) ? quiz : null,
    unpublished: l.status === "unpublished",
  };
}

/** The free preview lesson of a topic learners can pick (A9): its first published lesson. */
export async function previewLessonId(sql: Sql, topicId: string): Promise<string | null> {
  const [r] = await sql`
    select l.id from public.lessons l
    join public.visible_topics v on v.id = l.topic_id and v.pickable
    where l.topic_id = ${topicId} and public.is_preview_lesson(l.id)`;
  return r?.id ?? null;
}

/** Grades a preview quiz for a visitor (A9). Nothing is saved. */
export async function gradePreviewQuiz(
  sql: Sql,
  lessonId: string,
  answers: SubmittedAnswer[],
): Promise<{ answers: GradedAnswer[]; suggestReread: boolean }> {
  const [ok] = await sql`select public.is_preview_lesson(${lessonId}) as preview`;
  if (!ok?.preview) throw new QuizError("That lesson isn't a preview");
  const qs = await sql`
    select id, cardinality(options) as option_count, correct_index, explanation
    from public.questions where lesson_id = ${lessonId} order by position, id`;
  const graded = gradeAnswers(
    qs.map((q) => ({ id: q.id, optionCount: q.option_count, correctIndex: q.correct_index, explanation: q.explanation })),
    answers,
  );
  return { answers: graded, suggestReread: suggestReread(graded) };
}

export interface HistoryItem extends LessonCard {
  readOn: LocalDate | null;
  /** Null when the quiz was skipped or the lesson had none. */
  quiz: { correct: number; total: number } | null;
}

/**
 * Lessons the learner has, newest first, optionally for one topic (D5).
 * Pass the last item's `cursor` to get the next page.
 */
export async function loadHistory(
  sql: Sql,
  userId: string,
  options: { topicId?: string; limit?: number; before?: string } = {},
): Promise<{ items: HistoryItem[]; cursor: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const before = options.before ? new Date(options.before) : null;
  const rows = await sql`
    select d.lesson_id, d.kind, d.local_date::text as local_date, d.delivered_at, d.read_at,
           l.title, l.reading_minutes, t.id as topic_id, t.name as topic_name, p.time_zone,
           (select count(*)::int from public.answers a join public.questions q on q.id = a.question_id
            where a.user_id = d.user_id and a.context = 'lesson' and q.lesson_id = d.lesson_id) as answered,
           (select count(*)::int from public.answers a join public.questions q on q.id = a.question_id
            where a.user_id = d.user_id and a.context = 'lesson' and q.lesson_id = d.lesson_id and a.correct) as correct
    from public.deliveries d
    join public.profiles p on p.id = d.user_id
    join public.lessons l on l.id = d.lesson_id
    join public.topics t on t.id = l.topic_id
    where d.user_id = ${userId} and d.read_at is not null
      ${options.topicId ? sql`and l.topic_id = ${options.topicId}` : sql``}
      ${before && !Number.isNaN(before.getTime()) ? sql`and d.delivered_at < ${before}` : sql``}
    order by d.delivered_at desc
    limit ${limit + 1}`;
  const page = rows.slice(0, limit);
  return {
    items: page.map((r) => ({
      lessonId: r.lesson_id,
      title: r.title,
      topicId: r.topic_id,
      topicName: r.topic_name,
      readingMinutes: r.reading_minutes,
      kind: r.kind,
      deliveredOn: r.local_date,
      readOn: r.read_at ? localDate(r.read_at, r.time_zone) : null,
      quiz: r.answered ? { correct: r.correct, total: r.answered } : null,
    })),
    cursor: rows.length > limit ? (page.at(-1)!.delivered_at as Date).toISOString() : null,
  };
}

export interface ProgressTopic {
  id: string;
  name: string;
  goal: string;
  parentId: string | null;
  interest: number;
  progress: TopicProgress;
  /** Sub-topics to offer once this topic is finished (D8). */
  goDeeper: { id: string; name: string }[];
}

export interface ProgressView {
  lessonsRead: number;
  /** Topics that are on, or that have lessons read, in tree order. */
  topics: ProgressTopic[];
  /** Review and recap answers in the last 30 days (C9). Null with none yet. */
  reviewRemembered: { correct: number; total: number } | null;
  milestones: { kind: string; achievedAt: Date }[];
}

export const REVIEW_STATS_DAYS = 30;

export async function loadProgress(sql: Sql, userId: string, now: Date): Promise<ProgressView | null> {
  const [p] = await sql`select time_zone from public.profiles where id = ${userId}`;
  if (!p) return null;
  const topics = await sql`
    select t.id, t.name, t.goal, t.parent_id, t.position, coalesce(ut.interest, 0) as interest
    from public.topics t
    left join public.user_topics ut on ut.topic_id = t.id and ut.user_id = ${userId}
    order by t.position, t.name`;
  const lessons = await sql`select id, topic_id, level from public.lessons where status = 'published'`;
  const readRows = await sql`
    select d.lesson_id, l.topic_id from public.deliveries d join public.lessons l on l.id = d.lesson_id
    where d.user_id = ${userId} and d.read_at is not null`;
  const visible = new Set((await sql`select id from public.visible_topics where pickable`).map((r) => r.id as string));
  const since = new Date(now.getTime() - REVIEW_STATS_DAYS * 86_400_000);
  const [review] = await sql`
    select count(*)::int as total, count(*) filter (where correct)::int as correct
    from public.answers where user_id = ${userId} and context in ('review', 'weekly') and answered_at >= ${since}`;
  const milestones = await sql`
    select kind, achieved_at from public.milestones where user_id = ${userId} order by achieved_at desc`;

  const read = new Set(readRows.map((r) => r.lesson_id as string));
  const readTopics = new Set(readRows.map((r) => r.topic_id as string));
  const byTopic = new Map<string, { id: string; level: number }[]>();
  for (const l of lessons) byTopic.set(l.topic_id, [...(byTopic.get(l.topic_id) ?? []), { id: l.id, level: l.level }]);
  const on = new Set(topics.filter((t) => t.interest > 0).map((t) => t.id as string));
  type Row = (typeof topics)[number];
  const children = new Map<string | null, Row[]>();
  for (const t of topics) children.set(t.parent_id ?? null, [...(children.get(t.parent_id ?? null) ?? []), t]);

  const out: ProgressTopic[] = [];
  const visit = (t: Row) => {
    if (t.interest > 0 || readTopics.has(t.id)) {
      const progress = topicProgress(byTopic.get(t.id) ?? [], read);
      const kids = (children.get(t.id) ?? []).map((c) => ({ id: c.id as string, name: c.name as string, pickable: visible.has(c.id) }));
      out.push({
        id: t.id,
        name: t.name,
        goal: t.goal,
        parentId: t.parent_id,
        interest: t.interest,
        progress,
        goDeeper: goDeeperSuggestions(progress.finished, kids, on).map(({ id, name }) => ({ id, name })),
      });
    }
    for (const c of children.get(t.id) ?? []) visit(c);
  };
  for (const t of children.get(null) ?? []) visit(t);

  return {
    lessonsRead: read.size,
    topics: out,
    reviewRemembered: review!.total ? { correct: review!.correct, total: review!.total } : null,
    milestones: milestones.map((m) => ({ kind: m.kind, achievedAt: m.achieved_at })),
  };
}

