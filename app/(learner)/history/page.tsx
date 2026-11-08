import type { Metadata } from "next";
import Link from "next/link";
import { Button, PageTitle } from "@/components/ui";
import { loadHistory } from "@/lib/jobs/learner";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { formatDate } from "@/lib/rules/dates";
import { db } from "@/lib/server/db";
import { requireLearner } from "../guard";

export const metadata: Metadata = { title: "History" };

// Lesson history (D5, C4, E7): lessons read, newest first, by topic if picked.
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ topic?: string; before?: string }> }) {
  const user = await requireLearner();
  const { topic, before } = await searchParams;
  const topicId = topic && /^[0-9a-f-]{36}$/i.test(topic) ? topic : undefined;
  const [history, choices] = await Promise.all([
    loadHistory(db(), user.id, { topicId, before }),
    loadTopicChoices(db(), user.id),
  ]);
  const year = new Date().getUTCFullYear();
  const withProgress = choices.topics.filter((t) => (t.progress?.read ?? 0) > 0);
  return (
    <>
      <PageTitle>History</PageTitle>
      {withProgress.length > 1 && (
        <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="font-medium">Topic</span>
            <select
              name="topic"
              defaultValue={topicId ?? ""}
              className="mt-1 block rounded-control border border-border bg-surface px-3 py-2.5"
            >
              <option value="">All topics</option>
              {withProgress.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary">Show</Button>
        </form>
      )}
      {history.items.length === 0 ? (
        <p className="text-text-muted">
          {before ? "No older lessons." : "Lessons you read show up here."}{" "}
          <Link href="/home" className="font-medium text-primary underline underline-offset-4">
            Go to Home
          </Link>
        </p>
      ) : (
        <ol className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {history.items.map((l) => (
            <li key={l.lessonId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
              <div className="min-w-0">
                <Link href={`/lessons/${l.lessonId}`} className="font-heading text-[18px] font-bold hover:underline hover:text-accent">
                  {l.title}
                </Link>
                <p className="text-[15px] text-text-muted">
                  {l.topicName} · {l.readOn ? `Read ${formatDate(l.readOn, year)}` : `Sent ${formatDate(l.deliveredOn, year)}`}
                </p>
              </div>
              <p className="text-[15px] text-text-muted">{l.quiz ? `Quiz: ${l.quiz.correct} of ${l.quiz.total}` : "No quiz"}</p>
            </li>
          ))}
        </ol>
      )}
      {history.cursor && (
        <p className="mt-6">
          <Link
            href={`/history?${new URLSearchParams({ ...(topicId ? { topic: topicId } : {}), before: history.cursor })}`}
            className="font-medium text-primary underline underline-offset-4"
          >
            Older lessons
          </Link>
        </p>
      )}
    </>
  );
}
