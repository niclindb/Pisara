// Quiz grading against a real Postgres database. Needs TEST_DATABASE_URL
// (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connect } from "./postgres-store";
import { loadQuiz, loadRecap, QuizError, submitQuiz, submitRecap } from "./quiz";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const HOLES = "20000000-0000-4000-8000-000000000002"; // sub-topic of Stars
const ROME = "20000000-0000-4000-8000-000000000003";
const L = (t: number, n: number) => `3000000${t}-0000-4000-8000-00000000000${n}`;
const Q = (t: number, n: number) => `4000000${t}-0000-4000-8000-00000000000${n}`; // one question per lesson, answer 0

const at = (iso: string) => new Date(iso);

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons, public.questions cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com')`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name) values (${STARS}, ${CAT}, 'Stars'), (${ROME}, ${CAT}, 'Rome')`;
  await sql`insert into public.topics (id, parent_id, name) values (${HOLES}, ${STARS}, 'Black holes')`;
  for (const [t, topic] of [[1, STARS], [2, HOLES], [3, ROME]] as const) {
    for (const n of [1, 2, 3]) {
      await sql`insert into public.lessons (id, topic_id, position, level, title, status)
                values (${L(t, n)}, ${topic}, ${n}, ${n === 3 ? 2 : 1}, ${`Lesson ${t}.${n}`}, 'published')`;
      await sql`insert into public.questions (id, lesson_id, prompt, options, correct_index, explanation)
                values (${Q(t, n)}, ${L(t, n)}, ${`Question ${t}.${n}`}, ${["right", "wrong"]}, 0, 'Because.')`;
    }
  }
  await sql`insert into public.user_topics (user_id, topic_id, interest) values (${U}, ${STARS}, 3), (${U}, ${ROME}, 3)`;
}

