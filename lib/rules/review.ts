// Spaced review of missed questions (C5, C6; design 5.3) and the weekly recap
// (C7; design 5.4).

import {
  RECAP_MIN_LESSONS,
  RECAP_SIZE,
  REVIEW_INTERVALS,
  REVIEW_PER_DAY,
} from "./constants";
import { addDays, daysBetween, weekday, type LocalDate } from "./dates";

export interface ReviewItem {
  questionId: string;
  /** 0–4, an index into REVIEW_INTERVALS. */
  step: number;
  dueOn: LocalDate;
  lastCorrect: boolean;
}

const LAST_STEP = REVIEW_INTERVALS.length - 1;

/**
 * After a lesson-quiz answer. Only a missed question gets a review item;
 * one answered right the first time never enters review.
 */
export function afterLessonAnswer(
  questionId: string,
  correct: boolean,
  existing: ReviewItem | null,
  today: LocalDate,
): ReviewItem | null {
  if (existing) return existing;
  if (correct) return null;
  return { questionId, step: 0, dueOn: addDays(today, REVIEW_INTERVALS[0]), lastCorrect: false };
}

/** After answering a question in review or in a weekly recap. */
export function afterReviewAnswer(item: ReviewItem, correct: boolean, today: LocalDate): ReviewItem {
  const step = correct ? Math.min(item.step + 1, LAST_STEP) : 0;
  return { ...item, step, dueOn: addDays(today, REVIEW_INTERVALS[step]!), lastCorrect: correct };
}

export interface ReviewCandidate {
  questionId: string;
  dueOn: LocalDate;
  topicId: string;
  /** False if the question's lesson was unpublished (E7). */
  lessonPublished: boolean;
}

/**
 * Up to REVIEW_PER_DAY due questions to show after today's lesson quiz:
 * other topics first, then earliest due first.
 */
export function chooseReviewQuestions(
  candidates: ReviewCandidate[],
  today: LocalDate,
  todayTopicId: string | null,
  limit: number = REVIEW_PER_DAY,
): string[] {
  return candidates
    .filter((c) => c.lessonPublished && daysBetween(c.dueOn, today) >= 0)
    .sort(
      (a, b) =>
        Number(a.topicId === todayTopicId) - Number(b.topicId === todayTopicId) ||
        a.dueOn.localeCompare(b.dueOn) ||
        a.questionId.localeCompare(b.questionId),
    )
    .slice(0, limit)
    .map((c) => c.questionId);
}

export interface RecapInput {
  today: LocalDate;
  /** 0 = Sunday … 6 = Saturday. */
  recapDay: number;
  lessonsReadThisWeek: number;
  dueReview: ReviewCandidate[];
  /** This week's lesson questions the learner missed, oldest first. */
  missedThisWeek: string[];
  /** All of this week's lesson questions, oldest first. */
  questionsThisWeek: string[];
}

/**
 * The weekly recap's questions, or null if there's no recap today: due review
 * first, then this week's missed questions, then any of this week's questions.
 */
export function buildWeeklyRecap(r: RecapInput): string[] | null {
  if (weekday(r.today) !== r.recapDay) return null;
  if (r.lessonsReadThisWeek < RECAP_MIN_LESSONS) return null;
  const due = chooseReviewQuestions(r.dueReview, r.today, null, Number.POSITIVE_INFINITY);
  const picked: string[] = [];
  for (const id of [...due, ...r.missedThisWeek, ...r.questionsThisWeek]) {
    if (picked.length === RECAP_SIZE) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked.length > 0 ? picked : null;
}
