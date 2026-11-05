// Sign-in with email links (A1), and who is signed in. Pages call these from
// server actions and server components.

import { env } from "./env";
import { db } from "./db";
import { paths } from "./paths";
import { supabaseServer } from "./supabase";

export interface CurrentUser {
  id: string;
  email: string;
  role: "learner" | "author";
  /** False until onboarding turns on a topic. Stays true if they later turn every topic off. */
  onboarded: boolean;
}

export type SignInLinkResult = { ok: true } | { ok: false; reason: "invalid_email" | "too_many_requests" | "failed" };

/** Loose on purpose: the email link itself proves the address works. */
export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Sends a sign-in link, creating the account if it's new. The same call works for "Send again". */
export async function requestSignInLink(input: string): Promise<SignInLinkResult> {
  const email = normalizeEmail(input);
  if (!email) return { ok: false, reason: "invalid_email" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${env.siteUrl()}/auth/confirm` },
  });
  if (!error) return { ok: true };
  if (error.status === 429) return { ok: false, reason: "too_many_requests" };
  console.error("sign-in link failed", error.message);
  return { ok: false, reason: "failed" };
}

/** The signed-in user, checked with Supabase, or null. */
export async function currentUser(): Promise<CurrentUser | null> {
  // Local development only (`npm run dev`, never a production build): pretend to be
  // this user, so pages can be tried without a Supabase project.
  const devUser = process.env.NODE_ENV === "development" ? process.env.DEV_SIGNED_IN_USER_ID : undefined;
  if (devUser) return loadUser(devUser);
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return loadUser(data.user.id);
}

async function loadUser(id: string): Promise<CurrentUser | null> {
  const [p] = await db()`
    select p.id, p.email, p.role,
           exists (select 1 from public.user_topics ut where ut.user_id = p.id) as onboarded
    from public.profiles p where p.id = ${id}`;
  return p ? { id: p.id, email: p.email, role: p.role, onboarded: p.onboarded } : null;
}

/** Where to go right after signing in: onboarding until a topic is on (authors skip it), then Home (or `next`). */
export function afterSignIn(user: CurrentUser | null, next: string | null): string {
  if (!user) return paths.signInExpired;
  if (!user.onboarded) return user.role === "author" ? (next ?? paths.author) : paths.onboarding;
  return next ?? paths.home;
}

export { loadUser };
