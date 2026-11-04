// Signing out (settings page). POST only, so a link or prefetch can't sign someone out.

import { NextResponse, type NextRequest } from "next/server";
import { paths } from "@/lib/server/paths";
import { supabaseServer } from "@/lib/server/supabase";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(paths.landing, request.nextUrl.origin), 303);
}
