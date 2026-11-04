"use client";

// A form that runs a server action and shows what went wrong (or a short
// confirmation) right next to it, announced to screen readers.

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/app/author/actions";
import { Button, ErrorList, type ButtonVariant } from "./ui";

export function ActionForm({
  action,
  submit,
  pendingLabel = "Saving…",
  variant = "primary",
  confirm,
  className = "",
  children,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  submit: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  /** Ask before running, for things that can't be undone. */
  confirm?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form
      action={run}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={variant} disabled={pending}>
          {pending ? pendingLabel : submit}
        </Button>
        <p role="status" className="text-[15px] text-success">
          {state?.ok && state.message ? state.message : ""}
        </p>
      </div>
      {state && !state.ok && (
        <div className="mt-3">
          <ErrorList problems={state.problems} />
        </div>
      )}
    </form>
  );
}
