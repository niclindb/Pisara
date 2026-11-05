import { describe, expect, it } from "vitest";
import { draftProblems, estimateReadingMinutes, publishProblems, type LessonDraft } from "./authoring";

const draft = (over: Partial<LessonDraft> = {}): LessonDraft => ({
  title: "How stars form",
  body: "Clouds of gas collapse.",
  level: 1,
  questions: [],
  problems: [],
  ...over,
});
const q = { prompt: "What collapses?", options: ["Gas clouds", "Planets"], correctIndex: 0 };

describe("estimateReadingMinutes", () => {
  it("counts 200 words a minute, at least 1", () => {
    expect(estimateReadingMinutes("")).toBe(1);
    expect(estimateReadingMinutes("word ".repeat(50))).toBe(1);
    expect(estimateReadingMinutes("word ".repeat(600))).toBe(3);
    expect(estimateReadingMinutes("word\n\n".repeat(700))).toBe(4);
  });
});

describe("draftProblems", () => {
  it("accepts a lesson with no quiz and no practice problems", () => {
    expect(draftProblems(draft())).toEqual([]);
  });

  it("accepts up to 3 well-formed questions and any practice problems", () => {
    expect(
      draftProblems(draft({ questions: [q, q, q], problems: [{ prompt: "Try it", solution: "Like this" }] })),
    ).toEqual([]);
  });

  it("explains what's wrong", () => {
    const problems = draftProblems(
      draft({
        title: " ",
        level: 0,
        readingMinutes: 0,
        questions: [
          { prompt: "", options: ["a"], correctIndex: 3 },
          { prompt: "Same?", options: ["Yes", "yes "], correctIndex: 0 },
        ],
        problems: [{ prompt: "Try", solution: "" }],
      }),
    );
    expect(problems).toEqual([
      "Add a title.",
      "Pick Beginner, Intermediate or Advanced.",
      "Reading time must be at least 1 minute.",
      "Question 1: add the question.",
      "Question 1: give 2 to 4 choices.",
      "Question 1: pick the right answer.",
      "Question 2: two choices are the same.",
      "Practice problem 1: add the worked solution.",
    ]);
  });

  it("allows at most 3 questions", () => {
    expect(draftProblems(draft({ questions: [q, q, q, q] }))).toEqual(["A quiz can have at most 3 questions."]);
  });

  it("rejects the same saved question twice", () => {
    expect(draftProblems(draft({ questions: [{ ...q, id: "a" }, { ...q, id: "a" }] }))).toEqual([
      "The same question or problem appears twice.",
    ]);
  });
});

describe("publishProblems", () => {
  it("needs a body to publish, but not to save", () => {
    expect(draftProblems(draft({ body: "" }))).toEqual([]);
    expect(publishProblems(draft({ body: "" }))).toEqual(["Write the lesson before publishing it."]);
  });
});
