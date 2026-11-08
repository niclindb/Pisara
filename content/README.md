# Lesson content

Every lesson lives here as one Markdown file under `content/lessons/`. Folders are just for tidiness; the header in each file says where the lesson goes.

## Loading lessons into the app

```sh
npm run lessons:check     # checks every file; no database needed (npm test checks them too)
npm run lessons:import    # loads every file, using DATABASE_URL from .env.local
npm run lessons:import -- content/lessons/mental-math/01-doomsday-algorithm.md
```

- Categories and topics named in a file are created if they don't exist. Give a new topic its goal and description with a `topic.md` (below) or on the author pages.
- A lesson is matched to an existing one by **topic and title**. A new one is added at the end of its topic's path as a **draft**: look it over in the app's preview, then publish it there.
- Running the import again updates lessons whose file changed and leaves the rest alone. An updated lesson keeps its status, so a published lesson stays published.
- Changing a lesson's title in its file makes a new lesson. Rename it in the app as well, or the old one stays.
- Quiz questions are matched by position, so fixing a question's wording keeps learners' answers and review. Deleting a question from the file deletes it, along with those answers.
- If there's more than one author account, add `-- --author you@example.com`.

## Topic files

A file named `topic.md` sets a topic's goal (shown when learners pick topics), its description (shown on the topic's page) and the path outline. The import loads topic files before lessons.

```markdown
---
category: Technology
topic: Artificial intelligence
goal: Understand how today's AI learns, how chatbots work, and how to use them well.
---

The description, in Markdown.

<!-- outline -->

1. What counts as AI (Beginner)
2. ...
```

## File format

```markdown
---
category: Math
topic: Mental math              # a sub-topic: Mental math / Calendars
title: "The Doomsday algorithm"
level: Beginner                 # Beginner, Intermediate or Advanced
reading_minutes: 5              # optional; estimated from the length if left out
---

The lesson itself, in Markdown. Tables, lists and ## headings all work.

<!-- quiz -->

## Which of these dates is always a doomsday?

- 6/7
- [x] 6/6
- 1/1

The explanation shown after answering (optional).

<!-- practice -->

## Problem

What day of the week was January 1, 2000?

## Solution

The worked solution, hidden until the learner taps "Show solution".
```

The quiz and practice sections are both optional. A quiz has at most 3 questions, each with 2 to 4 choices and one marked `[x]`. Inside the quiz and practice sections, `##` starts a new question, problem or solution, so use `###` for any headings inside a solution.
