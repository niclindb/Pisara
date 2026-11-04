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
