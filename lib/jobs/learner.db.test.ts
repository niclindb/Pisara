// Learner page data against a real Postgres database. Needs TEST_DATABASE_URL
// (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { gradePreviewQuiz, loadHistory, loadHome, loadProgress, openLessonPage } from "./learner";
import { connect } from "./postgres-store";
import { submitQuiz } from "./quiz";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const HOLES = "20000000-0000-4000-8000-000000000002"; // under Stars
const L = (t: number, n: number) => `3000000${t}-0000-4000-8000-00000000000${n}`;
const Q = (t: number, n: number) => `4000000${t}-0000-4000-8000-00000000000${n}`;
const at = (iso: string) => new Date(iso);

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com')`;
  await sql`update public.profiles set display_name = 'Nick', time_zone = 'Europe/Helsinki'`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name, goal) values (${STARS}, ${CAT}, 'Stars', 'Know a star''s life')`;
  await sql`insert into public.topics (id, parent_id, name) values (${HOLES}, ${STARS}, 'Black holes')`;
  for (const [t, topic] of [[1, STARS], [2, HOLES]] as const) {
    for (const n of [1, 2, 3]) {
      await sql`insert into public.lessons (id, topic_id, position, level, title, body, reading_minutes, status)
                values (${L(t, n)}, ${topic}, ${n}, ${n === 3 ? 2 : 1}, ${`Lesson ${t}.${n}`}, 'Body', 2, 'published')`;
      await sql`insert into public.questions (id, lesson_id, prompt, options, correct_index, explanation)
                values (${Q(t, n)}, ${L(t, n)}, ${`Question ${t}.${n}`}, ${["right", "wrong"]}, 0, 'Because.')`;
    }
  }
  await sql`insert into public.practice_problems (lesson_id, prompt, solution) values (${L(1, 1)}, 'Try it', 'Like this')`;
  await sql`insert into public.user_topics (user_id, topic_id, interest) values (${U}, ${STARS}, 3)`;
}

async function deliver(lessonId: string, date: string, kind: "daily" | "extra" = "daily") {
  await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at)
            values (${U}, ${lessonId}, ${kind}, ${date}, ${`${date}T11:00:00Z`})`;
}

