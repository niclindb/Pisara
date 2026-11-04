import { notFound } from "next/navigation";
import { currentUser, type CurrentUser } from "@/lib/server/auth";

/** Author pages show the not-found page to everyone else (design 10). */
export async function requireAuthor(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user || user.role !== "author") notFound();
  return user;
}
