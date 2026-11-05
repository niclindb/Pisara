// Sample people and content shared by the page checks and their setup.

export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pisara_e2e";
export const UNSUBSCRIBE_SECRET = "e2e-unsubscribe";

export const AUTHOR = "00000000-0000-4000-8000-0000000000a1";
export const LEARNER = "00000000-0000-4000-8000-0000000000b1";
/** Signed in but hasn't picked topics yet. */
export const NEWCOMER = "00000000-0000-4000-8000-0000000000c1";

export const CATEGORY = "10000000-0000-4000-8000-000000000001";
export const STARS = "20000000-0000-4000-8000-000000000001";
export const BLACK_HOLES = "20000000-0000-4000-8000-000000000002";
export const lesson = (n: number) => `30000000-0000-4000-8000-00000000000${n}`;
export const question = (n: number) => `40000000-0000-4000-8000-00000000000${n}`;
export const RECAP = "50000000-0000-4000-8000-000000000001";
