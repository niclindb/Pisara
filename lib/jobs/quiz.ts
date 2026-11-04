// The quiz after a lesson (C1–C6, D3, D8) and the weekly recap (C7).
// Quizzes are optional: skipping one leaves the lesson read and puts nothing
// into review. Grading happens here, on the server.

import { REVIEW_PER_DAY } from "../rules/constants";
import { localDate, type LocalDate } from "../rules/dates";
import { checkMilestones, isLongMemory } from "../rules/milestones";
import { goDeeperSuggestions, topicProgress } from "../rules/progress";
import { gradeAnswers, QuizError, suggestReread, type GradedAnswer, type SubmittedAnswer } from "../rules/quiz";
import { afterLessonAnswer, afterReviewAnswer, chooseReviewQuestions, type ReviewItem } from "../rules/review";
import type postgres from "postgres";
import type { Sql } from "./postgres-store";

type Tx = postgres.TransactionSql;

export { QuizError };

export interface QuizQuestionView {
  id: string;
  prompt: string;
  options: string[];
  /** Set for review questions, so the page can label them. */
  reviewTopic?: string;
}

export interface QuizView {
  lessonQuestions: QuizQuestionView[];
  reviewQuestions: QuizQuestionView[];
  completed: boolean;
}

async function learnerToday(tx: Tx | Sql, userId: string, now: Date): Promise<{ today: LocalDate; timeZone: string }> {
  const [p] = await tx`select time_zone from public.profiles where id = ${userId}`;
  if (!p) throw new QuizError("No such learner");
  return { today: localDate(now, p.time_zone), timeZone: p.time_zone };
}

async function dueReview(tx: Tx | Sql, userId: string, today: LocalDate, lessonTopicId: string): Promise<string[]> {
  const rows = await tx`
    select ri.question_id, ri.due_on::text as due_on, l.topic_id, (l.status = 'published') as published
    from public.review_items ri
    join public.questions q on q.id = ri.question_id
    join public.lessons l on l.id = q.lesson_id
    where ri.user_id = ${userId} and ri.due_on <= ${today}`;
  return chooseReviewQuestions(
    rows.map((r) => ({ questionId: r.question_id, dueOn: r.due_on, topicId: r.topic_id, lessonPublished: r.published })),
    today,
    lessonTopicId,
    REVIEW_PER_DAY,
  );
}

/** The questions to show after a lesson, without the answers. Null if the lesson wasn't delivered to this learner. */
export async function loadQuiz(sql: Sql, userId: string, lessonId: string, now: Date): Promise<QuizView | null> {
  const [d] = await sql`
    select d.quiz_completed_at, l.topic_id
    from public.deliveries d join public.lessons l on l.id = d.lesson_id
    where d.user_id = ${userId} and d.lesson_id = ${lessonId}`;
  if (!d) return null;
  const { today } = await learnerToday(sql, userId, now);
  const lessonQuestions = await sql`
    select id, prompt, options from public.questions where lesson_id = ${lessonId} order by position, id`;
  const reviewIds = d.quiz_completed_at ? [] : await dueReview(sql, userId, today, d.topic_id);
  const review = reviewIds.length
    ? await sql`
        select q.id, q.prompt, q.options, t.name as topic
        from public.questions q
        join public.lessons l on l.id = q.lesson_id
        join public.topics t on t.id = l.topic_id
        where q.id = any(${reviewIds}::uuid[])`
    : [];
  const reviewById = new Map(review.map((r) => [r.id as string, r]));
  return {
    lessonQuestions: lessonQuestions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    reviewQuestions: reviewIds.map((id) => {
      const r = reviewById.get(id)!;
      return { id: r.id, prompt: r.prompt, options: r.options, reviewTopic: r.topic };
    }),
    completed: Boolean(d.quiz_completed_at),
  };
}

export interface QuizResult {
  lessonAnswers: GradedAnswer[];
  reviewAnswers: GradedAnswer[];
  /** Offer a link back to the lesson (C3). */
  suggestReread: boolean;
  /** The milestone to celebrate now, if any (D3). */
  milestone: string | null;
  /** Sub-topics to offer when this lesson finished its topic (D8). */
  goDeeper: { id: string; name: string }[];
}

