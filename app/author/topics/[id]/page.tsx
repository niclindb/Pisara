import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { MoveButtons } from "@/components/move-buttons";
import { Card, Field, PageTitle, StatusBadge } from "@/components/ui";
import { loadContentTree, loadTopicLessons, type AuthorTopic } from "@/lib/jobs/author";
import { MIN_PUBLISHED_LESSONS } from "@/lib/rules/constants";
import { db } from "@/lib/server/db";
import {
  createLessonAction,
  createTopicAction,
  deleteTopicAction,
  moveTopicAction,
  reorderLessonsAction,
  reorderTopicsAction,
  updateTopicAction,
} from "../../actions";
import { requireAuthor } from "../../guard";

export const metadata: Metadata = { title: "Topic" };

const inputClass = "mt-1 block w-full rounded-control border border-border bg-surface px-3 py-2.5";

/** Every place this topic could move to: any category, or any topic that isn't itself or below it. */
function placeOptions(tree: { categories: { id: string; name: string }[]; topics: AuthorTopic[] }, self: AuthorTopic) {
  const below = new Set<string>([self.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of tree.topics) {
      if (t.parentId && below.has(t.parentId) && !below.has(t.id)) {
        below.add(t.id);
        grew = true;
      }
    }
  }
  const out: { value: string; label: string }[] = [];
  const walk = (parent: string, depth: number) => {
    for (const t of tree.topics.filter((x) => x.parentId === parent && !below.has(x.id))) {
      out.push({ value: `topic:${t.id}`, label: `${"— ".repeat(depth)}under ${t.name}` });
      walk(t.id, depth + 1);
    }
  };
  for (const c of tree.categories) {
    out.push({ value: `category:${c.id}`, label: `Top of ${c.name}` });
    for (const t of tree.topics.filter((x) => x.categoryId === c.id && !below.has(x.id))) {
      out.push({ value: `topic:${t.id}`, label: `— under ${t.name}` });
      walk(t.id, 2);
    }
  }
  return out;
}

export default async function TopicEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthor();
  const tree = await loadContentTree(db(), user.id);
  const topic = tree.topics.find((t) => t.id === id);
  if (!topic) notFound();
  const lessons = await loadTopicLessons(db(), user.id, id);
  const children = tree.topics.filter((t) => t.parentId === id);
  const parent = topic.parentId ? tree.topics.find((t) => t.id === topic.parentId) : null;
  const category = tree.categories.find((c) => c.id === topic.categoryId);
  const currentPlace = topic.parentId ? `topic:${topic.parentId}` : `category:${topic.categoryId}`;
  const lessonIds = lessons.map((l) => l.id);
  const childIds = children.map((c) => c.id);

  return (
    <>
      <p className="mb-2 text-[15px]">
        <Link href="/author" className="text-primary hover:underline">
          Author
        </Link>
        {parent && (
          <>
            {" / "}
            <Link href={`/author/topics/${parent.id}`} className="text-primary hover:underline">
              {parent.name}
            </Link>
          </>
        )}
      </p>
      <PageTitle eyebrow={category?.name ?? "Sub-topic"}>{topic.name}</PageTitle>
      <p className="-mt-4 mb-6 text-text-muted">
        {topic.pickable
          ? "Learners can see and pick this topic."
          : `Learners can't see this topic until ${MIN_PUBLISHED_LESSONS} lessons are published (${topic.lessons.published} so far).`}
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <Card aria-labelledby="path-heading">
          <h2 id="path-heading" className="mb-1 text-[22px]">
            Lesson path
          </h2>
          <p className="mb-4 text-[15px] text-text-muted">
            Learners get these in order. The first published lesson is the free preview.
          </p>
          {lessons.length ? (
            <ol className="space-y-2">
              {lessons.map((l, i) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-card-sm border border-hairline px-3 py-2">
                  <MoveButtons ids={lessonIds} index={i} label={l.title} reorder={reorderLessonsAction.bind(null, id)} />
                  <span className="w-6 text-right font-bold text-accent" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/author/lessons/${l.id}`} className="font-medium text-primary hover:underline">
                      {l.title}
                    </Link>
                    <p className="text-[15px] text-text-muted">
                      Level {l.level} · {l.readingMinutes} min · {l.questionCount} quiz {l.questionCount === 1 ? "question" : "questions"} ·{" "}
                      {l.problemCount} practice {l.problemCount === 1 ? "problem" : "problems"}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-text-muted">No lessons yet.</p>
          )}
          <ActionForm action={createLessonAction} submit="Add lesson" variant="secondary" className="mt-5 space-y-2 border-t border-hairline pt-5">
            <input type="hidden" name="topicId" value={id} />
            <label className="block">
              <span className="font-medium">New lesson title</span>
              <input name="title" required className={inputClass} />
            </label>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-4 text-[22px]">
              Details
            </h2>
            <ActionForm action={updateTopicAction} submit="Save details" className="space-y-4">
              <input type="hidden" name="id" value={id} />
              <Field label="Name">{(p) => <input {...p} name="name" defaultValue={topic.name} required />}</Field>
              <Field label="Goal" hint="What learners will be able to do at the end of the path.">
                {(p) => <input {...p} name="goal" defaultValue={topic.goal} placeholder="e.g. Understand the life cycle of a star" />}
              </Field>
              <Field label="Description" hint="A short blurb for the topic picker.">
                {(p) => <textarea {...p} name="description" defaultValue={topic.description} rows={3} />}
              </Field>
              <Field label="Path outline" hint="Your plan for the path, in Markdown. Only authors see it.">
                {(p) => <textarea {...p} name="outline" defaultValue={topic.outline} rows={6} className={`${p.className} font-mono text-[15px]`} />}
              </Field>
            </ActionForm>
          </Card>

          <Card aria-labelledby="subtopics-heading">
            <h2 id="subtopics-heading" className="mb-1 text-[22px]">
              Sub-topics
            </h2>
            <p className="mb-4 text-[15px] text-text-muted">Deeper dives. This topic is their prerequisite.</p>
            {children.length ? (
              <ul className="space-y-2">
                {children.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <MoveButtons ids={childIds} index={i} label={c.name} reorder={reorderTopicsAction.bind(null, `topic:${id}`)} />
                    <Link href={`/author/topics/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted">None yet.</p>
            )}
            <ActionForm action={createTopicAction} submit="Add sub-topic" variant="secondary" className="mt-4 space-y-2">
              <input type="hidden" name="place" value={`topic:${id}`} />
              <label className="block">
                <span className="font-medium">New sub-topic</span>
                <input name="name" required className={inputClass} />
              </label>
            </ActionForm>
          </Card>

          <Card aria-labelledby="move-heading">
            <h2 id="move-heading" className="mb-4 text-[22px]">
              Move or delete
            </h2>
            <ActionForm action={moveTopicAction} submit="Move" variant="secondary" className="space-y-2">
              <input type="hidden" name="id" value={id} />
              <label className="block">
                <span className="font-medium">Place</span>
                <select name="place" defaultValue={currentPlace} className={inputClass}>
                  {placeOptions(tree, topic).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </ActionForm>
            <ActionForm
              action={deleteTopicAction}
              submit="Delete topic"
              pendingLabel="Deleting…"
              variant="danger"
              confirm={`Delete ${topic.name}? Only topics with no lessons or sub-topics can be deleted.`}
              className="mt-5 border-t border-hairline pt-5"
            >
              <input type="hidden" name="id" value={id} />
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
