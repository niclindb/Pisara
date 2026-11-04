// The author tools' server side (E1, E2, E4–E7): categories, the topic tree,
// and lessons with their quiz questions and practice problems. The pages call
// these with the signed-in user's id; every call checks that they're an author
// and runs in one transaction, so a failed change saves nothing.

import type postgres from "postgres";
import { MIN_PUBLISHED_LESSONS } from "../rules/constants";
import {
  AuthorError,
  draftProblems,
  estimateReadingMinutes,
  publishProblems,
  type LessonDraft,
  type ProblemDraft,
  type QuestionDraft,
} from "../rules/authoring";
import type { Sql } from "./postgres-store";

type Tx = postgres.TransactionSql;
export type LessonStatus = "draft" | "published" | "unpublished";

export { AuthorError };

/** Turns database refusals into messages an author can act on. */
function explain(err: unknown, onRestrict: string): never {
  if (err instanceof AuthorError) throw err;
  const e = err as { code?: string; message?: string };
  if (e.code === "23503") throw new AuthorError(onRestrict);
  if (e.code === "P0001" && e.message) throw new AuthorError(e.message); // e.g. a topic moved under its own sub-topic
  if (e.code === "23514" || e.code === "22P02") throw new AuthorError("Something in that change isn't valid.");
  throw err;
}

async function asAuthor<T>(sql: Sql, authorId: string, work: (tx: Tx) => Promise<T>, onRestrict = "That's still in use."): Promise<T> {
  try {
    return (await sql.begin(async (tx) => {
      const [p] = await tx`select role from public.profiles where id = ${authorId}`;
      if (p?.role !== "author") throw new AuthorError("Only authors can change lessons and topics.");
      return work(tx);
    })) as T;
  } catch (err) {
    explain(err, onRestrict);
  }
}

const blank = (s: string | undefined) => s !== undefined && s.trim().length === 0;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface AuthorTopic {
  id: string;
  categoryId: string | null;
  parentId: string | null;
  position: number;
  name: string;
  goal: string;
  description: string;
  lessons: Record<LessonStatus, number>;
  /** Learners can pick it once it has 3 published lessons (E4). */
  pickable: boolean;
}

export interface ContentTree {
  categories: { id: string; name: string; position: number }[];
  topics: AuthorTopic[];
}

/** Every category and topic with lesson counts, for the author home page. */
export async function loadContentTree(sql: Sql, authorId: string): Promise<ContentTree> {
  return asAuthor(sql, authorId, async (tx) => {
    const categories = await tx`select id, name, position from public.categories order by position, name`;
    const topics = await tx`
      select t.id, t.category_id, t.parent_id, t.position, t.name, t.goal, t.description,
             count(*) filter (where l.status = 'draft')::int as draft,
             count(*) filter (where l.status = 'published')::int as published,
             count(*) filter (where l.status = 'unpublished')::int as unpublished
      from public.topics t left join public.lessons l on l.topic_id = t.id
      group by t.id order by t.position, t.name`;
    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, position: c.position })),
      topics: topics.map((t) => ({
        id: t.id,
        categoryId: t.category_id,
        parentId: t.parent_id,
        position: t.position,
        name: t.name,
        goal: t.goal,
        description: t.description,
        lessons: { draft: t.draft, published: t.published, unpublished: t.unpublished },
        pickable: t.published >= MIN_PUBLISHED_LESSONS,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Categories (E1)
// ---------------------------------------------------------------------------

export async function createCategory(sql: Sql, authorId: string, name: string): Promise<string> {
  if (blank(name)) throw new AuthorError("Give the category a name.");
  return asAuthor(sql, authorId, async (tx) => {
    const [row] = await tx`
      insert into public.categories (name, position)
      select ${name.trim()}, coalesce(max(position) + 1, 0) from public.categories
      returning id`;
    return row!.id;
  });
}

export async function renameCategory(sql: Sql, authorId: string, categoryId: string, name: string): Promise<void> {
  if (blank(name)) throw new AuthorError("Give the category a name.");
  await asAuthor(sql, authorId, async (tx) => {
    const r = await tx`update public.categories set name = ${name.trim()} where id = ${categoryId}`;
    if (r.count === 0) throw new AuthorError("That category doesn't exist.");
  });
}

/** Only an empty category can be deleted. */
export async function deleteCategory(sql: Sql, authorId: string, categoryId: string): Promise<void> {
  await asAuthor(
    sql,
    authorId,
    async (tx) => {
      await tx`delete from public.categories where id = ${categoryId}`;
    },
    "Move or delete this category's topics first.",
  );
}

/** Puts the categories in this order. List every category once. */
export async function reorderCategories(sql: Sql, authorId: string, categoryIds: string[]): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const all = await tx`select id from public.categories`;
    sameSet(all.map((r) => r.id), categoryIds, "categories");
    for (const [i, id] of categoryIds.entries()) await tx`update public.categories set position = ${i} where id = ${id}`;
  });
}

