// The "Setup check" on the author page: which settings and database changes a
// live site still needs. Plain functions over plain values, so they're easy to
// test; the page passes in the environment and what the database reports.

export type CheckState = "ok" | "todo" | "problem";

export interface SetupCheck {
  label: string;
  state: CheckState;
  /** What's set, or what to do about it. Never includes a secret. */
  detail: string;
}

export interface SetupInput {
  env: Record<string, string | undefined>;
  /** Each migration's marker, from `migrationMarkers` below. */
  migrations: Record<MigrationName, boolean>;
}

export const MIGRATIONS = [
  "lessons only from your path",
  "practice problems",
  "three levels",
  "daily run log",
  "third waiting reminder",
] as const;
export type MigrationName = (typeof MIGRATIONS)[number];

/** One query that tells whether each migration after the first has been applied. */
export const MIGRATION_MARKERS_SQL = `
  select
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lessons'
            and policyname = 'read delivered or preview lessons') as "lessons only from your path",
    to_regclass('public.practice_problems') is not null as "practice problems",
    exists (select 1 from pg_constraint where conname = 'lessons_level_check'
            and pg_get_constraintdef(oid) like '%<= 3%') as "three levels",
    to_regclass('public.job_runs') is not null as "daily run log",
    exists (select 1 from pg_constraint where conname = 'profiles_waiting_reminders_sent_check'
            and pg_get_constraintdef(oid) like '%<= 3%') as "third waiting reminder"
`;

const set = (v: string | undefined) => Boolean(v?.trim());

/** The address part of `Pisara <a@b.com>`, or the whole string if there are no brackets. */
export function addressOf(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m?.[1] ?? from).trim().toLowerCase();
}

export function setupChecks({ env, migrations }: SetupInput): SetupCheck[] {
  const checks: SetupCheck[] = [];

  // Site address: email links and sign-in links are built from it.
  const site = env.SITE_URL?.trim();
  if (!site) {
    checks.push({ label: "Site address", state: "problem", detail: "SITE_URL isn't set." });
  } else if (!site.startsWith("https://") || /localhost|127\.0\.0\.1/.test(site)) {
    checks.push({ label: "Site address", state: "problem", detail: `SITE_URL is ${site}. Set it to the live address, e.g. https://pisara.vercel.app.` });
  } else if (site.endsWith("/")) {
    checks.push({ label: "Site address", state: "problem", detail: `SITE_URL ends with "/". Take the slash off: ${site.replace(/\/+$/, "")}` });
  } else {
    checks.push({ label: "Site address", state: "ok", detail: site });
  }

  // Secrets: only whether they're set, never their values.
  const secrets = ["CRON_SECRET", "UNSUBSCRIBE_SECRET"].filter((name) => !set(env[name]));
  checks.push(
    secrets.length
      ? { label: "Secrets", state: "problem", detail: `${secrets.join(" and ")} ${secrets.length > 1 ? "aren't" : "isn't"} set. Use a long random string, e.g. from \`openssl rand -base64 32\`.` }
      : { label: "Secrets", state: "ok", detail: "CRON_SECRET and UNSUBSCRIBE_SECRET are set." },
  );

  // The "Begin lesson" link in the daily email signs learners in with this key (lesson-link.ts).
  checks.push(
    set(env.SUPABASE_SERVICE_ROLE_KEY)
      ? { label: "Lesson email sign-in", state: "ok", detail: "The link in the daily email signs learners in." }
      : { label: "Lesson email sign-in", state: "todo", detail: "SUPABASE_SERVICE_ROLE_KEY isn't set, so the link in the daily email asks learners to sign in first. Copy the service_role key from Supabase → Project Settings → API." },
  );

  // Email: Gmail (SMTP) wins over Resend; with neither, emails only go to the log.
  const smtpUser = env.SMTP_USER?.trim();
  const smtpHost = env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const gmail = /(^|\.)gmail\.com$|(^|\.)google(mail)?\.com$/i.test(smtpHost);
  const from = env.EMAIL_FROM?.trim();
  if (smtpUser) {
    if (!set(env.SMTP_PASSWORD)) {
      checks.push({ label: "Email", state: "problem", detail: `SMTP_USER is set, but SMTP_PASSWORD (the app password or API key) isn't.` });
    } else if (gmail && from && addressOf(from) !== smtpUser.toLowerCase()) {
      checks.push({
        label: "Email",
        state: "problem",
        detail: `EMAIL_FROM uses ${addressOf(from)}, but Gmail only sends from ${smtpUser}. Set EMAIL_FROM to "Pisara <${smtpUser}>".`,
      });
    } else if (!gmail && !from) {
      checks.push({ label: "Email", state: "problem", detail: `Sending through ${smtpHost}, but EMAIL_FROM isn't set. Set it to the sender address you verified there.` });
    } else {
      const sender = from ? addressOf(from) : smtpUser;
      checks.push({ label: "Email", state: "ok", detail: `Sending from ${sender} through ${smtpHost}. Use "Send me a test email" below to make sure it works.` });
    }
  } else if (set(env.RESEND_API_KEY)) {
    checks.push({ label: "Email", state: "ok", detail: `Sending through Resend from ${env.EMAIL_FROM?.trim() || "the default address"}.` });
  } else {
    checks.push({ label: "Email", state: "todo", detail: "Not set up, so lesson emails only go to the Vercel log. Set SMTP_USER and SMTP_PASSWORD to send from Gmail." });
  }

  // Contact address on privacy and terms: needed before anyone else signs up.
  checks.push(
    set(env.CONTACT_EMAIL)
      ? { label: "Contact address", state: "ok", detail: `${env.CONTACT_EMAIL!.trim()} is shown on the privacy and terms pages.` }
      : { label: "Contact address", state: "todo", detail: "CONTACT_EMAIL isn't set, so privacy and terms have no way to reach you. Set it before anyone else signs up (the Gmail address works)." },
  );

  // Database: every migration applied.
  const missing = MIGRATIONS.filter((m) => !migrations[m]);
  checks.push(
    missing.length
      ? { label: "Database", state: "problem", detail: `Not applied yet: ${missing.join(", ")}. Run \`supabase db push --remote\` (see supabase/README.md).` }
      : { label: "Database", state: "ok", detail: "Every migration is applied." },
  );

  return checks;
}
