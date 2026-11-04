// Author tools against a real Postgres database. Needs TEST_DATABASE_URL
// (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  AuthorError,
  createCategory,
  createLesson,
  createTopic,
  deleteCategory,
  deleteLesson,
  deleteTopic,
  loadContentTree,
  loadLessonForEditing,
  loadTopicLessons,
  moveTopic,
  publishLesson,
  renameCategory,
  reorderCategories,
  reorderLessons,
  reorderTopics,
  saveLesson,
  unpublishLesson,
  updateTopic,
} from "./author";
import { connect } from "./postgres-store";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const AUTHOR = "00000000-0000-4000-8000-00000000000a";
const LEARNER = "00000000-0000-4000-8000-00000000000b";

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${AUTHOR}, 'author@example.com'), (${LEARNER}, 'learner@example.com')`;
  await sql`update public.profiles set role = 'author' where id = ${AUTHOR}`;
}

const draft = (over = {}) => ({
  title: "How stars form",
  body: "Clouds of gas collapse under gravity.",
  level: 1,
  questions: [{ prompt: "What collapses?", options: ["Gas clouds", "Planets"], correctIndex: 0, explanation: "Gravity pulls gas in." }],
  problems: [{ prompt: "Why does it heat up?", solution: "Squeezed gas gets hotter." }],
  ...over,
});

async function rejects(p: Promise<unknown>, message: string | RegExp) {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(AuthorError);
  expect(err.message).toMatch(message);
}

describe.skipIf(!url)("author tools on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("lets only authors make changes", async () => {
    await rejects(createCategory(sql, LEARNER, "Science"), "Only authors");
    await rejects(loadContentTree(sql, LEARNER), "Only authors");
    expect(await sql`select * from public.categories`).toHaveLength(0);
  });

  it("builds and rearranges categories and a topic tree", async () => {
    const science = await createCategory(sql, AUTHOR, " Science ");
    const history = await createCategory(sql, AUTHOR, "History");
    await renameCategory(sql, AUTHOR, history, "World history");
    await reorderCategories(sql, AUTHOR, [history, science]);
    await rejects(reorderCategories(sql, AUTHOR, [history]), "exactly once");

    const astronomy = await createTopic(sql, AUTHOR, { categoryId: science }, { name: "Astronomy", goal: "Read the night sky" });
    const stars = await createTopic(sql, AUTHOR, { parentId: astronomy }, { name: "Stars" });
    const planets = await createTopic(sql, AUTHOR, { parentId: astronomy }, { name: "Planets" });
    const holes = await createTopic(sql, AUTHOR, { parentId: stars }, { name: "Black holes" });
    await reorderTopics(sql, AUTHOR, { parentId: astronomy }, [planets, stars]);
    await updateTopic(sql, AUTHOR, stars, { outline: "1. Birth\n2. Death", goal: "Know a star's life" });

    // A topic can't go under its own sub-topic, but can move anywhere else.
    await rejects(moveTopic(sql, AUTHOR, astronomy, { parentId: holes }), "own sub-topics");
    await moveTopic(sql, AUTHOR, holes, { categoryId: science });

    const tree = await loadContentTree(sql, AUTHOR);
    expect(tree.categories.map((c) => c.name)).toEqual(["World history", "Science"]);
    // Tree order: siblings by position. The page nests them by parent.
    const under = (place: string) =>
      tree.topics.filter((t) => t.parentId === place || t.categoryId === place).map((t) => t.name);
    expect(under(science)).toEqual(["Astronomy", "Black holes"]);
    expect(under(astronomy)).toEqual(["Planets", "Stars"]);
    expect(tree.topics.find((t) => t.id === stars)).toMatchObject({ name: "Stars", goal: "Know a star's life", pickable: false });

    await rejects(deleteCategory(sql, AUTHOR, science), "topics first");
    await rejects(deleteTopic(sql, AUTHOR, astronomy), "sub-topics first");
    await deleteTopic(sql, AUTHOR, planets);
    await deleteCategory(sql, AUTHOR, history);
    expect((await loadContentTree(sql, AUTHOR)).topics).toHaveLength(3);
  });

  it("writes, edits and publishes a lesson with its quiz and practice problems", async () => {
    const cat = await createCategory(sql, AUTHOR, "Science");
    const topic = await createTopic(sql, AUTHOR, { categoryId: cat }, { name: "Stars" });
    const id = await createLesson(sql, AUTHOR, topic, "How stars form");

    // An empty draft can't be published, and nothing about it changes.
    const err = await publishLesson(sql, AUTHOR, id).then(() => null, (e) => e);
    expect(err.problems).toEqual(["Write the lesson before publishing it."]);

    await saveLesson(sql, AUTHOR, id, { ...draft(), body: "word ".repeat(450) });
    let lesson = (await loadLessonForEditing(sql, AUTHOR, id))!;
    expect(lesson).toMatchObject({ status: "draft", readingMinutes: 2, deliveredCount: 0 });
    expect(lesson.questions).toHaveLength(1);
    expect(lesson.problems).toEqual([{ id: expect.any(String), prompt: "Why does it heat up?", solution: "Squeezed gas gets hotter." }]);

    await publishLesson(sql, AUTHOR, id);

    // Edit: keep and change the question, add a second one first, drop the problem, set the reading time.
    const kept = lesson.questions[0]!;
    await saveLesson(sql, AUTHOR, id, {
      ...draft(),
      readingMinutes: 4,
      questions: [
        { prompt: "New first question?", options: ["Yes", "No"], correctIndex: 1 },
        { ...kept, prompt: "What collapses, again?" },
      ],
      problems: [],
    });
    lesson = (await loadLessonForEditing(sql, AUTHOR, id))!;
    expect(lesson.status).toBe("published");
    expect(lesson.readingMinutes).toBe(4);
    expect(lesson.questions.map((q) => q.prompt)).toEqual(["New first question?", "What collapses, again?"]);
    expect(lesson.questions[1]!.id).toBe(kept.id);
    expect(lesson.problems).toEqual([]);

    // A published lesson can't lose its body, and a lesson can drop its quiz entirely.
    await rejects(saveLesson(sql, AUTHOR, id, draft({ body: " " })), "before publishing");
    await saveLesson(sql, AUTHOR, id, draft({ questions: [] }));
    expect((await loadLessonForEditing(sql, AUTHOR, id))!.questions).toEqual([]);

    // Bad input saves nothing.
    const bad = await saveLesson(sql, AUTHOR, id, draft({ title: "", questions: [{ prompt: "?", options: ["a"], correctIndex: 0 }] })).then(
      () => null,
      (e) => e,
    );
    expect(bad.problems).toEqual(["Add a title.", "Question 1: give 2 to 4 choices."]);
    expect((await loadLessonForEditing(sql, AUTHOR, id))!.title).toBe("How stars form");
  });

  it("won't take a question from another lesson", async () => {
    const cat = await createCategory(sql, AUTHOR, "Science");
    const topic = await createTopic(sql, AUTHOR, { categoryId: cat }, { name: "Stars" });
    const a = await createLesson(sql, AUTHOR, topic, "A");
    const b = await createLesson(sql, AUTHOR, topic, "B");
    await saveLesson(sql, AUTHOR, a, draft());
    const q = (await loadLessonForEditing(sql, AUTHOR, a))!.questions[0]!;
    await rejects(saveLesson(sql, AUTHOR, b, draft({ questions: [q] })), "another lesson");
  });

  it("orders a path, and only deletes lessons no learner has", async () => {
    const cat = await createCategory(sql, AUTHOR, "Science");
    const topic = await createTopic(sql, AUTHOR, { categoryId: cat }, { name: "Stars" });
    const ids = [];
    for (const t of ["One", "Two", "Three"]) {
      const id = await createLesson(sql, AUTHOR, topic, t);
      await saveLesson(sql, AUTHOR, id, draft({ title: t }));
      await publishLesson(sql, AUTHOR, id);
      ids.push(id);
    }
    expect((await loadContentTree(sql, AUTHOR)).topics[0]).toMatchObject({ pickable: true, lessons: { published: 3 } });

    await reorderLessons(sql, AUTHOR, topic, [ids[2]!, ids[0]!, ids[1]!]);
    const path = await loadTopicLessons(sql, AUTHOR, topic);
    expect(path.map((l) => [l.title, l.position, l.questionCount, l.problemCount])).toEqual([
      ["Three", 1, 1, 1],
      ["One", 2, 1, 1],
      ["Two", 3, 1, 1],
    ]);
    // New lessons go to the end.
    const four = await createLesson(sql, AUTHOR, topic, "Four");
    expect((await loadTopicLessons(sql, AUTHOR, topic)).at(-1)).toMatchObject({ id: four, position: 4, status: "draft" });

    await sql`insert into public.deliveries (user_id, lesson_id, local_date) values (${LEARNER}, ${ids[0]!}, '2026-11-04')`;
    await rejects(deleteLesson(sql, AUTHOR, ids[0]!), "Unpublish it instead");
    await unpublishLesson(sql, AUTHOR, ids[0]!);
    expect((await loadLessonForEditing(sql, AUTHOR, ids[0]!))).toMatchObject({ status: "unpublished", deliveredCount: 1 });
    await deleteLesson(sql, AUTHOR, four);
    expect(await loadLessonForEditing(sql, AUTHOR, four)).toBeNull();
  });
});