describe.skipIf(!url)("learner pages on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("shows Home: waiting lessons newest first, then caught up, paused, or all finished", async () => {
    const now = at("2026-11-04T12:00:00Z");
    expect(await loadHome(sql, U, now)).toMatchObject({ state: "caught_up", waiting: [], displayName: "Nick", noTopicsOn: false });

    await deliver(L(1, 1), "2026-11-03");
    await deliver(L(1, 2), "2026-11-04");
    const home = (await loadHome(sql, U, now))!;
    expect(home.state).toBe("waiting");
    expect(home.waiting.map((w) => [w.title, w.topicName, w.readingMinutes, w.deliveredOn])).toEqual([
      ["Lesson 1.2", "Stars", 2, "2026-11-04"],
      ["Lesson 1.1", "Stars", 2, "2026-11-03"],
    ]);

    await sql`update public.deliveries set read_at = now()`;
    await sql`update public.profiles set paused_until = '2026-11-10'`;
    expect(await loadHome(sql, U, now)).toMatchObject({ state: "paused", pausedUntil: "2026-11-10" });

    await sql`update public.profiles set paused_until = null`;
    await deliver(L(1, 3), "2026-11-05", "extra");
    await sql`update public.deliveries set read_at = now()`;
    expect((await loadHome(sql, U, now))!.state).toBe("all_finished");

    await sql`insert into public.weekly_recaps (user_id, week_start, question_ids) values (${U}, '2026-11-01', ${[Q(1, 1), Q(1, 2)]}::uuid[])`;
    expect((await loadHome(sql, U, now))!.recap).toMatchObject({ questionCount: 2 });
  });

  it("opens a delivered lesson and marks it read, but never one from further along the path", async () => {
    const now = at("2026-11-04T12:00:00Z");
    expect(await openLessonPage(sql, U, L(1, 2), now)).toBeNull();
    await deliver(L(1, 2), "2026-11-04");
    const page = (await openLessonPage(sql, U, L(1, 2), now))!;
    expect(page).toMatchObject({ title: "Lesson 1.2", preview: false, topic: { name: "Stars" }, problems: [] });
    expect(page.quiz?.lessonQuestions.map((q) => q.prompt)).toEqual(["Question 1.2"]);
    expect(await sql`select read_at is not null as read from public.deliveries`).toEqual([{ read: true }]);
  });

  it("lets visitors read and try the preview quiz without saving anything", async () => {
    const page = (await openLessonPage(sql, null, L(1, 1), at("2026-11-04T12:00:00Z")))!;
    expect(page).toMatchObject({ preview: true, problems: [{ prompt: "Try it", solution: "Like this" }] });
    expect(JSON.stringify(page.quiz)).not.toContain("correct");
    const graded = await gradePreviewQuiz(sql, L(1, 1), [{ questionId: Q(1, 1), chosenIndex: 1 }]);
    expect(graded.answers[0]).toMatchObject({ correct: false, correctIndex: 0, explanation: "Because." });
    expect(await sql`select * from public.answers`).toHaveLength(0);
    await expect(gradePreviewQuiz(sql, L(1, 2), [])).rejects.toThrow("isn't a preview");
  });

  it("lists history newest first with quiz scores, a page at a time", async () => {
    for (const [n, date] of [[1, "2026-11-01"], [2, "2026-11-02"], [3, "2026-11-03"]] as const) {
      await deliver(L(1, n), date);
      await openLessonPage(sql, U, L(1, n), at(`${date}T12:00:00Z`));
    }
    await submitQuiz(sql, U, L(1, 3), { lesson: [{ questionId: Q(1, 3), chosenIndex: 0 }], review: [] }, at("2026-11-03T12:05:00Z"));

    const first = await loadHistory(sql, U, { limit: 2 });
    expect(first.items.map((i) => [i.title, i.quiz])).toEqual([
      ["Lesson 1.3", { correct: 1, total: 1 }],
      ["Lesson 1.2", null],
    ]);
    const second = await loadHistory(sql, U, { limit: 2, before: first.cursor! });
    expect(second).toMatchObject({ items: [{ title: "Lesson 1.1", readOn: "2026-11-01" }], cursor: null });
    expect((await loadHistory(sql, U, { topicId: HOLES })).items).toEqual([]);
  });

  it("shows progress, Go deeper and how many review questions were remembered", async () => {
    for (const [n, date] of [[1, "2026-11-01"], [2, "2026-11-02"], [3, "2026-11-03"]] as const) {
      await deliver(L(1, n), date);
      await openLessonPage(sql, U, L(1, n), at(`${date}T12:00:00Z`));
    }
    await sql`insert into public.answers (user_id, question_id, context, chosen_index, correct, answered_at) values
              (${U}, ${Q(1, 1)}, 'review', 0, true, '2026-11-03T12:00:00Z'),
              (${U}, ${Q(1, 2)}, 'weekly', 1, false, '2026-11-03T12:00:00Z'),
              (${U}, ${Q(1, 3)}, 'review', 0, true, '2026-09-01T12:00:00Z')`;
    const progress = (await loadProgress(sql, U, at("2026-11-04T12:00:00Z")))!;
    expect(progress.lessonsRead).toBe(3);
    expect(progress.topics).toEqual([
      {
        id: STARS,
        name: "Stars",
        goal: "Know a star's life",
        parentId: null,
        interest: 3,
        progress: { read: 3, total: 3, level: 2, finished: true },
        goDeeper: [{ id: HOLES, name: "Black holes" }],
      },
    ]);
    expect(progress.reviewRemembered).toEqual({ correct: 1, total: 2 });
  });
});
