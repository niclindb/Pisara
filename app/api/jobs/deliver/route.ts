// The daily delivery job, at 8am Eastern. Vercel Cron calls this at 12:00 and
// 13:00 UTC (see vercel.json); only the call in the 8am hour in New York runs.
// Running twice in a day is harmless anyway: one daily lesson per learner per date.

import { timingSafeEqual } from "node:crypto";
import { runDailyDelivery } from "@/lib/jobs/deliver";
import { isDeliveryHour } from "@/lib/rules/delivery-time";
import { jobRunFrom, recordJobRun, type RunResult } from "@/lib/jobs/job-runs";
import { postgresStore } from "@/lib/jobs/postgres-store";
import { pickMailer } from "@/lib/email/mailer";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${env.cronSecret()}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  if (!isDeliveryHour(now)) return Response.json({ skipped: "Not 8am in New York; the other scheduled call runs today" });

  const mailer = pickMailer({
    smtpHost: env.smtpHost(),
    smtpPort: env.smtpPort(),
    smtpUser: env.smtpUser(),
    smtpPassword: env.smtpPassword(),
    resendApiKey: env.resendApiKey(),
    from: env.emailFrom(),
  });
  const log = (message: string, detail: unknown) => console.error(message, detail);
  let result: RunResult;
  try {
    result = {
      summary: await runDailyDelivery(now, {
        store: postgresStore(db()),
        mailer,
        random: Math.random,
        baseUrl: env.siteUrl(),
        unsubscribeSecret: env.unsubscribeSecret(),
        log,
      }),
    };
  } catch (err) {
    result = { crashed: err instanceof Error ? err.message : String(err) };
  }
  // Saved to job_runs (shown on /author) and emailed to authors on failure.
  await recordJobRun(db(), jobRunFrom(now, result), { mailer, baseUrl: env.siteUrl(), log });
  if ("crashed" in result) return Response.json({ crashed: result.crashed }, { status: 500 });
  const summary = result.summary;
  // Per-learner outcomes go to the log; the response stays small.
  console.log(JSON.stringify(summary.outcomes));
  const { outcomes: _outcomes, ...totals } = summary;
  return Response.json(totals, { status: summary.failed > 0 ? 500 : 200 });
}
