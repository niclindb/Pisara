"use server";

// Server actions for learner pages.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/app/author/actions";
import { getExtraLesson } from "@/lib/jobs/extra";
import { QuizError, submitQuiz, type QuizResult } from "@/lib/jobs/quiz";
import { milestoneMessage } from "@/lib/rules/milestones";
import type { SubmittedAnswer } from "@/lib/rules/quiz";
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
