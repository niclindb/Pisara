// Why "Check answers" is greyed out: it stays off until every question,
// review questions included, has a pick. Says which ones are still open.

function list(nums: number[]): string {
  if (nums.length === 1) return `${nums[0]}`;
  return `${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
}

export function QuizHint({ id, unanswered, total, className = "" }: { id: string; unanswered: number[]; total: number; className?: string }) {
  const text =
    unanswered.length === total
      ? total === 1
        ? "Pick an answer to check it."
        : `Pick an answer for all ${total} questions to check them.`
      : `Pick an answer for question${unanswered.length === 1 ? "" : "s"} ${list(unanswered)} to check your answers.`;
  return (
    <p id={id} className={`text-[15px] text-text-muted ${className}`}>
      {text}
    </p>
  );
}
