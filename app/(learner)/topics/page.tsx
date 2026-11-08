import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { TopicInterest } from "@/components/topic-interest";
import { PageTitle } from "@/components/ui";
import { loadHome } from "@/lib/jobs/learner";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { INBOX_LIMIT, MANY_TOPICS } from "@/lib/rules/constants";
import { db } from "@/lib/server/db";
import { extraLessonAction, setTopicInterestAction } from "../actions";
import { requireLearner } from "../guard";

export const metadata: Metadata = { title: "My topics" };

// My topics (A4, A3a, B7, D2, D4): every topic with its interest control, and
// Start on the ones that are on.
export default async function MyTopicsPage() {
  const user = await requireLearner();
  const [choices, home] = await Promise.all([loadTopicChoices(db(), user.id), loadHome(db(), user.id, new Date())]);
  const roomForExtra = (home?.waiting.length ?? 0) < INBOX_LIMIT && (home?.extrasLeftToday ?? 0) > 0;
  const onCount = choices.topics.filter((t) => t.interest > 0).length;
  return (
    <>
      <PageTitle>My topics</PageTitle>
      <p className="-mt-3 mb-6 text-text-muted">
        Topics you turn up come up more often. Turning one off keeps your progress.
        {onCount > MANY_TOPICS && ` You have ${onCount} topics on, so each one will come up less often.`}
      </p>
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
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                      <div className="min-w-0 flex-1 basis-56">
                        <Link href={`/explore/${t.id}`} className="font-heading text-[18px] font-bold hover:underline hover:text-accent">
                          {t.name}
                        </Link>
                        {t.progress && t.pickable && (
                          <p className="mt-1 text-[15px] text-text-muted">
                            {t.progress.read} of {t.progress.total} read
                            {t.progress.finished && " · New lessons coming soon"}
                          </p>
                        )}
                        {!t.pickable && <p className="mt-1 text-[15px] text-text-muted">Pick a part below</p>}
                      </div>
                      {t.pickable && (
                        <div className="flex flex-wrap items-start gap-3">
                          <TopicInterest topicId={t.id} topicName={t.name} interest={t.interest} save={setTopicInterestAction} />
                          {t.interest > 0 && roomForExtra && !t.progress?.finished && (
                            <ActionForm
                              action={extraLessonAction}
                              submit="Start"
                              submitLabel={`Start a lesson in ${t.name}`}
                              pendingLabel="Opening…"
                              variant="secondary"
                            >
                              <input type="hidden" name="topicId" value={t.id} />
                            </ActionForm>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
