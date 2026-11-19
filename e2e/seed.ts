// Fills the page-test database with a small, known world: an author, a learner
// with lessons waiting, a recap and a milestone, a brand-new learner, one topic
// with three published lessons, and one more topic Home can suggest. Runs before the page tests. Deletes everything in that database.

import postgres from "postgres";

export const IDS = {
  author: "00000000-0000-4000-8000-0000000000aa",
  learner: "00000000-0000-4000-8000-0000000000bb",
  newcomer: "00000000-0000-4000-8000-0000000000cc",
  category: "10000000-0000-4000-8000-000000000001",
  astronomy: "20000000-0000-4000-8000-000000000001",
  stars: "20000000-0000-4000-8000-000000000002",
  planets: "20000000-0000-4000-8000-000000000003",
  lessons: [1, 2, 3].map((n) => `30000000-0000-4000-8000-00000000000${n}`),
  questions: [1, 2, 3].map((n) => `40000000-0000-4000-8000-00000000000${n}`),
  recap: "50000000-0000-4000-8000-000000000001",
};

export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("Set E2E_DATABASE_URL to a database with the schema loaded. Its data is replaced.");
  return url;
}

export default async function seed() {
  const sql = postgres(e2eDatabaseUrl(), { prepare: false, onnotice: () => {} });
  try {
    await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
    await sql`insert into auth.users (id, email) values
      (${IDS.author}, 'author@example.com'), (${IDS.learner}, 'learner@example.com'), (${IDS.newcomer}, 'new@example.com')`;
    await sql`update public.profiles set role = 'author' where id = ${IDS.author}`;
    await sql`update public.profiles set display_name = 'Sam', time_zone = 'America/New_York' where id = ${IDS.learner}`;
    await sql`insert into public.categories (id, name) values (${IDS.category}, 'Science')`;
    await sql`insert into public.topics (id, category_id, name, goal, description)
      values (${IDS.astronomy}, ${IDS.category}, 'Astronomy', 'Read the night sky', 'Stars, planets and how we know.')`;
    await sql`insert into public.topics (id, parent_id, name, goal) values (${IDS.stars}, ${IDS.astronomy}, 'Stars', 'Know a star''s life')`;
    const titles = ["How stars form", "The main sequence", "How stars end"];
    for (const [i, id] of IDS.lessons.entries()) {
      await sql`insert into public.lessons (id, topic_id, position, level, title, body, reading_minutes, status)
        values (${id}, ${IDS.stars}, ${i + 1}, ${Math.min(i + 1, 3)}, ${titles[i]!},
                ${"Clouds of **gas** collapse under gravity.\n\n## Why it matters\n\n- Heat\n- Light"}, 3, 'published')`;
      await sql`insert into public.questions (id, lesson_id, prompt, options, correct_index, explanation)
        values (${IDS.questions[i]!}, ${id}, ${`What pulls the gas in? (${i + 1})`}, ${["Gravity", "Magnetism"]}, 0, 'Gravity pulls it together.')`;
      await sql`insert into public.practice_problems (lesson_id, prompt, solution) values (${id}, 'Why does it heat up?', 'Squeezing gas heats it.')`;
    }
    await sql`insert into public.topics (id, category_id, position, name, goal, description)
      values (${IDS.planets}, ${IDS.category}, 2, 'Planets', 'Tell the planets apart', 'What each planet is made of, and why.')`;
    for (const n of [1, 2, 3]) {
      await sql`insert into public.lessons (topic_id, position, level, title, body, reading_minutes, status)
        values (${IDS.planets}, ${n}, 1, ${`Planets ${n}`}, 'Rock and gas.', 3, 'published')`;
    }
    await sql`insert into public.user_topics (user_id, topic_id, interest) values (${IDS.learner}, ${IDS.stars}, 3)`;
    await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at, read_at)
      values (${IDS.learner}, ${IDS.lessons[0]!}, 'daily', '2026-11-03', '2026-11-03T13:00:00Z', '2026-11-03T14:00:00Z'),
             (${IDS.learner}, ${IDS.lessons[1]!}, 'daily', '2026-11-04', '2026-11-04T13:00:00Z', null)`;
    await sql`insert into public.milestones (user_id, kind, achieved_at) values (${IDS.learner}, 'lessons_1', '2026-11-03T14:05:00Z')`;
    await sql`insert into public.weekly_recaps (id, user_id, week_start, question_ids)
      values (${IDS.recap}, ${IDS.learner}, '2026-10-26', ${[IDS.questions[0]!]})`;
  } finally {
    await sql.end();
  }
}
