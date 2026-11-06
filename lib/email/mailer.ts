// Picks how email goes out, from the environment: SMTP (a Gmail account) if
// SMTP_USER is set, else Resend if RESEND_API_KEY is set, else the log.

import type { Mailer } from "../jobs/types";
import { consoleMailer, resendMailer } from "./resend";
import { smtpMailer } from "./smtp";

export interface MailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  resendApiKey: string | null;
  from: string;
}

export function pickMailer(s: MailSettings): Mailer {
  if (s.smtpUser) {
    if (!s.smtpPassword) throw new Error("SMTP_USER is set but SMTP_PASSWORD is missing");
    return smtpMailer({ host: s.smtpHost, port: s.smtpPort, user: s.smtpUser, password: s.smtpPassword, from: s.from });
  }
  if (s.resendApiKey) return resendMailer({ apiKey: s.resendApiKey, from: s.from });
  return consoleMailer();
}
