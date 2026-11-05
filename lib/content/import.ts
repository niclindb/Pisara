// Loads lesson content files into the database through the author tools, so
// every check the lesson editor makes applies here too.
//
// - Categories and topics named in a file are created if they don't exist yet.
// - A lesson is matched to an existing one by topic and title. A new lesson is
//   added at the end of its topic's path as a draft; publish it in the app.
// - An existing lesson is updated in place and keeps its status. Its quiz
//   questions keep their ids by position, so learners' answers and review
//   items survive a wording fix. Lessons with nothing changed are left alone.

import {
  createCategory,
  createLesson,
  createTopic,
  loadLessonForEditing,
  saveLesson,
  type TopicPlace,
} from "../jobs/author";
import type { Sql } from "../jobs/postgres-store";
import { estimateReadingMinutes, type LessonDraft } from "../rules/authoring";
import type { LessonFile } from "./lesson-file";

export type ImportOutcome = "created" | "updated" | "unchanged";

export interface ImportResult {
  outcome: ImportOutcome;
  lessonId: string;
  /** Categories and topics that had to be made, e.g. "category Math", "topic Math / Mental math". */
  made: string[];
}

/** The author to import as: the one with this email, or the only author there is. */
export async function findAuthor(sql: Sql, email?: string): Promise<string> {
  const rows = email
    ? await sql`select id from public.profiles where role = 'author' and lower(email) = lower(${email})`
    : await sql`select id from public.profiles where role = 'author'`;
  if (rows.length === 1) return rows[0]!.id;
  if (email) throw new Error(`No author with the email ${email}.`);
  throw new Error(rows.length ? "There's more than one author. Pass --author <email>." : "No author account yet. Sign in once, then set role = 'author' on your profile.");
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function importLesson(sql: Sql, authorId: string, file: LessonFile): Promise<ImportResult> {
  const made: string[] = [];

  const [cat] = await sql`select id, name from public.categories`.then((rows) => rows.filter((r) => same(r.name, file.category)));
  const categoryId: string = cat?.id ?? (made.push(`category ${file.category}`), await createCategory(sql, authorId, file.category));

  let place: TopicPlace = { categoryId };
  let topicId = "";
  for (const [i, name] of file.topicPath.entries()) {
    const siblings =
      "categoryId" in place
        ? await sql`select id, name from public.topics where category_id = ${place.categoryId}`
        : await sql`select id, name from public.topics where parent_id = ${place.parentId}`;
    const found = siblings.filter((t) => same(t.name, name));
    if (found.length > 1) throw new Error(`More than one topic is called "${name}" there. Rename one in the app.`);
    topicId = found[0]?.id ?? (made.push(`topic ${[file.category, ...file.topicPath.slice(0, i + 1)].join(" / ")}`), await createTopic(sql, authorId, place, { name }));
    place = { parentId: topicId };
  }

  const matches = (await sql`select id, title from public.lessons where topic_id = ${topicId}`).filter((l) => same(l.title, file.draft.title));
  if (matches.length > 1) throw new Error(`That topic has more than one lesson titled "${file.draft.title}".`);

  if (!matches[0]) {
    const lessonId = await createLesson(sql, authorId, topicId, file.draft.title);
    await saveLesson(sql, authorId, lessonId, file.draft);
    return { outcome: "created", lessonId, made };
  }

  const lessonId: string = matches[0].id;
  const saved = (await loadLessonForEditing(sql, authorId, lessonId))!;
  const draft: LessonDraft = {
    ...file.draft,
    questions: file.draft.questions.map((q, i) => ({ ...q, id: saved.questions[i]?.id })),
    problems: file.draft.problems.map((p, i) => ({ ...p, id: saved.problems[i]?.id })),
  };
  if (unchanged(saved, draft)) return { outcome: "unchanged", lessonId, made };
  await saveLesson(sql, authorId, lessonId, draft);
  return { outcome: "updated", lessonId, made };
}

function unchanged(saved: LessonDraft, next: LessonDraft): boolean {
  const norm = (d: LessonDraft) =>
    JSON.stringify({
      title: d.title.trim(),
      body: d.body,
      level: d.level,
      readingMinutes: d.readingMinutes ?? estimateReadingMinutes(d.body),
      questions: d.questions.map((q) => [q.id, q.prompt.trim(), q.options.map((o) => o.trim()), q.correctIndex, q.explanation?.trim() ?? ""]),
      problems: d.problems.map((p) => [p.id, p.prompt.trim(), p.solution.trim()]),
    });
  return norm(saved) === norm(next);
}
