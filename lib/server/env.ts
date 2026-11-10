// Server-only settings, read from environment variables (set them in Vercel's
// project settings, and in .env.local for local runs). See .env.example.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  /** Postgres connection string (Supabase "Transaction pooler"). Server only. */
  databaseUrl: () => required("DATABASE_URL"),
  /** Vercel sends this as "Authorization: Bearer <CRON_SECRET>" on scheduled calls. */
  cronSecret: () => required("CRON_SECRET"),
  /** Signs unsubscribe and email settings links, and the daily email's sign-in link. Any long random string; changing it breaks old links. */
  unsubscribeSecret: () => required("UNSUBSCRIBE_SECRET"),
  /** Public site address used in email links, e.g. https://getpisara.com */
  siteUrl: () => required("SITE_URL"),
  /** Supabase → Project Settings → API. The URL and anon key are public by design. */
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /**
   * Supabase → Project Settings → API → service_role key (the Supabase Vercel
   * integration sets it). Server only. Lets the daily email's link sign learners
   * in; without it the link asks them to sign in as before.
   */
  supabaseServiceRoleKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  /** Gmail (or any SMTP server). Takes priority over Resend when SMTP_USER is set. */
  smtpHost: () => process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
  smtpPort: () => Number(process.env.SMTP_PORT?.trim() || 465),
  smtpUser: () => process.env.SMTP_USER?.trim() || null,
  smtpPassword: () => process.env.SMTP_PASSWORD?.replace(/\s/g, "") || null,
  /** Without SMTP or Resend settings, emails are printed to the log instead of sent. */
  resendApiKey: () => process.env.RESEND_API_KEY ?? null,
  /** Shown on the privacy and terms pages; null until the domain is set up. */
  contactEmail: () => process.env.CONTACT_EMAIL?.trim() || null,
  emailFrom: () => process.env.EMAIL_FROM ?? "Pisara <lessons@getpisara.com>",
};
