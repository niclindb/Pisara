import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHeading, TopicTreeList } from "@/components/topic-tree";
import { PageTitle } from "@/components/ui";
import { loadTopicChoices, type TopicChoices } from "@/lib/jobs/topics";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export const metadata: Metadata = { title: "Explore" };

// Explore (A2, A3, A3a): every topic learners can see, by category, with its
// goal and lesson count. Open to visitors.
export default async function ExplorePage() {
  const user = await currentUser();
  const choices = await loadTopicChoices(db(), user?.id ?? null);
  return (
    <>
      <PageTitle>Explore topics</PageTitle>
      {choices.topics.length === 0 ? (
        <p className="text-text-muted">The first topics are still being written. Check back soon.</p>
      ) : (
        <TopicTree choices={choices} signedIn={Boolean(user)} />
      )}
    </>
  );
}

function TopicTree({ choices, signedIn }: { choices: TopicChoices; signedIn: boolean }) {
  return (
    <div className="space-y-10">
      {choices.categories.map((c) => {
        const topics = choices.topics.filter((t) => t.categoryId === c.id);
        if (!topics.length) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <CategoryHeading id={`cat-${c.id}`}>{c.name}</CategoryHeading>
            <TopicTreeList
              topics={topics}
              renderTopic={(t) => (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <Link href={`/explore/${t.id}`} className="font-heading text-[18px] font-bold hover:underline hover:text-accent">
                      {t.name}
                    </Link>
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px]">
                      {signedIn && t.pickable && <TopicStatus on={t.interest > 0} />}
                      <span className="text-text-muted">{t.pickable ? `${t.lessonCount} lessons` : "Coming soon"}</span>
                    </span>
                  </div>
                  {t.goal && <p className="mt-1">{t.goal}</p>}
                </>
              )}
            />
          </section>
        );
      })}
    </div>
  );
}

// Whether the topic is one the learner's daily lessons come from. A filled tag
// with a check for yes, plain text for no, so the two never rely on color alone.
function TopicStatus({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-success-bg px-2 py-0.5 font-bold text-success">
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
        <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      In your lessons
    </span>
  ) : (
    <span className="text-text-muted">Not in your lessons</span>
  );
}
