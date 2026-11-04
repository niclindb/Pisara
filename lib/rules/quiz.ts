// Grading a quiz (C1, C2, C3). The server grades, so answers are recorded
// and the correct choice is only revealed after submitting.

export interface QuizQuestion {
  id: string;
  optionCount: number;
  correctIndex: number;
  explanation: string;
}

export interface SubmittedAnswer {
  questionId: string;
  chosenIndex: number;
}

export interface GradedAnswer {
  questionId: string;
  chosenIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

export class QuizError extends Error {}

/**
 * Grades answers to exactly these questions. Every question must be answered
 * once, with a valid option; anything else is a QuizError (a bad request).
 */
export function gradeAnswers(questions: QuizQuestion[], answers: SubmittedAnswer[]): GradedAnswer[] {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  if (byId.size !== answers.length) throw new QuizError("A question was answered more than once");
  if (answers.length !== questions.length || questions.some((q) => !byId.has(q.id))) {
    throw new QuizError("Answer every question, and only these questions");
  }
  return questions.map((q) => {
    const { chosenIndex } = byId.get(q.id)!;
    if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= q.optionCount) {
      throw new QuizError(`Not a valid choice for question ${q.id}`);
    }
    return {
      questionId: q.id,
      chosenIndex,
      correct: chosenIndex === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };
  });
}

/** Offer a link to re-read the lesson when most of its questions were missed (C3). */
export function suggestReread(lessonAnswers: GradedAnswer[]): boolean {
  const missed = lessonAnswers.filter((a) => !a.correct).length;
  return missed * 2 > lessonAnswers.length;
}
