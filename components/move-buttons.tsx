"use client";

// Move up / Move down, the keyboard- and tap-friendly way to reorder (WCAG 2.5.7).

import { useTransition } from "react";

export function MoveButtons({
  ids,
  index,
  label,
  reorder,
}: {
  ids: string[];
  index: number;
  /** What's being moved, for screen readers: "Move Stars up". */
  label: string;
  reorder: (ids: string[]) => Promise<unknown>;
}) {
  const [pending, start] = useTransition();
  const move = (by: -1 | 1) => {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    start(async () => {
      await reorder(next);
    });
  };
  const btn =
    "inline-flex h-11 w-11 items-center justify-center rounded-control border border-border bg-surface text-text disabled:opacity-40";
  return (
    <span className="inline-flex gap-1">
      <button type="button" className={btn} onClick={() => move(-1)} disabled={pending || index === 0} aria-label={`Move ${label} up`}>
        <span aria-hidden>↑</span>
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => move(1)}
        disabled={pending || index === ids.length - 1}
        aria-label={`Move ${label} down`}
      >
        <span aria-hidden>↓</span>
      </button>
    </span>
  );
}
