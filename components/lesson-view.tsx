// How a lesson looks to a learner: title, reading time, text, then practice
// problems with "Show solution". Shared by the lesson page and author preview.

import type { ReactNode } from "react";
import { levelName } from "@/lib/rules/levels";
import { Markdown } from "./markdown";

export function LessonArticle({
  title,
  topicName,
  readingMinutes,
  level,
  body,
}: {
  title: string;
  topicName: string;
  readingMinutes: number;
  level: number;
  body: string;
}) {
  return (
    <article>
      <header className="mb-8">
        <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">{topicName}</p>
        <h1 id="lesson-title" tabIndex={-1} className="text-[32px] leading-tight sm:text-[42px]">{title}</h1>
        <p className="mt-3 text-[15px] text-text-muted">
          {readingMinutes} min read · {levelName(level)}
        </p>
      </header>
      <Markdown>{body}</Markdown>
    </article>
  );
}

export function PracticeProblems({ problems }: { problems: { id: string; prompt: string; solution: string }[] }) {
  if (!problems.length) return null;
  return (
    <section aria-labelledby="practice-heading" className="mt-12">
      <h2 id="practice-heading" className="mb-4 text-[22px]">
        Practice
      </h2>
      <ol className="space-y-4">
        {problems.map((p, i) => (
          <li key={p.id} className="rounded-card-sm border border-hairline bg-surface p-5">
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">Problem {i + 1}</p>
            <Markdown>{p.prompt}</Markdown>
            <details className="mt-3">
              <summary className="cursor-pointer py-2 font-medium text-primary underline underline-offset-4">Show solution</summary>
              <div className="mt-2 border-t border-hairline pt-3">
                <Markdown>{p.solution}</Markdown>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LessonPageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[44rem]">{children}</div>;
}
