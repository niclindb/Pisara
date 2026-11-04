// Turning emails off from a one-click unsubscribe link (B3).

import { verifyUnsubscribe } from "../email/unsubscribe";
import type { Sql } from "./postgres-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function unsubscribe(
  sql: Sql,
  userId: string | null,
  token: string | null,
  secret: string,
): Promise<"unsubscribed" | "invalid"> {
  if (!userId || !token || !UUID_RE.test(userId) || !verifyUnsubscribe(userId, token, secret)) {
    return "invalid";
  }
  await sql`update public.profiles set emails_enabled = false where id = ${userId}`;
  return "unsubscribed";
}
