import { redirect } from "next/navigation";
import { LinkButton, Wordmark } from "@/components/ui";
import { afterSignIn, currentUser } from "@/lib/server/auth";

// A stand-in landing page until the real one is built from the mockups.
export default async function Landing() {
  const user = await currentUser();
  if (user) redirect(afterSignIn(user, null));
  return (
    <main id="main" className="min-h-dvh bg-hero-bg text-hero-text">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-16 sm:px-6">
        <Wordmark />
        <h1 className="text-[36px] leading-tight sm:text-[52px]">
          One short lesson a day, on <em className="font-normal">topics you choose</em>.
        </h1>
        <p className="max-w-xl text-[18px] text-hero-muted">
          A few minutes of reading, a quick quiz, and the questions you missed come back later so they stick.
        </p>
        <div>
          <LinkButton href="/sign-in" variant="bright">
            Get started
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
