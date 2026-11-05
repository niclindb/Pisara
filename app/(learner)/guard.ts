import { redirect } from "next/navigation";
import { currentUser, type CurrentUser } from "@/lib/server/auth";
import { paths } from "@/lib/server/paths";

/**
 * Learner pages need someone signed in. Learners who haven't picked a topic
 * yet go to onboarding first; authors can look around without topics.
 */
export async function requireLearner(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect(paths.signIn);
  if (!user.onboarded && user.role !== "author") redirect(paths.onboarding);
  return user;
}
