"use server";

import { cookies } from "next/headers";
import { requestSignInLink } from "@/lib/server/auth";
import { NEXT_COOKIE, safeNext } from "@/lib/server/paths";

export type SignInState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string };

const messages = {
  invalid_email: "Enter an email address like name@example.com.",
  too_many_requests: "That's a lot of links in a short time. Wait a minute, then try again.",
  failed: "The link couldn't be sent. Try again in a moment.",
} as const;

export async function sendSignInLink(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "");
  const result = await requestSignInLink(email);
  const next = safeNext(form.get("next") as string | null);
  if (result.ok && next) {
    // Remembered for as long as the link works (15 minutes), read by /auth/confirm.
    (await cookies()).set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 15 * 60 });
  }
  return result.ok ? { status: "sent", email: email.trim() } : { status: "error", message: messages[result.reason] };
}
