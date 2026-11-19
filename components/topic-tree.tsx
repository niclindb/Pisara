// A category's topics as a list, with each sub-topic grouped under the topic it
// builds on instead of indented by depth. Used by Explore, My topics and
// onboarding so the three read the same.

import type { ReactNode } from "react";

interface TreeTopic {
  id: string;
  name: string;
  parentId: string | null;
}

interface Node<T> {
  topic: T;
  children: Node<T>[];
}

/** Nests a tree-ordered topic list. Topics whose parent isn't in the list sit at the top. */
export function nestTopics<T extends TreeTopic>(topics: T[]): Node<T>[] {
  const nodes = new Map(topics.map((t) => [t.id, { topic: t, children: [] as Node<T>[] }]));
  const roots: Node<T>[] = [];
  for (const t of topics) {
    const node = nodes.get(t.id)!;
    const parent = t.parentId ? nodes.get(t.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

/** The heading over one category's topics. */
export function CategoryHeading({ id, level = 2, children }: { id: string; level?: 2 | 3; children: ReactNode }) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className="mb-3 border-b border-border pb-2 font-heading text-[22px] font-bold">
      {children}
    </Tag>
  );
}

export function TopicTreeList<T extends TreeTopic>({
  topics,
  renderTopic,
}: {
  topics: T[];
  renderTopic: (topic: T) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
      {nestTopics(topics).map((n) => (
        <TopicRow key={n.topic.id} node={n} renderTopic={renderTopic} />
      ))}
    </ul>
  );
}

function TopicRow<T extends TreeTopic>({ node, renderTopic }: { node: Node<T>; renderTopic: (topic: T) => ReactNode }) {
  const groupId = `sub-${node.topic.id}`;
  return (
    <li className="px-5 py-4">
      {renderTopic(node.topic)}
      {node.children.length > 0 && (
        <div className="mt-4">
          <p id={groupId} className="mb-1 font-heading text-[15px] italic text-text-muted">
            Builds on {node.topic.name}
          </p>
          <ul aria-labelledby={groupId} className="divide-y divide-hairline border-l-2 border-accent pl-4 sm:pl-5">
            {node.children.map((c) => (
              <SubTopicRow key={c.topic.id} node={c} renderTopic={renderTopic} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function SubTopicRow<T extends TreeTopic>({ node, renderTopic }: { node: Node<T>; renderTopic: (topic: T) => ReactNode }) {
  return (
    <li className="py-3 first:pt-1 last:pb-1">
      {renderTopic(node.topic)}
      {node.children.length > 0 && (
        <ul className="mt-3 divide-y divide-hairline border-l-2 border-hairline pl-4">
          {node.children.map((c) => (
            <SubTopicRow key={c.topic.id} node={c} renderTopic={renderTopic} />
          ))}
        </ul>
      )}
    </li>
  );
}
