import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { loadProgress } from "@/lib/jobs/learner";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { milestoneMessage } from "@/lib/rules/milestones";
import { db } from "@/lib/server/db";
import { requireLearner } from "../guard";

export const metadata: Metadata = { title: "Progress" };

// Progress (D1, D3, D8, C9): lessons read, each topic's level and lessons read
// toward its goal, Go deeper, review accuracy and milestones.
export default async function ProgressPage() {
  const user = await requireLearner();
  const now = new Date();
  const [progress, choices] = await Promise.all([loadProgress(db(), user.id, now), loadTopicChoices(db(), user.id)]);
  if (!progress) return null;
  const name = (id: string) => choices.topics.find((t) => t.id === id)?.name ?? progress.topics.find((t) => t.id === id)?.name;
  const depth = (id: string) => choices.topics.find((t) => t.id === id)?.depth ?? 0;
  const review = progress.reviewRemembered;
  return (
    <>
      <PageTitle>Progress</PageTitle>
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-text-muted">Lessons read</p>
          <p className="mt-1 font-heading text-[42px] font-bold leading-none">{progress.lessonsRead}</p>
        </Card>
        <Card>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-text-muted">Review, last 30 days</p>
          {review ? (
            <>
              <p className="mt-1 font-heading text-[42px] font-bold leading-none">{Math.round((review.correct / review.total) * 100)}%</p>
              <p className="mt-1 text-[15px] text-text-muted">
                {review.correct} of {review.total} remembered
              </p>
            </>
          ) : (
            <p className="mt-2 text-text-muted">Review questions come back a day or more after you miss them.</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="topics-heading" className="mb-10">
        <h2 id="topics-heading" className="mb-3 text-[22px]">
          Topics
        </h2>
        {progress.topics.length === 0 ? (
          <p className="text-text-muted">Your topics show up here once you start reading.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
            {progress.topics.map((t) => {
              const pct = t.progress.total ? Math.round((t.progress.read / t.progress.total) * 100) : 0;
              return (
                <li key={t.id} className="py-4 pr-5" style={{ paddingLeft: `${1.25 + depth(t.id) * 1.5}rem` }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <Link href={`/explore/${t.id}`} className="font-heading text-[18px] font-bold hover:underline">
                      {t.name}
                    </Link>
                    <span className="text-[15px] text-text-muted">
                      {t.progress.level > 0 ? `Level ${t.progress.level} · ` : ""}
                      {t.interest === 0 ? "Off · " : ""}
                      {t.progress.read} of {t.progress.total} read
                    </span>
                  </div>
                  {t.goal && <p className="mt-1 text-[15px]">Goal: {t.goal}</p>}
                  <div aria-hidden className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-hairline">
                    <div className="h-full rounded-full bg-bright dark:bg-text-muted" style={{ width: `${pct}%` }} />
                  </div>
                  {t.goDeeper.length > 0 && (
                    <p className="mt-2 text-[15px]">
                      Go deeper:{" "}
                      {t.goDeeper.map((g, i) => (
                        <span key={g.id}>
                          {i > 0 && ", "}
                          <Link href={`/explore/${g.id}`} className="font-medium text-primary underline underline-offset-4">
                            {g.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {progress.milestones.length > 0 && (
        <section aria-labelledby="milestones-heading">
          <h2 id="milestones-heading" className="mb-3 text-[22px]">
            Milestones
          </h2>
          <ul className="space-y-2">
            {progress.milestones.map((m) => (
              <li key={m.kind} className="rounded-card-sm border border-hairline bg-surface px-5 py-3">
                {milestoneMessage(m.kind, name)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
