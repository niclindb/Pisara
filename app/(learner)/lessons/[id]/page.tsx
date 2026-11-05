import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LessonArticle, LessonPageFrame, PracticeProblems } from "@/components/lesson-view";
import { openLessonPage } from "@/lib/jobs/learner";
import { db } from "@/lib/server/db";
import { requireLearner } from "../../guard";
import { LessonQuiz } from "@/components/lesson-quiz";
import { LinkButton } from "@/components/ui";
import { submitQuizAction } from "../../actions";

export const metadata: Metadata = { title: "Lesson" };

// The lesson page (B4, B5, C1–C6, D3, D8). Opening it marks the lesson read.
// Only lessons delivered to this learner open; there's no reading ahead.
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireLearner();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lesson = await openLessonPage(db(), user.id, id, new Date());
  if (!lesson) notFound();
  if (lesson.preview) redirect(`/explore/${lesson.topic.id}/preview`);
  return (
    <LessonPageFrame>
      {lesson.unpublished && (
        <p className="mb-6 rounded-card-sm border border-border bg-surface px-4 py-3 text-[15px]">
          This lesson has been taken down for changes. You can still read it here.
        </p>
      )}
      <LessonArticle
        title={lesson.title}
        topicName={lesson.topic.name}
        readingMinutes={lesson.readingMinutes}
        level={lesson.level}
        body={lesson.body}
      />
      <PracticeProblems problems={lesson.problems} />
      <LessonQuiz
        quiz={lesson.quiz}
        grade={submitQuizAction.bind(null, lesson.id)}
        next={
          <LinkButton href="/home" variant="secondary">
            Back to Home
          </LinkButton>
        }
      />
    </LessonPageFrame>
  );
}
