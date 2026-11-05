"use client";

// A quiz that grades in the browser. Only for author previews, where the
// answers are already known; learners' quizzes are graded on the server.

import { NotQuiteMark, optionClass, RightMark } from "./answer-mark";
import { useState } from "react";
import { Button } from "./ui";

export interface TryQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export function QuizTry({ questions }: { questions: TryQuestion[] }) {
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  if (!questions.length) return null;
  const allAnswered = questions.every((q) => chosen[q.id] !== undefined);
  return (
    <section aria-labelledby="quiz-heading" className="mt-12">
      <h2 id="quiz-heading" className="mb-4 text-[22px]">
        Quick quiz
      </h2>
      <div className="space-y-5">
        {questions.map((q, i) => (
          <fieldset key={q.id} className="rounded-card-sm border border-hairline bg-surface p-5">
            <legend className="sr-only">Question {i + 1}</legend>
            <p className="mb-3 font-medium">
              {i + 1}. {q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((o, j) => {
                const right = checked && j === q.correctIndex;
                const wrong = checked && chosen[q.id] === j && j !== q.correctIndex;
                return (
                  <label
                    key={j}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 ${
                      optionClass(right, wrong)
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      disabled={checked}
                      checked={chosen[q.id] === j}
                      onChange={() => setChosen({ ...chosen, [q.id]: j })}
                      className="h-5 w-5"
                    />
                    <span>{o}</span>
                    {right && <RightMark chosen={chosen[q.id] === j} />}
                    {wrong && <NotQuiteMark />}
                  </label>
                );
              })}
            </div>
            {checked && q.explanation && <p className="mt-3 text-[15px]">{q.explanation}</p>}
          </fieldset>
        ))}
      </div>
      <div className="mt-5 flex gap-3" role="status">
        {!checked ? (
          <Button disabled={!allAnswered} onClick={() => setChecked(true)}>
            Check answers
          </Button>
        ) : (
          <>
            <p className="py-2">
              {questions.filter((q) => chosen[q.id] === q.correctIndex).length} of {questions.length} right.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setChosen({});
                setChecked(false);
              }}
            >
              Try again
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
