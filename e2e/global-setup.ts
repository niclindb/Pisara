// Fills the page-check database with sample content before the run. The
// schema must already be loaded (supabase/tests/load_schema.sh).

import postgres from "postgres";
import { AUTHOR, BLACK_HOLES, CATEGORY, DATABASE_URL, LEARNER, NEWCOMER, RECAP, STARS, lesson, question } from "./fixtures";

export default async function globalSetup() {
  const sql = postgres(DATABASE_URL, { onnotice: () => {} });
  try {
    await sql`truncate auth.users, public.categories, public.topics, public.lessons, public.job_runs cascade`;
    await sql`insert into auth.users (id, email) values
      (${AUTHOR}, 'author@example.com'), (${LEARNER}, 'learner@example.com'), (${NEWCOMER}, 'new@example.com')`;
    await sql`update public.profiles set role = 'author', display_name = 'Nick' where id = ${AUTHOR}`;
    await sql`update public.profiles set display_name = 'Sam', time_zone = 'America/New_York' where id = ${LEARNER}`;
    await sql`insert into public.categories (id, name) values (${CATEGORY}, 'Science')`;
    await sql`insert into public.topics (id, category_id, parent_id, name, goal, description, outline) values
      (${STARS}, ${CATEGORY}, null, 'Stars', 'Understand the life cycle of a star', 'How stars are born, live and die.', '1. Main sequence\n2. Red giants'),
      (${BLACK_HOLES}, null, ${STARS}, 'Black holes', 'Know what a black hole is', 'What is left after the biggest stars.', '')`;
    const lessons: [number, string, number, string][] = [
      [1, STARS, 1, "Main sequence"],
      [2, STARS, 1, "Red giants"],
      [3, STARS, 2, "White dwarfs"],
      [4, STARS, 3, "Neutron stars"],
      [5, BLACK_HOLES, 1, "Event horizons"],
      [6, BLACK_HOLES, 2, "Hawking radiation"],
      [7, BLACK_HOLES, 3, "Spaghettification"],
    ];
    for (const [n, topic, level, title] of lessons) {
      await sql`insert into public.lessons (id, topic_id, position, level, title, body, reading_minutes, status, published_at)
        values (${lesson(n)}, ${topic}, ${n}, ${level}, ${title},
                ${`## Why it matters\n\nClouds of **gas** collapse under gravity and heat up.\n\n- gravity\n- time\n\n[Read more](https://example.com/stars)`},
                2, 'published', now())`;
      await sql`insert into public.questions (id, lesson_id, position, prompt, options, correct_index, explanation)
        values (${question(n)}, ${lesson(n)}, 1, ${`What happens in ${title}?`}, ${["Gas collapses", "Planets form", "Nothing"]}, 0, 'Gravity pulls gas in.')`;
    }
    await sql`insert into public.practice_problems (lesson_id, position, prompt, solution)
      values (${lesson(1)}, 1, 'Why does the cloud heat up?', 'Falling gas turns gravity into heat.'),
             (${lesson(2)}, 1, 'Why does the star swell?', 'The core shrinks and the outer layers expand.')`;

    await sql`insert into public.user_topics (user_id, topic_id, interest) values (${LEARNER}, ${STARS}, 3)`;
    // Lesson 2 read with its quiz missed (so it's in review), lessons 1 and 3 waiting on Home.
    await sql`insert into public.deliveries (user_id, lesson_id, kind, local_date, delivered_at, read_at, quiz_completed_at) values
      (${LEARNER}, ${lesson(2)}, 'daily', current_date - 2, now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'),
      (${LEARNER}, ${lesson(1)}, 'daily', current_date - 1, now() - interval '1 day', null, null),
      (${LEARNER}, ${lesson(3)}, 'extra', current_date, now(), null, null)`;
    await sql`insert into public.answers (user_id, question_id, context, chosen_index, correct) values (${LEARNER}, ${question(2)}, 'lesson', 1, false)`;
    await sql`insert into public.review_items (user_id, question_id, step, due_on) values (${LEARNER}, ${question(2)}, 0, current_date - 1)`;
    await sql`insert into public.weekly_recaps (id, user_id, week_start, question_ids) values (${RECAP}, ${LEARNER}, current_date - 6, ${[question(2)]})`;
    await sql`insert into public.milestones (user_id, kind, shown_at) values (${LEARNER}, 'lessons_1', now())`;
    await sql`insert into public.job_runs (job, started_at, learners, delivered, failed, first_error)
      values ('deliver', now() - interval '1 day', 2, 1, 1, 'Resend said 422')`;
  } finally {
    await sql.end();
  }
}