/** A delivered, read lesson. A second one on the same date is an "extra" lesson (B7). */
async function deliver(lessonId: string, date: string, kind: "daily" | "extra" = "daily") {
  await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at, read_at)
            values (${U}, ${lessonId}, ${kind}, ${date}, ${`${date}T11:00:00Z`}, ${`${date}T12:00:00Z`})`;
}

const right = (id: string) => ({ questionId: id, chosenIndex: 0 });
const wrong = (id: string) => ({ questionId: id, chosenIndex: 1 });

describe.skipIf(!url)("quiz on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("only shows the quiz for a lesson in your inbox, without the answers", async () => {
    expect(await loadQuiz(sql, U, L(1, 1), at("2026-11-02T12:00:00Z"))).toBeNull();
    await deliver(L(1, 1), "2026-11-02");
    const quiz = await loadQuiz(sql, U, L(1, 1), at("2026-11-02T12:00:00Z"));
    expect(quiz).toEqual({
      lessonQuestions: [{ id: Q(1, 1), prompt: "Question 1.1", options: ["right", "wrong"] }],
      reviewQuestions: [],
      completed: false,
    });
    expect(JSON.stringify(quiz)).not.toContain("correct");
  });

  it("grades, records answers, puts only missed questions into review, and celebrates the first lesson", async () => {
    await deliver(L(1, 1), "2026-11-02");
    const result = await submitQuiz(sql, U, L(1, 1), { lesson: [wrong(Q(1, 1))], review: [] }, at("2026-11-02T12:05:00Z"));
    expect(result.lessonAnswers).toEqual([
      { questionId: Q(1, 1), chosenIndex: 1, correct: false, correctIndex: 0, explanation: "Because." },
    ]);
    expect(result.suggestReread).toBe(true);
    expect(result.milestone).toBe("lessons_1");
    expect(await sql`select step, due_on::text as due from public.review_items`).toEqual([{ step: 0, due: "2026-11-03" }]);
    expect(await sql`select context, correct from public.answers`).toEqual([{ context: "lesson", correct: false }]);

    await deliver(L(3, 1), "2026-11-03");
    await submitQuiz(sql, U, L(3, 1), { lesson: [right(Q(3, 1))], review: [] }, at("2026-11-03T12:05:00Z"));
    // The right answer didn't enter review.
    expect(await sql`select question_id from public.review_items`).toEqual([{ question_id: Q(1, 1) }]);
  });

  it("accepts each quiz once, and saves nothing from an invalid submission", async () => {
    await deliver(L(1, 1), "2026-11-02");
    await expect(submitQuiz(sql, U, L(1, 1), { lesson: [], review: [] }, at("2026-11-02T12:05:00Z"))).rejects.toThrow(QuizError);
    expect(await sql`select 1 from public.answers`).toHaveLength(0);
    await submitQuiz(sql, U, L(1, 1), { lesson: [right(Q(1, 1))], review: [] }, at("2026-11-02T12:05:00Z"));
    await expect(
      submitQuiz(sql, U, L(1, 1), { lesson: [right(Q(1, 1))], review: [] }, at("2026-11-02T12:06:00Z")),
    ).rejects.toThrow("already submitted");
    await expect(
      submitQuiz(sql, U, L(1, 2), { lesson: [right(Q(1, 2))], review: [] }, at("2026-11-02T12:06:00Z")),
    ).rejects.toThrow("isn't in your inbox");
  });

  it("brings missed questions back the next day, from another topic first, and moves them along", async () => {
    await deliver(L(1, 1), "2026-11-02");
    await submitQuiz(sql, U, L(1, 1), { lesson: [wrong(Q(1, 1))], review: [] }, at("2026-11-02T12:05:00Z"));
    await deliver(L(3, 1), "2026-11-03");
    const quiz = await loadQuiz(sql, U, L(3, 1), at("2026-11-03T12:00:00Z"));
    expect(quiz!.reviewQuestions).toEqual([{ id: Q(1, 1), prompt: "Question 1.1", options: ["right", "wrong"], reviewTopic: "Stars" }]);

    const result = await submitQuiz(
      sql,
      U,
      L(3, 1),
      { lesson: [right(Q(3, 1))], review: [right(Q(1, 1))] },
      at("2026-11-03T12:05:00Z"),
    );
    expect(result.reviewAnswers[0]!.correct).toBe(true);
    expect(await sql`select step, due_on::text as due from public.review_items`).toEqual([{ step: 1, due: "2026-11-06" }]);
    expect((await sql`select context from public.answers order by answered_at, context`).map((r) => r.context)).toEqual([
      "lesson",
      "lesson",
      "review",
    ]);
  });

  it("refuses review answers for questions that aren't due", async () => {
    await deliver(L(1, 1), "2026-11-02");
    await submitQuiz(sql, U, L(1, 1), { lesson: [wrong(Q(1, 1))], review: [] }, at("2026-11-02T12:05:00Z"));
    await deliver(L(3, 1), "2026-11-02", "extra");
    await expect(
      submitQuiz(sql, U, L(3, 1), { lesson: [right(Q(3, 1))], review: [right(Q(1, 1))] }, at("2026-11-02T13:00:00Z")),
    ).rejects.toThrow("isn't due");
  });

  it("celebrates a question remembered after 21+ days", async () => {
    await deliver(L(1, 1), "2026-09-01");
    await sql`insert into public.review_items (user_id, question_id, step, due_on) values (${U}, ${Q(1, 1)}, 3, '2026-11-02')`;
    await sql`insert into public.milestones (user_id, kind) values (${U}, 'lessons_1')`;
    await deliver(L(3, 1), "2026-11-02");
    const result = await submitQuiz(sql, U, L(3, 1), { lesson: [right(Q(3, 1))], review: [right(Q(1, 1))] }, at("2026-11-02T12:05:00Z"));
    expect(result.milestone).toBe(`long_memory:${Q(1, 1)}`);
  });

  it("celebrates finishing a topic, offers its sub-topics, and shows only one milestone a day", async () => {
    await sql`insert into public.milestones (user_id, kind) values (${U}, 'lessons_1')`;
    await deliver(L(1, 1), "2026-11-01");
    await deliver(L(1, 2), "2026-11-02");
    await deliver(L(1, 3), "2026-11-03");
    const result = await submitQuiz(sql, U, L(1, 3), { lesson: [right(Q(1, 3))], review: [] }, at("2026-11-03T12:05:00Z"));
    expect(result.milestone).toBe(`topic_goal:${STARS}`);
    expect(result.goDeeper).toEqual([{ id: HOLES, name: "Black holes" }]);
    const earned = (await sql`select kind, shown_at is not null as shown from public.milestones order by kind`).map((m) => [m.kind, m.shown]);
    expect(earned).toContainEqual([`level_up:${STARS}:2`, false]);
    expect(earned).toContainEqual([`topic_goal:${STARS}`, true]);

    // A second quiz the same day can earn milestones but doesn't show one.
    await sql`update public.lessons set level = 2 where id = ${L(3, 1)}`;
    await deliver(L(3, 1), "2026-11-03", "extra");
    const second = await submitQuiz(sql, U, L(3, 1), { lesson: [right(Q(3, 1))], review: [] }, at("2026-11-03T12:15:00Z"));
    expect(second.milestone).toBeNull();
    const [rome] = await sql`select shown_at from public.milestones where kind = ${`level_up:${ROME}:2`}`;
    expect(rome).toEqual({ shown_at: null }); // earned, not shown
  });

  it("works for a lesson with no quiz questions", async () => {
    await sql`delete from public.questions where lesson_id = ${L(1, 1)}`;
    await deliver(L(1, 1), "2026-11-02");
    expect((await loadQuiz(sql, U, L(1, 1), at("2026-11-02T12:00:00Z")))!.lessonQuestions).toEqual([]);
    const result = await submitQuiz(sql, U, L(1, 1), { lesson: [], review: [] }, at("2026-11-02T12:05:00Z"));
    expect(result.suggestReread).toBe(false);
  });

  it("grades the weekly recap: moves review items along and adds newly missed questions", async () => {
    await sql`insert into public.review_items (user_id, question_id, step, due_on) values (${U}, ${Q(1, 1)}, 0, '2026-11-08')`;
    const [recap] = await sql`insert into public.weekly_recaps (user_id, week_start, question_ids)
                              values (${U}, '2026-11-02', ${[Q(1, 1), Q(1, 2)]}::uuid[]) returning id`;
    const loaded = await loadRecap(sql, U);
    expect(loaded!.questions.map((q) => q.id)).toEqual([Q(1, 1), Q(1, 2)]);
    await submitRecap(sql, U, recap!.id, [right(Q(1, 1)), wrong(Q(1, 2))], at("2026-11-08T12:00:00Z"));
    const items = await sql`select question_id, step, due_on::text as due from public.review_items order by question_id`;
    expect(items).toEqual([
      { question_id: Q(1, 1), step: 1, due: "2026-11-11" },
      { question_id: Q(1, 2), step: 0, due: "2026-11-09" },
    ]);
    expect(await loadRecap(sql, U)).toBeNull();
    await expect(submitRecap(sql, U, recap!.id, [right(Q(1, 1)), right(Q(1, 2))], at("2026-11-08T12:01:00Z"))).rejects.toThrow(
      "already submitted",
    );
  });
});
