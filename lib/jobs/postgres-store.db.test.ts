// Runs the real delivery job against a real Postgres database with the
// Pisara schema loaded. Needs TEST_DATABASE_URL; see supabase/README.md.
// Deletes all data in that database, so never point it at production.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runDailyDelivery } from "./deliver";
import { connect, postgresStore } from "./postgres-store";
import { unsubscribe } from "./unsubscribe";
import { unsubscribeUrl } from "../email/unsubscribe";
import type { EmailMessage } from "./types";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U1 = "00000000-0000-4000-8000-000000000001";
const CAT = "10000000-0000-4000-8000-000000000001";
const ASTRO = "20000000-0000-4000-8000-000000000001";
const ROME = "20000000-0000-4000-8000-000000000002";
const lesson = (topic: number, n: number) => `3000000${topic}-0000-4000-8000-00000000000${n}`;

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons, public.questions cascade`;
  await sql`insert into auth.users (id, email) values (${U1}, 'nick@example.com')`;
  await sql`update public.profiles set display_name = 'Nick', weekly_recap_day = 2 where id = ${U1}`;
  await sql`insert into public.categories (id, name) values (${CAT}, 'Science')`;
  await sql`insert into public.topics (id, category_id, name) values (${ASTRO}, ${CAT}, 'Astronomy'), (${ROME}, ${CAT}, 'Rome')`;
  for (const [t, topic] of [[1, ASTRO], [2, ROME]] as const) {
    for (const n of [1, 2, 3]) {
      await sql`insert into public.lessons (id, topic_id, position, title, status, reading_minutes)
                values (${lesson(t, n)}, ${topic}, ${n}, ${`Lesson ${t}.${n}`}, 'published', 3)`;
      await sql`insert into public.questions (lesson_id, position, prompt, options, correct_index)
                values (${lesson(t, n)}, 0, 'Q?', ${["a", "b"]}, 0)`;
    }
  }
  // Rome is off, so only Astronomy can be picked.
  await sql`insert into public.user_topics (user_id, topic_id, interest) values (${U1}, ${ASTRO}, 3), (${U1}, ${ROME}, 0)`;
}

function deps() {
  const sent: EmailMessage[] = [];
  return {
    sent,
    deps: {
      store: postgresStore(sql),
      mailer: { send: async (m: EmailMessage) => void sent.push(m) },
      random: () => 0,
      baseUrl: "https://getpisara.com",
      unsubscribeSecret: "secret",
    },
  };
}

const at = (iso: string) => new Date(iso);

describe.skipIf(!url)("delivery job on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("delivers the first lesson of the picked topic and records it", async () => {
    const { deps: d, sent } = deps();
    const summary = await runDailyDelivery(at("2026-11-09T11:00:00Z"), d);
    expect(summary).toMatchObject({ learners: 1, delivered: 1, failed: 0 });
    const rows = await sql`select lesson_id, local_date::text as date, kind from public.deliveries`;
    expect(rows).toEqual([{ lesson_id: lesson(1, 1), date: "2026-11-09", kind: "daily" }]);
    const [ut] = await sql`select last_delivered_at from public.user_topics where topic_id = ${ASTRO}`;
    expect(ut!.last_delivered_at).toEqual(at("2026-11-09T11:00:00Z"));
    expect(sent.map((m) => m.subject)).toEqual(["Lesson 1.1 (3 min read)"]);
  });

  it("doesn't deliver twice on the same day", async () => {
    const { deps: d, sent } = deps();
    await runDailyDelivery(at("2026-11-09T11:00:00Z"), d);
    const again = await runDailyDelivery(at("2026-11-09T11:30:00Z"), d);
    expect(again.outcomes[0]).toMatchObject({ outcome: "skipped", reason: "already_delivered" });
    expect(await sql`select 1 from public.deliveries`).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it("moves along the path day by day, then reminds when the inbox is full", async () => {
    const { deps: d, sent } = deps();
    for (const date of ["2026-11-01", "2026-11-02", "2026-11-03"]) {
      await runDailyDelivery(at(`${date}T11:00:00Z`), d);
    }
    const delivered = await sql`select lesson_id from public.deliveries order by local_date`;
    expect(delivered.map((r) => r.lesson_id)).toEqual([lesson(1, 1), lesson(1, 2), lesson(1, 3)]);

    // Inbox now holds 3 unread: first reminder, quiet, then a week later the second.
    const day4 = await runDailyDelivery(at("2026-11-04T11:00:00Z"), d);
    expect(day4.outcomes[0]).toMatchObject({ outcome: "waiting_reminder", remindersSent: 1 });
    const day5 = await runDailyDelivery(at("2026-11-05T11:00:00Z"), d);
    expect(day5.outcomes[0]).toMatchObject({ outcome: "skipped", reason: "inbox_full_quiet" });
    const day11 = await runDailyDelivery(at("2026-11-11T11:00:00Z"), d);
    expect(day11.outcomes[0]).toMatchObject({ outcome: "waiting_reminder", remindersSent: 2 });
    const [p] = await sql`select waiting_reminders_sent, waiting_reminder_sent_on::text as on from public.profiles`;
    expect(p).toEqual({ waiting_reminders_sent: 2, on: "2026-11-11" });
    expect(sent.filter((m) => m.subject.includes("waiting"))).toHaveLength(2);
  });

  it("stops when every lesson in the turned-on topics has been delivered", async () => {
    const { deps: d } = deps();
    for (const date of ["2026-11-01", "2026-11-02", "2026-11-03"]) {
      await runDailyDelivery(at(`${date}T11:00:00Z`), d);
    }
    await sql`update public.deliveries set read_at = delivered_at`;
    const day4 = await runDailyDelivery(at("2026-11-04T11:00:00Z"), d);
    expect(day4.outcomes[0]).toMatchObject({ outcome: "skipped", reason: "nothing_to_pick" });
  });

  it("doesn't pick a topic with fewer than 3 published lessons", async () => {
    await sql`update public.lessons set status = 'draft' where id = ${lesson(1, 3)}`;
    const { deps: d } = deps();
    const summary = await runDailyDelivery(at("2026-11-09T11:00:00Z"), d);
    expect(summary.outcomes[0]).toMatchObject({ outcome: "skipped", reason: "nothing_to_pick" });
  });

  it("builds the weekly recap from missed questions on recap day", async () => {
    const { deps: d, sent } = deps();
    // Mon Nov 9 and Tue Nov 10 (recap day is Tuesday). Read and miss Monday's question.
    await runDailyDelivery(at("2026-11-08T11:00:00Z"), d);
    await runDailyDelivery(at("2026-11-09T11:00:00Z"), d);
    await sql`update public.deliveries set read_at = delivered_at + interval '1 hour'`;
    const [q] = await sql`select id from public.questions where lesson_id = ${lesson(1, 2)}`;
    await sql`insert into public.answers (user_id, question_id, context, chosen_index, correct, answered_at)
              values (${U1}, ${q!.id}, 'lesson', 1, false, '2026-11-09T12:30:00Z')`;
    const tue = await runDailyDelivery(at("2026-11-10T11:00:00Z"), d);
    expect(tue.outcomes[0]).toMatchObject({ outcome: "delivered", recap: true });
    const [recap] = await sql`select week_start::text as week_start, question_ids from public.weekly_recaps`;
    expect(recap!.week_start).toBe("2026-11-04");
    expect(recap!.question_ids[0]).toBe(q!.id);
    expect(recap!.question_ids).toHaveLength(2);
    expect(sent.at(-1)!.text).toContain("weekly recap");
  });

  it("turns emails off from a valid unsubscribe link only", async () => {
    const link = new URL(unsubscribeUrl("https://getpisara.com", U1, "secret"));
    expect(await unsubscribe(sql, U1, "forged", "secret")).toBe("invalid");
    expect(await unsubscribe(sql, "not-a-uuid", link.searchParams.get("t"), "secret")).toBe("invalid");
    expect((await sql`select emails_enabled from public.profiles`)[0]!.emails_enabled).toBe(true);
    expect(await unsubscribe(sql, U1, link.searchParams.get("t"), "secret")).toBe("unsubscribed");
    expect((await sql`select emails_enabled from public.profiles`)[0]!.emails_enabled).toBe(false);
  });
});
