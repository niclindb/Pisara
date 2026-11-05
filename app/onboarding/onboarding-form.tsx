"use client";

import { useEffect, useState, useTransition } from "react";
import { InterestControl } from "@/components/interest-control";
import { Button, ErrorList, Field } from "@/components/ui";
import type { TopicChoices } from "@/lib/jobs/topics";
import { MANY_TOPICS } from "@/lib/rules/constants";
import { DISPLAY_NAME_MAX } from "@/lib/rules/onboarding";
import { finishOnboardingAction } from "./actions";

export function OnboardingForm({ choices, zones }: { choices: TopicChoices; zones: string[] }) {
  const [interest, setInterest] = useState<Record<string, number>>(() =>
    Object.fromEntries(choices.topics.map((t) => [t.id, t.interest])),
  );
  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();

  // Detect the time zone in the browser; the server can't know it.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && zones.includes(detected)) setTimeZone(detected);
  }, [zones]);

  const onCount = Object.values(interest).filter((v) => v > 0).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCount === 0) {
      setProblems(["Turn on at least one topic."]);
      return;
    }
    setProblems([]);
    start(async () => {
      const result = await finishOnboardingAction({
        topics: Object.entries(interest)
          .filter(([, v]) => v > 0)
          .map(([topicId, v]) => ({ topicId, interest: v })),
        timeZone,
        displayName: name,
      });
      if (result && !result.ok) setProblems(result.problems);
    });
  };

  if (!choices.topics.some((t) => t.pickable)) {
    return <p className="mt-8 rounded-card border border-hairline bg-surface p-6">The first topics are still being written. Check back soon.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-10" noValidate>
      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="mb-1 text-[22px]">
          Topics
        </h2>
        <p className="mb-5 text-text-muted">Topics you turn up come up more often.</p>
        <div className="space-y-8">
          {choices.categories.map((c) => {
            const topics = choices.topics.filter((t) => t.categoryId === c.id);
            if (!topics.length) return null;
            return (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <h3 id={`cat-${c.id}`} className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">
                  {c.name}
                </h3>
                <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
                  {topics.map((t) => {
                    const d = t.depth;
                    const on = (interest[t.id] ?? 0) > 0;
                    return (
                      <li key={t.id} className="px-5 py-4" style={{ paddingLeft: `${1.25 + d * 1.5}rem` }}>
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                          <div className="min-w-0 flex-1 basis-64">
                            <p className="font-heading text-[18px] font-bold">{t.name}</p>
                            {t.goal && <p className="mt-1">{t.goal}</p>}
                            {t.pickable && <p className="mt-1 text-[15px] text-text-muted">{t.lessonCount} lessons</p>}
                          </div>
                          {t.pickable ? (
                            <InterestControl
                              topicId={t.id}
                              topicName={t.name}
                              value={interest[t.id] ?? 0}
                              disabled={pending}
                              onChange={(v) => {
                                setInterest({ ...interest, [t.id]: v });
                                setProblems([]);
                              }}
                            />
                          ) : (
                            <p className="text-[15px] text-text-muted">Pick a part below</p>
                          )}
                        </div>
                        {on && t.prerequisiteNote && <p className="mt-2 text-[15px] text-text-muted">{t.prerequisiteNote}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p role="status" className="mt-4 text-[15px] text-text-muted">
          {onCount > MANY_TOPICS
            ? `You have ${onCount} topics on, so each one will come up less often.`
            : onCount > 0
              ? `${onCount} ${onCount === 1 ? "topic" : "topics"} on.`
              : ""}
        </p>
      </section>

      <section aria-labelledby="about-heading" className="space-y-5">
        <h2 id="about-heading" className="text-[22px]">
          About you
        </h2>
        <Field label="Your name (optional)" hint="Only used to greet you. Nobody else sees it.">
          {(p) => (
            <input
              {...p}
              name="displayName"
              autoComplete="given-name"
              maxLength={DISPLAY_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Time zone" hint="Found from your device. Lessons arrive at 8am Eastern, and this decides what counts as today for you.">
          {(p) => (
            <select {...p} name="timeZone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          )}
        </Field>
      </section>

      <div className="space-y-4 border-t border-hairline pt-6">
        <ErrorList problems={problems} />
        <Button disabled={pending}>{pending ? "Getting your first lesson…" : "Start learning"}</Button>
      </div>
    </form>
  );
}
