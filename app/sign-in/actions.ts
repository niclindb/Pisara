"use server";

import { requestSignInLink } from "@/lib/server/auth";

export type SignInState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string };

const messages = {
  invalid_email: "Enter an email address like name@example.com.",
  too_many_requests: "That's a lot of links in a short time. Wait a minute, then try again.",
  failed: "The link couldn't be sent. Try again in a moment.",
} as const;

export async function sendSignInLink(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "");
  const result = await requestSignInLink(email);
  return result.ok ? { status: "sent", email: email.trim() } : { status: "error", message: messages[result.reason] };
}
