"use server";

// Server actions for learner pages.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/app/author/actions";
import { getExtraLesson } from "@/lib/jobs/extra";
import { QuizError, submitQuiz, submitRecap, type QuizResult } from "@/lib/jobs/quiz";
import { deleteAccount, SettingsError, updateSettings } from "@/lib/jobs/settings";
import { ChoiceError, setTopicInterest } from "@/lib/jobs/topics";
import type { SettingsChange } from "@/lib/rules/settings";
import { supabaseServer } from "@/lib/server/supabase";
import { milestoneMessage } from "@/lib/rules/milestones";
import type { GradedAnswer, SubmittedAnswer } from "@/lib/rules/quiz";
import { db } from "@/lib/server/db";
import { requireLearner } from "./guard";

const extraProblems = {
  inbox_full: "Read one of the lessons waiting on Home first.",
  topic_finished: "You've read every lesson in this topic so far. New ones are on the way.",
  topic_unavailable: "That topic isn't available yet.",
  nothing_left: "You've read every lesson in your topics so far. Turn on another topic to keep going.",
} as const;

/** "Start" on a topic, or "Surprise me" without a topic (B7). Opens the new lesson. */
export async function extraLessonAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireLearner();
  const topicId = String(form.get("topicId") ?? "") || undefined;
  const result = await getExtraLesson(db(), user.id, new Date(), { topicId });
  if (!result.ok) return { ok: false, problems: [extraProblems[result.reason]] };
  revalidatePath("/", "layout");
  redirect(`/lessons/${result.lessonId}`);
}

export type QuizOutcome =
  | ({ ok: true; milestoneText: string | null } & QuizResult)
  | { ok: false; problems: string[] };

/** Grades a lesson quiz and its review questions (C1–C6, D3, D8). */
export async function submitQuizAction(
  lessonId: string,
  answers: { lesson: SubmittedAnswer[]; review: SubmittedAnswer[] },
): Promise<QuizOutcome> {
  const user = await requireLearner();
  let result: QuizResult;
  try {
    result = await submitQuiz(db(), user.id, lessonId, answers, new Date());
  } catch (err) {
    if (err instanceof QuizError) return { ok: false, problems: [err.message] };
    throw err;
  }
  let milestoneText: string | null = null;
  if (result.milestone) {
    const ids = result.milestone.split(":").slice(1, 2);
    const names = ids.length ? await db()`select id, name from public.topics where id = any(${ids}::uuid[])` : [];
    milestoneText = milestoneMessage(result.milestone, (id) => names.find((n) => n.id === id)?.name);
  }
  revalidatePath("/", "layout");
  return { ok: true, milestoneText, ...result };
}

/** Turns a topic on or off, or sets how often it comes up (A4). Returns the prerequisite note, if any. */
export async function setTopicInterestAction(topicId: string, interest: number): Promise<ActionResult> {
  const user = await requireLearner();
  try {
    const { note } = await setTopicInterest(db(), user.id, topicId, interest);
    revalidatePath("/", "layout");
    return { ok: true, message: note ?? (interest === 0 ? "Turned off. Your progress is kept." : "Saved.") };
  } catch (err) {
    if (err instanceof ChoiceError) return { ok: false, problems: err.problems };
    throw err;
  }
}

async function changeSettings(change: SettingsChange, message: string): Promise<ActionResult> {
  const user = await requireLearner();
  try {
    await updateSettings(db(), user.id, change, new Date());
  } catch (err) {
    if (err instanceof SettingsError) return { ok: false, problems: err.problems };
    throw err;
  }
  revalidatePath("/", "layout");
  return { ok: true, message };
}

/** Name, time zone, recap day and emails (A5, A10, B3, C7). */
export async function saveSettingsAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return changeSettings(
    {
      displayName: String(form.get("displayName") ?? ""),
      timeZone: String(form.get("timeZone") ?? ""),
      weeklyRecapDay: Number(form.get("weeklyRecapDay")),
      emailsEnabled: form.get("emailsEnabled") === "on",
    },
    "Saved.",
  );
}

/** Pause lessons through a date, or resume (D6). */
export async function pauseAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const until = String(form.get("pausedUntil") ?? "");
  if (!until) return { ok: false, problems: ["Pick the last day with no lessons."] };
  return changeSettings({ pausedUntil: until }, "Paused.");
}

export async function resumeAction(): Promise<ActionResult> {
  return changeSettings({ pausedUntil: null }, "Lessons are back on.");
}

/** Deletes the account and everything in it (D9), then signs out. */
export async function deleteAccountAction(): Promise<ActionResult> {
  const user = await requireLearner();
  await deleteAccount(db(), user.id);
  // The account is gone either way; clearing the session cookie is a courtesy.
  await (await supabaseServer()).auth.signOut().catch(() => {});
  redirect("/");
}

export type RecapOutcome = { ok: true; answers: GradedAnswer[] } | { ok: false; problems: string[] };

/** Grades the weekly recap (C7). */
export async function submitRecapAction(recapId: string, answers: SubmittedAnswer[]): Promise<RecapOutcome> {
  const user = await requireLearner();
  try {
    // No refresh here: the recap page would swap the results for "This recap is done".
    const graded = await submitRecap(db(), user.id, recapId, answers, new Date());
    return { ok: true, answers: graded };
  } catch (err) {
    if (err instanceof QuizError) return { ok: false, problems: [err.message] };
    throw err;
  }
}
