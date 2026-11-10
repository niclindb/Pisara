"use server";

import { redirect } from "next/navigation";
import { readLessonLinkToken } from "@/lib/email/lesson-link";
import { afterSignIn, loadUser, signInFromLessonLink } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { signInFor } from "@/lib/server/paths";

/** Signs in from the daily email's link and opens the lesson; any problem falls back to the sign-in page. */
export async function openLessonFromEmailAction(token: string): Promise<void> {
  const link = readLessonLinkToken(token, env.unsubscribeSecret(), new Date());
  if (!link.ok) redirect(signInFor(link.lessonId ? `/lessons/${link.lessonId}` : null));
  const lesson = `/lessons/${link.lessonId}`;
  if (!(await signInFromLessonLink(link.userId))) redirect(signInFor(lesson));
  redirect(afterSignIn(await loadUser(link.userId), lesson));
}
