# Pisara

Pisara (Finnish for "a drop") sends you one short lesson a day from topics you choose, with a quick quiz and spaced review of what you missed.

- [User stories and MVP](docs/user-stories-and-mvp.md)
- [Design doc](docs/design.md)

## Code so far

The backend only. No pages yet: those wait for the design scheme.

| Path | What it is |
|---|---|
| `supabase/` | The database schema, access rules and their tests. See [supabase/README.md](supabase/README.md). |
| `lib/rules/` | The core rules from the design doc: topic picking, the inbox and "lessons waiting" reminders, review timing, the weekly recap, progress and prerequisites, milestones. Plain functions with no database access. Every tunable number is in `lib/rules/constants.ts`. |
| `lib/jobs/` | The daily delivery job and its database queries. |
| `lib/email/` | The daily lesson and "lessons waiting" emails, signed unsubscribe links, and sending through Resend. |
| `app/api/jobs/deliver` | The endpoint Vercel Cron calls at 11:00 UTC every day (`vercel.json`). |
| `app/api/unsubscribe` | One-click unsubscribe from email links and email apps. |

```sh
npm install
npm test           # rules, job and email tests
npm run typecheck
npm run build
```

`npm run test:db` also runs the delivery job against a real Postgres database. Set `TEST_DATABASE_URL` to an **empty test database** with the schema loaded (see supabase/README.md). It deletes all data in that database.

Every pull request runs all of these (`.github/workflows/test.yml`).

## Going live (one time)

1. **Supabase:** follow "Setting up" in [supabase/README.md](supabase/README.md).
2. **Resend:** create an account, add and verify your sending domain (for example getpisara.com), and create an API key.
3. **Vercel:** import the GitHub repo. Under Settings → Environment Variables, add every variable in [.env.example](.env.example). The daily job is registered automatically from `vercel.json`, and Vercel sends `CRON_SECRET` with each call.

Without `RESEND_API_KEY`, emails are printed to the Vercel log instead of sent, which is handy for a first test.
