import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonArticle, LessonPageFrame, PracticeProblems } from "@/components/lesson-view";
import { LessonQuiz } from "@/components/lesson-quiz";
import { Card, LinkButton } from "@/components/ui";
import { openLessonPage, previewLessonId } from "@/lib/jobs/learner";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { gradePreviewQuizAction } from "../../actions";

export const metadata: Metadata = { title: "Free lesson" };

// The free preview (A9): a topic's first published lesson, practice problems
// and quiz. Nothing is saved. Ends with sign-up.
export default async function PreviewPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(topic)) notFound();
  const lessonId = await previewLessonId(db(), topic);
  if (!lessonId) notFound();
  const user = await currentUser();
  const lesson = await openLessonPage(db(), user?.id ?? null, lessonId, new Date());
  if (!lesson) notFound();
  // Already delivered to this learner: read it as their own lesson.
  if (!lesson.preview) redirect(`/lessons/${lesson.id}`);

  const next = user ? (
    <LinkButton href={`/explore/${topic}`} variant="secondary">
      Back to {lesson.topic.name}
    </LinkButton>
  ) : (
    <Card aria-labelledby="signup-heading">
      <h2 id="signup-heading" className="text-[22px]">
        Want one of these every day?
      </h2>
      <p className="mt-1 mb-4 text-text-muted">Pick your topics and get a short lesson each morning. It&rsquo;s free.</p>
      <LinkButton href="/sign-in">Sign up</LinkButton>
    </Card>
  );

  return (
    <LessonPageFrame>
      <p className="mb-6 text-[15px] text-text-muted">
        Free lesson from{" "}
        <Link href={`/explore/${topic}`} className="font-medium text-primary hover:underline">
          {lesson.topic.name}
        </Link>
      </p>
      <LessonArticle
        title={lesson.title}
        topicName={lesson.topic.name}
        readingMinutes={lesson.readingMinutes}
        level={lesson.level}
        body={lesson.body}
      />
      <PracticeProblems problems={lesson.problems} />
      <LessonQuiz quiz={lesson.quiz} grade={gradePreviewQuizAction.bind(null, lesson.id)} next={next} />
    </LessonPageFrame>
  );
}