function sameSet(existing: string[], given: string[], what: string) {
  const want = new Set(existing);
  if (new Set(given).size !== given.length || given.length !== want.size || given.some((id) => !want.has(id))) {
    throw new AuthorError(`List each of the ${what} exactly once.`);
  }
}

// ---------------------------------------------------------------------------
// Topics (E1, E2): a tree under each category, any depth
// ---------------------------------------------------------------------------

/** Where a topic sits: at the top of a category, or under another topic. */
export type TopicPlace = { categoryId: string } | { parentId: string };

export interface TopicFields {
  name?: string;
  goal?: string;
  description?: string;
  /** The author's outline of the path, Markdown (E2). */
  outline?: string;
}

const placeColumns = (place: TopicPlace) =>
  "categoryId" in place
    ? { category_id: place.categoryId, parent_id: null }
    : { category_id: null, parent_id: place.parentId };

async function nextTopicPosition(tx: Tx, place: TopicPlace): Promise<number> {
  const [row] =
    "categoryId" in place
      ? await tx`select coalesce(max(position) + 1, 0) as p from public.topics where category_id = ${place.categoryId}`
      : await tx`select coalesce(max(position) + 1, 0) as p from public.topics where parent_id = ${place.parentId}`;
  return row!.p;
}

export async function createTopic(sql: Sql, authorId: string, place: TopicPlace, fields: TopicFields & { name: string }): Promise<string> {
  if (blank(fields.name) || !fields.name) throw new AuthorError("Give the topic a name.");
  return asAuthor(
    sql,
    authorId,
    async (tx) => {
      const { category_id, parent_id } = placeColumns(place);
      const [row] = await tx`
        insert into public.topics (category_id, parent_id, position, name, goal, description, outline)
        values (${category_id}, ${parent_id}, ${await nextTopicPosition(tx, place)}, ${fields.name.trim()},
                ${fields.goal?.trim() ?? ""}, ${fields.description?.trim() ?? ""}, ${fields.outline ?? ""})
        returning id`;
      return row!.id;
    },
    "That category or parent topic doesn't exist.",
  );
}

export async function updateTopic(sql: Sql, authorId: string, topicId: string, fields: TopicFields): Promise<void> {
  if (blank(fields.name)) throw new AuthorError("Give the topic a name.");
  await asAuthor(sql, authorId, async (tx) => {
    const [t] = await tx`select name, goal, description, outline from public.topics where id = ${topicId}`;
    if (!t) throw new AuthorError("That topic doesn't exist.");
    await tx`
      update public.topics set
        name = ${fields.name?.trim() ?? t.name},
        goal = ${fields.goal?.trim() ?? t.goal},
        description = ${fields.description?.trim() ?? t.description},
        outline = ${fields.outline ?? t.outline}
      where id = ${topicId}`;
  });
}

/** Moves a topic, with its sub-topics and lessons, to the end of a new place. */
export async function moveTopic(sql: Sql, authorId: string, topicId: string, place: TopicPlace): Promise<void> {
  await asAuthor(
    sql,
    authorId,
    async (tx) => {
      const { category_id, parent_id } = placeColumns(place);
      const r = await tx`
        update public.topics set category_id = ${category_id}, parent_id = ${parent_id},
               position = ${await nextTopicPosition(tx, place)}
        where id = ${topicId}`;
      if (r.count === 0) throw new AuthorError("That topic doesn't exist.");
    },
    "That category or parent topic doesn't exist.",
  );
}

/** Puts a topic's siblings (same category or same parent) in this order. List every sibling once. */
export async function reorderTopics(sql: Sql, authorId: string, place: TopicPlace, topicIds: string[]): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const siblings =
      "categoryId" in place
        ? await tx`select id from public.topics where category_id = ${place.categoryId}`
        : await tx`select id from public.topics where parent_id = ${place.parentId}`;
    sameSet(siblings.map((r) => r.id), topicIds, "topics here");
    for (const [i, id] of topicIds.entries()) await tx`update public.topics set position = ${i} where id = ${id}`;
  });
}

