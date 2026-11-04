// Signed one-click unsubscribe links (B3). The signature proves the link came
// from us, so nobody can unsubscribe someone else by guessing their id.

import { createHmac, timingSafeEqual } from "node:crypto";

function sign(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

export function unsubscribeUrl(baseUrl: string, userId: string, secret: string): string {
  const url = new URL("/api/unsubscribe", baseUrl);
  url.searchParams.set("u", userId);
  url.searchParams.set("t", sign(userId, secret));
  return url.toString();
}

export function verifyUnsubscribe(userId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(sign(userId, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * The token in an email's "Email settings" link (/email/[token]): the user id
 * and the same signature as the unsubscribe link, so it works without signing in.
 */
export function emailSettingsToken(userId: string, secret: string): string {
  return `${userId}.${sign(userId, secret)}`;
}

/** The user id from an email settings token, or null if it isn't genuine. */
export function readEmailSettingsToken(token: string, secret: string): string | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const userId = token.slice(0, dot);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  return verifyUnsubscribe(userId, token.slice(dot + 1), secret) ? userId : null;
}
