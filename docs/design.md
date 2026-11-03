# Pisara: Design Doc

_Draft 2, November 3, 2026. Updated after the design review (see section 13). Builds on [user-stories-and-mvp.md](user-stories-and-mvp.md); story IDs like B1 refer to that document._

## 1. Overview

Pisara is a web app that delivers one short lesson a day, picked at random from the learner's chosen topics and weighted by interest. Lessons arrive in an inbox and by email. Each lesson ends with a short multiple-choice quiz and one spaced review question. Authors add categories, topics, and lessons through built-in author tools.

### Goals for the MVP
- One person can build, run, and pay for it (ideally on free tiers).
- Every learner gets exactly one lesson a day, from a single daily run.
- The picking, review, and milestone rules are simple, tested functions, easy to tune later.
- Data needed to measure the success targets (week-3 retention, quiz accuracy) is recorded from day one.

### Non-goals for the MVP
- Native mobile apps, push notifications
- AI-generated lessons
- Sign-in other than email links
- Contributors, payments, social features
- Scaling past a few thousand learners

## 2. Architecture

```mermaid
flowchart LR
  L[Learner's browser] -->|pages, quiz answers| W[Next.js web app on Vercel]
  A[Author's browser] -->|author tools| W
  W -->|read/write data| DB[(Supabase Postgres)]
  W -->|email sign-in links| AU[Supabase Auth]
  C[Daily scheduled job, Vercel Cron] -->|calls /api/jobs/deliver| W
  W -->|daily + weekly emails| E[Resend email]
  E --> L
```

One web app does everything: pages for learners, pages for authors, and a few API routes. Once a day, a scheduled job calls one of those routes to deliver that day's lesson to every learner.

## 3. Tech stack

| Part | Choice | Why | Alternatives |
|---|---|---|---|
| Language | **TypeScript** | One language for pages, server code, and emails. Catches mistakes early. | — |
| Web framework | **Next.js** (App Router) | Pages and API routes in one project; huge community; first-class hosting on Vercel. | Remix, SvelteKit |
| Database | **Supabase Postgres** | Real relational database with a free tier and a web dashboard for looking at data. | Neon, PlanetScale |
| Sign-in | **Supabase Auth** (email sign-in links) | Email sign-in links built in (A1). Google/Apple can be switched on later (A7) without changing accounts. | Auth.js, Clerk |
| Email | **Resend** + React Email | Simple API, emails written as components, supports the one-click unsubscribe header. | Postmark, Amazon SES |
| Hosting | **Vercel** | Deploys automatically from GitHub. | Netlify, Render |
| Scheduled jobs | **Vercel Cron** calling an API route once a day (11:00 UTC) | Delivery runs once a day for everyone, which Vercel's free plan supports. If learners can choose their own time later (A8), this moves to an hourly job, for example Supabase Cron. | Supabase Cron, GitHub Actions schedule |
| Styling | **Tailwind CSS** | Fast to build a clean, mobile-friendly UI. | Plain CSS modules |
| Lesson text | **Markdown** | Easy to write; supports headings, lists, bold, examples. | Rich-text editor (later) |
| Tests | **Vitest** | Fast unit tests for the picking and review rules. | Jest |

_Free-tier limits change. Check each service's current limits before launch. At the MVP's size (tens of learners) all of these should be free or close to it._

## 4. Data model

```mermaid
erDiagram
  categories ||--o{ topics : contains
  topics ||--o{ topics : "sub-topics"
  topics ||--o{ lessons : "path of"
  lessons ||--o{ questions : has
  profiles ||--o{ user_topics : chooses
  topics ||--o{ user_topics : ""
  profiles ||--o{ deliveries : receives
  lessons ||--o{ deliveries : ""
  profiles ||--o{ answers : gives
  questions ||--o{ answers : ""
  profiles ||--o{ review_items : schedules
  questions ||--o{ review_items : ""
  profiles ||--o{ milestones : earns
  profiles ||--o{ weekly_recaps : gets
```

### Content (written by authors)

**categories**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | e.g. "Science" |
| position | int | Display order |

**topics**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| category_id | uuid | Set on top-level topics. Sub-topics belong to their parent's category. |
| parent_id | uuid | Null for a top-level topic. Otherwise the parent topic, which is also its prerequisite (A3a). Any depth. |
| position | int | Display order among siblings |
| name | text | e.g. "Astronomy", or "Black holes" under "Stars" |
| goal | text | e.g. "Understand the life cycle of a star" (A3) |
| description | text | Short blurb for the topic picker |
| outline | text | Author's path outline, Markdown (E2) |

A topic is shown to learners when it has at least 3 published lessons (E4). A parent with too few lessons is still shown as a heading if any of its sub-topics are shown. Every topic in the tree can be picked, not just the deepest ones.

