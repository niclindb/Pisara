import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { extraLessonAction, setTopicInterestAction } from "@/app/(learner)/actions";
import { ActionForm } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { TopicInterest } from "@/components/topic-interest";
import { Card, LinkButton } from "@/components/ui";
import { previewLessonId } from "@/lib/jobs/learner";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { levelName } from "@/lib/rules/levels";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  if (!isId(topic)) return {};
  const choices = await loadTopicChoices(db(), null);
  return { title: choices.topics.find((t) => t.id === topic)?.name ?? "Topic" };
}

// A topic page (A3, A3a, A4, A9, D1, D2). There's no lesson list, so there's
// no reading ahead: visitors get the free first lesson, learners get Start.
export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: id } = await params;
  if (!isId(id)) notFound();
  const user = await currentUser();
  const choices = await loadTopicChoices(db(), user?.id ?? null);
  const topic = choices.topics.find((t) => t.id === id);
  if (!topic) notFound();
  const parent = choices.topics.find((t) => t.id === topic.parentId);
  const children = choices.topics.filter((t) => t.parentId === id);
  const category = choices.categories.find((c) => c.id === topic.categoryId);
  const preview = topic.pickable ? await previewLessonId(db(), id) : null;
  const signedIn = Boolean(user);

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-[15px] text-text-muted">
        <Link href="/explore" className="hover:underline hover:text-accent">
          Explore
        </Link>
        {category && <> / {category.name}</>}
        {parent && (
          <>
            {" / "}
            <Link href={`/explore/${parent.id}`} className="hover:underline hover:text-accent">
              {parent.name}
            </Link>
          </>
        )}
      </nav>
      <h1 className="text-[32px] leading-tight sm:text-[42px]">{topic.name}</h1>
      {topic.goal && <p className="mt-3 text-[18px]">{topic.goal}</p>}
      <p className="mt-2 text-[15px] text-text-muted">{topic.pickable ? `${topic.lessonCount} lessons` : "Coming soon"}</p>

      {topic.pickable && signedIn && topic.progress && (
        <Card className="mt-8 space-y-5" aria-label="Your progress and settings">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {topic.progress.read} of {topic.progress.total} lessons read
                {topic.progress.level > 0 && ` · ${levelName(topic.progress.level)}`}
              </p>
              {topic.progress.finished && <p className="text-text-muted">New lessons coming soon.</p>}
            </div>
            {!topic.progress.finished && (
              <ActionForm action={extraLessonAction} submit="Start a lesson" pendingLabel="Opening…">
                <input type="hidden" name="topicId" value={topic.id} />
              </ActionForm>
            )}
          </div>
          <div>
            <p className="mb-2 font-medium">How often it comes up</p>
            <TopicInterest topicId={topic.id} topicName={topic.name} interest={topic.interest} save={setTopicInterestAction} />
            {topic.interest === 0 && topic.prerequisiteNote && <p className="text-[15px] text-text-muted">{topic.prerequisiteNote}</p>}
          </div>
        </Card>
      )}

      {topic.pickable && !signedIn && (
        <Card className="mt-8 flex flex-wrap items-center gap-3" aria-label="Try it">
          {preview && (
            <LinkButton href={`/explore/${topic.id}/preview`}>Read the first lesson free</LinkButton>
          )}
          <LinkButton href="/sign-in" variant="secondary">
            Sign up
          </LinkButton>
        </Card>
      )}

      {topic.description && (
        <section aria-labelledby="about-heading" className="mt-10">
          <h2 id="about-heading" className="mb-3 text-[22px]">
            About this topic
          </h2>
          <Markdown>{topic.description}</Markdown>
        </section>
      )}

      {children.length > 0 && (
        <section aria-labelledby="sub-heading" className="mt-10">
          <h2 id="sub-heading" className="mb-3 text-[22px]">
            Go deeper
          </h2>
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
            {children.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <Link href={`/explore/${c.id}`} className="font-heading text-[18px] font-bold hover:underline hover:text-accent">
                  {c.name}
                </Link>
                {c.goal && <p className="mt-1">{c.goal}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
