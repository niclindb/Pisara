import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { MoveButtons } from "@/components/move-buttons";
import { Card, PageTitle } from "@/components/ui";
import { loadContentTree, type AuthorTopic } from "@/lib/jobs/author";
import { MIN_PUBLISHED_LESSONS } from "@/lib/rules/constants";
import { db } from "@/lib/server/db";
import {
  createCategoryAction,
  createTopicAction,
  deleteCategoryAction,
  renameCategoryAction,
  reorderCategoriesAction,
  reorderTopicsAction,
} from "./actions";
import { requireAuthor } from "./guard";

export const metadata: Metadata = { title: "Author" };

function TopicTree({ topics, parent, all }: { topics: AuthorTopic[]; parent: { categoryId: string } | { parentId: string }; all: AuthorTopic[] }) {
  if (!topics.length) return null;
  const ids = topics.map((t) => t.id);
  const place = "categoryId" in parent ? `category:${parent.categoryId}` : `topic:${parent.parentId}`;
  return (
    <ul className="space-y-2">
      {topics.map((t, i) => {
        const children = all.filter((c) => c.parentId === t.id);
        return (
          <li key={t.id}>
            <div className="flex flex-wrap items-center gap-3 rounded-card-sm border border-hairline bg-page/40 px-3 py-2">
              <MoveButtons ids={ids} index={i} label={t.name} reorder={reorderTopicsAction.bind(null, place)} />
              <div className="min-w-0 flex-1">
                <Link href={`/author/topics/${t.id}`} className="font-medium text-primary hover:underline">
                  {t.name}
                </Link>
                <p className="text-[15px] text-text-muted">
                  {t.lessons.published} published · {t.lessons.draft} draft
                  {t.lessons.unpublished ? ` · ${t.lessons.unpublished} unpublished` : ""}
                  {" · "}
                  {t.pickable ? (
                    <span className="text-success">Learners can pick it</span>
                  ) : (
                    <span>Hidden until {MIN_PUBLISHED_LESSONS} lessons are published</span>
                  )}
                </p>
              </div>
            </div>
            {children.length > 0 && (
              <div className="mt-2 border-l-2 border-hairline pl-4 sm:pl-6">
                <TopicTree topics={children} parent={{ parentId: t.id }} all={all} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function AuthorHome() {
  const user = await requireAuthor();
  const tree = await loadContentTree(db(), user.id);
  const categoryIds = tree.categories.map((c) => c.id);

  return (
    <>
      <PageTitle eyebrow="Author">Categories and topics</PageTitle>
      <div className="space-y-6">
        {tree.categories.length === 0 && (
          <Card>
            <p>Start by adding a category, such as Science or Languages. Topics go inside categories.</p>
          </Card>
        )}
        {tree.categories.map((c, i) => {
          const top = tree.topics.filter((t) => t.categoryId === c.id);
          return (
            <Card key={c.id} aria-labelledby={`cat-${c.id}`}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <MoveButtons ids={categoryIds} index={i} label={c.name} reorder={reorderCategoriesAction} />
                <h2 id={`cat-${c.id}`} className="flex-1 text-[22px]">
                  {c.name}
                </h2>
              </div>
              {top.length ? (
                <TopicTree topics={top} parent={{ categoryId: c.id }} all={tree.topics} />
              ) : (
                <p className="text-text-muted">No topics yet.</p>
              )}
              <div className="mt-5 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
                <ActionForm action={createTopicAction} submit="Add topic" variant="secondary" className="space-y-2">
                  <input type="hidden" name="place" value={`category:${c.id}`} />
                  <label className="block">
                    <span className="font-medium">New topic in {c.name}</span>
                    <input name="name" required className="mt-1 block w-full rounded-control border border-border bg-surface px-3 py-2.5" />
                  </label>
                </ActionForm>
                <details className="space-y-2">
                  <summary className="cursor-pointer py-2 font-medium text-primary">Rename or delete {c.name}</summary>
                  <ActionForm action={renameCategoryAction} submit="Rename" variant="secondary" className="space-y-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="block">
                      <span className="font-medium">Name</span>
                      <input name="name" defaultValue={c.name} required className="mt-1 block w-full rounded-control border border-border bg-surface px-3 py-2.5" />
                    </label>
                  </ActionForm>
                  <ActionForm
                    action={deleteCategoryAction}
                    submit="Delete category"
                    pendingLabel="Deleting…"
                    variant="danger"
                    confirm={`Delete ${c.name}? Only empty categories can be deleted.`}
                    className="pt-2"
                  >
                    <input type="hidden" name="id" value={c.id} />
                  </ActionForm>
                </details>
              </div>
            </Card>
          );
        })}
        <Card>
          <ActionForm action={createCategoryAction} submit="Add category" className="space-y-3">
            <label className="block">
              <span className="font-medium">New category</span>
              <input name="name" required placeholder="e.g. Science" className="mt-1 block w-full max-w-sm rounded-control border border-border bg-surface px-3 py-2.5 placeholder:text-text-muted" />
            </label>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
