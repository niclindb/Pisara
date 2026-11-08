import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="space-y-8">
      {choices.categories.map((c) => {
        const topics = choices.topics.filter((t) => t.categoryId === c.id);
        if (!topics.length) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">
              {c.name}
            </h2>
            <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
              {topics.map((t) => (
                <li key={t.id} className="py-4 pr-5" style={{ paddingLeft: `${1.25 + t.depth * 1.5}rem` }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link href={`/explore/${t.id}`} className="font-heading text-[18px] font-bold hover:underline hover:text-accent">
                      {t.name}
                    </Link>
                    <span className="text-[15px] text-text-muted">
                      {signedIn && t.interest > 0 ? "On · " : ""}
                      {t.pickable ? `${t.lessonCount} lessons` : "Coming soon"}
                    </span>
                  </div>
                  {t.goal && <p className="mt-1">{t.goal}</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
