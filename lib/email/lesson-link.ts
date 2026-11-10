// The "Begin lesson" link in the daily email signs the learner in (A1, B4).
// The link is signed, names one learner and one lesson, and expires after
// LESSON_LINK_HOURS. It can only open that lesson: after that the learner has
// an ordinary session, the same as signing in from the sign-in email.
//
// The link isn't single-use on purpose: work and school mail scanners open
// every link in an email first, and a single-use link would be spent before
// the learner clicks it. Opening the link changes nothing either; the page
// signs in with a button press that runs automatically in a real browser.

import { createHmac, timingSafeEqual } from "node:crypto";

/** How long the link in a daily email keeps signing people in. After that it asks for a sign-in email. */
export const LESSON_LINK_HOURS = 24;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(userId: string, lessonId: string, expires: number, secret: string): string {
  // The "lesson-sign-in" prefix keeps these signatures apart from unsubscribe ones made with the same secret.
  return createHmac("sha256", secret).update(`lesson-sign-in:${userId}:${lessonId}:${expires}`).digest("base64url");
}

/** The token for /auth/lesson/[token]: learner, lesson, expiry (Unix seconds) and signature. */
export function lessonLinkToken(userId: string, lessonId: string, now: Date, secret: string): string {
  const expires = Math.floor(now.getTime() / 1000) + LESSON_LINK_HOURS * 3600;
  return `${userId}.${lessonId}.${expires}.${sign(userId, lessonId, expires, secret)}`;
}

export function lessonLinkUrl(baseUrl: string, userId: string, lessonId: string, now: Date, secret: string): string {
  return new URL(`/auth/lesson/${lessonLinkToken(userId, lessonId, now, secret)}`, baseUrl).toString();
}

export type LessonLink =
  | { ok: true; userId: string; lessonId: string }
  /** lessonId is set when the token is well formed, so the learner can still be sent to sign in for that lesson. */
  | { ok: false; lessonId: string | null };

export function readLessonLinkToken(token: string, secret: string, now: Date): LessonLink {
  const [userId = "", lessonId = "", expiresText = "", signature = "", ...rest] = token.split(".");
  if (rest.length || !UUID.test(userId) || !UUID.test(lessonId) || !/^\d{1,12}$/.test(expiresText)) return { ok: false, lessonId: null };
  const expires = Number(expiresText);
  const expected = Buffer.from(sign(userId, lessonId, expires, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, lessonId: null };
  if (now.getTime() / 1000 > expires) return { ok: false, lessonId };
  return { ok: true, userId, lessonId };
}
