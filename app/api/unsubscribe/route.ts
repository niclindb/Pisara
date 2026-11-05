// Unsubscribe links (B3). Email apps POST here from the List-Unsubscribe
// header (RFC 8058 one-click), and that turns emails off at once. A GET is a
// person clicking the footer link, or a mail scanner checking it, so it never
// changes anything: it sends them to the email settings page, which asks first.

import { settingsPageFor } from "@/lib/email/unsubscribe";
import { unsubscribe } from "@/lib/jobs/unsubscribe";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const result = await unsubscribe(db(), url.searchParams.get("u"), url.searchParams.get("t"), env.unsubscribeSecret());
  return new Response(null, { status: result === "unsubscribed" ? 200 : 400 });
}

export function GET(request: Request) {
  return Response.redirect(settingsPageFor(request.url, env.unsubscribeSecret()), 303);
}
