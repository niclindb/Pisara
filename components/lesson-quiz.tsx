"use client";

// The quiz after a lesson, graded on the server (C1–C3), with up to 2 review
// questions from earlier lessons (C5). Results show on the same page.

import { NotQuiteMark, optionClass, RightMark } from "./answer-mark";
import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import type { QuizOutcome } from "@/app/(learner)/actions";
import type { QuizQuestionView, QuizView } from "@/lib/jobs/quiz";
import type { GradedAnswer, SubmittedAnswer } from "@/lib/rules/quiz";
import { Button, ErrorList } from "./ui";

type Done = Extract<QuizOutcome, { ok: true }>;

/**
 * `grade` is a server action: the learner's quiz (saved, with review) or the
 * free preview (nothing saved). `next` is what to offer once done or skipped.
 */
export function LessonQuiz({
  quiz: fromServer,
  grade,
  next,
}: {
  quiz: QuizView | null;
  grade: (answers: { lesson: SubmittedAnswer[]; review: SubmittedAnswer[] }) => Promise<QuizOutcome>;
  next: ReactNode;
}) {
  // Keep the questions as first shown: after grading, the page refreshes without the review questions.
  const [quiz] = useState(fromServer);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Done | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Once graded, the page refreshes with the quiz marked done; keep showing the results.
  if (!quiz || (!result && (quiz.completed || skipped))) {
    return (
      <section aria-label="What's next" className="mt-12 border-t border-hairline pt-6">
        {quiz?.completed && <p className="mb-4 text-text-muted">You’ve done this lesson’s quiz.</p>}
        {next}
      </section>
    );
  }

  const questions = [...quiz.lessonQuestions, ...quiz.reviewQuestions];
  const graded = new Map<string, GradedAnswer>(result ? [...result.lessonAnswers, ...result.reviewAnswers].map((a) => [a.questionId, a]) : []);
  const allAnswered = questions.every((q) => chosen[q.id] !== undefined);
  const right = [...graded.values()].filter((a) => a.correct).length;

  const submit = () =>
    start(async () => {
      const pick = (qs: QuizQuestionView[]) => qs.map((q) => ({ questionId: q.id, chosenIndex: chosen[q.id]! }));
      const outcome = await grade({ lesson: pick(quiz.lessonQuestions), review: pick(quiz.reviewQuestions) });
      if (!outcome.ok) {
        setProblems(outcome.problems);
        return;
      }
      setProblems([]);
      setResult(outcome);
      requestAnimationFrame(() => resultsRef.current?.focus());
    });

  return (
    <section aria-labelledby="quiz-heading" className="mt-12">
      <h2 id="quiz-heading" className="mb-4 text-[22px]">
        Quick quiz
      </h2>
      <div className="space-y-5">
        {questions.map((q, i) => {
          const g = graded.get(q.id);
          return (
            <fieldset key={q.id} className="rounded-card-sm border border-hairline bg-surface p-5">
              <legend className="sr-only">Question {i + 1}</legend>
              {q.reviewTopic && (
                <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">Review · {q.reviewTopic}</p>
              )}
              <p className="mb-3 font-medium">
                {i + 1}. {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((o, j) => {
                  const isRight = g && j === g.correctIndex;
                  const isWrong = g && g.chosenIndex === j && !g.correct;
                  return (
                    <label
                      key={j}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 ${
                        optionClass(Boolean(isRight), Boolean(isWrong))
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        disabled={Boolean(result) || pending}
                        checked={chosen[q.id] === j}
                        onChange={() => setChosen({ ...chosen, [q.id]: j })}
                        className="h-5 w-5 shrink-0"
                      />
                      <span>{o}</span>
                      {isRight && <RightMark chosen={g.chosenIndex === j} />}
                      {isWrong && <NotQuiteMark />}
                    </label>
                  );
                })}
              </div>
              {g?.explanation && <p className="mt-3 text-[15px]">{g.explanation}</p>}
            </fieldset>
          );
        })}
      </div>

      {!result ? (
        <div className="mt-5 space-y-4">
          <ErrorList problems={problems} />
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!allAnswered || pending} onClick={submit}>
              {pending ? "Checking…" : "Check answers"}
            </Button>
            <Button variant="quiet" disabled={pending} onClick={() => setSkipped(true)}>
              Skip quiz
            </Button>
          </div>
        </div>
      ) : (
        <div ref={resultsRef} tabIndex={-1} role="status" className="mt-6 space-y-5 outline-none">
          <p className="text-[18px] font-medium">
            {right} of {questions.length} right.
            {right < questions.length && " The ones you missed come back for review later."}
          </p>
          {result.suggestReread && (
            <p>
              <a href="#lesson-title" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                Read the lesson again
              </a>{" "}
              to go over it.
            </p>
          )}
          {result.milestoneText && (
            <div className="rounded-card border border-hairline bg-accent-fill p-5 text-accent-fill-text">
              <p className="text-[13px] font-bold uppercase tracking-[0.08em]">Milestone</p>
              <p className="mt-1 font-heading text-[22px] font-bold">{result.milestoneText}</p>
            </div>
          )}
          {result.goDeeper.length > 0 && (
            <div>
              <h3 className="mb-2 text-[18px]">Go deeper</h3>
              <ul className="space-y-1">
                {result.goDeeper.map((t) => (
                  <li key={t.id}>
                    <Link href={`/explore/${t.id}`} className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {next}
        </div>
      )}
    </section>
  );
}
