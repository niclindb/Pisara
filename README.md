# Pisara

Pisara (Finnish for "a drop") sends you one short lesson a day from topics you choose, with a quick quiz and spaced review of what you missed.

- [User stories and MVP](docs/user-stories-and-mvp.md)
- [Design doc](docs/design.md)
- [Design scheme](docs/design-scheme.md): colors, fonts, spacing

## Code so far

The backend, plus the first pages: sign-in and the author tools. The learner pages come next.

| Path | What it is |
|---|---|
| `supabase/` | The database schema, access rules and their tests. See [supabase/README.md](supabase/README.md). |
| `lib/rules/` | The core rules from the design doc: topic picking, the inbox and "lessons waiting" reminders, review timing, the weekly recap, progress and prerequisites, milestones. Plain functions with no database access. Every tunable number is in `lib/rules/constants.ts`. |
| `lib/jobs/` | Server-side work on the database: the daily delivery job (`deliver.ts`), opening a lesson and its practice problems (`lessons.ts`), the Home, lesson, history and progress pages (`learner.ts`), settings, email preferences and account deletion (`settings.ts`), extra lessons and the first lesson after onboarding (`extra.ts`), quizzes, review and the weekly recap (`quiz.ts`), choosing topics and onboarding (`topics.ts`), and the author tools (`author.ts`). |
| `lib/email/` | The daily lesson and "lessons waiting" emails, signed unsubscribe links, and sending through Gmail (SMTP) or Resend. |
| `lib/server/` | Server-only helpers: settings from environment variables, the database connection, and sign-in with Supabase Auth (`auth.ts`). |
| `app/author/` | The author tools: categories and topic trees (`/author`), the topic editor, and the lesson editor with live preview, practice problems and quiz. Only authors can open them; everyone else gets the not-found page. |
| `app/sign-in/` | Sign in with an email link. |
| `app/globals.css`, `components/` | The design scheme as CSS variables and Tailwind colors (checked against `lib/a11y/color-pairs.ts`), and the shared buttons, cards, forms and lesson view. |
| `app/auth/confirm`, `app/auth/sign-out` | Where the sign-in email link lands (then onboarding or Home), and signing out. `proxy.ts` keeps the sign-in session fresh. |
| `app/api/jobs/deliver` | The daily lesson run at 8am Eastern. Vercel Cron calls it at 12:00 and 13:00 UTC (`vercel.json`), and only the call in New York's 8am hour runs. |
| `app/api/unsubscribe` | One-click unsubscribe from email links and email apps. |

```sh
npm install
npm test           # rules, job and email tests
npm run typecheck
npm run build
```

`npm run test:db` also runs the delivery job against a real Postgres database. Set `TEST_DATABASE_URL` to an **empty test database** with the schema loaded (see supabase/README.md). It deletes all data in that database.

`npm run lint` checks the code, including accessibility rules. `npm run test:pages` opens every page in a real browser as a visitor, a learner and an author, checks it with axe, and runs sign-in, onboarding and a quiz with the keyboard only. Set `E2E_DATABASE_URL` to another **empty test database** with the schema loaded; the tests replace its data with a small sample.

Every pull request runs all of these (`.github/workflows/test.yml`).

### Trying the pages locally

`npm run dev` needs a database with the schema loaded. Without a Supabase project, you can pretend to be signed in: set `DEV_SIGNED_IN_USER_ID` in `.env.local` to the id of a user in that database (give them `role = 'author'` to see the author tools; a new learner starts at onboarding). This only works in `npm run dev`, never in a production build.

## Going live

Follow [docs/going-live.md](docs/going-live.md): Supabase, Gmail, Vercel, then making yourself the author and adding lessons. Once the site is up, the **Setup check** at the bottom of `/author` shows anything still missing and can send you a test email.

Without `SMTP_USER` or `RESEND_API_KEY`, emails are printed to the Vercel log instead of sent, which is handy for a first test.
