# Supabase

The database is defined entirely in `migrations/`. Don't change tables or access rules in the Supabase dashboard: add a new migration file instead, so every change is reviewed and in git.

## What's here

| Path | What it is |
|---|---|
| `migrations/20261103000000_initial_schema.sql` | All tables, the topic tree, triggers, and access rules (row-level security) from `docs/design.md` sections 4 and 9 |
| `migrations/20261104000000_lessons_only_from_your_path.sql` | Learners can only open lessons delivered to them, plus each topic's free preview: no reading ahead |
| `migrations/20261105020000_third_waiting_reminder.sql` | Lets `waiting_reminders_sent` reach 3, for the last "still here" email |
| `migrations/20261105010000_job_runs.sql` | A record of each daily run (totals and first error), shown on the author page. Server only: no access through the public API |
| `migrations/20261104010000_practice_problems.sql` | Optional practice problems per lesson (prompt + worked solution), readable by whoever can read the lesson |
| `migrations/20261105000000_three_levels.sql` | Lesson levels become 1 Beginner, 2 Intermediate, 3 Advanced |
| `tests/load_schema.sh` | Loads the stand-in and every migration, in order, into a database |
| `tests/stub_supabase.sql` | A tiny stand-in for Supabase's `auth` schema and roles, so the migration can be tested on plain Postgres |
| `tests/rls_test.sql` | Checks the access rules and constraints: visitors see only topics and preview lessons; learners see only their own data and the lessons delivered to them (plus previews), can't make themselves authors, can't write content; one daily lesson per day; no topic loops; deleting an account removes its data |

## How the pieces fit

- **Signed-out visitors** can browse categories and topics (through `visible_topics`, with lesson counts) and read each topic's first published lesson as a free preview, quiz included. Nothing else.
- **Sign-in** is Supabase Auth with email links. The first sign-in creates a row in `auth.users`, and a trigger creates the matching `profiles` row.
- **Writes go through the Next.js server** using the signed-in user's session. The access rules are the safety net if anything slips through.
- **The daily delivery job** runs on the server with the service role key, which skips the access rules. It's the only thing that creates deliveries and weekly recaps.
- **Picking, review and milestone logic** lives in TypeScript (`lib/rules/`), not in the database.
- **Authors:** set `role = 'author'` on a profile by hand in the SQL editor. Learners can't change their own role, email or id.
- **Deleting an account** (D9): the server deletes the `auth.users` row with the service role, and everything else cascades.

## Setting up (one time)

1. Create a project at [supabase.com](https://supabase.com). Save the database password.
2. Install the CLI: `brew install supabase/tap/supabase`
3. In this repo: `supabase init` (keeps the existing `migrations/` folder), then `supabase link --project-ref <your project ref>`
4. Apply the schema: `supabase db push`
5. Sign-in by email link (A1):
   - Authentication → Providers → Email: keep it on, and set the email link expiry to 900 seconds (15 minutes).
   - Authentication → URL Configuration: set the Site URL to your site (for example https://getpisara.com), and add `https://getpisara.com/auth/confirm` (and `http://localhost:3000/auth/confirm` for local runs) to the redirect URLs.
   - Authentication → Emails → Magic link (and Confirm signup): change the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
     This makes the link work on any device. Supabase's default link only works in the browser that asked for it, which breaks when someone asks on a laptop and opens the email on a phone.
   - Before anyone outside the team signs in: Authentication → Emails → SMTP settings. Supabase's built-in sender only mails your team members. Turn on custom SMTP and use the same Gmail account as the lesson emails: host `smtp.gmail.com`, port `465`, username the Gmail address, password the app password, sender email the Gmail address, sender name `Pisara`. Then raise Authentication → Rate Limits → "emails sent per hour" to about 30. If you later buy a domain, switch these to Resend.

For local development with Docker running, `supabase start` runs a full local copy and applies the migrations.

## Running the tests

Against any empty Postgres 15+ database:

```sh
createdb pisara_test
supabase/tests/load_schema.sh pisara_test
psql -v ON_ERROR_STOP=1 -d pisara_test -f supabase/tests/rls_test.sql
```

It prints `all checks passed` at the end, or stops at the first failed check.

The delivery job tests (`npm run test:db`) need their own empty database with only the stub and the migration loaded:

```sh
createdb pisara_jobs
supabase/tests/load_schema.sh pisara_jobs
TEST_DATABASE_URL=postgres://localhost/pisara_jobs npm run test:db
```
