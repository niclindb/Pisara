// A record of each daily run (design 6), shown on the author home page, plus
// an email to the authors when any learner failed or the whole run crashed.
// Vercel keeps function logs only briefly, so without this a failed 8am run
// would be invisible by the time anyone looked.

import { jobFailedEmail } from "../email/templates";
import type { DeliverySummary } from "./deliver";
import type { Sql } from "./postgres-store";
import type { Mailer } from "./types";

export interface JobRun {
  startedAt: string;
  learners: number;
  delivered: number;
  reminders: number;
  skipped: number;
  failed: number;
  firstError: string | null;
}

/** The run's totals, or the error that stopped it. */
export type RunResult = { summary: DeliverySummary } | { crashed: string };

export function jobRunFrom(startedAt: Date, result: RunResult): JobRun {
  if ("crashed" in result) {
    return { startedAt: startedAt.toISOString(), learners: 0, delivered: 0, reminders: 0, skipped: 0, failed: 0, firstError: result.crashed };
  }
  const s = result.summary;
  const firstFailure = s.outcomes.find((o) => o.outcome === "failed");
  return {
    startedAt: startedAt.toISOString(),
    learners: s.learners,
    delivered: s.delivered,
    reminders: s.reminders,
    skipped: s.skipped,
    failed: s.failed,
    firstError: firstFailure && "error" in firstFailure ? firstFailure.error : null,
  };
}

/** Saves the run and, if anything failed, emails every author. Never throws: the run's own result matters more. */
export async function recordJobRun(
  sql: Sql,
  run: JobRun,
  deps: { mailer: Mailer; baseUrl: string; log: (message: string, detail: unknown) => void },
): Promise<void> {
  try {
    await sql`
      insert into public.job_runs (job, started_at, learners, delivered, reminders, skipped, failed, first_error)
      values ('deliver', ${run.startedAt}, ${run.learners}, ${run.delivered}, ${run.reminders}, ${run.skipped}, ${run.failed}, ${run.firstError})`;
  } catch (err) {
    deps.log("could not record the job run", err);
  }
  if (!run.failed && !run.firstError) return;
  try {
    const authors = await sql`select email from public.profiles where role = 'author'`;
    for (const a of authors) await deps.mailer.send(jobFailedEmail(a.email, run, deps.baseUrl));
  } catch (err) {
    deps.log("could not email the authors about a failed run", err);
  }
}

/** The latest runs, newest first, for the author home page. */
export async function loadRecentJobRuns(sql: Sql, limit = 7): Promise<JobRun[]> {
  const rows = await sql`
    select started_at, learners, delivered, reminders, skipped, failed, first_error
    from public.job_runs where job = 'deliver' order by started_at desc limit ${limit}`;
  return rows.map((r) => ({
    startedAt: new Date(r.started_at).toISOString(),
    learners: r.learners,
    delivered: r.delivered,
    reminders: r.reminders,
    skipped: r.skipped,
    failed: r.failed,
    firstError: r.first_error,
  }));
}
