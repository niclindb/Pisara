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
  /** Signs unsubscribe links. Any long random string; changing it breaks old links. */
  unsubscribeSecret: () => required("UNSUBSCRIBE_SECRET"),
  /** Public site address used in email links, e.g. https://getpisara.com */
  siteUrl: () => required("SITE_URL"),
  /** Supabase → Project Settings → API. The URL and anon key are public by design. */
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /** Without these, emails are printed to the log instead of sent. */
  resendApiKey: () => process.env.RESEND_API_KEY ?? null,
  /** Shown on the privacy and terms pages; null until the domain is set up. */
  contactEmail: () => process.env.CONTACT_EMAIL?.trim() || null,
  emailFrom: () => process.env.EMAIL_FROM ?? "Pisara <lessons@getpisara.com>",
};