/** Only a topic with no lessons and no sub-topics can be deleted. */
export async function deleteTopic(sql: Sql, authorId: string, topicId: string): Promise<void> {
  await asAuthor(
    sql,
    authorId,
    async (tx) => {
      await tx`delete from public.topics where id = ${topicId}`;
    },
    "Move or delete this topic's lessons and sub-topics first.",
  );
}

// ---------------------------------------------------------------------------
// Lessons (E4–E7)
// ---------------------------------------------------------------------------

export interface LessonRow {
  id: string;
  position: number;
  level: number;
  title: string;
  status: LessonStatus;
  readingMinutes: number;
  questionCount: number;
  problemCount: number;
}

/** A topic's path, in order, for the author's topic page. */
export async function loadTopicLessons(sql: Sql, authorId: string, topicId: string): Promise<LessonRow[]> {
  return asAuthor(sql, authorId, async (tx) => {
    const rows = await tx`
      select l.id, l.position, l.level, l.title, l.status, l.reading_minutes,
             (select count(*)::int from public.questions q where q.lesson_id = l.id) as question_count,
             (select count(*)::int from public.practice_problems p where p.lesson_id = l.id) as problem_count
      from public.lessons l where l.topic_id = ${topicId} order by l.position`;
    return rows.map((r) => ({
      id: r.id,
      position: r.position,
      level: r.level,
      title: r.title,
      status: r.status,
      readingMinutes: r.reading_minutes,
      questionCount: r.question_count,
      problemCount: r.problem_count,
    }));
  });
}

/** Starts a draft lesson at the end of a topic's path. */
export async function createLesson(sql: Sql, authorId: string, topicId: string, title: string): Promise<string> {
  if (blank(title) || !title) throw new AuthorError("Add a title.");
  return asAuthor(
    sql,
    authorId,
    async (tx) => {
      const [last] = await tx`
        select position, level from public.lessons where topic_id = ${topicId} order by position desc limit 1`;
      const [row] = await tx`
        insert into public.lessons (topic_id, position, level, title)
        values (${topicId}, ${last ? last.position + 1 : 1}, ${last?.level ?? 1}, ${title.trim()})
        returning id`;
      return row!.id;
    },
    "That topic doesn't exist.",
  );
}

export interface LessonForEditing extends Required<Omit<LessonDraft, "questions" | "problems">> {
  id: string;
  topicId: string;
  status: LessonStatus;
  questions: Required<QuestionDraft>[];
  problems: Required<ProblemDraft>[];
  /** How many learners have it. A delivered lesson can be unpublished but not deleted. */
  deliveredCount: number;
}

export async function loadLessonForEditing(sql: Sql, authorId: string, lessonId: string): Promise<LessonForEditing | null> {
  return asAuthor(sql, authorId, (tx) => lessonForEditing(tx, lessonId));
}

async function lessonForEditing(tx: Tx, lessonId: string): Promise<LessonForEditing | null> {
  const [l] = await tx`
    select id, topic_id, title, body, level, reading_minutes, status,
           (select count(*)::int from public.deliveries d where d.lesson_id = l.id) as delivered
    from public.lessons l where id = ${lessonId}`;
  if (!l) return null;
  const questions = await tx`
    select id, prompt, options, correct_index, explanation from public.questions
    where lesson_id = ${lessonId} order by position, id`;
  const problems = await tx`
    select id, prompt, solution from public.practice_problems
    where lesson_id = ${lessonId} order by position, created_at, id`;
  return {
    id: l.id,
    topicId: l.topic_id,
    title: l.title,
    body: l.body,
    level: l.level,
    readingMinutes: l.reading_minutes,
    status: l.status,
    deliveredCount: l.delivered,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    })),
    problems: problems.map((p) => ({ id: p.id, prompt: p.prompt, solution: p.solution })),
  };
}

/**
 * Saves the whole lesson editor at once: text, level, reading time, and the
 * questions and practice problems in their new order. Items without an id are
 * added; saved items left out are removed. Removing a question also removes
 * learners' answers to it and its review items. A published lesson stays
 * published, so it must still pass the publishing checks.
 */