**lessons**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| topic_id | uuid | |
| position | int | Order in the path. Gaps allowed so lessons can be inserted. |
| level | int | Difficulty, 1 and up (E6) |
| title | text | |
| body | text | Markdown, any length |
| reading_minutes | int | Auto-estimated at 200 words/min, editable (E6) |
| status | enum | `draft`, `published`, `unpublished`. Unpublished lessons stay in existing inboxes and history but are never picked again, and their questions are left out of review (E7). |
| published_at | timestamptz | |

**questions**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| lesson_id | uuid | |
| position | int | |
| prompt | text | |
| options | text[] | 2–4 choices |
| correct_index | int | |
| explanation | text | One line, shown after answering (C2) |

### Learner data

**profiles** (one per account; linked to Supabase Auth by user id)
| Column | Type | Notes |
|---|---|---|
| id | uuid | Same as the auth user id |
| email | text | Unique. Accounts are keyed by email (A7). |
| display_name | text | Optional, up to 50 characters. Used in greetings; never shown to other learners. |
| time_zone | text | IANA name, e.g. "America/Chicago". Decides the learner's local date and recap day (A5). |
| weekly_recap_day | int | 0–6, default Sunday (C7) |
| emails_enabled | bool | One-click pause/unsubscribe (B3) |
| paused_until | date | Vacation pause (D6) |
| waiting_reminders_sent | int | 0, 1 or 2. How many "lessons waiting" emails went out since the inbox filled (B6). Reset to 0 when a lesson is read. |
| waiting_reminder_sent_on | date | Local date of the last "lessons waiting" email |
| role | enum | `learner` or `author` |
| created_at | timestamptz | |

**user_topics**
| Column | Type | Notes |
|---|---|---|
| user_id, topic_id | uuid | Primary key together |
| interest | int | 0 = Off, otherwise 1–5. The level is also the weight (A4). |
| last_delivered_at | timestamptz | Used for the freshness boost (B2) |

**deliveries** (the inbox)
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| lesson_id | uuid | |
| kind | enum | `daily` or `extra` (B7) |
| local_date | date | The learner's local date it was delivered for |
| delivered_at | timestamptz | |
| read_at | timestamptz | Null = unread, so it's in the inbox (B6) |
| quiz_completed_at | timestamptz | Null if quiz skipped |

Unique on (user_id, local_date) where kind = `daily`, so a learner can never get two daily lessons on one day, even if the job runs twice.

Progress in a topic = the lessons in it the learner has **read** (`read_at` is set). Their level in a topic = the highest level among those lessons. The next lesson = the lowest-position published lesson in that topic not yet delivered to them.

**answers**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| question_id | uuid | |
| context | enum | `lesson`, `review`, `weekly` |
| chosen_index | int | |
| correct | bool | |
| answered_at | timestamptz | |

**review_items** (C5, C6). Created only when a learner misses a question.
| Column | Type | Notes |
|---|---|---|
| user_id, question_id | uuid | Primary key together |
| step | int | 0–4, index into the review intervals |
| due_on | date | Learner's local date |
| last_correct | bool | |

**weekly_recaps** (C7)
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| week_start | date | |
| question_ids | uuid[] | 5 questions |
| completed_at | timestamptz | |

**milestones** (D3)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | |
| kind | text | e.g. `lessons_10`, `level_up:astronomy:2`, `topic_goal:astronomy` |
| achieved_at | timestamptz | |
| shown_at | timestamptz | Null until shown |

Unique on (user_id, kind), so each milestone is earned once.

## 5. Core rules

These live in one folder (`lib/rules/`) as plain functions with no database access, so they can be unit tested directly.

### 5.1 Picking the daily topic (B1, B2)

```text
eligible topics = topics where
    interest > 0
    and the topic has a published lesson not yet delivered to this learner
    and NOT (this topic was picked on each of the last 2 days
             and some other topic is eligible)

for each eligible topic:
    weight    = interest                            // 1–5; Off topics aren't eligible
    days      = days since last_delivered_at (never = 10)
    freshness = 1 + min(days, 10) * 0.10            // up to 2×
    score     = weight * freshness

pick one topic at random, with probability score / sum(scores)
```

The random function is passed in so tests can control it.

### 5.2 The inbox (B6)
- Before picking, count the learner's unread deliveries. If there are 3, skip the pick and the daily email for today.
- "You have 3 lessons waiting" goes out on the first day the inbox is full and once more 7 days later, then never again while it stays full. `waiting_reminders_sent` tracks this.
- Reading a lesson sets `read_at` and resets `waiting_reminders_sent` to 0. Finishing or skipping the quiz doesn't change inbox status.

### 5.3 Review scheduling (C5, C6)

