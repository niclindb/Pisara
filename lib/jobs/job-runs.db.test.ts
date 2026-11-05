// Recording daily runs against a real Postgres database. Needs
// TEST_DATABASE_URL (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { DeliverySummary } from "./deliver";
import { jobRunFrom, loadRecentJobRuns, recordJobRun } from "./job-runs";
import { connect } from "./postgres-store";
import type { EmailMessage } from "./types";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);
const AUTHOR = "00000000-0000-4000-8000-000000000001";
const LEARNER = "00000000-0000-4000-8000-000000000002";

function summary(failed: number): DeliverySummary {
  return {
    ranAt: "2026-11-05T13:00:00.000Z",
    learners: 3,
    delivered: 3 - failed,
    reminders: 0,
    skipped: 0,
    failed,
    outcomes: failed ? [{ userId: LEARNER, outcome: "failed", error: "Resend said 422" }] : [],
  };
}

describe.skipIf(!url)("job runs on Postgres", () => {
  const sent: EmailMessage[] = [];
  const deps = { mailer: { send: async (m: EmailMessage) => void sent.push(m) }, baseUrl: "https://getpisara.com", log: () => {} };

  beforeEach(async () => {
    sent.length = 0;
    await sql`truncate auth.users, public.job_runs cascade`;
    await sql`insert into auth.users (id, email) values (${AUTHOR}, 'nick@example.com'), (${LEARNER}, 'learner@example.com')`;
    await sql`update public.profiles set role = 'author' where id = ${AUTHOR}`;
  });
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("records a clean run without emailing anyone", async () => {
    await recordJobRun(sql, jobRunFrom(new Date("2026-11-05T13:00:00Z"), { summary: summary(0) }), deps);
    expect(await loadRecentJobRuns(sql)).toEqual([
      { startedAt: "2026-11-05T13:00:00.000Z", learners: 3, delivered: 3, reminders: 0, skipped: 0, failed: 0, firstError: null },
    ]);
    expect(sent).toEqual([]);
  });

  it("emails only the authors when learners failed, with the first error", async () => {
    await recordJobRun(sql, jobRunFrom(new Date("2026-11-05T13:00:00Z"), { summary: summary(1) }), deps);
    expect((await loadRecentJobRuns(sql))[0]).toMatchObject({ failed: 1, firstError: "Resend said 422" });
    expect(sent.map((m) => m.to)).toEqual(["nick@example.com"]);
    expect(sent[0]!.subject).toBe("Pisara: daily run failed for 1 learners");
    expect(sent[0]!.text).toContain("Resend said 422");
  });

  it("records and reports a run that crashed", async () => {
    await recordJobRun(sql, jobRunFrom(new Date("2026-11-05T13:00:00Z"), { crashed: "database is down" }), deps);
    expect((await loadRecentJobRuns(sql))[0]).toMatchObject({ learners: 0, firstError: "database is down" });
    expect(sent[0]!.subject).toBe("Pisara: the daily run stopped");
  });

  it("lists the newest runs first", async () => {
    for (const day of ["03", "05", "04"]) {
      await recordJobRun(sql, jobRunFrom(new Date(`2026-11-${day}T13:00:00Z`), { summary: summary(0) }), deps);
    }
    expect((await loadRecentJobRuns(sql, 2)).map((r) => r.startedAt.slice(0, 10))).toEqual(["2026-11-05", "2026-11-04"]);
  });
});
