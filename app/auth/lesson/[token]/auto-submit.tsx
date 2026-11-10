"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A form that submits itself once in a browser. Mail scanners that only fetch the page never submit it. */
export function AutoSubmitForm({ action, children }: { action: () => Promise<void>; children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    form.current?.requestSubmit();
  }, []);
  return (
    <form ref={form} action={action}>
      {children}
    </form>
  );
}
