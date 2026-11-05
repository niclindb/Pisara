import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LessonFileError, parseLessonFile } from "./lesson-file";

const file = (over: { header?: string; body?: string; tail?: string } = {}) =>
  `---
${over.header ?? "category: Math\ntopic: Mental math / Calendars\ntitle: \"Weekdays: fast\"\nlevel: intermediate"}
---

${over.body ?? "## Idea\n\nSome *Markdown*."}
${over.tail ?? ""}`;

const problemsOf = (text: string) => {
  try {
    parseLessonFile(text, "x.md");
  } catch (err) {
    if (err instanceof LessonFileError) return err.problems;
    throw err;
  }
  return [];
};

describe("parseLessonFile", () => {
  it("reads the header and body", () => {
    const l = parseLessonFile(file());
    expect(l.category).toBe("Math");
    expect(l.topicPath).toEqual(["Mental math", "Calendars"]);
    expect(l.draft).toEqual({
      title: "Weekdays: fast",
      body: "## Idea\n\nSome *Markdown*.",
      level: 2,
      readingMinutes: undefined,
      questions: [],
      problems: [],
    });
  });

  it("reads a quiz and practice problems in either order", () => {
    const tail = `
<!-- practice -->

## Problem

What is **2 + 2**?

## Solution

It's 4.

Really.

<!-- quiz -->

## Pick one

- A
- [x] B
- C

Because B.
`;
    const l = parseLessonFile(file({ tail, header: "category: M\ntopic: T\ntitle: X\nlevel: Advanced\nreading_minutes: 4" }));
    expect(l.draft.body).toBe("## Idea\n\nSome *Markdown*.");
    expect(l.draft.level).toBe(3);
    expect(l.draft.readingMinutes).toBe(4);
    expect(l.draft.questions).toEqual([{ prompt: "Pick one", options: ["A", "B", "C"], correctIndex: 1, explanation: "Because B." }]);
    expect(l.draft.problems).toEqual([{ prompt: "What is **2 + 2**?", solution: "It's 4.\n\nReally." }]);
  });

  it("lists everything wrong at once", () => {
    const tail = `
<!-- quiz -->

## No answer marked

- A
- B

<!-- practice -->

## Problem

Solve it.
`;
    expect(problemsOf(file({ header: "topic: T\ntitle: X\nlevel: Expert\ncolour: blue", body: "", tail }))).toEqual([
      'Header: unknown line "colour: blue". Use category, topic, title, level, reading_minutes.',
      "Header: add a category.",
      "Header: level must be Beginner, Intermediate, Advanced.",
      "Question 1: mark the right choice with [x].",
      'Practice problem 1: follow it with "## Solution".',
      "Practice problem 1: add the worked solution.",
      "Write the lesson before publishing it.",
    ]);
  });

  it("uses the editor's checks on quiz questions", () => {
    const tail = "\n<!-- quiz -->\n\n## Q\n\n- [x] Only one\n";
    expect(problemsOf(file({ tail }))).toContain("Question 1: give 2 to 4 choices.");
  });

  it("needs the header", () => {
    expect(problemsOf("# Just a lesson")).toEqual(["Start the file with a header between two --- lines."]);
  });
});

describe("content/lessons", () => {
  const all = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? all(p) : n.endsWith(".md") && n !== "README.md" ? [p] : [];
    });

  it.each(all("content/lessons"))("%s is a valid lesson", (path) => {
    expect(problemsOf(readFileSync(path, "utf8"))).toEqual([]);
  });
});
