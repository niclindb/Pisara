"use client";

// The interest control, saved as soon as it changes (A4), with the
// prerequisite note (A3a) or a problem announced next to it.

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/author/actions";
import { InterestControl } from "./interest-control";

export function TopicInterest({
  topicId,
  topicName,
  interest,
  save,
}: {
  topicId: string;
  topicName: string;
  interest: number;
  save: (topicId: string, interest: number) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState(interest);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [, start] = useTransition();
  const change = (v: number) => {
    const before = value;
    setValue(v);
    start(async () => {
      const r = await save(topicId, v);
      if (!r.ok) setValue(before);
      setResult(r);
    });
  };
  return (
    <div>
      <InterestControl topicId={topicId} topicName={topicName} value={value} onChange={change} />
      <p role="status" className={`mt-1 text-[15px] ${result && !result.ok ? "text-danger" : "text-text-muted"}`}>
        {result ? (result.ok ? (result.message ?? "") : result.problems.join(" ")) : ""}
      </p>
    </div>
  );
}