export async function saveLesson(sql: Sql, authorId: string, lessonId: string, draft: LessonDraft): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const [l] = await tx`select status from public.lessons where id = ${lessonId} for update`;
    if (!l) throw new AuthorError("That lesson doesn't exist.");
    const problems = l.status === "published" ? publishProblems(draft) : draftProblems(draft);
    if (problems.length) throw new AuthorError(problems[0]!, problems);

    await tx`
      update public.lessons set
        title = ${draft.title.trim()}, body = ${draft.body}, level = ${draft.level},
        reading_minutes = ${draft.readingMinutes ?? estimateReadingMinutes(draft.body)}
      where id = ${lessonId}`;

    const savedQ = new Set((await tx`select id from public.questions where lesson_id = ${lessonId}`).map((r) => r.id));
    const savedP = new Set((await tx`select id from public.practice_problems where lesson_id = ${lessonId}`).map((r) => r.id));
    if (draft.questions.some((q) => q.id && !savedQ.has(q.id)) || draft.problems.some((p) => p.id && !savedP.has(p.id))) {
      throw new AuthorError("A question or problem belongs to another lesson. Reload and try again.");
    }

    const keepQ = draft.questions.flatMap((q) => (q.id ? [q.id] : []));
    await tx`delete from public.questions where lesson_id = ${lessonId} and not (id = any(${keepQ}::uuid[]))`;
    for (const [i, q] of draft.questions.entries()) {
      const options = q.options.map((o) => o.trim());
      const explanation = q.explanation?.trim() ?? "";
      if (q.id) {
        await tx`
          update public.questions set position = ${i}, prompt = ${q.prompt.trim()}, options = ${options},
                 correct_index = ${q.correctIndex}, explanation = ${explanation}
          where id = ${q.id}`;
      } else {
        await tx`
          insert into public.questions (lesson_id, position, prompt, options, correct_index, explanation)
          values (${lessonId}, ${i}, ${q.prompt.trim()}, ${options}, ${q.correctIndex}, ${explanation})`;
      }
    }

    const keepP = draft.problems.flatMap((p) => (p.id ? [p.id] : []));
    await tx`delete from public.practice_problems where lesson_id = ${lessonId} and not (id = any(${keepP}::uuid[]))`;
    for (const [i, p] of draft.problems.entries()) {
      if (p.id) {
        await tx`
          update public.practice_problems set position = ${i}, prompt = ${p.prompt.trim()}, solution = ${p.solution.trim()}
          where id = ${p.id}`;
      } else {
        await tx`
          insert into public.practice_problems (lesson_id, position, prompt, solution)
          values (${lessonId}, ${i}, ${p.prompt.trim()}, ${p.solution.trim()})`;
      }
    }
  });
}

/** Publishes a draft or unpublished lesson, once it passes the checks (E5). */
export async function publishLesson(sql: Sql, authorId: string, lessonId: string): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const lesson = await lessonForEditing(tx, lessonId);
    if (!lesson) throw new AuthorError("That lesson doesn't exist.");
    if (lesson.status === "published") return;
    const problems = publishProblems(lesson);
    if (problems.length) throw new AuthorError(problems[0]!, problems);
    await tx`update public.lessons set status = 'published' where id = ${lessonId}`;
  });
}

/**
 * Takes a lesson out of picking and review (E7). Learners who already have it
 * keep it in their inbox and history.
 */
export async function unpublishLesson(sql: Sql, authorId: string, lessonId: string): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const [l] = await tx`select status from public.lessons where id = ${lessonId}`;
    if (!l) throw new AuthorError("That lesson doesn't exist.");
    if (l.status === "published") await tx`update public.lessons set status = 'unpublished' where id = ${lessonId}`;
  });
}

/** Deletes a lesson no learner has received. Otherwise, unpublish it. */
export async function deleteLesson(sql: Sql, authorId: string, lessonId: string): Promise<void> {
  await asAuthor(
    sql,
    authorId,
    async (tx) => {
      await tx`delete from public.lessons where id = ${lessonId}`;
    },
    "Learners already have this lesson, so it can't be deleted. Unpublish it instead.",
  );
}

/**
 * Puts a topic's lessons in this order. List every lesson in the topic once.
 * Learners get lessons in path order, and the first published one is the
 * free preview, so reordering changes both.
 */
export async function reorderLessons(sql: Sql, authorId: string, topicId: string, lessonIds: string[]): Promise<void> {
  await asAuthor(sql, authorId, async (tx) => {
    const all = await tx`select id from public.lessons where topic_id = ${topicId}`;
    sameSet(all.map((r) => r.id), lessonIds, "lessons in this topic");
    // Positions are unique within a topic, so step out of the way first.
    await tx`update public.lessons set position = -position - 1 where topic_id = ${topicId}`;
    for (const [i, id] of lessonIds.entries()) await tx`update public.lessons set position = ${i + 1} where id = ${id}`;
  });
}
