// How a graded answer is marked (C2; design 10 "color is never the only
// signal"): an icon and words, so it reads the same without color. A missed
// answer is marked in the cool crimson `danger` color (never the warm red),
// so it can't be mistaken for a right one.

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}

function Cross() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** Shown only on the option the learner picked, when it was right. */
export function RightMark({ chosen, className = "ml-auto" }: { chosen: boolean; className?: string }) {
  return (
    <span className={`${className} flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-success`}>
      <Check />
      {chosen ? "Correct" : "Right answer"}
    </span>
  );
}

export function NotQuiteMark({ className = "ml-auto" }: { className?: string }) {
  return (
    <span className={`${className} flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-danger`}>
      <Cross />
      Not quite
    </span>
  );
}

/** Option row styles: the learner's pick in green when right, crimson when not. The right answer is never lit up after a miss. */
export function optionClass(right: boolean, wrong: boolean): string {
  return right ? "border-success bg-success-bg" : wrong ? "border-danger bg-danger-bg" : "border-border";
}
