"use client";

// Shown when a page fails to load. It never shows the error itself, which may
// hold details only the server should see; the digest helps find it in the logs.

import { useEffect } from "react";
import { Button, LinkButton, Wordmark } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
      <div>
        <Wordmark />
      </div>
      <h1 className="text-[28px]">Something went wrong</h1>
      <p>This page didn&rsquo;t load. Trying again usually fixes it, and nothing you saved was lost.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="secondary">
          Go to Pisara
        </LinkButton>
      </div>
      {error.digest && <p className="text-[13px] text-text-muted">Error code: {error.digest}</p>}
    </main>
  );
}
