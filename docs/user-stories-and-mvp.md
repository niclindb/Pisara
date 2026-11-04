# Pisara: User Stories & MVP

_Draft 5, November 4, 2026. Draft 4 added one daily run, interest levels 1–5, sub-topics, and review only for missed questions. Draft 5 adds practice problems, makes the quiz optional for every lesson, and adds the free preview for visitors, the optional display name, read-on-open, and no reading ahead._

**Pisara** is Finnish for "a drop," like a raindrop. Small lessons, drop by drop, add up to real knowledge. Say it PEE-sah-rah.

## 1. Product summary

Pisara sends you a short lesson on a topic you care about, picked at random from the topics you've chosen. You set how often each topic should come up. A lesson can come with practice problems to work through and a quick quiz, plus up to 2 review questions from things you learned earlier. Once a week you get a short recap quiz, and once a month a look back at what you've learned. Lessons in each topic get harder as you go and build toward a goal.

**Why it's different from asking a chatbot:** it remembers what you've learned, puts lessons in order, tests you again later, and shows up on its own.

## 2. Who it's for

| User | Description | MVP? |
|---|---|---|
| **Learner** | A curious adult with a few topics they've "always meant to learn" but no time for courses. Reads on their phone or laptop, often in the morning. | Yes |
| **Author** (admin) | Adds categories and topics, writes lessons, and publishes them. At first, this is just the founder. | Yes |
| **Contributor** | A learner who suggests or writes lessons for a topic, which an author reviews before publishing. | No, later |

## 3. Key concepts

- **Category:** a group of topics, such as Science or Languages.
- **Topic:** one subject, such as Astronomy. Each topic has a **path**. Topics can have **sub-topics** that go deeper, and those can have their own, to any depth (Astronomy → Stars → Black holes). Every topic in the tree, not just the deepest ones, has its own goal and path and can be picked.
- **Prerequisite:** a topic's parent. Picking a sub-topic before finishing its parent shows a gentle note, never a block.
- **Path:** an ordered list of lessons building toward a stated **goal**, for example "Understand the life cycle of a star." Lessons have a **level** (difficulty). Paths grow over time: authors publish lessons one at a time.
- **Lesson:** a title, body text, and estimated reading time. It can also have practice problems and a quiz of up to 3 questions; both are optional.
- **Practice problem:** an exercise that helps the learner apply a lesson, with a worked solution they can reveal. Not graded, and never enters review.
- **Inbox:** the learner's unread lessons, up to 3. The newest one is the "current lesson."
- **Interest level:** how often a learner wants a topic. Off, or a level from 1 to 5. The level is the weight, so a topic at 5 comes up 5× as often as one at 1.
- **Freshness boost:** a topic's chance goes up 10% per day since it last came up, up to 2×.
- **Review item:** a quiz question the learner missed, scheduled to come back. Wrong answers return sooner, right answers later and later.
- **Milestone:** a moment worth congratulating, such as 10 lessons finished or a level reached in a topic.

## 4. User stories

Priority: **Must** = in the MVP · **Should** = in the MVP if time allows · **Later** = after the MVP.

### A. Getting started

| ID | Story | Priority |
|---|---|---|
| A1 | As a learner, I want to sign up with just my email so I can start without creating a password. | Must |
| A2 | As a learner, I want to browse categories and pick the topics I'm interested in so my lessons are about things I care about. | Must |
| A3 | As a learner, I want to see each topic's goal and number of lessons before I pick it so I know what I'm signing up for. | Must |
| A3a | As a learner, I want to see a topic's sub-topics and pick any of them, not just the deepest ones, so I can start at the level that suits me. | Must |
| A4 | As a learner, I want to set an interest level for each topic so topics I care about more come up more often. | Must |
| A5 | As a learner, I want my lesson to arrive at the same time every day so it becomes part of my routine. | Must |
| A6 | As a learner, I want to get my first lesson right after signing up so I see what the app is like immediately. | Should |
| A7 | As a learner, I want to sign in with Google or Apple so I don't have to wait for an email. | Later |
| A8 | As a learner, I want to choose what time my lesson arrives so it fits my routine. | Later |
| A9 | As a visitor, I want to browse topics and read each topic's first lesson before signing up so I can see what Pisara is like. | Must |
| A10 | As a learner, I want to give an optional display name so greetings feel personal. | Should |

