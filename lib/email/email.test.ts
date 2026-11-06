import { describe, expect, it } from "vitest";
import { dailyLessonEmail, lessonsWaitingEmail, type EmailContext } from "./templates";
import { emailSettingsToken, readEmailSettingsToken, settingsPageFor, unsubscribeUrl, verifyUnsubscribe } from "./unsubscribe";
import { resendMailer } from "./resend";
import { smtpMailer, type SmtpTransport } from "./smtp";
import { pickMailer, type MailSettings } from "./mailer";

const secret = "test-secret";
const userId = "6f1c1b7a-1111-4222-8333-944455556666";
const ctx: EmailContext = { baseUrl: "https://getpisara.com", unsubscribeSecret: secret, userId, to: "a@example.com", displayName: "Nick" };

describe("unsubscribe links", () => {
  it("sends a clicked link to the email settings page instead of unsubscribing", () => {
    const link = unsubscribeUrl(ctx.baseUrl, userId, secret);
    expect(settingsPageFor(link, secret)).toBe(`https://getpisara.com/email/${emailSettingsToken(userId, secret)}`);
    expect(settingsPageFor(link.replace(/t=[^&]+/, "t=forged"), secret)).toBe("https://getpisara.com/email/invalid");
  });


  it("verify for the right user only", () => {
    const url = new URL(unsubscribeUrl(ctx.baseUrl, userId, secret));
    expect(url.pathname).toBe("/api/unsubscribe");
    const token = url.searchParams.get("t")!;
    expect(verifyUnsubscribe(userId, token, secret)).toBe(true);
    expect(verifyUnsubscribe("00000000-0000-4000-8000-000000000000", token, secret)).toBe(false);
    expect(verifyUnsubscribe(userId, token, "other-secret")).toBe(false);
    expect(verifyUnsubscribe(userId, "garbage", secret)).toBe(false);
  });
});

describe("daily lesson email", () => {
  const lesson = { id: "lesson-1", title: "Why stars <twinkle>", readingMinutes: 4, topicName: "Astronomy" };

  it("has the title, topic, reading time and a link to the lesson", () => {
    const m = dailyLessonEmail(ctx, lesson, false);
    expect(m.subject).toBe("Why stars <twinkle> (4 min)");
    expect(m.text).toContain("Good morning, Nick.");
    expect(m.text).toContain("Astronomy · 4 min");
    expect(m.text).toContain("https://getpisara.com/lessons/lesson-1");
    expect(m.text).not.toContain("weekly recap");
  });

  it("escapes HTML in lesson titles", () => {
    expect(dailyLessonEmail(ctx, lesson, false).html).toContain("Why stars &lt;twinkle&gt;");
  });

  it("mentions the weekly recap on recap day", () => {
    expect(dailyLessonEmail(ctx, lesson, true).text).toContain("weekly recap");
  });

  it("greets without a name when there isn't one", () => {
    expect(dailyLessonEmail({ ...ctx, displayName: null }, lesson, false).text).toMatch(/^Good morning\. /);
  });

  it("has one-click unsubscribe headers and a footer link", () => {
    const m = dailyLessonEmail(ctx, lesson, false);
    expect(m.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/getpisara\.com\/api\/unsubscribe\?u=/);
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(m.html).toContain("Stop these emails");
  });

  it("links to the email settings page, which works without signing in", () => {
    const m = dailyLessonEmail(ctx, lesson, false);
    const link = m.text.match(/Email settings: (\S+)/)![1]!;
    const token = new URL(link).pathname.replace("/email/", "");
    expect(readEmailSettingsToken(token, secret)).toBe(userId);
  });
});

describe("lessons waiting email", () => {
  it("says how many are waiting and links to Home", () => {
    const m = lessonsWaitingEmail(ctx, 3);
    expect(m.subject).toBe("You have 3 lessons waiting");
    expect(m.text).toContain("https://getpisara.com/home");
  });
});

describe("resendMailer", () => {
  it("posts the message to Resend", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    await resendMailer({ apiKey: "re_123", from: "Pisara <l@x.com>", fetch: fakeFetch }).send(lessonsWaitingEmail(ctx, 3));
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.to).toEqual(["a@example.com"]);
    expect(body.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("throws when Resend refuses", async () => {
    const fakeFetch = (async () => new Response("bad key", { status: 401 })) as unknown as typeof fetch;
    await expect(resendMailer({ apiKey: "x", from: "x", fetch: fakeFetch }).send(lessonsWaitingEmail(ctx, 3))).rejects.toThrow("401");
  });
});

describe("smtpMailer", () => {
  it("hands the message, with its unsubscribe headers, to the SMTP transport", async () => {
    const sent: Parameters<SmtpTransport["sendMail"]>[0][] = [];
    const transport: SmtpTransport = { sendMail: async (m) => void sent.push(m) };
    const mailer = smtpMailer({ host: "smtp.gmail.com", port: 465, user: "p@gmail.com", password: "x", from: "Pisara <p@gmail.com>", transport });
    await mailer.send(lessonsWaitingEmail(ctx, 3));
    expect(sent[0]!.from).toBe("Pisara <p@gmail.com>");
    expect(sent[0]!.to).toBe("a@example.com");
    expect(sent[0]!.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("passes sending failures on", async () => {
    const transport: SmtpTransport = { sendMail: async () => { throw new Error("535 bad credentials"); } };
    const mailer = smtpMailer({ host: "h", port: 465, user: "u", password: "p", from: "f", transport });
    await expect(mailer.send(lessonsWaitingEmail(ctx, 3))).rejects.toThrow("535");
  });
});

describe("pickMailer", () => {
  const base: MailSettings = { smtpHost: "smtp.gmail.com", smtpPort: 465, smtpUser: null, smtpPassword: null, resendApiKey: null, from: "f" };
  it("refuses an SMTP user without a password, so a typo fails loudly", () => {
    expect(() => pickMailer({ ...base, smtpUser: "p@gmail.com" })).toThrow("SMTP_PASSWORD");
  });
  it("builds a mailer for each setup", () => {
    expect(pickMailer({ ...base, smtpUser: "p@gmail.com", smtpPassword: "x", resendApiKey: "re" })).toHaveProperty("send");
    expect(pickMailer({ ...base, resendApiKey: "re" })).toHaveProperty("send");
    expect(pickMailer(base)).toHaveProperty("send");
  });
});

describe("email settings tokens", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("round-trips and rejects forgeries", () => {
    const token = emailSettingsToken(id, "s");
    expect(readEmailSettingsToken(token, "s")).toBe(id);
    expect(readEmailSettingsToken(token, "other")).toBeNull();
    expect(readEmailSettingsToken(`00000000-0000-4000-8000-000000000002.${token.split(".")[1]}`, "s")).toBeNull();
    expect(readEmailSettingsToken("nonsense", "s")).toBeNull();
  });
});
