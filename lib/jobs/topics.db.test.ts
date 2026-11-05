// Topic choices and onboarding against a real Postgres database. Needs
// TEST_DATABASE_URL (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connect } from "./postgres-store";
import { ChoiceError, completeOnboarding, loadTopicChoices, setTopicInterest } from "./topics";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const HOLES = "20000000-0000-4000-8000-000000000002"; // under Stars
const ROME = "20000000-0000-4000-8000-000000000003"; // only 1 lesson: not shown yet
const L = (t: number, n: number) => `3000000${t}-0000-4000-8000-00000000000${n}`;

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com')`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name, goal) values (${STARS}, ${CAT}, 'Stars', 'Know a star''s life'), (${ROME}, ${CAT}, 'Rome', '')`;
  await sql`insert into public.topics (id, parent_id, name) values (${HOLES}, ${STARS}, 'Black holes')`;
  for (const [t, topic, count] of [[1, STARS, 3], [2, HOLES, 3], [3, ROME, 1]] as const) {
    for (let n = 1; n <= count; n++) {
      await sql`insert into public.lessons (id, topic_id, position, level, title, status)
                values (${L(t, n)}, ${topic}, ${n}, ${n === 3 ? 2 : 1}, ${`Lesson ${t}.${n}`}, 'published')`;
    }
  }
}

const rejects = async (p: Promise<unknown>, message: string) => {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(ChoiceError);
  expect(err.message).toBe(message);
};

describe.skipIf(!url)("topic choices on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("lists visible topics in tree order, for visitors too", async () => {
    const choices = await loadTopicChoices(sql, null);
    expect(choices.categories).toEqual([{ id: CAT, name: "Science" }]);
    expect(choices.topics.map((t) => [t.name, t.categoryId === CAT, t.lessonCount, t.interest, t.progress])).toEqual([
      ["Stars", true, 3, 0, null],
      ["Black holes", true, 3, 0, null],
    ]);
    expect(choices.topics[1]!.prerequisiteNote).toBe("This builds on Stars, which you haven't finished.");
    expect(choices.topics.map((t) => t.depth)).toEqual([0, 1]);
  });

  it("finishes onboarding only with a topic turned on", async () => {
    await rejects(completeOnboarding(sql, U, { topics: [], timeZone: "Europe/Helsinki" }), "Turn on at least one topic.");
    await rejects(completeOnboarding(sql, U, { topics: [{ topicId: ROME, interest: 3 }], timeZone: "UTC" }), "That topic isn't available yet.");

    await completeOnboarding(sql, U, {
      topics: [{ topicId: STARS, interest: 3 }, { topicId: HOLES, interest: 5 }],
      timeZone: "Europe/Helsinki",
      weeklyRecapDay: 6,
      displayName: "  Nick ",
    });
    expect(await sql`select time_zone, weekly_recap_day, display_name from public.profiles`).toEqual([
      { time_zone: "Europe/Helsinki", weekly_recap_day: 6, display_name: "Nick" },
    ]);
    const choices = await loadTopicChoices(sql, U);
    expect(choices.topics.map((t) => [t.name, t.interest, t.progress?.read])).toEqual([
      ["Stars", 3, 0],
      ["Black holes", 5, 0],
    ]);
  });

  it("turns topics on and off, with the prerequisite note only when it matters", async () => {
    expect(await setTopicInterest(sql, U, HOLES, 3)).toEqual({ note: "This builds on Stars, which you haven't finished." });
    expect(await setTopicInterest(sql, U, HOLES, 4)).toEqual({ note: null }); // already on
    expect(await setTopicInterest(sql, U, HOLES, 0)).toEqual({ note: null });
    await rejects(setTopicInterest(sql, U, ROME, 2), "That topic isn't available yet.");
    await rejects(setTopicInterest(sql, U, STARS, 9), "Interest goes from Off to 5.");

    for (const n of [1, 2, 3]) {
      await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, read_at)
                values (${U}, ${L(1, n)}, 'extra', '2026-11-04', now())`;
    }
    expect(await setTopicInterest(sql, U, HOLES, 3)).toEqual({ note: null }); // Stars is finished
    const stars = (await loadTopicChoices(sql, U)).topics[0]!;
    expect(stars.progress).toEqual({ read: 3, total: 3, level: 2, finished: true });
  });
});
