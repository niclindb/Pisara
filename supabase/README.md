# Supabase

The database is defined entirely in `migrations/`. Don't change tables or access rules in the Supabase dashboard: add a new migration file instead, so every change is reviewed and in git.

## What's here

| Path | What it is |
|---|---|
| `migrations/20261103000000_initial_schema.sql` | All tables, the topic tree, triggers, and access rules (row-level security) from `docs/design.md` sections 4 and 9 |
| `tests/stub_supabase.sql` | A tiny stand-in for Supabase's `auth` schema and roles, so the migration can be tested on plain Postgres |
| `tests/rls_test.sql` | Checks the access rules and constraints: learners see only their own data and published lessons, can't make themselves authors, can't write content; one daily lesson per day; no topic loops; deleting an account removes its data |

## How the pieces fit

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
5. Under Authentication → Providers, keep Email on and turn on magic links. Under Authentication → URL Configuration, set the site URL to your Vercel URL.

For local development with Docker running, `supabase start` runs a full local copy and applies the migrations.

## Running the tests

Against any empty Postgres 15+ database:

```sh
createdb pisara_test
psql -v ON_ERROR_STOP=1 -d pisara_test \
  -f supabase/tests/stub_supabase.sql \
  -f supabase/migrations/20261103000000_initial_schema.sql \
  -f supabase/tests/rls_test.sql
```

It prints `all checks passed` at the end, or stops at the first failed check.
