import { describe, expect, it } from "vitest";
import {
  afterLessonAnswer,
  afterReviewAnswer,
  buildWeeklyRecap,
  chooseReviewQuestions,
  type ReviewCandidate,
} from "./review";

const today = "2026-11-10";

describe("afterLessonAnswer", () => {
  it("puts a missed question into review, due tomorrow", () => {
    expect(afterLessonAnswer("q1", false, null, today)).toEqual({
      questionId: "q1",
      step: 0,
      dueOn: "2026-11-11",
      lastCorrect: false,
    });
  });

  it("leaves questions answered right out of review", () => {
    expect(afterLessonAnswer("q1", true, null, today)).toBeNull();
  });
});

describe("afterReviewAnswer", () => {
  const item = { questionId: "q1", step: 0, dueOn: today, lastCorrect: false };

  it("steps through 3, 7, 21 and 60 days on right answers", () => {
    let j = item;
    const due: string[] = [];
    for (let n = 0; n < 5; n++) {
      j = afterReviewAnswer(j, true, today);
      due.push(j.dueOn);
    }
    expect(due).toEqual(["2026-11-13", "2026-11-17", "2026-12-01", "2027-01-09", "2027-01-09"]);
  });

  it("resets to tomorrow on a wrong answer at any step", () => {
    const later = { ...item, step: 3 };
    expect(afterReviewAnswer(later, false, today)).toEqual({
      questionId: "q1",
      step: 0,
      dueOn: "2026-11-11",
      lastCorrect: false,
    });
  });
});

describe("chooseReviewQuestions", () => {
  const c = (questionId: string, dueOn: string, topicId: string, lessonPublished = true): ReviewCandidate => ({
    questionId,
    dueOn,
    topicId,
    lessonPublished,
  });

  it("shows up to 2 due questions, earliest first", () => {
    const due = [c("q3", "2026-11-09", "a"), c("q1", "2026-11-01", "a"), c("q2", "2026-11-05", "a")];
    expect(chooseReviewQuestions(due, today, null)).toEqual(["q1", "q2"]);
  });

  it("prefers topics other than today's lesson", () => {
    const due = [c("same", "2026-11-01", "today"), c("other", "2026-11-09", "b")];
    expect(chooseReviewQuestions(due, today, "today", 1)).toEqual(["other"]);
  });

  it("skips questions not due yet and from unpublished lessons", () => {
    const due = [c("future", "2026-11-11", "a"), c("gone", "2026-11-01", "a", false), c("ok", "2026-11-10", "a")];
    expect(chooseReviewQuestions(due, today, null)).toEqual(["ok"]);
  });

  it("returns nothing when nothing is due", () => {
    expect(chooseReviewQuestions([], today, null)).toEqual([]);
  });
});

describe("buildWeeklyRecap", () => {
  // 2026-11-08 is a Sunday.
  const base = {
    today: "2026-11-08",
    recapDay: 0,
    lessonsReadThisWeek: 3,
    dueReview: [{ questionId: "r1", dueOn: "2026-11-07", topicId: "a", lessonPublished: true }],
    missedThisWeek: ["m1", "m2"],
    questionsThisWeek: ["m1", "w1", "w2", "w3", "w4"],
  };

  it("fills 5 questions: due review, then missed, then the rest of the week", () => {
    expect(buildWeeklyRecap(base)).toEqual(["r1", "m1", "m2", "w1", "w2"]);
  });

  it("only happens on the learner's recap day", () => {
    expect(buildWeeklyRecap({ ...base, today: "2026-11-09" })).toBeNull();
  });

  it("is skipped if fewer than 2 lessons were read that week", () => {
    expect(buildWeeklyRecap({ ...base, lessonsReadThisWeek: 1 })).toBeNull();
  });
});
