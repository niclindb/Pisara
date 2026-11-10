# Going live

Everything here happens in your own accounts (Supabase, Gmail, Vercel), so it's yours to click through. It takes about 45 minutes. The site lives on the free `vercel.app` address; no domain is needed.

When you're done, the **Setup check** at the bottom of `/author` shows what's set and what's missing, and has a **Send me a test email** button.

Below, `https://pisara.vercel.app` stands for your site's address. Vercel shows the real one after the first deploy (step 3); use that everywhere instead.

## 1. Supabase (the database and sign-in)

1. Create a project at [supabase.com](https://supabase.com) (free plan, US East region). Save the database password somewhere safe.
2. Load the database: on your Mac, in this repo,
   ```sh
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref <your project ref>   # the ref is in the project's URL
   supabase db push --remote   # without --remote, newer versions aim at a local copy
   ```
3. Copy three values for later:
   - Project Settings → Database → Connection string → **Transaction pooler** (port 6543), with your password filled in. This is `DATABASE_URL`.
   - Project Settings → API: the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`) and the **anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

The sign-in settings come in step 4, once you know the site's address.

## 2. Gmail (sending email)

1. Make a Gmail account for Pisara (or use your own) and turn on 2-Step Verification.
2. Google Account → Security → **App passwords**: create one called "Pisara" and copy the 16 letters.

Gmail allows about 500 emails a day, which covers roughly 400 learners. Lessons, reminders and sign-in links share that limit.

## 3. Vercel (the website)

1. At [vercel.com](https://vercel.com), sign in with GitHub and **Add New → Project → import `niclindb/Pisara`**. Keep the defaults.
2. Before the first deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Transaction pooler string from step 1 |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from step 1 |
   | `CRON_SECRET` | a long random string (`openssl rand -base64 32` in Terminal) |
   | `UNSUBSCRIBE_SECRET` | another, different long random string. Never change it later, or old unsubscribe links stop working. |
   | `SITE_URL` | `https://pisara.vercel.app` (fix it after the first deploy if Vercel gives a different address; no slash at the end) |
   | `SMTP_USER` | the Gmail address |
   | `SMTP_PASSWORD` | the 16-letter app password |
   | `EMAIL_FROM` | `Pisara <the Gmail address>` |
   | `CONTACT_EMAIL` | the Gmail address. It's shown on the privacy and terms pages, and must be set before anyone else signs up. |

3. Deploy. If the address Vercel gives isn't what you put in `SITE_URL`, fix `SITE_URL` and choose **Redeploy**.

The daily lesson run is set up automatically from `vercel.json`. On the free Hobby plan, Vercel runs it some time within the scheduled hour, so lessons arrive between 8:00 and 9:00am Eastern.

## 4. Supabase sign-in settings

In the Supabase dashboard:

1. **Authentication → URL Configuration:** Site URL `https://pisara.vercel.app`. Redirect URLs: add `https://pisara.vercel.app/auth/confirm`. The redirect URL is the one that matters: the Supabase integration in Vercel can reset the Site URL to Vercel's long default address (`<project>-<team>.vercel.app`) after a deploy, so the sign-in emails don't use the Site URL (next steps).
2. **Authentication → Providers → Email:** keep it on. Set the email link expiry to `900` seconds.
3. **Authentication → Emails → Templates**, for both **Magic link** and **Confirm signup**: change the link to
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
   `{{ .RedirectTo }}` is the address the app asks for (`SITE_URL` + `/auth/confirm`), so the link follows `SITE_URL` in Vercel even if the Site URL above changes.
4. **Authentication → Emails → SMTP settings:** turn on custom SMTP. Host `smtp.gmail.com`, port `465`, username and sender email the Gmail address, password the app password, sender name `Pisara`.
5. **Authentication → Rate Limits:** raise "emails sent per hour" to about `30`.

## 5. Make yourself the author

1. Open the site and sign in with your own email.
2. In Supabase → **SQL Editor**, run (with your address):
   ```sql
   update public.profiles set role = 'author' where email = 'you@example.com';
   ```
3. Go to `https://pisara.vercel.app/author`. Check that every line of **Setup check** says Done, and press **Send me a test email**.

## 6. Add lessons

A topic only shows up for learners once it has **3 published lessons**. Two ways to add them:

- **In the app:** `/author` → add a category and a topic → write lessons in the lesson editor → Publish.
- **From files:** put Markdown files in `content/lessons/` (format in [content/README.md](../content/README.md)), put `DATABASE_URL=...` in a `.env.local` file in this repo on your Mac, and run `npm run lessons:import`. Imported lessons arrive as drafts: preview each one in `/author`, then publish.

Then fill in each topic's goal and description on its author page.

## 7. Try it for a few days

1. Sign up as a learner with a second email address (any address works; a `+pisara` alias on your Gmail is fine), pick a topic and read the first lesson.
2. The next morning, check the lesson email arrived, and that `/author` → **Daily runs** shows the run with nothing under Problems. If a run fails, authors get an email too.
3. Try the unsubscribe link in an email, and the privacy and terms pages.

Once that all works, share the link.

## Later

- **More than ~400 learners:** buy a domain, then switch email to Resend (set `RESEND_API_KEY`, verify the domain there, clear `SMTP_USER`) and point Supabase's SMTP settings at it. Set `SITE_URL` and the Supabase URLs to the new address.
- **New database changes:** when a pull request adds a file to `supabase/migrations/`, run `supabase db push --remote` again after merging it. The Setup check on `/author` shows if one is missing.
