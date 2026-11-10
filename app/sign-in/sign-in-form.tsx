"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { sendSignInLink, type SignInState } from "./actions";

export function SignInForm({ next = null }: { next?: string | null }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendSignInLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-4">
        <h2 className="text-[22px]">Check your email</h2>
        <p>
          We sent a sign-in link to <strong>{state.email}</strong>. It works once, for 15 minutes, on any device.
        </p>
        <form action={action}>
          <input type="hidden" name="email" value={state.email} />
          {next && <input type="hidden" name="next" value={next} />}
          <Button variant="secondary" disabled={pending}>
            {pending ? "Sending…" : "Send again"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" error={state.status === "error" ? state.message : null}>
        {(p) => <input {...p} name="email" type="email" autoComplete="email" inputMode="email" required />}
      </Field>
      <Button disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send me a link"}
      </Button>
      <p className="text-[15px] text-text-muted">No password. New here? The same link creates your account.</p>
    </form>
  );
}
