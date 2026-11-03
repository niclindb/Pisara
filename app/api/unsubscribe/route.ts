// One-click unsubscribe (B3). Email apps POST here from the List-Unsubscribe
// header; people clicking the footer link arrive with GET.

import { unsubscribe } from "@/lib/jobs/unsubscribe";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";

async function handle(request: Request) {
  const url = new URL(request.url);
  return unsubscribe(db(), url.searchParams.get("u"), url.searchParams.get("t"), env.unsubscribeSecret());
}

export async function POST(request: Request) {
  const result = await handle(request);
  return new Response(null, { status: result === "unsubscribed" ? 200 : 400 });
}

export async function GET(request: Request) {
  const result = await handle(request);
  // Plain until the design scheme exists.
  const message =
    result === "unsubscribed"
      ? "You won't get Pisara emails anymore. Your lessons still wait in your inbox, and you can turn emails back on in settings."
      : "This unsubscribe link isn't valid. Try the link in a more recent email, or change email settings after signing in.";
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><title>Pisara</title><p style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">${message}</p>`,
    { status: result === "unsubscribed" ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
