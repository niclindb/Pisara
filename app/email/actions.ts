"use server";

import type { ActionResult } from "@/app/author/actions";
import { SettingsError, updateEmailPreferences } from "@/lib/jobs/settings";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";

const bad = { ok: false as const, problems: ["This link isn't valid any more. Use the link in your latest email."] };

/** Undo: emails back on (B3). */
export async function emailsOnAction(token: string): Promise<ActionResult> {
  const r = await updateEmailPreferences(db(), token, env.unsubscribeSecret(), { emailsEnabled: true }, new Date());
  return r ? { ok: true, message: "Emails are back on." } : bad;
}

/** Pause lessons through a date, with emails back on afterwards (D6). */
export async function pauseFromEmailAction(token: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const until = String(form.get("pausedUntil") ?? "");
  if (!until) return { ok: false, problems: ["Pick the last day with no lessons."] };
  try {
    const r = await updateEmailPreferences(db(), token, env.unsubscribeSecret(), { emailsEnabled: true, pausedUntil: until }, new Date());
    return r ? { ok: true, message: "Paused. Lessons and emails start again after that day." } : bad;
  } catch (err) {
    if (err instanceof SettingsError) return { ok: false, problems: err.problems };
    throw err;
  }
}