**Acceptance criteria**
- A1: Anyone can create an account. Entering an email sends a sign-in link that works once and expires after 15 minutes. No password anywhere.
- A2/A4: The learner must turn on at least one topic before finishing setup. Every topic starts at "Off," and one tap turns it on at level 3.
- A3a: Picking a sub-topic whose parent the learner hasn't finished shows a note such as "This builds on Stars, which you haven't finished." The learner can carry on anyway.
- A5: Lessons go out once a day for everyone, at 11:00 UTC. The learner's time zone is detected automatically (and can be changed) and decides what counts as "today" and their weekly recap day.
- A7: Accounts are linked by email address, so adding a sign-in method later doesn't create duplicate accounts.
- A9: Signed-out visitors can browse categories and topics and read each visible topic's first published lesson, with its practice problems and quiz. Their answers aren't saved. The preview ends with a sign-up prompt.
- A10: Up to 50 characters, set during onboarding or in settings. Never shown to other learners.

### B. Daily lesson

| ID | Story | Priority |
|---|---|---|
| B1 | As a learner, I want one lesson a day, picked at random from my topics and weighted by my interest levels, so every day is a bit of a surprise. | Must |
| B2 | As a learner, I want topics I haven't seen in a while to be more likely to come up so I don't forget them. | Must |
| B3 | As a learner, I want a daily email with the lesson title, topic, and reading time so I can decide when to read it. | Must |
| B4 | As a learner, I want to read the lesson in a clean, readable page on my phone or computer. | Must |
| B5 | As a learner, I want to see the estimated reading time before I start so I can save longer lessons for later. | Must |
| B6 | As a learner, I want an inbox that holds my unread lessons so I can always get to my current lesson, and a missed day isn't a lost lesson. | Must |
| B7 | As a learner, I want to ask for an extra lesson when I'm in the mood so I can learn more on days I have time. | Should |
| B8 | As a learner, I want to see why today's topic was picked so the randomness feels fair. | Later |

**Acceptance criteria**
- B1/B2: Chance of a topic = interest weight × freshness boost, divided by the total for all eligible topics. Topics set to Off, or with no unread published lessons left, are never picked.
- B1: The same topic shouldn't come up more than 2 days in a row unless it's the only topic available.
- B4/B6: A lesson counts as read as soon as the learner opens it, which takes it out of the inbox. Learners can open only lessons delivered to them, never lessons further along their path (the free preview in A9 is the only exception).
- B6: The inbox is the first thing the learner sees after signing in, with the current lesson at the top. It holds up to 3 unread lessons. When it's full, no new lessons are picked until one is read, and no daily email is sent. Instead a "You have 3 lessons waiting" email goes out on the first day the inbox is full, once more a week later, and then never again. Reading a lesson resets this.
- B3: Unsubscribing or pausing emails takes one click from the email.

### C. Quizzes and review

Three layers, each one short:

| When | What | Length |
|---|---|---|
| After a lesson | Practice problems and a quiz on that lesson if it has them, plus up to 2 review questions from earlier lessons | Up to 5 questions, about 1 minute, plus any practice |
| Once a week | Recap quiz on the week's lessons, focused on what the learner missed | 5 questions, about 2 minutes |
| Once a month | Month in review: what you learned, how you did, plus an optional recap quiz | About 3 minutes |

| ID | Story | Priority |
|---|---|---|
| C1 | As a learner, I want a few quick questions right after a lesson so I can check that I understood it while it's fresh. | Must |
| C2 | As a learner, I want to see the right answer and a one-line explanation after I submit so I learn from my mistakes. | Must |
| C3 | As a learner, I want to move on to the next lesson in a topic even if I miss questions so I'm never stuck repeating a lesson. | Must |
| C4 | As a learner, I want to re-read a past lesson whenever I choose, but never be forced to. | Should |
| C5 | As a learner, I want up to 2 review questions from past lessons after each lesson so I remember what I've learned. | Must |
| C6 | As a learner, I want questions I got wrong to come back sooner than ones I got right so review focuses on what I'm weak at. | Must |
| C7 | As a learner, I want a short weekly recap quiz on the week's lessons so I can lock in what I learned. | Should |
| C8 | As a learner, I want a monthly look back at what I learned, with an optional recap quiz, so I can see how far I've come. | Later |
| C9 | As a learner, I want to see how many of my recent review questions I remembered so I can tell I'm actually learning. | Should |
| C10 | As a learner, I want practice problems with a lesson, with worked solutions I can reveal, so I can check I can use what I just read. | Must |

