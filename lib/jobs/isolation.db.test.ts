// Learners never see or change each other's data through the app's own
// loaders and actions. The server talks to the database as its owner, which
// skips the row-level access rules (those protect the public API and are
// checked in supabase/tests/rls_test.sql), so every query here has to filter
// by the signed-in learner itself. These tests check that it does: learner A
// has nothing, learner B has a bit of everything, and A must see none of B's.
// Add a check here whenever a new loader or action takes a userId.
// Needs TEST_DATABASE_URL (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getExtraLesson } from "./extra";
import { loadHistory, loadHome, openLessonPage, loadProgress } from "./learner";
import { connect } from "./postgres-store";
import { loadRecap, submitQuiz, submitRecap } from "./quiz";
import { deleteAccount, loadSettings } from "./settings";
import { loadTopicChoices, setTopicInterest } from "./topics";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const L = (n: number) => `30000000-0000-4000-8000-00000000000${n}`;
const Q = (n: number) => `40000000-0000-4000-8000-00000000000${n}`;
const RECAP = "50000000-0000-4000-8000-000000000001";
const now = new Date("2026-11-05T15:00:00Z");

/** Everything B has, to compare before and after A's calls. */
const bSnapshot = async () => ({
  deliveries: await sql`select lesson_id, read_at, quiz_completed_at from public.deliveries where user_id = ${B} order by lesson_id`,
  answers: await sql`select question_id, correct from public.answers where user_id = ${B} order by question_id`,
  review: await sql`select question_id, step, due_on::text from public.review_items where user_id = ${B}`,
  recaps: await sql`select id, completed_at from public.weekly_recaps where user_id = ${B}`,
  topics: await sql`select topic_id, interest from public.user_topics where user_id = ${B}`,
  profile: await sql`select email, display_name, emails_enabled from public.profiles where id = ${B}`,
});

describe.skipIf(!url)("learners can't see each other's data", () => {
  let before: Awaited<ReturnType<typeof bSnapshot>>;

  beforeAll(async () => {
    await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
    await sql`insert into auth.users (id, email) values (${A}, 'a@example.com'), (${B}, 'b@example.com')`;
    await sql`update public.profiles set display_name = 'Bea', time_zone = 'America/New_York' where id = ${B}`;
    await sql`update public.profiles set time_zone = 'America/New_York' where id = ${A}`;
    await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
    await sql`insert into public.topics (id, category_id, name) values (${STARS}, ${CAT}, 'Stars')`;
    for (const n of [1, 2, 3, 4]) {
      await sql`insert into public.lessons (id, topic_id, position, title, status) values (${L(n)}, ${STARS}, ${n}, ${`Lesson ${n}`}, 'published')`;
      await sql`insert into public.questions (id, lesson_id, position, prompt, options, correct_index, explanation)
                values (${Q(n)}, ${L(n)}, 1, ${`Question ${n}`}, '{"Yes","No"}', 0, 'Because.')`;
    }
    // B: Stars on, lessons 2 (read, quiz done) and 3 (unread), a missed answer
    // in review, an open recap and a milestone.
    await sql`insert into public.user_topics (user_id, topic_id, interest) values (${B}, ${STARS}, 5)`;
    await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at, read_at, quiz_completed_at)
              values (${B}, ${L(2)}, 'daily', '2026-11-03', ${now}, ${now}, ${now}),
                     (${B}, ${L(3)}, 'daily', '2026-11-04', ${now}, null, null)`;
    await sql`insert into public.answers (user_id, question_id, context, chosen_index, correct) values (${B}, ${Q(2)}, 'lesson', 1, false)`;
    await sql`insert into public.review_items (user_id, question_id, step, due_on) values (${B}, ${Q(2)}, 0, '2026-11-05')`;
    await sql`insert into public.weekly_recaps (id, user_id, week_start, question_ids) values (${RECAP}, ${B}, '2026-11-01', ${[Q(2)]})`;
    await sql`insert into public.milestones (user_id, kind) values (${B}, 'lessons_1')`;
    before = await bSnapshot();
  });
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("Home shows A nothing of B's", async () => {
    const home = (await loadHome(sql, A, now))!;
    expect(home.waiting).toEqual([]);
    expect(home.recap).toBeNull();
    expect(home.noTopicsOn).toBe(true);
  });

  it("A can't open a lesson delivered only to B, and B's copy stays unread", async () => {
    expect(await openLessonPage(sql, A, L(3), now)).toBeNull();
    expect(await openLessonPage(sql, A, L(2), now)).toBeNull();
  });

  it("history, progress, recap and settings are A's own", async () => {
    expect((await loadHistory(sql, A)).items).toEqual([]);
    const progress = (await loadProgress(sql, A, now))!;
    expect(progress.lessonsRead).toBe(0);
    expect(progress.milestones).toEqual([]);
    expect(progress.reviewRemembered).toBeNull();
    expect(await loadRecap(sql, A)).toBeNull();
    expect(await loadSettings(sql, A, now)).toMatchObject({ email: "a@example.com", displayName: null });
  });

  it("topic choices show A's interest, not B's", async () => {
    const stars = (await loadTopicChoices(sql, A)).topics.find((t) => t.id === STARS);
    expect(stars?.interest ?? 0).toBe(0);
  });

  it("A can't submit B's quiz or B's recap", async () => {
    await expect(submitQuiz(sql, A, L(3), { lesson: [{ questionId: Q(3), chosenIndex: 0 }], review: [] }, now)).rejects.toThrow();
    await expect(submitRecap(sql, A, RECAP, [{ questionId: Q(2), chosenIndex: 0 }], now)).rejects.toThrow();
  });

  it("A's own actions leave B's data exactly as it was", async () => {
    await setTopicInterest(sql, A, STARS, 2);
    expect(await getExtraLesson(sql, A, now, { topicId: STARS })).toMatchObject({ ok: true });
    expect(await deleteAccount(sql, A)).toBe(true);
    expect(await bSnapshot()).toEqual(before);
  });
});
