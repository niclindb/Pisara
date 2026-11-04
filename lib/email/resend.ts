// Sends email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).

import type { EmailMessage, Mailer } from "../jobs/types";

export function resendMailer(opts: {
  apiKey: string;
  /** e.g. "Pisara <lessons@getpisara.com>", on a domain verified in Resend. */
  from: string;
  fetch?: typeof fetch;
}): Mailer {
  const doFetch = opts.fetch ?? fetch;
  return {
    async send(message: EmailMessage) {
      const res = await doFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: opts.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers,
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
    },
  };
}

/** For local runs without a Resend key: prints instead of sending. */
export function consoleMailer(): Mailer {
  return {
    async send(m) {
      console.log(`[email] to=${m.to} subject=${JSON.stringify(m.subject)}\n${m.text}`);
    },
  };
}
