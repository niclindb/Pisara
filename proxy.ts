// Runs before each page request and keeps the Supabase session cookies fresh,
// so server pages always see who is signed in. It doesn't block anything:
// each page decides what a signed-out visitor sees. It also tells pages which
// address was asked for, so a sign-in redirect can come back to it.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REQUESTED_PATH_HEADER } from "@/lib/server/paths";

export async function proxy(request: NextRequest) {
  request.headers.set(REQUESTED_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Not for the cron job, unsubscribe, the sign-in link itself, or static files.
  matcher: ["/((?!api/|auth/confirm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
