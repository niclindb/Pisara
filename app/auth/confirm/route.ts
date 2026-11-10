// The link in the sign-in email lands here (A1). It carries a one-time token
// that works on any device, so opening the email on a phone after asking on a
// laptop still signs you in on the phone. Links work once and expire after 15
// minutes (set in Supabase → Authentication); a bad link goes to /sign-in/expired.

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { afterSignIn, loadUser } from "@/lib/server/auth";
import { NEXT_COOKIE, paths, safeNext } from "@/lib/server/paths";
import { supabaseServer } from "@/lib/server/supabase";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");
  // Where to go back to: from the link, or remembered when the link was asked for in this browser.
  const next = safeNext(url.searchParams.get("next")) ?? safeNext(request.cookies.get(NEXT_COOKIE)?.value);
  const to = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.cookies.delete(NEXT_COOKIE);
    return response;
  };

  const supabase = await supabaseServer();
  let userId: string | null = null;
  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) userId = data.user?.id ?? null;
  } else if (code) {
    // Supabase's default email template: only works in the browser that asked for the link.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id ?? null;
  }
  if (!userId) return to(paths.signInExpired);
  return to(afterSignIn(await loadUser(userId), next));
}