**Acceptance criteria**
- C1: The quiz is optional twice over: an author can publish a lesson without one, and a learner can always skip it. Skipping still leaves the lesson read, but its questions don't enter review. A lesson with no quiz still offers any review questions that are due, which can also be skipped.
- C10: Practice problems are optional for each lesson and appear between the lesson and the quiz. Each has a prompt and a worked solution, hidden until the learner reveals it. Nothing is graded or recorded, and practice problems never enter review.
- C3: Finishing a lesson always unlocks the next one in the path, whatever the score. Missed questions go into review (C6) instead of making the learner retake the lesson. If a learner misses most questions on a lesson, the end-of-quiz screen offers a link to re-read it.
- C5/C6: Only questions the learner missed go into review. Questions answered correctly the first time don't. This keeps the review queue small enough that up to 2 a day, plus the weekly recap, can keep up.
- C6: Review timing: wrong answer → 1 day. Right answers → 3, then 7, then 21, then 60 days. A wrong answer at any point resets to 1 day. Review questions come from a different topic than today's lesson when possible.
- C7: Sent on the learner's chosen day (default Sunday). Questions due for review are picked first, then questions from the week's lessons. Skipped if the learner read fewer than 2 lessons that week.

### D. Progress and celebrations

| ID | Story | Priority |
|---|---|---|
| D1 | As a learner, I want to see my level in each topic and how close I am to the topic's goal. | Must |
| D2 | As a learner, I want to change interest levels or add and remove topics at any time. | Must |
| D3 | As a learner, I want to be congratulated now and then when I reach a milestone so I feel my progress. | Must |
| D4 | As a learner, I want a gentle note when I have so many topics on that each one will move very slowly. | Should |
| D5 | As a learner, I want to look back at lessons I've already finished. | Should |
| D6 | As a learner, I want to pause lessons (for a vacation, say) without losing progress. | Should |
| D7 | As a learner, I want to see an estimate of when I'll finish a topic at my current pace. | Later |
| D8 | As a learner, I want to be offered a topic's sub-topics when I finish its path so I have a natural next step. | Must |
| D9 | As a learner, I want to delete my account and all my data. | Must |

**Acceptance criteria**
- D1: Progress counts lessons the learner has read, not just received. A learner's level in a topic is the highest level of lesson they've read in it.
- D2: Changes take effect from the next pick. Turning a topic off keeps its progress.
- D3: Milestones: first lesson finished; 10, 25, 50, 100 and every 100 lessons after; each new level in a topic; reaching a topic's goal; a review question remembered after 21+ days. Shown once, on the screen after the quiz, and at most once a day. Never counts consecutive days, and never mentions missed days.
- D4: Show the note when more than 8 topics are on. Never block the learner.
- D8: When a learner reads the last published lesson in a topic that has sub-topics, the screen after the quiz and the progress page show "Go deeper" with those sub-topics.
- D9: Deleting removes the profile and all learner data. It asks for confirmation first.

### E. Creating lessons (author)

| ID | Story | Priority |
|---|---|---|
| E1 | As an author, I want to add categories, add topics to each category, and add sub-topics under any topic, each with a goal. | Must |
| E2 | As an author, I want to write a path outline (an ordered list of lesson titles and key points) that I can add to over time. | Must |
| E3 | As an author, I want AI to draft a lesson and its quiz questions from an outline entry so I don't write everything from scratch. | Later |
| E4 | As an author, I want to write a lesson, with optional practice problems and quiz questions, as a draft and publish it when it's ready so only finished lessons reach learners. | Must |
| E5 | As an author, I want to publish lessons one at a time so a topic can launch small and grow. | Must |
| E6 | As an author, I want to set or adjust each lesson's level and reading time. | Must |
| E7 | As an author, I want to unpublish a lesson that turns out to be wrong. | Should |
| E8 | As an author, I want to see which quiz questions most learners get wrong so I can fix confusing lessons. | Later |

**Acceptance criteria**
- E1: The app ships as an empty template with no built-in categories or topics. Everything learners see is added by an author.
- E4: A lesson has a title, a body of any length, and a reading time. Optionally it has practice problems (each a Markdown prompt and a worked solution) and up to 3 multiple-choice questions (each with one correct answer and a one-line explanation). A lesson can be published with neither, but any problem or question it has must be complete. Drafts are never shown to learners.
- E4/E5: Only lessons marked "Published" can be picked. A topic appears to learners once it has at least 3 published lessons.
- E5: When a learner has read every published lesson in a topic, the topic stops being picked and shows "New lessons coming soon." When a new lesson is published, it becomes eligible again on the next pick.
- E6: Reading time is estimated at about 200 words per minute and can be edited.
- E7: An unpublished lesson stays in the inbox and history of learners who already got it, but is never picked again, and its questions leave review.

