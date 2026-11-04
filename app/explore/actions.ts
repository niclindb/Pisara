"use server";

import type { QuizOutcome } from "@/app/(learner)/actions";
import { gradePreviewQuiz } from "@/lib/jobs/learner";
import { QuizError } from "@/lib/jobs/quiz";
import type { SubmittedAnswer } from "@/lib/rules/quiz";
import { db } from "@/lib/server/db";

/** Grades the free preview quiz for anyone (A9). Nothing is saved. */
export async function gradePreviewQuizAction(
  lessonId: string,
  answers: { lesson: SubmittedAnswer[]; review: SubmittedAnswer[] },
): Promise<QuizOutcome> {
  try {
    const r = await gradePreviewQuiz(db(), lessonId, answers.lesson);
    return { ok: true, lessonAnswers: r.answers, reviewAnswers: [], suggestReread: r.suggestReread, milestone: null, milestoneText: null, goDeeper: [] };
  } catch (err) {
    if (err instanceof QuizError) return { ok: false, problems: [err.message] };
    throw err;
  }
}
