"use client";

// The lesson editor (E4–E7): text with a live preview, level and reading time,
// optional practice problems, an optional quiz of up to 3 questions, and
// publishing. Everything saves together.

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { Button, Card, ErrorList, StatusBadge } from "@/components/ui";
import type { LessonForEditing, LessonStatus } from "@/lib/jobs/author";
import { estimateReadingMinutes, type LessonDraft, type ProblemDraft, type QuestionDraft } from "@/lib/rules/authoring";
import { MAX_QUIZ_QUESTIONS } from "@/lib/rules/constants";
import { deleteLessonAction, publishLessonAction, saveLessonAction, unpublishLessonAction, type ActionResult } from "../../actions";

const input = "mt-1 block w-full rounded-control border border-border bg-surface px-3 py-2.5";
const label = "font-medium";

type Q = QuestionDraft & { key: string };
type P = ProblemDraft & { key: string };
let counter = 0;
const newKey = () => `new-${++counter}`;

export function LessonEditor({ lesson, topicName }: { lesson: LessonForEditing; topicName: string }) {
  const [title, setTitle] = useState(lesson.title);
  const [level, setLevel] = useState(lesson.level);
  const [body, setBody] = useState(lesson.body);
  const estimated = useMemo(() => estimateReadingMinutes(body), [body]);
  const [autoMinutes, setAutoMinutes] = useState(lesson.readingMinutes === estimateReadingMinutes(lesson.body));
  const [minutes, setMinutes] = useState(lesson.readingMinutes);
  const [questions, setQuestions] = useState<Q[]>(lesson.questions.map((q) => ({ ...q, key: q.id })));
  const [problems, setProblems] = useState<P[]>(lesson.problems.map((p) => ({ ...p, key: p.id })));
  const [status, setStatus] = useState<LessonStatus>(lesson.status);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
    setResult(null);
  };

  const draft = (): LessonDraft => ({
    title,
    body,
    level,
    readingMinutes: autoMinutes ? undefined : minutes,
    questions: questions.map(({ key: _k, ...q }) => q),
    problems: problems.map(({ key: _k, ...p }) => p),
  });

  const act = (work: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await work();
      setResult(r);
      if (r.ok) {
        setDirty(false);
        after?.();
      }
    });

  const updateQ = (key: string, patch: Partial<QuestionDraft>) =>
    change(setQuestions)(questions.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const updateP = (key: string, patch: Partial<ProblemDraft>) =>
    change(setProblems)(problems.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[15px]">
          <Link href={`/author/topics/${lesson.topicId}`} className="text-primary hover:underline">
            ← {topicName}
          </Link>
        </p>
        <StatusBadge status={status} />
        {lesson.deliveredCount > 0 && (
          <span className="text-[15px] text-text-muted">
            {lesson.deliveredCount} {lesson.deliveredCount === 1 ? "learner has" : "learners have"} this lesson
          </span>
        )}
      </div>

      <Card className="space-y-4">
        <label className="block">
          <span className={label}>Title</span>
          <input className={`${input} font-heading text-[22px] font-bold`} value={title} onChange={(e) => change(setTitle)(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="block">
            <span className={label}>Level</span>
            <input type="number" min={1} className={`${input} w-24`} value={level} onChange={(e) => change(setLevel)(Number(e.target.value))} />
          </label>
          <fieldset>
            <legend className={label}>Reading time</legend>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={autoMinutes} onChange={(e) => change(setAutoMinutes)(e.target.checked)} className="h-5 w-5" />
                Estimate ({estimated} min)
              </label>
              {!autoMinutes && (
                <label className="inline-flex items-center gap-2">
                  <input type="number" min={1} className={`${input} mt-0 w-20`} value={minutes} onChange={(e) => change(setMinutes)(Number(e.target.value))} />
                  <span>min</span>
                </label>
              )}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card aria-labelledby="body-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="body-heading" className="text-[22px]">
            Lesson
          </h2>
          <div role="tablist" aria-label="Lesson text" className="flex gap-1 lg:hidden">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`min-h-11 rounded-control px-4 ${tab === t ? "bg-primary text-primary-text" : "border border-border"}`}
              >
                {t === "write" ? "Write" : "Preview"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <label className={`block ${tab === "write" ? "" : "hidden lg:block"}`}>
            <span className={label}>Markdown</span>
            <textarea
              className={`${input} min-h-[28rem] font-mono text-[15px] leading-relaxed`}
              value={body}
              onChange={(e) => change(setBody)(e.target.value)}
              placeholder={"Write the lesson here.\n\n## A heading\n\n**Bold**, *italic*, lists and links work."}
            />
          </label>
          <div className={tab === "preview" ? "" : "hidden lg:block"}>
            <p className={`${label} mb-1`}>Preview</p>
            <div className="min-h-[28rem] rounded-control border border-hairline bg-page/40 p-4" aria-live="off">
              {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-text-muted">Nothing written yet.</p>}
            </div>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="problems-heading" className="space-y-4">
        <div>
          <h2 id="problems-heading" className="text-[22px]">
            Practice problems <span className="font-sans text-[15px] font-normal text-text-muted">(optional)</span>
          </h2>
          <p className="text-[15px] text-text-muted">Learners see each problem with a “Show solution” button. They aren’t graded.</p>
        </div>
        {problems.map((p, i) => (
          <fieldset key={p.key} className="space-y-3 rounded-card-sm border border-hairline p-4">
            <legend className="px-1 font-bold text-accent">Problem {i + 1}</legend>
            <label className="block">
              <span className={label}>Problem</span>
              <textarea rows={3} className={input} value={p.prompt} onChange={(e) => updateP(p.key, { prompt: e.target.value })} />
            </label>
            <label className="block">
              <span className={label}>Worked solution</span>
              <textarea rows={4} className={input} value={p.solution} onChange={(e) => updateP(p.key, { solution: e.target.value })} />
            </label>
            <Button type="button" variant="quiet" onClick={() => change(setProblems)(problems.filter((x) => x.key !== p.key))}>
              Remove problem {i + 1}
            </Button>
          </fieldset>
        ))}
        <Button type="button" variant="secondary" onClick={() => change(setProblems)([...problems, { key: newKey(), prompt: "", solution: "" }])}>
          Add practice problem
        </Button>
      </Card>

      <Card aria-labelledby="quiz-heading" className="space-y-4">
        <div>
          <h2 id="quiz-heading" className="text-[22px]">
            Quiz <span className="font-sans text-[15px] font-normal text-text-muted">(optional, up to {MAX_QUIZ_QUESTIONS} questions)</span>
          </h2>
          <p className="text-[15px] text-text-muted">Missed questions come back later in review.</p>
          {lesson.deliveredCount > 0 && questions.some((q) => q.id) && (
            <p className="mt-1 text-[15px] text-text-muted">Removing a question also removes learners’ answers to it.</p>
          )}
        </div>
        {questions.map((q, i) => (
          <fieldset key={q.key} className="space-y-3 rounded-card-sm border border-hairline p-4">
            <legend className="px-1 font-bold text-accent">Question {i + 1}</legend>
            <label className="block">
              <span className={label}>Question</span>
              <input className={input} value={q.prompt} onChange={(e) => updateQ(q.key, { prompt: e.target.value })} />
            </label>
            <fieldset>
              <legend className={label}>Choices (pick the right one)</legend>
              <div className="mt-1 space-y-2">
                {q.options.map((o, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.key}`}
                      checked={q.correctIndex === j}
                      onChange={() => updateQ(q.key, { correctIndex: j })}
                      aria-label={`Choice ${j + 1} is the right answer`}
                      className="h-5 w-5 shrink-0"
                    />
                    <input
                      className={`${input} mt-0`}
                      value={o}
                      aria-label={`Choice ${j + 1}`}
                      onChange={(e) => updateQ(q.key, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })}
                    />
                    {q.options.length > 2 && (
                      <Button
                        type="button"
                        variant="quiet"
                        aria-label={`Remove choice ${j + 1}`}
                        onClick={() =>
                          updateQ(q.key, {
                            options: q.options.filter((_, k) => k !== j),
                            correctIndex: q.correctIndex === j ? 0 : q.correctIndex > j ? q.correctIndex - 1 : q.correctIndex,
                          })
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {q.options.length < 4 && (
                <Button type="button" variant="quiet" onClick={() => updateQ(q.key, { options: [...q.options, ""] })}>
                  Add a choice
                </Button>
              )}
            </fieldset>
            <label className="block">
              <span className={label}>Explanation</span>
              <span className="block text-[15px] text-text-muted">One line, shown after answering.</span>
              <input className={input} value={q.explanation ?? ""} onChange={(e) => updateQ(q.key, { explanation: e.target.value })} />
            </label>
            <Button type="button" variant="quiet" onClick={() => change(setQuestions)(questions.filter((x) => x.key !== q.key))}>
              Remove question {i + 1}
            </Button>
          </fieldset>
        ))}
        {questions.length < MAX_QUIZ_QUESTIONS && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => change(setQuestions)([...questions, { key: newKey(), prompt: "", options: ["", ""], correctIndex: 0, explanation: "" }])}
          >
            Add question
          </Button>
        )}
      </Card>

      {lesson.deliveredCount === 0 && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Delete "${lesson.title}"? This can't be undone.`)) act(() => deleteLessonAction(lesson.id, lesson.topicId));
            }}
          >
            Delete lesson
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-hairline bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => act(() => saveLessonAction(lesson.id, draft()))} disabled={pending}>
            {pending ? "Working…" : "Save"}
          </Button>
          {status !== "published" ? (
            <Button variant="secondary" disabled={pending} onClick={() => act(() => publishLessonAction(lesson.id, draft()), () => setStatus("published"))}>
              Save and publish
            </Button>
          ) : (
            <Button variant="secondary" disabled={pending} onClick={() => act(() => unpublishLessonAction(lesson.id), () => setStatus("unpublished"))}>
              Unpublish
            </Button>
          )}
          <Link href={`/author/lessons/${lesson.id}/preview`} className="py-2 font-medium text-primary hover:underline">
            Preview as learner
          </Link>
          <p role="status" className="basis-full text-[15px] text-success sm:basis-auto">
            {result?.ok ? result.message : dirty ? <span className="text-text-muted">Unsaved changes</span> : ""}
          </p>
        </div>
        {result && !result.ok && (
          <div className="mt-3">
            <ErrorList problems={result.problems} />
          </div>
        )}
      </div>
    </div>
  );
}