### F. Community (after the MVP)

| ID | Story | Priority |
|---|---|---|
| F1 | As a learner, I want to request a topic that doesn't exist yet. | Later |
| F2 | As a learner, I want to vote for topics other people requested. | Later |
| F3 | As a contributor, I want to suggest a lesson or fix for a topic I know well. | Later |
| F4 | As an author, I want a review queue for contributed lessons. | Later |
| F5 | As a learner, I want to report a lesson that seems wrong. | Later |

## 5. MVP scope

### Goal
Find out if people keep using it. Specifically: **do learners still open their lessons in week 3?**

### Who uses the MVP
The founder first, for 2 weeks. Then sign-up opens to anyone, with a first push to recruit 10–20 learners to watch closely.

### In
- Web app that works well on phones
- Open sign-up with email sign-in links (A1)
- Topic browsing and a free first-lesson preview for signed-out visitors (A9)
- Privacy policy and terms pages, before sign-up opens to anyone
- Topic picking with sub-topics, interest levels, one daily delivery (A2–A5, A3a)
- Daily weighted random pick with freshness boost, run once a day for everyone (B1–B2)
- Daily email, inbox, and lesson page with reading time (B3–B6)
- Optional practice problems with revealable solutions (C10)
- Optional quiz after a lesson, with answers and explanations; no forced retakes (C1–C3)
- Up to 2 review questions per day, missed questions only, with spaced timing (C5–C6)
- Progress page, topic settings, milestone celebrations, "Go deeper" suggestions, account deletion (D1–D3, D8, D9)
- Author tools: add categories and topics, outline paths, write lessons, publish one at a time (E1, E2, E4–E6)
- Starts as an empty template. The author adds categories, topics, and lessons; there is no fixed starting list.

### In if time allows
A6, A10, B7, C4, C7, C9, D4, D5, D6, E7

### Out (not in the MVP)
- Google, Apple, or other sign-in methods (A7)
- Choosing your own delivery time (A8)
- Prerequisites other than a topic's parent (for example, Algebra before Physics)
- AI-drafted lessons (E3)
- Typed-answer questions (multiple choice only)
- Monthly recap (C8)
- Native mobile apps and push notifications
- Contributors, topic requests, voting (all of section F)
- Streaks, leaderboards, social features
- Payments
- More than one lesson format (no video, audio, or interactive lessons)

## 6. How we'll know it's working

| Measure | Target for the first learners |
|---|---|
| Lessons opened, week 3 vs. week 1 | At least 60% as many in week 3 |
| Learners still opening lessons at least 3 days a week by week 3 | At least half |
| Quiz questions answered correctly | 60–85% (lower means lessons are confusing, higher means they're too easy) |
| Review questions answered correctly | Rising over time |
| Learners who say they'd pay $3–5/month | At least a few, asked at the end |

If week 3 opens collapse, fix delivery and lesson quality before adding anything else.

## 7. Decisions

- **Name:** Pisara. pisara.com and pisara.app are taken; pisara.co, pisara.io, getpisara.com, and pisaralearn.com were free on November 3, 2026. No App Store app used the name. Trademark search done, no conflict found.
- **Starting topics:** none built in. The app is a template; authors add categories and topics.
- **AI:** not in the MVP. Authors write lessons themselves; AI drafting (E3) comes later.
- **Lesson length:** no maximum. Every lesson shows its reading time.
- **Quiz types:** multiple choice only for the MVP. It's simple to grade automatically. Typed answers can come later.
- **Delivery:** one run a day for everyone at 11:00 UTC (placeholder until a final time is picked). Learners can't choose a time in the MVP.
- **Interest levels:** Off, or 1–5 with the level as the weight.
- **Sub-topics:** topics form a tree of any depth. Any topic can be picked. A topic's parent is its only prerequisite, and it's a warning, not a block.
- **Review:** only missed questions enter review, up to 2 a day.
- **Quizzes are optional:** authors can publish a lesson without one, and learners can skip any quiz.
- **Practice problems:** optional per lesson, ungraded, with a worked solution to reveal; not part of review.
- **Reading:** a lesson is read as soon as it's opened. No reading ahead in a path for now.
- **Visitors:** can browse topics and preview each topic's first lesson without signing up.
- **Pages:** the full page list is in [design.md](design.md#7-pages).

## 8. Open questions

Email provider, tech stack, and weekly recap delivery are now decided in [design.md](design.md#13-decisions-in-this-doc).
