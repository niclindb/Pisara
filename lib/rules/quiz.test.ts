import { describe, expect, it } from "vitest";
import { gradeAnswers, QuizError, suggestReread, type QuizQuestion } from "./quiz";

const qs: QuizQuestion[] = [
  { id: "q1", optionCount: 3, correctIndex: 1, explanation: "Because." },
  { id: "q2", optionCount: 2, correctIndex: 0, explanation: "Also because." },
];

describe("gradeAnswers", () => {
  it("marks each answer and reveals the right one", () => {
    expect(gradeAnswers(qs, [{ questionId: "q2", chosenIndex: 1 }, { questionId: "q1", chosenIndex: 1 }])).toEqual([
      { questionId: "q1", chosenIndex: 1, correct: true, correctIndex: 1, explanation: "Because." },
      { questionId: "q2", chosenIndex: 1, correct: false, correctIndex: 0, explanation: "Also because." },
    ]);
  });

  it("requires every question, once, and nothing else", () => {
    expect(() => gradeAnswers(qs, [{ questionId: "q1", chosenIndex: 0 }])).toThrow(QuizError);
    expect(() =>
      gradeAnswers(qs, [
        { questionId: "q1", chosenIndex: 0 },
        { questionId: "q1", chosenIndex: 1 },
      ]),
    ).toThrow(QuizError);
    expect(() =>
      gradeAnswers(qs, [
        { questionId: "q1", chosenIndex: 0 },
        { questionId: "other", chosenIndex: 0 },
      ]),
    ).toThrow(QuizError);
  });

  it("rejects choices that don't exist", () => {
    expect(() =>
      gradeAnswers(qs, [
        { questionId: "q1", chosenIndex: 3 },
        { questionId: "q2", chosenIndex: 0 },
      ]),
    ).toThrow(QuizError);
    expect(() =>
      gradeAnswers(qs, [
        { questionId: "q1", chosenIndex: 0.5 },
        { questionId: "q2", chosenIndex: 0 },
      ]),
    ).toThrow(QuizError);
  });
});

describe("suggestReread", () => {
  const a = (correct: boolean) => ({ questionId: "q", chosenIndex: 0, correct, correctIndex: 0, explanation: "" });

  it("suggests re-reading when most were missed", () => {
    expect(suggestReread([a(false), a(false), a(true)])).toBe(true);
    expect(suggestReread([a(false), a(true)])).toBe(false);
    expect(suggestReread([a(true), a(true), a(false)])).toBe(false);
  });
});
