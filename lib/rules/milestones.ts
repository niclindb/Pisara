// Milestones (D3; design 5.5). Checked after each quiz.

import { LESSON_MILESTONES, LONG_MEMORY_STEP } from "./constants";

export interface MilestoneInput {
  /** Total lessons read, including this one. */
  lessonsRead: number;
  /** Topics whose level went up with this lesson. */
  levelUps: { topicId: string; level: number }[];
  /** Topics finished with this lesson. */
  topicsFinished: string[];
  /** Review questions answered right at step LONG_MEMORY_STEP or higher, before the answer. */
  longMemoryQuestionIds: string[];
  /** Milestone kinds already earned. */
  earned: ReadonlySet<string>;
  /** Whether a milestone was already shown today. */
  shownToday: boolean;
}

export interface MilestoneResult {
  /** New milestone kinds to record. */
  newlyEarned: string[];
  /** The one to show now, or null (at most one a day; the biggest wins). */
  show: string | null;
}

function lessonThresholds(lessonsRead: number): number[] {
  const out = LESSON_MILESTONES.filter((n) => n <= lessonsRead) as number[];
  const last = LESSON_MILESTONES[LESSON_MILESTONES.length - 1] ?? 0;
  for (let n = last + 100; n <= lessonsRead; n += 100) out.push(n);
  return out;
}

/** Bigger is more worth showing. */
function rank(kind: string): number {
  if (kind.startsWith("topic_goal:")) return 3_000_000;
  if (kind.startsWith("lessons_")) return 2_000_000 + Number(kind.slice("lessons_".length));
  if (kind.startsWith("level_up:")) return 1_000_000 + Number(kind.split(":")[2]);
  return 0; // long_memory
}

export function checkMilestones(m: MilestoneInput): MilestoneResult {
  const candidates = [
    ...lessonThresholds(m.lessonsRead).map((n) => `lessons_${n}`),
    // Level 1 comes with the first lesson, which has its own milestone.
    ...m.levelUps.filter((l) => l.level > 1).map((l) => `level_up:${l.topicId}:${l.level}`),
    ...m.topicsFinished.map((id) => `topic_goal:${id}`),
    ...m.longMemoryQuestionIds.map((id) => `long_memory:${id}`),
  ];
  const newlyEarned = [...new Set(candidates)].filter((k) => !m.earned.has(k));
  const show = m.shownToday
    ? null
    : (newlyEarned.reduce<string | null>((best, k) => (best === null || rank(k) > rank(best) ? k : best), null));
  return { newlyEarned, show };
}

/** Whether a correct review answer counts as remembered after 21+ days. */
export function isLongMemory(stepBeforeAnswer: number): boolean {
  return stepBeforeAnswer >= LONG_MEMORY_STEP;
}
