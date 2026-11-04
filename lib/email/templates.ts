// The learner emails (design 8). Deliberately plain until the design scheme
// is picked; the wording and links are what matter here.

import type { EmailMessage } from "../jobs/types";
import { emailSettingsToken, unsubscribeUrl } from "./unsubscribe";

export interface EmailContext {
  baseUrl: string;
  unsubscribeSecret: string;
  userId: string;
  to: string;
  displayName: string | null;
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
  const html = `<!doctype html><html><body style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#161D2B;max-width:560px;margin:0 auto;padding:24px">
${bodyHtml}
<p style="margin-top:40px;font-size:13px;color:#596377">You get this because you signed up for Pisara. <a href="${escapeHtml(settings)}" style="color:#596377">Email settings</a> · <a href="${escapeHtml(unsub)}" style="color:#596377">Stop these emails</a></p>
</body></html>`;
  const text = `${bodyText}\n\n--\nEmail settings: ${settings}\nStop these emails: ${unsub}\n`;
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
  const url = new URL(`/lessons/${lesson.id}`, ctx.baseUrl).toString();
  const minutes = `${lesson.readingMinutes} min read`;
  const recapLine = "Your weekly recap is waiting on Home too: 5 quick questions on what you learned this week.";
  const html = `<p>${escapeHtml(greeting(ctx.displayName))} Today's lesson is in ${escapeHtml(lesson.topicName)}:</p>
<h1 style="font-size:24px;line-height:1.25;margin:16px 0 4px">${escapeHtml(lesson.title)}</h1>
<p style="margin-top:0;color:#596377">${escapeHtml(lesson.topicName)} · ${minutes}</p>
${button(url, "Read lesson")}
${hasRecap ? `<p>${recapLine}</p>` : ""}`;
  const text = `${greeting(ctx.displayName)} Today's lesson is in ${lesson.topicName}:\n\n${lesson.title}\n${lesson.topicName} · ${minutes}\n\nRead it: ${url}${hasRecap ? `\n\n${recapLine}` : ""}`;
  return wrap(ctx, `${lesson.title} (${minutes})`, html, text);
}

export function lessonsWaitingEmail(ctx: EmailContext, waiting: number): EmailMessage {
  const url = new URL("/home", ctx.baseUrl).toString();
  const line = `You have ${waiting} lessons waiting. New ones will start arriving again once you've read one.`;
  const html = `<p>${escapeHtml(greeting(ctx.displayName))}</p><p>${escapeHtml(line)}</p>${button(url, "Go to Home")}`;
  const text = `${greeting(ctx.displayName)}\n\n${line}\n\nHome: ${url}`;
  return wrap(ctx, `You have ${waiting} lessons waiting`, html, text);
}
