import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonArticle, LessonPageFrame, PracticeProblems } from "@/components/lesson-view";
import { QuizTry } from "@/components/quiz-try";
import { loadContentTree, loadLessonForEditing } from "@/lib/jobs/author";
import { db } from "@/lib/server/db";
import { requireAuthor } from "../../../guard";

export const metadata: Metadata = { title: "Preview lesson" };

export default async function LessonPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthor();
  const lesson = await loadLessonForEditing(db(), user.id, id).catch(() => null);
  if (!lesson) notFound();
  const tree = await loadContentTree(db(), user.id);
  const topicName = tree.topics.find((t) => t.id === lesson.topicId)?.name ?? "";
  return (
    <LessonPageFrame>
      <p className="mb-6 rounded-card-sm border border-border bg-surface px-4 py-3 text-[15px]">
        Preview as a learner sees it, from the last save.{" "}
        <Link href={`/author/lessons/${id}`} className="font-medium text-primary hover:underline hover:text-accent">
          Back to editing
        </Link>
      </p>
      <LessonArticle title={lesson.title} topicName={topicName} readingMinutes={lesson.readingMinutes} level={lesson.level} body={lesson.body} />
      <PracticeProblems problems={lesson.problems} />
      <QuizTry questions={lesson.questions} />
    </LessonPageFrame>
  );
}
