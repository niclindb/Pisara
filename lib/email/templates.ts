// The learner emails (design 8). Deliberately plain until the design scheme
// is picked; the wording and links are what matter here.

import type { EmailMessage } from "../jobs/types";
import { lessonLinkUrl } from "./lesson-link";
import { emailSettingsToken, unsubscribeUrl } from "./unsubscribe";

export interface EmailContext {
  baseUrl: string;
  unsubscribeSecret: string;
  userId: string;
  to: string;
  displayName: string | null;
  /** When the email is sent; the sign-in link in the daily email expires a day later. */
  now: Date;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function greeting(name: string | null): string {
  return name ? `Good morning, ${name}.` : "Good morning.";
}

function wrap(ctx: EmailContext, subject: string, bodyHtml: string, bodyText: string): EmailMessage {
  const unsub = unsubscribeUrl(ctx.baseUrl, ctx.userId, ctx.unsubscribeSecret);
  const settings = new URL(`/email/${emailSettingsToken(ctx.userId, ctx.unsubscribeSecret)}`, ctx.baseUrl).toString();
  const privacy = new URL("/privacy", ctx.baseUrl).toString();
  const html = `<!doctype html><html><body style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#161D2B;max-width:560px;margin:0 auto;padding:24px">
${bodyHtml}
<p style="margin-top:40px;font-size:13px;color:#596377">You get this because you signed up for Pisara. <a href="${escapeHtml(settings)}" style="color:#596377">Email settings</a> · <a href="${escapeHtml(unsub)}" style="color:#596377">Stop these emails</a> · <a href="${escapeHtml(privacy)}" style="color:#596377">Privacy</a></p>
</body></html>`;
  const text = `${bodyText}\n\n--\nEmail settings: ${settings}\nStop these emails: ${unsub}\nPrivacy: ${privacy}\n`;
  return {
    to: ctx.to,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#2D47C8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif">${escapeHtml(label)}</a></p>`;
}

export function dailyLessonEmail(
  ctx: EmailContext,
  lesson: { id: string; title: string; readingMinutes: number; topicName: string },
  hasRecap: boolean,
): EmailMessage {
  // Signs the learner in and opens the lesson (lesson-link.ts); after a day it asks them to sign in first.
  const url = lessonLinkUrl(ctx.baseUrl, ctx.userId, lesson.id, ctx.now, ctx.unsubscribeSecret);
  const minutes = `${lesson.readingMinutes} min`;
  const recapLine = "Your weekly recap is waiting on Home too: 5 quick questions on what you learned this week.";
  const html = `<p>${escapeHtml(greeting(ctx.displayName))} Today's lesson is in ${escapeHtml(lesson.topicName)}:</p>
<h1 style="font-size:24px;line-height:1.25;margin:16px 0 4px">${escapeHtml(lesson.title)}</h1>
<p style="margin-top:0;color:#596377">${escapeHtml(lesson.topicName)} · ${minutes}</p>
${button(url, "Begin lesson")}
${hasRecap ? `<p>${recapLine}</p>` : ""}`;
  const text = `${greeting(ctx.displayName)} Today's lesson is in ${lesson.topicName}:\n\n${lesson.title}\n${lesson.topicName} · ${minutes}\n\nBegin lesson: ${url}${hasRecap ? `\n\n${recapLine}` : ""}`;
  return wrap(ctx, `${lesson.title} (${minutes})`, html, text);
}

export function lessonsWaitingEmail(ctx: EmailContext, waiting: number): EmailMessage {
  const url = new URL("/home", ctx.baseUrl).toString();
  const line = `You have ${waiting} lessons waiting. New ones will start arriving again once you've read one.`;
  const html = `<p>${escapeHtml(greeting(ctx.displayName))}</p><p>${escapeHtml(line)}</p>${button(url, "Go to Home")}`;
  const text = `${greeting(ctx.displayName)}\n\n${line}\n\nHome: ${url}`;
  return wrap(ctx, `You have ${waiting} lessons waiting`, html, text);
}

/**
 * The last "lessons waiting" email (B6), 30 days after the second. Short, no
 * guilt, and points at pausing or stopping for anyone who's moved on.
 */
export function stillHereEmail(ctx: EmailContext, waiting: number): EmailMessage {
  const home = new URL("/home", ctx.baseUrl).toString();
  const settings = new URL(`/email/${emailSettingsToken(ctx.userId, ctx.unsubscribeSecret)}`, ctx.baseUrl).toString();
  const line = `Your ${waiting} lessons are still here whenever you want them. This is the last reminder we'll send about them.`;
  const offer = "If now isn't a good time, you can pause lessons or turn off emails.";
  const html = `<p>${escapeHtml(greeting(ctx.displayName))}</p><p>${escapeHtml(line)}</p>${button(home, "Go to Home")}<p>${escapeHtml(offer)} <a href="${escapeHtml(settings)}">Email settings</a></p>`;
  const text = `${greeting(ctx.displayName)}\n\n${line}\n\nHome: ${home}\n\n${offer} ${settings}`;
  return wrap(ctx, "Your lessons are still here", html, text);
}

/** To the authors when the daily run had failures or crashed. No unsubscribe: it's an operations alert. */
export function jobFailedEmail(
  to: string,
  run: { startedAt: string; learners: number; delivered: number; failed: number; firstError: string | null },
  baseUrl: string,
): EmailMessage {
  const url = new URL("/author", baseUrl).toString();
  const crashed = run.failed === 0 && run.firstError !== null;
  const line = crashed
    ? `The daily lesson run at ${run.startedAt} stopped before delivering anything.`
    : `The daily lesson run at ${run.startedAt} failed for ${run.failed} of ${run.learners} learners (${run.delivered} delivered).`;
  const error = run.firstError ? `First error: ${run.firstError}` : "";
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px">Pisara's daily run had a problem</h1><p>${escapeHtml(line)}</p>${error ? `<pre style="white-space:pre-wrap;font-size:14px">${escapeHtml(error)}</pre>` : ""}
<p>Recent runs are on the <a href="${escapeHtml(url)}">author page</a>; the full log is in Vercel.</p></body></html>`;
  const text = `${line}\n\n${error}\n\nRecent runs: ${url}\nThe full log is in Vercel.\n`;
  return { to, subject: crashed ? "Pisara: the daily run stopped" : `Pisara: daily run failed for ${run.failed} learners`, html, text, headers: {} };
}
