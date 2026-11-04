// Picking the day's topic (B1, B2; design 5.1).

import {
  FRESHNESS_MAX_DAYS,
  FRESHNESS_PER_DAY,
  MAX_SAME_TOPIC_DAYS,
} from "./constants";
import { addDays, daysBetween, type LocalDate } from "./dates";

export interface TopicCandidate {
  topicId: string;
  /** 0 = Off, otherwise 1–5. The level is the weight (A4). */
  interest: number;
  /** Learner-local date this topic last came up, or null if never. */
  lastDeliveredOn: LocalDate | null;
  /** Whether a published lesson in this topic hasn't been delivered yet. */
  hasNextLesson: boolean;
}

export interface TopicOdds {
  topicId: string;
  weight: number;
  freshness: number;
  score: number;
  /** Share of the total, 0–1. Zero for topics that can't be picked today. */
  chance: number;
  /** Why the topic can't be picked today, if it can't. */
  excluded?: "off" | "no_lessons" | "streak";
}

export interface PickInput {
  candidates: TopicCandidate[];
  today: LocalDate;
  /** Topics picked on recent days. Only the last MAX_SAME_TOPIC_DAYS days matter. */
  recentPicks: { date: LocalDate; topicId: string }[];
  /** Returns a number in [0, 1). Pass Math.random in the app, a fixed one in tests. */
  random: () => number;
}

export interface PickResult {
  /** The picked topic, or null if nothing can be picked. */
  topicId: string | null;
  /** Every candidate's odds, for "why was this picked?" (B8) and debugging. */
  odds: TopicOdds[];
}

export function freshness(lastDeliveredOn: LocalDate | null, today: LocalDate): number {
  const days =
    lastDeliveredOn === null ? FRESHNESS_MAX_DAYS : Math.max(0, daysBetween(lastDeliveredOn, today));
  return 1 + Math.min(days, FRESHNESS_MAX_DAYS) * FRESHNESS_PER_DAY;
}

/** The topic picked on every one of the last MAX_SAME_TOPIC_DAYS days, if there is one. */
function streakTopic(today: LocalDate, recentPicks: PickInput["recentPicks"]): string | null {
  let topic: string | null = null;
  for (let i = 1; i <= MAX_SAME_TOPIC_DAYS; i++) {
    const day = addDays(today, -i);
    const pick = recentPicks.find((p) => p.date === day);
    if (!pick || (topic !== null && pick.topicId !== topic)) return null;
    topic = pick.topicId;
  }
  return topic;
}

export function pickTopic({ candidates, today, recentPicks, random }: PickInput): PickResult {
  const odds: TopicOdds[] = candidates.map((c) => {
    const weight = c.interest;
    const fresh = freshness(c.lastDeliveredOn, today);
    const excluded = c.interest <= 0 ? "off" : !c.hasNextLesson ? "no_lessons" : undefined;
    return {
      topicId: c.topicId,
      weight,
      freshness: fresh,
      score: excluded ? 0 : weight * fresh,
      chance: 0,
      ...(excluded ? { excluded } : {}),
    };
  });

  // No more than MAX_SAME_TOPIC_DAYS in a row, unless it's the only topic left.
  const streak = streakTopic(today, recentPicks);
  if (streak !== null) {
    const others = odds.filter((o) => o.score > 0 && o.topicId !== streak);
    const repeat = odds.find((o) => o.topicId === streak && o.score > 0);
    if (others.length > 0 && repeat) {
      repeat.score = 0;
      repeat.excluded = "streak";
    }
  }

  const total = odds.reduce((sum, o) => sum + o.score, 0);
  if (total === 0) return { topicId: null, odds };
  for (const o of odds) o.chance = o.score / total;

  let r = random() * total;
  const eligible = odds.filter((o) => o.score > 0);
  for (const o of eligible) {
    r -= o.score;
    if (r < 0) return { topicId: o.topicId, odds };
  }
  // Floating-point leftovers land on the last eligible topic.
  return { topicId: eligible[eligible.length - 1]!.topicId, odds };
}
