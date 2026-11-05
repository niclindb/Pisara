import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, LinkButton } from "@/components/ui";
import { loadHome, type HomeView, type LessonCard } from "@/lib/jobs/learner";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { INBOX_LIMIT } from "@/lib/rules/constants";
import { addDays, formatDate } from "@/lib/rules/dates";
import { db } from "@/lib/server/db";
import { extraLessonAction } from "../actions";
import { requireLearner } from "../guard";

export const metadata: Metadata = { title: "Home" };

// Home (B5, B6, B7, C7, D6): the current lesson on top, the other waiting
// lessons, then the weekly recap, then the learner's topics with Start. It
// never mentions how many lessons Home can hold.

export default async function HomePage() {
  const user = await requireLearner();
  const now = new Date();
  const home = await loadHome(db(), user.id, now);
  if (!home) return null;
  const choices = await loadTopicChoices(db(), user.id);
  const topicsOn = choices.topics.filter((t) => t.interest > 0);
  // Extra lessons count toward Home, so Start and Surprise me only show while there's room.
  const roomForExtra = home.waiting.length < INBOX_LIMIT;
  const [current, ...others] = home.waiting;

  return (
    <div className="space-y-10">
      <Hero home={home} year={now.getUTCFullYear()} />

      {current && <CurrentLesson lesson={current} />}

      {others.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="mb-3 text-[22px]">
            Also waiting
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {others.map((l) => (
              <li key={l.lessonId}>
                <Link
                  href={`/lessons/${l.lessonId}`}
                  className="block h-full rounded-card-sm border border-hairline bg-surface p-4 hover:border-border"
                >
                  <span className="block text-[13px] font-bold uppercase tracking-[0.08em] text-accent">{l.topicName}</span>
                  <span className="mt-1 block font-heading text-[18px] font-bold">{l.title}</span>
                  <span className="mt-1 block text-[15px] text-text-muted">
                    {l.readingMinutes} min{l.kind === "extra" ? " · Extra" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {home.recap && (
        <Card aria-labelledby="recap-heading" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="recap-heading" className="text-[22px]">
              Your weekly recap
            </h2>
            <p className="mt-1 text-text-muted">
              {home.recap.questionCount} {home.recap.questionCount === 1 ? "question" : "questions"} on this week&rsquo;s lessons.
            </p>
          </div>
          <LinkButton href={`/recap/${home.recap.recapId}`} variant="secondary">
            Start recap
          </LinkButton>
        </Card>
      )}

      {topicsOn.length > 0 && (
        <section aria-labelledby="topics-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="topics-heading" className="text-[22px]">
              Your topics
            </h2>
            {roomForExtra && home.state !== "all_finished" && (
              <ActionForm action={extraLessonAction} submit="Surprise me" pendingLabel="Picking…" variant="secondary" />
            )}
          </div>
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
            {topicsOn.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/explore/${t.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  {t.progress && (
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar read={t.progress.read} total={t.progress.total} />
                      <span className="shrink-0 text-[15px] text-text-muted">
                        {t.progress.read} of {t.progress.total} read
                      </span>
                    </div>
                  )}
                </div>
                {t.progress?.finished ? (
                  <span className="text-[15px] text-text-muted">New lessons coming soon</span>
                ) : (
                  roomForExtra && (
                    <ActionForm
                      action={extraLessonAction}
                      submit="Start"
                      submitLabel={`Start a lesson in ${t.name}`}
                      pendingLabel="Opening…"
                      variant="secondary"
                    >
                      <input type="hidden" name="topicId" value={t.id} />
                    </ActionForm>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Hero({ home, year }: { home: HomeView; year: number }) {
  const name = home.displayName ? `, ${home.displayName}` : "";
  let headline: string;
  let line: React.ReactNode;
  if (home.noTopicsOn) {
    headline = `No topics are on${name}.`;
    line = (
      <>
        Turn one on in{" "}
        <Link href="/explore" className="font-medium text-hero-text underline underline-offset-4">
          Explore
        </Link>{" "}
        and your lessons start again.
      </>
    );
  } else if (home.state === "waiting") {
    const n = home.waiting.length;
    headline = `Welcome back${name}.`;
    line = n === 1 ? "Your lesson is ready." : `You have ${n} lessons waiting.`;
  } else if (home.state === "paused") {
    headline = `Lessons are paused${name}.`;
    line = (
      <>
        They start again on {formatDate(addDays(home.pausedUntil!, 1), year)}. You can change that in{" "}
        <Link href="/settings" className="font-medium text-hero-text underline underline-offset-4">
          Settings
        </Link>
        .
      </>
    );
  } else if (home.state === "all_finished") {
    headline = `You've read every lesson${name}.`;
    line = (
      <>
        New lessons are on the way. Meanwhile,{" "}
        <Link href="/explore" className="font-medium text-hero-text underline underline-offset-4">
          Explore
        </Link>{" "}
        has more topics to try.
      </>
    );
  } else {
    headline = `You're all caught up${name}.`;
    line = "Your next lesson arrives at 8am Eastern.";
  }
  return (
    <section aria-labelledby="home-heading" className="rounded-card bg-hero-bg px-6 py-8 text-hero-text sm:px-10 sm:py-12">
      <h1 id="home-heading" className="text-[32px] leading-tight text-hero-text sm:text-[44px]">
        {headline}
      </h1>
      <p className="mt-3 max-w-xl text-[18px] text-hero-muted">{line}</p>
    </section>
  );
}

function CurrentLesson({ lesson }: { lesson: LessonCard }) {
  return (
    <section
      aria-labelledby="current-heading"
      className="overflow-hidden rounded-card border border-hairline bg-surface shadow-[0_8px_24px_-12px_rgb(11_37_69/0.25)]"
    >
      <div aria-hidden className="h-1.5 bg-bright dark:h-0.5 dark:bg-accent" />
      <div className="p-6 sm:p-8">
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent">
          {lesson.topicName}
          {lesson.kind === "extra" ? " · Extra lesson" : ""}
        </p>
        <h2 id="current-heading" className="mt-2 text-[26px] leading-tight sm:text-[32px]">
          {lesson.title}
        </h2>
        <p className="mt-2 text-[15px] text-text-muted">{lesson.readingMinutes} min</p>
        <LinkButton href={`/lessons/${lesson.lessonId}`} className="mt-5">
          Begin lesson
        </LinkButton>
      </div>
    </section>
  );
}

function ProgressBar({ read, total }: { read: number; total: number }) {
  const pct = total ? Math.round((read / total) * 100) : 0;
  return (
    <div aria-hidden className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-hairline">
      <div className="h-full rounded-full bg-bright dark:bg-text-muted" style={{ width: `${pct}%` }} />
    </div>
  );
}
