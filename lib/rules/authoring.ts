// Checks on what authors write (E4, E6). Saving a draft only needs each piece
// to be well formed; publishing also needs a lesson body. Quizzes and practice
// problems are optional (decided Nov 4, 2026).

import { MAX_QUIZ_QUESTIONS, READING_WORDS_PER_MINUTE } from "./constants";
import { isValidLevel } from "./levels";

/** A change an author can't make. `problems` lists what to fix, when there's more than one thing. */
export class AuthorError extends Error {
  constructor(message: string, readonly problems: string[] = [message]) {
    super(message);
  }
}

export interface QuestionDraft {
  /** Set for a question that's already saved; left out for a new one. */
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ProblemDraft {
  id?: string;
  prompt: string;
  solution: string;
}

export interface LessonDraft {
  title: string;
  body: string;
  level: number;
  /** Left out to estimate it from the body. */
  readingMinutes?: number;
  questions: QuestionDraft[];
  problems: ProblemDraft[];
}

const blank = (s: string | undefined) => !s || s.trim().length === 0;

/** Reading time from the body at 200 words a minute, at least 1 minute. */
export function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE));
}

/** Problems with a lesson draft, as messages an author can act on. Empty means it can be saved. */
export function draftProblems(draft: LessonDraft): string[] {
  const out: string[] = [];
  if (blank(draft.title)) out.push("Add a title.");
  if (!isValidLevel(draft.level)) out.push("Pick Beginner, Intermediate or Advanced.");
  if (draft.readingMinutes !== undefined && (!Number.isInteger(draft.readingMinutes) || draft.readingMinutes < 1)) {
    out.push("Reading time must be at least 1 minute.");
  }
  if (draft.questions.length > MAX_QUIZ_QUESTIONS) out.push(`A quiz can have at most ${MAX_QUIZ_QUESTIONS} questions.`);
  draft.questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    if (blank(q.prompt)) out.push(`${n}: add the question.`);
    if (q.options.length < 2 || q.options.length > 4) out.push(`${n}: give 2 to 4 choices.`);
    if (q.options.some((o) => blank(o))) out.push(`${n}: a choice is empty.`);
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) {
      out.push(`${n}: two choices are the same.`);
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      out.push(`${n}: pick the right answer.`);
    }
  });
  draft.problems.forEach((p, i) => {
    const n = `Practice problem ${i + 1}`;
    if (blank(p.prompt)) out.push(`${n}: add the problem.`);
    if (blank(p.solution)) out.push(`${n}: add the worked solution.`);
  });
  const ids = [...draft.questions, ...draft.problems].map((x) => x.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) out.push("The same question or problem appears twice.");
  return out;
}

/** Everything that stops a lesson being published. Empty means it can be. */
export function publishProblems(draft: LessonDraft): string[] {
  const out = draftProblems(draft);
  if (blank(draft.body)) out.push("Write the lesson before publishing it.");
  return out;
}
