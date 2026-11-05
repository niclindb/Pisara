// Lesson difficulty (E6), shown as words (decided Nov 5, 2026). A learner's
// standing in a topic uses the same words: the highest level they've read (D1).

export const LEVEL_NAMES = ["Beginner", "Intermediate", "Advanced"] as const;
export type LevelName = (typeof LEVEL_NAMES)[number];

/** Levels are stored as 1, 2 or 3. */
export const MAX_LEVEL = LEVEL_NAMES.length;

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL;
}

/** "Beginner" for 1, and so on. */
export function levelName(level: number): LevelName {
  if (!isValidLevel(level)) throw new Error(`Not a lesson level: ${level}`);
  return LEVEL_NAMES[level - 1]!;
}
