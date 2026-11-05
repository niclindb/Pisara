// Extra and first lessons against a real Postgres database. Needs
// TEST_DATABASE_URL (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deliverFirstLesson, getExtraLesson } from "./extra";
import { connect } from "./postgres-store";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const ROME = "20000000-0000-4000-8000-000000000002";
const DRAFTY = "20000000-0000-4000-8000-000000000003"; // only 1 published lesson
const L = (t: number, n: number) => `3000000${t}-0000-4000-8000-00000000000${n}`;
const now = new Date("2026-11-04T12:00:00Z");

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com')`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name) values (${STARS}, ${CAT}, 'Stars'), (${ROME}, ${CAT}, 'Rome'), (${DRAFTY}, ${CAT}, 'Drafty')`;
  for (const [t, topic, count] of [[1, STARS, 3], [2, ROME, 3], [3, DRAFTY, 1]] as const) {
    for (let n = 1; n <= count; n++) {
      await sql`insert into public.lessons (id, topic_id, position, title, status)
                values (${L(t, n)}, ${topic}, ${n}, ${`Lesson ${t}.${n}`}, 'published')`;
    }
  }
  await sql`insert into public.user_topics (user_id, topic_id, interest) values (${U}, ${STARS}, 3)`;
}

const deliveries = () => sql`select lesson_id, kind, local_date::text as date from public.deliveries order by delivered_at, lesson_id`;

describe.skipIf(!url)("extra lessons on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("gives the first lesson right after onboarding, as today's daily lesson, only once", async () => {
    expect(await deliverFirstLesson(sql, U, now, () => 0)).toBe(L(1, 1));
    expect(await deliverFirstLesson(sql, U, now, () => 0)).toBeNull();
    expect(await deliveries()).toEqual([{ lesson_id: L(1, 1), kind: "daily", date: "2026-11-04" }]);
  });

  it("starts the next lesson in a picked topic, even one that isn't turned on", async () => {
    expect(await getExtraLesson(sql, U, now, { topicId: DRAFTY })).toEqual({ ok: false, reason: "topic_unavailable" });
    expect(await getExtraLesson(sql, U, now, { topicId: ROME })).toEqual({ ok: true, lessonId: L(2, 1), topicId: ROME });
    expect(await getExtraLesson(sql, U, now, { topicId: ROME })).toMatchObject({ lessonId: L(2, 2) });
    expect((await deliveries()).map((d) => d.kind)).toEqual(["extra", "extra"]);
  });

  it("allows 2 extra lessons a day, even when each is read straight away", async () => {
    expect(await getExtraLesson(sql, U, now, { topicId: ROME })).toMatchObject({ ok: true, lessonId: L(2, 1) });
    await sql`update public.deliveries set read_at = now()`;
    expect(await getExtraLesson(sql, U, now)).toMatchObject({ ok: true });
    await sql`update public.deliveries set read_at = now()`;
    expect(await getExtraLesson(sql, U, now, { topicId: ROME })).toEqual({ ok: false, reason: "daily_limit" });
    expect(await getExtraLesson(sql, U, now)).toEqual({ ok: false, reason: "daily_limit" });
    // A new local day brings 2 more.
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    expect(await getExtraLesson(sql, U, tomorrow, { topicId: ROME })).toMatchObject({ ok: true });
  });

  it("surprises from turned-on topics, and stops when 3 lessons are waiting", async () => {
    expect(await getExtraLesson(sql, U, now)).toMatchObject({ ok: true, topicId: STARS, lessonId: L(1, 1) });
    await getExtraLesson(sql, U, now);
    // The daily lesson fills the third spot.
    await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at)
              values (${U}, ${L(1, 3)}, 'daily', '2026-11-04', now())`;
    expect(await getExtraLesson(sql, U, now)).toEqual({ ok: false, reason: "inbox_full" });

    await sql`update public.deliveries set read_at = now()`;
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    expect(await getExtraLesson(sql, U, tomorrow)).toEqual({ ok: false, reason: "nothing_left" });
    expect(await getExtraLesson(sql, U, tomorrow, { topicId: STARS })).toEqual({ ok: false, reason: "topic_finished" });
  });
});
