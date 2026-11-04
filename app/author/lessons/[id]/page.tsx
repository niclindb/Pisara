import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadContentTree, loadLessonForEditing } from "@/lib/jobs/author";
import { db } from "@/lib/server/db";
import { requireAuthor } from "../../guard";
import { LessonEditor } from "./lesson-editor";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthor();
  const lesson = await loadLessonForEditing(db(), user.id, id).catch(() => null);
  if (!lesson) notFound();
  const tree = await loadContentTree(db(), user.id);
  const topicName = tree.topics.find((t) => t.id === lesson.topicId)?.name ?? "Topic";
  // key: a fresh editor after each save that changes the saved ids.
  return <LessonEditor key={JSON.stringify(lesson.questions.map((q) => q.id).concat(lesson.problems.map((p) => p.id)))} lesson={lesson} topicName={topicName} />;
}
