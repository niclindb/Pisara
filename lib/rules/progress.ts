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