```text
INTERVALS = [1, 3, 7, 21, 60]   // days

after an answer to a lesson quiz question:
    if wrong and no review item exists: create one at step 0, due tomorrow
    if right: nothing (questions answered right the first time never enter review)

after an answer to a review or weekly recap question:
    if correct: step = min(step + 1, 4)
    else:       step = 0
    due_on = today + INTERVALS[step]
```

A wrong answer is due tomorrow. A right one comes back in 3, then 7, 21, and 60 days.

**Choosing review questions after a lesson quiz:** up to 2 due items, earliest `due_on` first, preferring topics different from today's lesson. Items whose lesson is unpublished are skipped. If nothing is due, no review questions. Items not shown stay due and come up on later days, oldest first.

_Why only missed questions:_ if every question entered review, a learner would add 2–3 items a day, each needing about 5 more answers, or roughly 12 review answers a day. With only missed questions (15–40% at the target accuracy), up to 2 a day plus the 5-question weekly recap roughly keeps up.

### 5.4 Weekly recap (C7)
On the learner's recap day, if they read 2 or more lessons in the past 7 days, build a recap of 5 questions: due review items first, then questions from this week's lessons they got wrong, then any from this week's lessons. It appears at the top of the inbox, and that day's email mentions it.

### 5.5 Milestones (D3)
Checked after each quiz is submitted:
- Lessons read: 1, 10, 25, 50, 100, then every 100
- A new level reached in a topic (the highest level of lesson read in it goes up)
- All published lessons in a topic's path read (topic goal reached)
- A review question answered correctly at step 3 or higher (remembered after 21+ days)

At most one milestone is shown per day. If several are earned, the biggest is shown and the rest are recorded without being shown. Wording never mentions days in a row or missed days.

### 5.6 Sub-topics and prerequisites (A3a, D8)
- **Prerequisite note:** when a learner turns on a sub-topic and hasn't read every published lesson in its parent, show "This builds on {parent}, which you haven't finished." Never block. Only the direct parent is checked.
- **Go deeper:** when a learner reads the last published lesson in a topic that has visible sub-topics, offer those sub-topics on the screen after the quiz and on the progress page.
- Picking (5.1) treats every turned-on topic the same, whatever its depth.

## 6. Scheduled jobs