async function questionsFor(tx: Tx, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await tx`
    select id, cardinality(options) as option_count, correct_index, explanation
    from public.questions where id = any(${ids}::uuid[])`;
  return rows.map((r) => ({
    id: r.id as string,
    optionCount: r.option_count as number,
    correctIndex: r.correct_index as number,
    explanation: r.explanation as string,
  }));
}

async function loadReviewItem(tx: Tx, userId: string, questionId: string): Promise<ReviewItem | null> {
  const [r] = await tx`
    select question_id, step, due_on::text as due_on, last_correct from public.review_items
    where user_id = ${userId} and question_id = ${questionId}
    for update`;
  return r ? { questionId: r.question_id, step: r.step, dueOn: r.due_on, lastCorrect: r.last_correct } : null;
}

async function saveReviewItem(tx: Tx, userId: string, item: ReviewItem) {
  await tx`
    insert into public.review_items (user_id, question_id, step, due_on, last_correct)
    values (${userId}, ${item.questionId}, ${item.step}, ${item.dueOn}, ${item.lastCorrect})
    on conflict (user_id, question_id) do update
    set step = excluded.step, due_on = excluded.due_on, last_correct = excluded.last_correct`;
}

async function recordAnswers(tx: Tx, userId: string, context: "lesson" | "review" | "weekly", graded: GradedAnswer[], now: Date) {
  for (const a of graded) {
    await tx`
      insert into public.answers (user_id, question_id, context, chosen_index, correct, answered_at)
      values (${userId}, ${a.questionId}, ${context}, ${a.chosenIndex}, ${a.correct}, ${now})`;
  }
}

/**
 * Grades a lesson quiz plus its review questions, updates review, and works
 * out milestones. Each lesson's quiz can be submitted once.
 */
export async function submitQuiz(
  sql: Sql,
  userId: string,
  lessonId: string,
  answers: { lesson: SubmittedAnswer[]; review: SubmittedAnswer[] },
  now: Date,
): Promise<QuizResult> {
  return sql.begin(async (tx) => {
    const [d] = await tx`
      select d.id, d.quiz_completed_at, l.topic_id
      from public.deliveries d join public.lessons l on l.id = d.lesson_id
      where d.user_id = ${userId} and d.lesson_id = ${lessonId}
      for update of d`;
    if (!d) throw new QuizError("This lesson isn't in your inbox");
    if (d.quiz_completed_at) throw new QuizError("This quiz was already submitted");
    const { today, timeZone } = await learnerToday(tx, userId, now);

    // Lesson questions: every one must be answered.
    const lessonQs = await tx`select id from public.questions where lesson_id = ${lessonId}`;
    const lessonAnswers = gradeAnswers(await questionsFor(tx, lessonQs.map((q) => q.id)), answers.lesson);
    await recordAnswers(tx, userId, "lesson", lessonAnswers, now);
    for (const a of lessonAnswers) {
      const item = afterLessonAnswer(a.questionId, a.correct, await loadReviewItem(tx, userId, a.questionId), today);
      if (item) await saveReviewItem(tx, userId, item);
    }

    // Review questions: only ones that are due for this learner, at most REVIEW_PER_DAY.
    if (answers.review.length > REVIEW_PER_DAY) throw new QuizError("Too many review answers");
    const longMemory: string[] = [];
    const reviewAnswers: GradedAnswer[] = [];
    for (const submitted of answers.review) {
      const item = await loadReviewItem(tx, userId, submitted.questionId);
      if (!item || item.dueOn > today) throw new QuizError("That review question isn't due");
      const [graded] = gradeAnswers(await questionsFor(tx, [item.questionId]), [submitted]);
      if (graded!.correct && isLongMemory(item.step)) longMemory.push(item.questionId);
      await saveReviewItem(tx, userId, afterReviewAnswer(item, graded!.correct, today));
      reviewAnswers.push(graded!);
    }
    await recordAnswers(tx, userId, "review", reviewAnswers, now);
    await tx`update public.deliveries set quiz_completed_at = ${now} where id = ${d.id}`;

    // Progress in this lesson's topic, with and without this lesson, for level-ups and goals.
    const published = await tx`
      select id, level from public.lessons where topic_id = ${d.topic_id} and status = 'published'`;
    const read = await tx`
      select d.lesson_id from public.deliveries d join public.lessons l on l.id = d.lesson_id
      where d.user_id = ${userId} and l.topic_id = ${d.topic_id} and d.read_at is not null`;
    const readIds = new Set(read.map((r) => r.lesson_id as string));
    readIds.add(lessonId); // finishing the quiz means it was opened
    const before = new Set(readIds);
    before.delete(lessonId);
    const lessons = published.map((l) => ({ id: l.id as string, level: l.level as number }));
    const after = topicProgress(lessons, readIds);
    const was = topicProgress(lessons, before);

    const [counts] = await tx`
      select count(*)::int as total from public.deliveries
      where user_id = ${userId} and (read_at is not null or lesson_id = ${lessonId})`;
    const earnedRows = await tx`select kind, shown_at from public.milestones where user_id = ${userId}`;
    // At most one milestone shown per learner-local day.
    const shownToday = earnedRows.some((m) => m.shown_at && localDate(m.shown_at, timeZone) === today);

    const milestones = checkMilestones({
      lessonsRead: counts!.total,
      levelUps: after.level > was.level ? [{ topicId: d.topic_id, level: after.level }] : [],
      topicsFinished: after.finished && !was.finished ? [d.topic_id] : [],
      longMemoryQuestionIds: longMemory,
      earned: new Set(earnedRows.map((m) => m.kind as string)),
      shownToday,
    });
    for (const kind of milestones.newlyEarned) {
      await tx`
        insert into public.milestones (user_id, kind, achieved_at, shown_at)
        values (${userId}, ${kind}, ${now}, ${kind === milestones.show ? now : null})
        on conflict do nothing`;
    }

    let goDeeper: { id: string; name: string }[] = [];
    if (after.finished) {
      const children = await tx`
        select id, name, pickable from public.visible_topics where parent_id = ${d.topic_id} order by position, name`;
      const on = await tx`select topic_id from public.user_topics where user_id = ${userId} and interest > 0`;
      goDeeper = goDeeperSuggestions(
        true,
        children.map((c) => ({ id: c.id as string, name: c.name as string, pickable: c.pickable as boolean })),
        new Set(on.map((o) => o.topic_id as string)),
      ).map(({ id, name }) => ({ id, name }));
    }

    return {
      lessonAnswers,
      reviewAnswers,
      suggestReread: lessonAnswers.length > 0 && suggestReread(lessonAnswers),
      milestone: milestones.show,
      goDeeper,
    };
  });
}

