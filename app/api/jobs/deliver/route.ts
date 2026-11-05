// The daily delivery job, at 8am Eastern. Vercel Cron calls this at 12:00 and
// 13:00 UTC (see vercel.json); only the call in the 8am hour in New York runs.
// Running twice in a day is harmless anyway: one daily lesson per learner per date.

import { timingSafeEqual } from "node:crypto";
import { runDailyDelivery } from "@/lib/jobs/deliver";
import { isDeliveryHour } from "@/lib/rules/delivery-time";
import { postgresStore } from "@/lib/jobs/postgres-store";
import { consoleMailer, resendMailer } from "@/lib/email/resend";
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

  const apiKey = env.resendApiKey();
  const summary = await runDailyDelivery(now, {
    store: postgresStore(db()),
    mailer: apiKey ? resendMailer({ apiKey, from: env.emailFrom() }) : consoleMailer(),
    random: Math.random,
    baseUrl: env.siteUrl(),
    unsubscribeSecret: env.unsubscribeSecret(),
    log: (message, detail) => console.error(message, detail),
  });
  // Per-learner outcomes go to the log; the response stays small.
  console.log(JSON.stringify(summary.outcomes));
  const { outcomes: _outcomes, ...totals } = summary;
  return Response.json(totals, { status: summary.failed > 0 ? 500 : 200 });
}