### Daily delivery job
Vercel Cron calls `POST /api/jobs/deliver` once a day at 11:00 UTC with a secret key. (11:00 UTC is a placeholder: 6am in New York, 3am in California, 1pm in Finland. Aim it at the first learners' morning.)

```text
for each learner where
    emails are enabled or they have used the site in the last 14 days,
    and paused_until is empty or in the past:

    local date = today in their time zone
    if a daily delivery already exists for that local date: skip
    if inbox has 3 unread: send "lessons waiting" email if due (5.2); skip
    pick topic (5.1); find next lesson; insert delivery
    if it's their weekly recap day: build recap (5.4)
    send daily email
```

- Each learner is handled separately, so one failure doesn't stop the rest. Failures are logged.
- The unique (user_id, local_date) rule makes the job safe to run twice.
- Everyone gets the email at the same moment, so for some learners it arrives at night. That's the trade-off for one simple run; choosing a time (A8) can come later.

### Welcome lesson (A6)
When a learner finishes onboarding, the same delivery logic runs once immediately, so they don't wait until tomorrow.

## 7. Pages

### Learner
| Path | What it shows | Stories |
|---|---|---|
| `/` | Landing page with sign-up | A1 |
| `/sign-in` | Enter email; "check your inbox" message | A1 |
| `/onboarding` | Pick topics by category as an expandable tree, set interest 1–5, prerequisite notes | A2–A4, A3a |
| `/inbox` | Home after sign-in. Current lesson on top, other unread below, weekly recap if any, "Get an extra lesson" button | B6, B7, C7 |
| `/lessons/[id]` | Lesson with reading time, then the quiz and up to 2 review questions; results with explanations; milestone if earned; "Go deeper" when a path is finished | B4, B5, C1–C3, C5, D3, D8 |
| `/progress` | Per-topic level and progress toward goal, grouped by the topic tree; "Go deeper" suggestions; review accuracy; past lessons | D1, D8, C9, D5 |
| `/topics` | The topic tree: change interest levels, add or remove topics, prerequisite notes; note if more than 8 are on | D2, D4, A3a |
| `/settings` | Time zone, recap day, pause, email on/off, delete account | A5, D6, B3, D9 |

### Author (role = author only)
| Path | What it shows | Stories |
|---|---|---|
| `/author` | Categories and the topic tree, with lesson counts by status | E1 |
| `/author/topics/[id]` | Topic details, parent topic, goal, outline, sub-topics, ordered lesson list (drag to reorder) | E1, E2 |
| `/author/lessons/[id]` | Lesson editor: Markdown with live preview, questions, level, reading time, publish/unpublish | E4–E7 |

## 8. Emails

| Email | When | Contents |
|---|---|---|
| Sign-in link | On request | Link valid 15 minutes, single use |
| Daily lesson | Daily run | Topic, title, reading time, "Read lesson" button. Mentions the weekly recap on recap day. |
| Lessons waiting | Daily run, inbox full: first day, then 7 days later, then never again | "You have 3 lessons waiting," button to inbox |

Every learner email includes a one-click pause/unsubscribe link and the standard `List-Unsubscribe` header, so email apps show their own unsubscribe button.

Emails link to the lesson page; lessons aren't included in full in the email, so reading and quizzes always happen on the site, where they're recorded.

## 9. Security and privacy

- **Database access rules (Supabase row-level security):** signed-out visitors can browse categories and topics and read each topic's first published lesson as a free preview, so they can try Pisara before signing up. Learners can read only published content and only their own learner data. Only authors can write content.
- **Author role** is set by hand in the database for the MVP.
- **Job endpoint** requires a secret key stored in environment variables.
- **Lesson Markdown is sanitized** when rendered, so no scripts can run.
- **Data collected:** email, an optional display name, time zone, settings, and learning activity. No tracking pixels, no third-party analytics in the MVP.
- **Delete account** removes the profile and all learner data (D9).

## 10. Measuring success

The success targets in the MVP doc come straight from the database, with no analytics service needed:

| Measure | Source |
|---|---|
| Lessons opened per week | `deliveries.read_at` |
| Learners active 3+ days a week | Distinct `local_date` of reads per learner per week |
| Quiz accuracy | `answers.correct` where context = `lesson` |
| Review accuracy over time | `answers.correct` where context = `review`, by week |

A simple author-only `/author/stats` page can show these later. For the MVP, saved SQL queries in the Supabase dashboard are enough.

## 11. Testing

- **Unit tests** for everything in `lib/rules/`: topic picking (including the "not 3 days in a row" rule and odds over many runs), review steps (missed questions only, up to 2 a day), recap building, milestones, inbox limit and "lessons waiting" reminders, prerequisite notes and "Go deeper".
- **Time zone tests** for the delivery job: local dates across several zones (including ones where 11:00 UTC is already tomorrow), daylight saving changes, and the job running twice.
- **Manual checklist** before each release: sign up, onboard, read, quiz, get emails, author publishes a lesson.

## 12. Build plan

| Phase | What gets built | Ends with |
|---|---|---|
| 1. Setup | Next.js project, Supabase project, database tables, deploy to Vercel | Empty app live at a URL |
| 2. Author tools | Categories, topic tree, lesson editor, publish | Author can add real lessons |
| 3. Content | Write 3+ lessons for each of a few topics | Enough content to test with |
| 4. Learner flow | Sign-in, onboarding, inbox, lesson page, quiz, progress | Founder can use it by hand |
| 5. Delivery | Picking rules, daily job, daily and "lessons waiting" emails | Lessons arrive on their own |
| 6. Review & celebrations | Review questions, weekly recap, milestones | Full MVP |
| 7. Founder test | Use it daily for 2 weeks, fix what's annoying | Ready to open sign-up |

## 13. Decisions in this doc

- **Email provider:** Resend.
- **Tech stack:** Next.js (React) + TypeScript, Supabase (database, sign-in), Vercel (hosting, daily scheduled job).
- **Weekly recap delivery:** in the inbox, with a mention in that day's lesson email. No separate email.
- **Delivery time:** one run a day for everyone, at 11:00 UTC until a final time is picked. Learners don't choose a time in the MVP (A8 is Later). _Changed in draft 2; draft 1 had an hourly job and a chosen hour._
- **"Lessons waiting" email:** first day the inbox is full, again 7 days later, then never again until a lesson is read.
- **Interest levels:** Off, or 1–5 where the level is the weight.
- **Sub-topics:** topics form a tree of any depth; any topic can be picked; the parent is a soft prerequisite.
- **Review:** only missed questions enter review; up to 2 review questions a day.
- **Progress:** counts read lessons, not delivered ones.
- **Unpublishing:** lessons stay where learners already have them, but leave picking and review.

## 14. Open questions

1. **Daily run time:** 11:00 UTC is a placeholder. Pick a time aimed at the first learners' morning.
2. **Domain:** register pisara.co or getpisara.com before the first deploy so emails come from the real domain.
3. **Look and feel:** colors, fonts, logo. Could be a short design pass during phase 4.
4. **Lesson images:** text only for the MVP, or allow images in lessons? Images need file storage (Supabase Storage can do it).
