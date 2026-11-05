"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/app/author/actions";
import { deliverFirstLesson } from "@/lib/jobs/extra";
import { ChoiceError, completeOnboarding } from "@/lib/jobs/topics";
import type { OnboardingInput } from "@/lib/rules/onboarding";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { paths } from "@/lib/server/paths";

/** Saves onboarding, delivers the first lesson right away (A6), then goes Home. */
export async function finishOnboardingAction(input: OnboardingInput): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) redirect(paths.signIn);
  try {
    await completeOnboarding(db(), user.id, input);
  } catch (err) {
    if (err instanceof ChoiceError) return { ok: false, problems: err.problems };
    throw err;
  }
  await deliverFirstLesson(db(), user.id, new Date());
  redirect(paths.home);
}
