"use server";

// Server actions for the author pages. Each one checks the signed-in user is an
// author (the job functions check again), then refreshes the pages it changed.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as author from "@/lib/jobs/author";
import { AuthorError, type LessonDraft } from "@/lib/rules/authoring";
import { db } from "@/lib/server/db";
import { requireAuthor } from "./guard";

export type ActionResult = { ok: true; message?: string } | { ok: false; problems: string[] };

async function run(work: (authorId: string) => Promise<void>): Promise<ActionResult> {
  const user = await requireAuthor();
  try {
    await work(user.id);
  } catch (err) {
    if (err instanceof AuthorError) return { ok: false, problems: err.problems };
    throw err;
  }
  refresh();
  return { ok: true };
}

/** Author pages all read the same content, so refresh them together. */
function refresh() {
  revalidatePath("/author", "layout");
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// Categories --------------------------------------------------------------

export async function createCategoryAction(_: ActionResult | null, form: FormData) {
  return run((a) => author.createCategory(db(), a, text(form, "name")).then(() => {}));
}

export async function renameCategoryAction(_: ActionResult | null, form: FormData) {
  return run((a) => author.renameCategory(db(), a, text(form, "id"), text(form, "name")));
}

export async function deleteCategoryAction(_: ActionResult | null, form: FormData) {
  return run((a) => author.deleteCategory(db(), a, text(form, "id")));
}

export async function reorderCategoriesAction(ids: string[]) {
  return run((a) => author.reorderCategories(db(), a, ids));
}

// Topics ------------------------------------------------------------------

function placeFrom(value: string): author.TopicPlace {
  const [kind, id] = value.split(":");
  if (!id || (kind !== "category" && kind !== "topic")) throw new AuthorError("Pick where the topic goes.");
  return kind === "category" ? { categoryId: id } : { parentId: id };
}

export async function createTopicAction(_: ActionResult | null, form: FormData) {
  const user = await requireAuthor();
  let id: string;
  try {
    id = await author.createTopic(db(), user.id, placeFrom(text(form, "place")), { name: text(form, "name") });
  } catch (err) {
    if (err instanceof AuthorError) return { ok: false, problems: err.problems } as ActionResult;
    throw err;
  }
  refresh();
  redirect(`/author/topics/${id}`);
}

export async function updateTopicAction(_: ActionResult | null, form: FormData) {
  const id = text(form, "id");
  const result = await run(
    (a) =>
      author.updateTopic(db(), a, id, {
        name: text(form, "name"),
        goal: text(form, "goal"),
        description: text(form, "description"),
        outline: text(form, "outline"),
      }));
  return result.ok ? { ok: true as const, message: "Saved." } : result;
}

export async function moveTopicAction(_: ActionResult | null, form: FormData) {
  const id = text(form, "id");
  return run(async (a) => author.moveTopic(db(), a, id, placeFrom(text(form, "place"))));
}

export async function reorderTopicsAction(place: string, ids: string[]) {
  return run((a) => author.reorderTopics(db(), a, placeFrom(place), ids));
}

export async function deleteTopicAction(_: ActionResult | null, form: FormData) {
  const result = await run((a) => author.deleteTopic(db(), a, text(form, "id")));
  if (result.ok) redirect("/author");
  return result;
}

// Lessons -----------------------------------------------------------------

export async function createLessonAction(_: ActionResult | null, form: FormData) {
  const user = await requireAuthor();
  const topicId = text(form, "topicId");
  let id: string;
  try {
    id = await author.createLesson(db(), user.id, topicId, text(form, "title"));
  } catch (err) {
    if (err instanceof AuthorError) return { ok: false, problems: err.problems } as ActionResult;
    throw err;
  }
  refresh();
  redirect(`/author/lessons/${id}`);
}

export async function reorderLessonsAction(topicId: string, ids: string[]) {
  return run((a) => author.reorderLessons(db(), a, topicId, ids));
}

export async function saveLessonAction(lessonId: string, draft: LessonDraft) {
  const result = await run((a) => author.saveLesson(db(), a, lessonId, draft));
  return result.ok ? { ok: true as const, message: "Saved." } : result;
}

export async function publishLessonAction(lessonId: string, draft: LessonDraft) {
  const user = await requireAuthor();
  try {
    await author.saveLesson(db(), user.id, lessonId, draft);
    await author.publishLesson(db(), user.id, lessonId);
  } catch (err) {
    if (err instanceof AuthorError) return { ok: false, problems: err.problems } as ActionResult;
    throw err;
  }
  refresh();
  return { ok: true, message: "Published." } as ActionResult;
}

export async function unpublishLessonAction(lessonId: string) {
  const result = await run((a) => author.unpublishLesson(db(), a, lessonId));
  return result.ok ? { ok: true as const, message: "Unpublished. Learners who have it keep it." } : result;
}

export async function deleteLessonAction(lessonId: string, topicId: string) {
  const result = await run((a) => author.deleteLesson(db(), a, lessonId));
  if (result.ok) redirect(`/author/topics/${topicId}`);
  return result;
}

// Setup check --------------------------------------------------------------

/** Sends a short email to the signed-in author, to prove the email settings work. */
export async function sendTestEmailAction(): Promise<ActionResult> {
  const user = await requireAuthor();
  const { pickMailer } = await import("@/lib/email/mailer");
  const { env } = await import("@/lib/server/env");
  const smtpUser = env.smtpUser();
  const resend = env.resendApiKey();
  try {
    const mailer = pickMailer({
      smtpHost: env.smtpHost(),
      smtpPort: env.smtpPort(),
      smtpUser,
      smtpPassword: env.smtpPassword(),
      resendApiKey: resend,
      from: env.emailFrom(),
    });
    await mailer.send({
      to: user.email,
      subject: "Pisara test email",
      text: "This is a test from Pisara's setup check. If you can read it, lesson emails will reach you too.",
      html: "<p>This is a test from Pisara's setup check. If you can read it, lesson emails will reach you too.</p>",
      headers: {},
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, problems: [`The test email didn't send: ${reason}`] };
  }
  if (!smtpUser && !resend) return { ok: true, message: "Email isn't set up yet, so the test went to the Vercel log." };
  return { ok: true, message: `Sent to ${user.email}. Check your inbox, and spam if it isn't there in a minute.` };
}
