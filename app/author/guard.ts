import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser, type CurrentUser } from "@/lib/server/auth";
import { paths, REQUESTED_PATH_HEADER, signInFor } from "@/lib/server/paths";

/**
 * Signed-out visitors go to sign in, then come back here. Signed-in learners
 * get the not-found page (design 10).
 */
export async function requireAuthor(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect(signInFor((await headers()).get(REQUESTED_PATH_HEADER) ?? paths.author));
  if (user.role !== "author") notFound();
  return user;
}
