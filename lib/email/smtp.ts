// Sends email over SMTP. Used with a Gmail account (smtp.gmail.com and an app
// password) while Pisara has no domain of its own; works with any SMTP server.

import nodemailer from "nodemailer";
import type { EmailMessage, Mailer } from "../jobs/types";

/** The one call we need from a nodemailer transport, so tests can pass a fake. */
export interface SmtpTransport {
  sendMail(mail: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    headers: Record<string, string>;
  }): Promise<unknown>;
}

export function smtpMailer(opts: {
  host: string;
  port: number;
  user: string;
  password: string;
  /** e.g. "Pisara <pisara.lessons@gmail.com>". Gmail only sends from the signed-in address. */
  from: string;
  transport?: SmtpTransport;
}): Mailer {
  const transport =
    opts.transport ??
    nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      // Port 465 starts encrypted; 587 upgrades with STARTTLS.
      secure: opts.port === 465,
      auth: { user: opts.user, pass: opts.password },
    });
  return {
    async send(message: EmailMessage) {
      await transport.sendMail({
        from: opts.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      });
    },
  };
}
