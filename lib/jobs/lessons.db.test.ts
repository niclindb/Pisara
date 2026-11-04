// Practice problems against a real Postgres database. Needs TEST_DATABASE_URL
// (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connect } from "./postgres-store";
import { loadPracticeProblems } from "./lessons";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const STARS = "20000000-0000-4000-8000-000000000001";
const L1 = "30000000-0000-4000-8000-000000000001"; // the free preview
const L2 = "30000000-0000-4000-8000-000000000002";

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com')`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name) values (${STARS}, ${CAT}, 'Stars')`;
  await sql`insert into public.lessons (id, topic_id, position, title, status) values
            (${L1}, ${STARS}, 1, 'One', 'published'), (${L2}, ${STARS}, 2, 'Two', 'published')`;
  await sql`insert into public.practice_problems (lesson_id, position, prompt, solution) values
            (${L2}, 2, 'Second', 'Solution 2'), (${L2}, 1, 'First', 'Solution 1')`;
}

describe.skipIf(!url)("practice problems on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("shows a delivered lesson's problems in order", async () => {
    expect(await loadPracticeProblems(sql, U, L2)).toBeNull();
    await sql`insert into public.deliveries (user_id, lesson_id, local_date) values (${U}, ${L2}, '2026-11-04')`;
    const problems = await loadPracticeProblems(sql, U, L2);
    expect(problems?.map((p) => [p.prompt, p.solution])).toEqual([
      ["First", "Solution 1"],
      ["Second", "Solution 2"],
    ]);
  });

  it("lets anyone open the preview, which may have no problems", async () => {
    expect(await loadPracticeProblems(sql, null, L1)).toEqual([]);
    expect(await loadPracticeProblems(sql, U, L1)).toEqual([]);
    expect(await loadPracticeProblems(sql, null, L2)).toBeNull();
  });
});
