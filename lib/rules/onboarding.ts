// Checks for onboarding and topic settings (A2, A4, A5, A10).

export interface TopicChoice {
  topicId: string;
  /** 0 = Off, 1–5 = how often it comes up. Turning a topic on starts it at 3. */
  interest: number;
}

export interface OnboardingInput {
  topics: TopicChoice[];
  timeZone: string;
  /** 0 = Sunday … 6 = Saturday. Left out keeps Sunday. */
  weeklyRecapDay?: number;
  displayName?: string | null;
}

export const DEFAULT_INTEREST = 3;
export const DISPLAY_NAME_MAX = 50;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone.length > 0;
  } catch {
    return false;
  }
}

export function isValidInterest(interest: number): boolean {
  return Number.isInteger(interest) && interest >= 0 && interest <= 5;
}

/** A display name, trimmed, or null when blank. Throws nothing; check with displayNameProblem. */
export function cleanDisplayName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed.length ? trimmed : null;
}

export function displayNameProblem(name: string | null | undefined): string | null {
  const clean = cleanDisplayName(name);
  return clean && [...clean].length > DISPLAY_NAME_MAX ? `Keep your name to ${DISPLAY_NAME_MAX} characters.` : null;
}

/** What stops onboarding from finishing, as messages. `pickable` is the set of topics learners can turn on. */
export function onboardingProblems(input: OnboardingInput, pickable: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const ids = input.topics.map((t) => t.topicId);
  if (new Set(ids).size !== ids.length) out.push("A topic is listed twice.");
  if (input.topics.some((t) => !isValidInterest(t.interest))) out.push("Interest goes from Off to 5.");
  if (input.topics.some((t) => t.interest > 0 && !pickable.has(t.topicId))) out.push("That topic isn't available yet.");
  if (!input.topics.some((t) => t.interest > 0)) out.push("Turn on at least one topic.");
  if (!isValidTimeZone(input.timeZone)) out.push("Pick your time zone.");
  if (input.weeklyRecapDay !== undefined && !(Number.isInteger(input.weeklyRecapDay) && input.weeklyRecapDay >= 0 && input.weeklyRecapDay <= 6)) {
    out.push("Pick a day for your weekly recap.");
  }
  const name = displayNameProblem(input.displayName);
  if (name) out.push(name);
  return out;
}
