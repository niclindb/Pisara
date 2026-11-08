---
category: Technology
topic: Artificial intelligence / AI for developers
title: "Evals: knowing whether it works"
level: Advanced
reading_minutes: 6
---

With normal code, a test passes or fails. With an AI feature, the same input can give a different answer each time, and "good" is often a matter of degree. Teams that ship reliable AI products all do the same thing: they build **evals**, sets of test cases with a way to score the outputs. It's also the skill interviewers probe hardest, because it separates demos from products.

## Why "it looked fine when I tried it" isn't enough

You change the prompt to fix one complaint. Did it break three other cases? You switch to a cheaper model. Is it as good? Without an eval you're guessing, and guesses about language models are wrong surprisingly often. An eval turns "seems better" into "went from 82% to 91% on 200 cases, with two regressions."

## Building an eval set

1. **Collect real inputs.** Start with 30 to 100 examples from actual usage, or realistic ones you write. Cover the common cases *and* the awkward ones: vague questions, wrong language, rude users, questions the bot should refuse.
2. **Decide what good looks like** for each case: an exact expected answer, facts that must be in the reply, or a short rubric.
3. **Keep it growing.** Every bug report becomes a new test case, so it can't come back unnoticed.

## Ways to score

- **Exact or code checks:** best when possible. Did it return valid JSON? Pick the right category? Call the right tool? Stay under 100 words? Cheap, fast and reliable.
- **Model-graded ("LLM as judge"):** another model call scores each output against a rubric, such as "Does the answer mention the 30-day return window? Does it invent any policy?" This scales to open-ended answers. Make each rubric question specific and answerable with yes or no, and check the grader against a few dozen cases you've scored by hand before trusting it.
- **Human review:** slow but the final word. Use it to build and check the other two, and to sample production traffic regularly.

## A minimal eval in code

```typescript
type Case = { input: string; mustMention: string[]; mustNotMention: string[] };

const cases: Case[] = [
  {
    input: "Can I return shoes after 5 weeks?",
    mustMention: ["30 days"],
    mustNotMention: ["60 days"],
  },
  // ...dozens more
];

let passed = 0;
for (const c of cases) {
  const answer = (await askSupportBot(c.input)).toLowerCase();
  const ok =
    c.mustMention.every((s) => answer.includes(s.toLowerCase())) &&
    c.mustNotMention.every((s) => !answer.includes(s.toLowerCase()));
  if (ok) passed++;
  else console.log("FAIL:", c.input, "→", answer.slice(0, 120));
}
console.log(`${passed}/${cases.length} passed`);
```

Simple string checks like these catch a surprising amount. Add a model-graded check when the answers get too varied for strings.

## Using evals well

- **Run them on every change:** prompt, model, retrieval settings. Track the score over time like test coverage.
- **Read the failures**, not just the score. The patterns in failures tell you what to fix.
- **Run noisy cases more than once.** If a case passes 3 times out of 5, the score should show that.
- **Keep a held-out set** you don't tune against, so you don't fool yourself by fitting the prompt to the test.

<!-- quiz -->

## Why can't you rely on trying a few prompts by hand?

- Manual testing is not allowed
- [x] A change can fix one case and quietly break others you didn't try
- Models always give the same answer

Only a fixed set of cases, scored the same way every time, shows whether a change helped overall.

## Which scoring method should you prefer when it's possible?

- [x] Code checks, like valid JSON or the right category
- Asking a model to rate the answer from 1 to 10
- Reading every answer yourself

Deterministic checks are cheap, fast and don't drift. Use model grading for what code can't check.

## Before trusting an "LLM as judge" grader, what should you do?

- Use the biggest model as the grader
- [x] Compare its scores with a set of cases people scored by hand
- Ask it whether it's accurate

A grader is a model too, and it can be wrong. Check that it agrees with human judgment before relying on it.

<!-- practice -->

## Problem

Your bot sorts support emails into "billing," "shipping," "returns" or "other." Design a small eval: what cases would you include, and how would you score them?

## Solution

This one's easy to score with code, because the right answer is one of four labels.

**Cases:** 50 to 100 real emails labeled by hand, with a fair number of each category, plus tricky ones: an email about a refund for a late delivery (returns or shipping?), one with two questions, one in another language, an empty one, and spam.

**Scoring:** exact match on the label, reported overall *and per category*, so you notice if "returns" quietly gets worse. A confusion matrix (lesson 4) shows which categories get mixed up. For the ambiguous cases, agree on the right label as a team first, or the eval measures your disagreement instead of the bot.
