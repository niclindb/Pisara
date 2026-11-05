import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton, PageTitle } from "@/components/ui";
import { loadRecap } from "@/lib/jobs/quiz";
import { db } from "@/lib/server/db";
import { submitRecapAction } from "../../actions";
import { requireLearner } from "../../guard";
import { RecapQuiz } from "./recap-quiz";

export const metadata: Metadata = { title: "Weekly recap" };

// The weekly recap (C7, C6): a few questions one at a time, then results.
export default async function RecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireLearner();
  const recap = await loadRecap(db(), user.id);
  if (!recap || recap.recapId !== id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    return (
      <div className="mx-auto max-w-[44rem]">
        <PageTitle>Weekly recap</PageTitle>
        <p className="mb-5">This recap is done. A new one comes next week.</p>
        <LinkButton href="/home" variant="secondary">
          Back to Home
        </LinkButton>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[44rem]">
      <PageTitle eyebrow="This week">Weekly recap</PageTitle>
      <RecapQuiz questions={recap.questions} grade={submitRecapAction.bind(null, recap.recapId)} />
    </div>
  );
}
