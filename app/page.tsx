import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, LinkButton, Wordmark } from "@/components/ui";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { afterSignIn, currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { SignInForm } from "./sign-in/sign-in-form";

const STEPS = [
  { title: "Pick your topics", text: "Turn on the topics you're curious about, and choose which come up more often." },
  { title: "Get one lesson a day", text: "A short lesson arrives each morning at 8am Eastern, by email and on Home. Each takes a few minutes." },
  { title: "Check what you learned", text: "A quick quiz follows each lesson, and Progress shows how far along each topic you are." },
];

// The landing page (A1, A9): what Pisara is, sign-up, and a way to look around first.
export default async function Landing() {
  const user = await currentUser();
  if (user) redirect(afterSignIn(user, null));
  const choices = await loadTopicChoices(db(), null);
  const topics = choices.topics.filter((t) => t.pickable).slice(0, 6);
  return (
    <>
      <div className="bg-hero-bg text-hero-text">
        <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark onDark />
          <Link href="/sign-in" className="py-2 font-medium text-hero-text hover:underline hover:text-bright">
            Sign in
          </Link>
        </header>
        <main id="main" className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:pt-16 md:pb-24">
          <div>
            <h1 className="text-[36px] leading-tight text-hero-text sm:text-[52px]">
              One short lesson a day, on <em className="font-normal">topics you choose</em>.
            </h1>
            <p className="mt-5 max-w-xl text-[18px] text-hero-muted">
              A few minutes of reading and a quick quiz each morning. Drop by drop, it adds up.
            </p>
            <p className="mt-6">
              <LinkButton href="/explore" variant="bright">
                Browse topics
              </LinkButton>
            </p>
          </div>
          <Card aria-labelledby="signup-heading" className="text-text">
            <h2 id="signup-heading" className="mb-4 text-[22px]">
              Start free
            </h2>
            <SignInForm />
          </Card>
        </main>
      </div>

      <section aria-labelledby="how-heading" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <h2 id="how-heading" className="mb-8 text-[28px] sm:text-[32px]">
          How it works
        </h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent">Step {i + 1}</p>
              <h3 className="mt-1 text-[22px]">{s.title}</h3>
              <p className="mt-2 text-text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {topics.length > 0 && (
        <section aria-labelledby="topics-heading" className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
          <h2 id="topics-heading" className="mb-2 text-[28px] sm:text-[32px]">
            Try a lesson first
          </h2>
          <p className="mb-6 text-text-muted">The first lesson in every topic is free to read, no account needed.</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/explore/${t.id}`}
                  className="block h-full rounded-card border border-hairline bg-surface p-5 hover:border-border"
                >
                  <span className="block font-heading text-[18px] font-bold">{t.name}</span>
                  {t.goal && <span className="mt-1 block">{t.goal}</span>}
                  <span className="mt-2 block text-[15px] text-text-muted">{t.lessonCount} lessons</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
