import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui";
import { loadTopicChoices } from "@/lib/jobs/topics";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { paths } from "@/lib/server/paths";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Get started" };

// Onboarding (A2–A6, A3a, A10, D4): an optional name, the detected time zone,
// and the topics to turn on. Finishing delivers the first lesson.
export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect(paths.signIn);
  if (user.onboarded) redirect(paths.home);
  const choices = await loadTopicChoices(db(), user.id);
  const zones = Intl.supportedValuesOf("timeZone");
  return (
    <>
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <Wordmark href="/" />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-[28px] leading-tight sm:text-[32px]">Pick what you want to learn</h1>
        <p className="mt-2 text-[18px] text-text-muted">
          Turn on a few topics. Each day you get one short lesson from them, and you can change this any time.
        </p>
        <OnboardingForm choices={choices} zones={zones} />
      </main>
    </>
  );
}
