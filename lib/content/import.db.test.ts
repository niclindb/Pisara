// Lesson file import against a real Postgres database. Needs TEST_DATABASE_URL
// (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publishLesson, loadLessonForEditing } from "../jobs/author";
import { connect } from "../jobs/postgres-store";
import { findAuthor, importLesson } from "./import";
import { parseLessonFile } from "./lesson-file";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const AUTHOR = "00000000-0000-4000-8000-00000000000a";
const LEARNER = "00000000-0000-4000-8000-00000000000b";

const lessonText = (over: { title?: string; body?: string; q?: string } = {}) => `---
category: Math
topic: Mental math / Calendars
title: ${over.title ?? "Doomsday"}
level: Beginner
---

${over.body ?? "Every year has a doomsday."}

<!-- quiz -->

## ${over.q ?? "Which date is always a doomsday?"}

- [x] 4/4
- 4/5

<!-- practice -->

## Problem

Jan 1, 2000?

## Solution

Saturday.
`;

describe.skipIf(!url)("importing lesson files", () => {
  beforeEach(async () => {
    await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
    await sql`insert into auth.users (id, email) values (${AUTHOR}, 'author@example.com'), (${LEARNER}, 'learner@example.com')`;
    await sql`update public.profiles set role = 'author' where id = ${AUTHOR}`;
  });
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("finds the author", async () => {
    expect(await findAuthor(sql)).toBe(AUTHOR);
    expect(await findAuthor(sql, "AUTHOR@example.com")).toBe(AUTHOR);
    await expect(findAuthor(sql, "learner@example.com")).rejects.toThrow("No author");
  });

  it("creates the category, topics and a draft lesson, then does nothing on a second run", async () => {
    const first = await importLesson(sql, AUTHOR, parseLessonFile(lessonText()));
    expect(first.outcome).toBe("created");
    expect(first.made).toEqual(["category Math", "topic Math / Mental math", "topic Math / Mental math / Calendars"]);

    const l = (await loadLessonForEditing(sql, AUTHOR, first.lessonId))!;
    expect(l).toMatchObject({ title: "Doomsday", status: "draft", level: 1, body: "Every year has a doomsday." });
    expect(l.questions).toHaveLength(1);
    expect(l.problems).toEqual([expect.objectContaining({ prompt: "Jan 1, 2000?", solution: "Saturday." })]);

    const again = await importLesson(sql, AUTHOR, parseLessonFile(lessonText()));
    expect(again).toEqual({ outcome: "unchanged", lessonId: first.lessonId, made: [] });
    const [row] = await sql`select count(*)::int as n from public.lessons`;
    expect(row!.n).toBe(1);
  });

  it("updates a published lesson in place and keeps its status and question ids", async () => {
    const { lessonId } = await importLesson(sql, AUTHOR, parseLessonFile(lessonText()));
    await publishLesson(sql, AUTHOR, lessonId);
    const before = (await loadLessonForEditing(sql, AUTHOR, lessonId))!;

    const r = await importLesson(sql, AUTHOR, parseLessonFile(lessonText({ body: "Fixed a typo.", q: "Which date is a doomsday?" })));
    expect(r.outcome).toBe("updated");
    const after = (await loadLessonForEditing(sql, AUTHOR, lessonId))!;
    expect(after.status).toBe("published");
    expect(after.body).toBe("Fixed a typo.");
    expect(after.questions[0]).toMatchObject({ id: before.questions[0]!.id, prompt: "Which date is a doomsday?" });
  });

  it("adds a lesson with a new title after the existing ones", async () => {
    await importLesson(sql, AUTHOR, parseLessonFile(lessonText()));
    await importLesson(sql, AUTHOR, parseLessonFile(lessonText({ title: "Leap years" })));
    const rows = await sql`select title, position from public.lessons order by position`;
    expect(rows.map((r) => r.title)).toEqual(["Doomsday", "Leap years"]);
  });
});
