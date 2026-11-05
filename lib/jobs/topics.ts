// Choosing topics: the Explore and onboarding lists (A2–A4, A3a, A9), finishing
// onboarding (A2, A5, A10), and turning a topic on, off, up or down later (A4).

import { onboardingProblems, cleanDisplayName, isValidInterest, type OnboardingInput } from "../rules/onboarding";
import { prerequisiteNote, showManyTopicsNote, topicProgress, type TopicProgress } from "../rules/progress";
import { AuthorError } from "../rules/authoring";
import type postgres from "postgres";
import type { Sql } from "./postgres-store";

type Tx = postgres.TransactionSql;

/** A request a learner can fix, with what to fix. */
export class ChoiceError extends AuthorError {}

export interface TopicChoiceView {
  id: string;
  /** The top-level category, also for sub-topics. */
  categoryId: string;
  parentId: string | null;
  /** 0 for a top-level topic, 1 for its sub-topics, and so on. */
  depth: number;
  name: string;
  goal: string;
  description: string;
  lessonCount: number;
  /** False for a heading shown only because a sub-topic is ready. */
  pickable: boolean;
  /** Signed in only: 0 = Off. */
  interest: number;
  progress: TopicProgress | null;
  /** "This builds on Stars, which you haven't finished." for sub-topics, or null. */
  prerequisiteNote: string | null;
}

export interface TopicChoices {
  categories: { id: string; name: string }[];
  /** In tree order: each topic comes right after its parent, siblings by position. */
  topics: TopicChoiceView[];
  /** More than 8 topics on: show "each will come up less often" (D4). */
  manyTopicsNote: boolean;
}

/** Categories and the topics learners can see, with the learner's own settings when signed in. */
export async function loadTopicChoices(sql: Sql | Tx, userId: string | null): Promise<TopicChoices> {
  const categories = await sql`
    select c.id, c.name from public.categories c
    where exists (select 1 from public.visible_topics v where v.category_id = c.id)
    order by c.position, c.name`;
  const topics = await sql`
    select v.id, v.category_id, v.parent_id, v.position, v.name, v.goal, v.description, v.lesson_count, v.pickable,
           coalesce(ut.interest, 0) as interest
    from public.visible_topics v
    left join public.user_topics ut on ut.topic_id = v.id and ut.user_id = ${userId}
    order by v.position, v.name`;
  const published = await sql`
    select l.id, l.topic_id, l.level from public.lessons l
    join public.visible_topics v on v.id = l.topic_id where l.status = 'published'`;
  const read = userId
    ? new Set(
        (await sql`select lesson_id from public.deliveries where user_id = ${userId} and read_at is not null`).map(
          (r) => r.lesson_id as string,
        ),
      )
    : new Set<string>();

  const lessonsByTopic = new Map<string, { id: string; level: number }[]>();
  for (const l of published) {
    const list = lessonsByTopic.get(l.topic_id) ?? [];
    list.push({ id: l.id, level: l.level });
    lessonsByTopic.set(l.topic_id, list);
  }
  const progressOf = (id: string) => topicProgress(lessonsByTopic.get(id) ?? [], read);
  const byId = new Map(topics.map((t) => [t.id as string, t]));
  type Row = (typeof topics)[number];
  const children = new Map<string | null, Row[]>();
  for (const t of topics) {
    const key = t.parent_id ?? null;
    children.set(key, [...(children.get(key) ?? []), t]);
  }
  const rootCategory = (t: Row): string => {
    let cur = t;
    while (cur.parent_id && byId.has(cur.parent_id)) cur = byId.get(cur.parent_id)!;
    return cur.category_id;
  };

  const ordered: TopicChoiceView[] = [];
  const visit = (t: Row, depth: number) => {
    const parent = t.parent_id ? byId.get(t.parent_id) : undefined;
    ordered.push({
      id: t.id,
      categoryId: rootCategory(t),
      parentId: t.parent_id,
      depth,
      name: t.name,
      goal: t.goal,
      description: t.description,
      lessonCount: t.lesson_count,
      pickable: t.pickable,
      interest: t.interest,
      progress: userId ? progressOf(t.id) : null,
      prerequisiteNote: parent?.pickable ? prerequisiteNote({ name: parent.name, progress: progressOf(parent.id) }) : null,
    });
    for (const c of children.get(t.id) ?? []) visit(c, depth + 1);
  };
  for (const t of children.get(null) ?? []) visit(t, 0);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    topics: ordered,
    manyTopicsNote: showManyTopicsNote(ordered.filter((t) => t.interest > 0).length),
  };
}

async function pickableIds(tx: Tx): Promise<Set<string>> {
  return new Set((await tx`select id from public.visible_topics where pickable`).map((r) => r.id as string));
}

/**
 * Saves onboarding in one go: the topics turned on and their levels, time zone
 * (detected by the page, editable), recap day and optional display name.
 */
export async function completeOnboarding(sql: Sql, userId: string, input: OnboardingInput): Promise<void> {
  await sql.begin(async (tx) => {
    const problems = onboardingProblems(input, await pickableIds(tx));
    if (problems.length) throw new ChoiceError(problems[0]!, problems);
    const r = await tx`
      update public.profiles set
        time_zone = ${input.timeZone},
        weekly_recap_day = coalesce(${input.weeklyRecapDay ?? null}::int, weekly_recap_day),
        display_name = ${cleanDisplayName(input.displayName)},
        last_active_at = now()
      where id = ${userId}`;
    if (r.count === 0) throw new ChoiceError("No such learner.");
    for (const t of input.topics) await upsertInterest(tx, userId, t.topicId, t.interest);
  });
}

async function upsertInterest(tx: Tx, userId: string, topicId: string, interest: number) {
  await tx`
    insert into public.user_topics (user_id, topic_id, interest) values (${userId}, ${topicId}, ${interest})
    on conflict (user_id, topic_id) do update set interest = excluded.interest`;
}

/**
 * Sets one topic's interest from a topic page or settings: 0 turns it off,
 * 1–5 sets how often it comes up. Turning a topic off keeps its progress.
 * Returns the prerequisite note to show when this turned on a sub-topic early.
 */
export async function setTopicInterest(sql: Sql, userId: string, topicId: string, interest: number): Promise<{ note: string | null }> {
  if (!isValidInterest(interest)) throw new ChoiceError("Interest goes from Off to 5.");
  return sql.begin(async (tx) => {
    if (interest > 0 && !(await pickableIds(tx)).has(topicId)) throw new ChoiceError("That topic isn't available yet.");
    const [before] = await tx`select interest from public.user_topics where user_id = ${userId} and topic_id = ${topicId}`;
    await upsertInterest(tx, userId, topicId, interest);
    if (interest === 0 || (before && before.interest > 0)) return { note: null };
    const choices = await loadTopicChoices(tx, userId);
    return { note: choices.topics.find((t) => t.id === topicId)?.prerequisiteNote ?? null };
  });
}
