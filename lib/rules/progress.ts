// Progress in a topic (D1), prerequisite notes (A3a), "Go deeper" (D8),
// and the many-topics note (D4). Design 5.6.

import { MANY_TOPICS } from "./constants";

export interface TopicProgress {
  read: number;
  total: number;
  /** Highest level among lessons read; 0 if none. */
  level: number;
  /** Every published lesson read (the topic's goal is reached). */
  finished: boolean;
}

/** Progress counts lessons read, not just delivered. */
export function topicProgress(
  publishedLessons: { id: string; level: number }[],
  readLessonIds: ReadonlySet<string>,
): TopicProgress {
  const read = publishedLessons.filter((l) => readLessonIds.has(l.id));
  return {
    read: read.length,
    total: publishedLessons.length,
    level: read.reduce((max, l) => Math.max(max, l.level), 0),
    finished: publishedLessons.length > 0 && read.length === publishedLessons.length,
  };
}

/** The note to show when turning on a sub-topic whose parent isn't finished, or null. */
export function prerequisiteNote(
  parent: { name: string; progress: TopicProgress } | null,
): string | null {
  if (!parent || parent.progress.finished) return null;
  return `This builds on ${parent.name}, which you haven't finished.`;
}

/** Sub-topics to suggest when a topic is finished: pickable ones not already on. */
export function goDeeperSuggestions<T extends { id: string; pickable: boolean }>(
  finished: boolean,
  children: T[],
  turnedOnTopicIds: ReadonlySet<string>,
): T[] {
  if (!finished) return [];
  return children.filter((c) => c.pickable && !turnedOnTopicIds.has(c.id));
}

export function showManyTopicsNote(topicsOn: number): boolean {
  return topicsOn > MANY_TOPICS;
}

export interface SuggestableTopic {
  id: string;
  parentId: string | null;
  categoryId: string;
  pickable: boolean;
  /** 0 = Off. */
  interest: number;
  progress: { read: number; finished: boolean } | null;
  /** Set when the topic builds on a parent the learner hasn't finished. */
  prerequisiteNote: string | null;
}

/**
 * One topic to suggest on Home, or null. Only pickable topics that are off and
 * never read (a topic read and then turned off was a choice), and never one
 * that builds on an unfinished topic. Best first: a sub-topic of a finished
 * topic ("Go deeper"), then a topic in the same category as one that's on,
 * then anything else. Ties go to tree order, so the pick stays put between visits.
 */
export function suggestTopic<T extends SuggestableTopic>(topics: T[]): T | null {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const onCategories = new Set(topics.filter((t) => t.interest > 0).map((t) => t.categoryId));
  const rank = (t: T): number => {
    if (t.parentId && byId.get(t.parentId)?.progress?.finished) return 0;
    if (onCategories.has(t.categoryId)) return 1;
    return 2;
  };
  let best: T | null = null;
  for (const t of topics) {
    if (!t.pickable || t.interest > 0 || (t.progress?.read ?? 0) > 0 || t.prerequisiteNote) continue;
    if (best === null || rank(t) < rank(best)) best = t;
  }
  return best;
}
