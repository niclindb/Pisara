"use client";

import { useRef, useState, useTransition } from "react";
import { Button, ErrorList, LinkButton } from "@/components/ui";
import type { SubmittedAnswer } from "@/lib/rules/quiz";
import type { RecapOutcome } from "../../actions";

type Question = { id: string; prompt: string; options: string[] };

export function RecapQuiz({ questions, grade }: { questions: Question[]; grade: (answers: SubmittedAnswer[]) => Promise<RecapOutcome> }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Extract<RecapOutcome, { ok: true }> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus());

  if (result) {
    const right = result.answers.filter((a) => a.correct).length;
    return (
      <section aria-labelledby="recap-results">
        <h2 id="recap-results" ref={headingRef} tabIndex={-1} className="mb-4 text-[22px] outline-none">
          {right} of {result.answers.length} right
        </h2>
        <ol className="mb-6 space-y-4">
          {result.answers.map((a, i) => {
            const q = questions.find((x) => x.id === a.questionId)!;
            return (
              <li key={a.questionId} className="rounded-card-sm border border-hairline bg-surface p-5">
                <p className="mb-2 font-medium">
                  {i + 1}. {q.prompt}
                </p>
                <p className={a.correct ? "text-success" : "text-danger"}>
                  {a.correct ? "Right: " : `You said ${q.options[a.chosenIndex]}. The answer: `}
                  {q.options[a.correctIndex]}
                </p>
                {a.explanation && <p className="mt-2 text-[15px]">{a.explanation}</p>}
              </li>
            );
          })}
        </ol>
        {right < result.answers.length && <p className="mb-4 text-text-muted">The ones you missed come back for review later.</p>}
        <LinkButton href="/home" variant="secondary">
          Back to Home
        </LinkButton>
      </section>
    );
  }

  const q = questions[step]!;
  const last = step === questions.length - 1;
  const next = () => {
    if (!last) {
      setStep(step + 1);
      focusHeading();
      return;
    }
    start(async () => {
      const r = await grade(questions.map((x) => ({ questionId: x.id, chosenIndex: chosen[x.id]! })));
      if (!r.ok) return setProblems(r.problems);
      setResult(r);
      focusHeading();
    });
  };
  return (
    <section aria-labelledby="recap-q">
      <p className="mb-2 text-[15px] text-text-muted">
        Question {step + 1} of {questions.length}
      </p>
      <fieldset className="rounded-card-sm border border-hairline bg-surface p-5">
        <legend className="sr-only">Question {step + 1}</legend>
        <h2 id="recap-q" ref={headingRef} tabIndex={-1} className="mb-3 font-sans text-[18px] font-medium outline-none">
          {q.prompt}
        </h2>
        <div className="space-y-2">
          {q.options.map((o, j) => (
            <label key={j} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-3 py-2">
              <input
                type="radio"
                name={q.id}
                checked={chosen[q.id] === j}
                onChange={() => setChosen({ ...chosen, [q.id]: j })}
                className="h-5 w-5 shrink-0"
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 space-y-4">
        <ErrorList problems={problems} />
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" disabled={pending} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button disabled={chosen[q.id] === undefined || pending} onClick={next}>
            {last ? (pending ? "Checking…" : "See results") : "Next"}
          </Button>
        </div>
      </div>
    </section>
  );
}
