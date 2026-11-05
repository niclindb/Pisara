// Lesson content files (content/lessons/**/*.md). Each file is one lesson:
// a small header saying where it goes, the lesson in Markdown, then an
// optional quiz and optional practice problems. See content/README.md.
//
// This module only reads and checks files; lib/content/import.ts loads them
// into the database through the author tools.

import { publishProblems, type LessonDraft } from "../rules/authoring";
import { LEVEL_NAMES } from "../rules/levels";

export interface LessonFile {
  category: string;
  /** Topic names from the top-level topic down, e.g. ["Mental math", "Calendars"]. */
  topicPath: string[];
  draft: LessonDraft;
}

export class LessonFileError extends Error {
  constructor(readonly file: string, readonly problems: string[]) {
    super(`${file}:\n  - ${problems.join("\n  - ")}`);
  }
}

const QUIZ_MARK = /^<!--\s*quiz\s*-->\s*$/im;
const PRACTICE_MARK = /^<!--\s*practice\s*-->\s*$/im;
const HEADER_KEYS = ["category", "topic", "title", "level", "reading_minutes"] as const;

/** Reads one lesson file. Throws LessonFileError listing everything to fix. */
export function parseLessonFile(text: string, file = "lesson"): LessonFile {
  const problems: string[] = [];
  const src = text.replace(/\r\n?/g, "\n");

  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) throw new LessonFileError(file, ["Start the file with a header between two --- lines."]);
  const header = parseHeader(m[1]!, problems);
  // Split off the quiz and practice sections, in either order.
  const sections = splitSections(src.slice(m[0].length), problems);

  const category = header.category ?? "";
  const topicPath = (header.topic ?? "").split("/").map((s) => s.trim()).filter(Boolean);
  if (!category.trim()) problems.push("Header: add a category.");
  if (topicPath.length === 0) problems.push("Header: add a topic (use / for a sub-topic, e.g. Mental math / Calendars).");

  const levelIndex = LEVEL_NAMES.findIndex((n) => n.toLowerCase() === (header.level ?? "").trim().toLowerCase());
  if (levelIndex < 0) problems.push(`Header: level must be ${LEVEL_NAMES.join(", ")}.`);

  let readingMinutes: number | undefined;
  if (header.reading_minutes !== undefined) {
    readingMinutes = Number(header.reading_minutes);
    if (!Number.isInteger(readingMinutes) || readingMinutes < 1) problems.push("Header: reading_minutes must be a whole number of at least 1.");
  }

  const draft: LessonDraft = {
    title: header.title ?? "",
    body: sections.body.trim(),
    level: levelIndex + 1,
    readingMinutes,
    questions: parseQuiz(sections.quiz, problems),
    problems: parsePractice(sections.practice, problems),
  };
  // Content files are meant to be publishable, so hold them to the publishing checks.
  // (The level was already reported above if it's wrong.)
  problems.push(...publishProblems({ ...draft, level: levelIndex < 0 ? 1 : draft.level }));

  const unique = [...new Set(problems)];
  if (unique.length) throw new LessonFileError(file, unique);
  return { category: category.trim(), topicPath, draft };
}

function parseHeader(text: string, problems: string[]): Partial<Record<(typeof HEADER_KEYS)[number], string>> {
  const out: Partial<Record<(typeof HEADER_KEYS)[number], string>> = {};
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "").trim(); // allow trailing # comments
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(":");
    const key = (i < 0 ? line : line.slice(0, i)).trim().toLowerCase();
    if (!(HEADER_KEYS as readonly string[]).includes(key)) {
      problems.push(`Header: unknown line "${raw.trim()}". Use ${HEADER_KEYS.join(", ")}.`);
      continue;
    }
    out[key as (typeof HEADER_KEYS)[number]] = unquote(line.slice(i + 1).trim());
  }
  return out;
}

function unquote(s: string): string {
  return /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function splitSections(text: string, problems: string[]): { body: string; quiz: string; practice: string } {
  const marks = [
    { name: "quiz" as const, at: text.search(QUIZ_MARK) },
    { name: "practice" as const, at: text.search(PRACTICE_MARK) },
  ].filter((s) => s.at >= 0);
  for (const re of [QUIZ_MARK, PRACTICE_MARK]) {
    if ((text.match(new RegExp(re.source, "gim")) ?? []).length > 1) problems.push(`Use ${re === QUIZ_MARK ? "<!-- quiz -->" : "<!-- practice -->"} only once.`);
  }
  marks.sort((a, b) => a.at - b.at);
  const out = { body: text, quiz: "", practice: "" };
  if (marks.length === 0) return out;
  out.body = text.slice(0, marks[0]!.at);
  marks.forEach((s, i) => {
    const start = text.indexOf("\n", s.at);
    const end = i + 1 < marks.length ? marks[i + 1]!.at : text.length;
    out[s.name] = start < 0 || start > end ? "" : text.slice(start + 1, end);
  });
  return out;
}

/** Splits a section at its "## " headings. Text before the first heading is returned as `lead`. */
function byHeading(text: string): { lead: string; items: { heading: string; content: string }[] } {
  const items: { heading: string; content: string }[] = [];
  let lead = "";
  let current: { heading: string; lines: string[] } | null = null;
  let fenced = false;
  const all: { heading: string; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = !fenced && /^##\s+(.*)$/.exec(line);
    if (h) {
      current = { heading: h[1]!.trim(), lines: [] };
      all.push(current);
    } else if (current) current.lines.push(line);
    else lead += line + "\n";
  }
  for (const c of all) items.push({ heading: c.heading, content: c.lines.join("\n").trim() });
  return { lead: lead.trim(), items };
}

function parseQuiz(text: string, problems: string[]): LessonDraft["questions"] {
  const { lead, items } = byHeading(text);
  if (lead) problems.push("Quiz: start each question with a ## heading.");
  return items.map(({ heading, content }, i) => {
    const n = `Question ${i + 1}`;
    const options: string[] = [];
    let correctIndex = -1;
    const rest: string[] = [];
    for (const line of content.split("\n")) {
      const o = /^\s*[-*]\s+(\[( |x|X)\]\s+)?(.*)$/.exec(line);
      if (o && rest.length === 0) {
        if (o[2]?.toLowerCase() === "x") {
          if (correctIndex >= 0) problems.push(`${n}: mark only one choice with [x].`);
          correctIndex = options.length;
        }
        options.push(o[3]!.trim());
      } else if (line.trim() || rest.length) rest.push(line);
    }
    if (correctIndex < 0 && options.length) problems.push(`${n}: mark the right choice with [x].`);
    return { prompt: heading, options, correctIndex: Math.max(correctIndex, 0), explanation: rest.join("\n").trim() };
  });
}

function parsePractice(text: string, problems: string[]): LessonDraft["problems"] {
  const { lead, items } = byHeading(text);
  if (lead) problems.push("Practice: start each problem with ## Problem.");
  const out: LessonDraft["problems"] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const n = `Practice problem ${out.length + 1}`;
    if (!/^problem\b/i.test(item.heading)) {
      problems.push(`${n}: expected "## Problem", found "## ${item.heading}".`);
      continue;
    }
    const next = items[i + 1];
    if (!next || !/^solution\b/i.test(next.heading)) {
      problems.push(`${n}: follow it with "## Solution".`);
      out.push({ prompt: item.content, solution: "" });
      continue;
    }
    out.push({ prompt: item.content, solution: next.content });
    i++;
  }
  return out;
}