/** The current weekly recap's questions, without answers, or null if there isn't an open one. */
export async function loadRecap(sql: Sql, userId: string) {
  const [r] = await sql`
    select id, question_ids from public.weekly_recaps
    where user_id = ${userId} and completed_at is null
    order by week_start desc limit 1`;
  if (!r) return null;
  const qs = await sql`select id, prompt, options from public.questions where id = any(${r.question_ids}::uuid[])`;
  const byId = new Map(qs.map((q) => [q.id as string, q]));
  return {
    recapId: r.id as string,
    questions: (r.question_ids as string[])
      .filter((id) => byId.has(id))
      .map((id) => ({ id, prompt: byId.get(id)!.prompt as string, options: byId.get(id)!.options as string[] })),
  };
}

/**
 * Grades a weekly recap (C7). Questions already in review move along their
 * schedule; a newly missed one goes into review, due tomorrow.
 */
export async function submitRecap(
  sql: Sql,
  userId: string,
  recapId: string,
  answers: SubmittedAnswer[],
  now: Date,
): Promise<GradedAnswer[]> {
  return sql.begin(async (tx) => {
    const [r] = await tx`
      select question_ids, completed_at from public.weekly_recaps
      where id = ${recapId} and user_id = ${userId}
      for update`;
    if (!r) throw new QuizError("No such recap");
    if (r.completed_at) throw new QuizError("This recap was already submitted");
    const { today } = await learnerToday(tx, userId, now);
    const graded = gradeAnswers(await questionsFor(tx, r.question_ids), answers);
    await recordAnswers(tx, userId, "weekly", graded, now);
    for (const a of graded) {
      const item = await loadReviewItem(tx, userId, a.questionId);
      const next = item ? afterReviewAnswer(item, a.correct, today) : afterLessonAnswer(a.questionId, a.correct, null, today);
      if (next) await saveReviewItem(tx, userId, next);
    }
    await tx`update public.weekly_recaps set completed_at = ${now} where id = ${recapId}`;
    return graded;
  });
}
