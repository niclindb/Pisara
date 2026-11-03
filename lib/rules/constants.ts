// Tunable numbers from docs/user-stories-and-mvp.md and docs/design.md.
// Change them here, and the tests show what moves.

/** Unread lessons the inbox holds before picking stops (B6). */
export const INBOX_LIMIT = 3;

/** Days between the first and second "lessons waiting" email (B6). */
export const WAITING_REMINDER_GAP_DAYS = 7;

/** "Lessons waiting" emails sent per full inbox before going quiet (B6). */
export const WAITING_REMINDER_MAX = 2;

/** Learners with emails off still get lessons if active this recently (design 6). */
export const ACTIVE_WITHOUT_EMAIL_DAYS = 14;

/** Freshness boost per day since a topic last came up (B2). */
export const FRESHNESS_PER_DAY = 0.1;

/** Days after which the freshness boost stops growing (2× at 10 days). */
export const FRESHNESS_MAX_DAYS = 10;

/** A topic can't be picked more than this many days in a row (B1). */
export const MAX_SAME_TOPIC_DAYS = 2;

/** Days until a missed question comes back, by review step (C6). */
export const REVIEW_INTERVALS = [1, 3, 7, 21, 60] as const;

/** Review questions shown after a lesson quiz (C5). */
export const REVIEW_PER_DAY = 2;

/** Review step reached once a question is remembered after 21+ days (D3). */
export const LONG_MEMORY_STEP = 3;

/** Questions in a weekly recap (C7). */
export const RECAP_SIZE = 5;

/** Lessons read in the week before a recap is built (C7). */
export const RECAP_MIN_LESSONS = 2;

/** Lessons-read counts that earn a milestone; then every 100 after (D3). */
export const LESSON_MILESTONES = [1, 10, 25, 50, 100] as const;

/** Topics turned on before the "each will move slowly" note (D4). */
export const MANY_TOPICS = 8;

/** Published lessons a topic needs before learners can pick it (E4). */
export const MIN_PUBLISHED_LESSONS = 3;
