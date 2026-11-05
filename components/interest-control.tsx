"use client";

// Turning a topic on or off and setting how often it comes up (A4). Every topic
// starts Off; one tap turns it on at 3.

import { useEffect, useRef } from "react";
import { DEFAULT_INTEREST } from "@/lib/rules/onboarding";
import { Button } from "./ui";

const LEVELS = [1, 2, 3, 4, 5] as const;

export function InterestControl({
  topicId,
  topicName,
  value,
  onChange,
  disabled = false,
}: {
  topicId: string;
  topicName: string;
  value: number;
  onChange: (interest: number) => void;
  disabled?: boolean;
}) {
  // Turning on or off swaps the controls, so move focus to what replaced the button.
  const moved = useRef(false);
  const onRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (value === 0) onRef.current?.focus();
    else groupRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
  }, [value]);
  const set = (v: number) => {
    if ((v === 0) !== (value === 0)) moved.current = true;
    onChange(v);
  };

  if (value === 0) {
    return (
      <Button
        ref={onRef}
        type="button"
        variant="secondary"
        disabled={disabled}
        aria-label={`Turn on ${topicName}`}
        onClick={() => set(DEFAULT_INTEREST)}
      >
        Turn on
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <fieldset ref={groupRef} disabled={disabled} className="flex items-center gap-2">
        <legend className="sr-only">{`How often ${topicName} comes up, from 1 (less) to 5 (more)`}</legend>
        <span aria-hidden className="text-[13px] text-text-muted">
          Less
        </span>
        <div className="flex">
          {LEVELS.map((n) => (
            <label key={n} className="relative">
              <input
                type="radio"
                name={`interest-${topicId}`}
                value={n}
                checked={value === n}
                onChange={() => set(n)}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                className={`flex h-11 w-10 items-center justify-center border border-border font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring ${
                  n === 1 ? "rounded-l-control" : "-ml-px"
                } ${n === 5 ? "rounded-r-control" : ""} ${value === n ? "relative z-10 border-primary bg-primary text-primary-text" : "bg-surface"}`}
              >
                {n}
              </span>
            </label>
          ))}
        </div>
        <span aria-hidden className="text-[13px] text-text-muted">
          More
        </span>
      </fieldset>
      <Button type="button" variant="quiet" disabled={disabled} aria-label={`Turn off ${topicName}`} onClick={() => set(0)}>
        Turn off
      </Button>
    </div>
  );
}
