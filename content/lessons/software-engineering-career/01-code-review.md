---
category: Technology
topic: Software engineering career
title: Code review and giving feedback
level: Beginner
reading_minutes: 6
---

Code review has two jobs: catch problems before they reach users, and spread knowledge across the team. A good reviewer does both without slowing everyone down or making the author defensive. That takes a plan for what to look at, and care in how you say it.

## Review in order of cost

Look at the expensive things first. A naming nitpick is pointless if the whole approach has to change.

1. **Does it do the right thing?** Read the description or ticket, then ask if the change solves that problem. Check the edge cases: empty input, a missing user, two requests at once, a network call that fails.
2. **Is the design sound?** Is the code in the right place? Will the next person understand it? Does it add a dependency or a pattern the team will have to live with?
3. **Is it tested?** Would the tests fail if the code were broken? A test that only checks that a function runs proves very little.
4. **Is it safe?** User input reaching SQL or HTML, secrets in code, missing permission checks, personal data in logs.
5. **Is it readable?** Names, comments that explain *why*, dead code left behind.

Style and formatting belong to tools. If the team argues about commas in review, add a linter and a formatter and stop arguing.

## Word comments so they land

The author can't hear your tone, so the words carry all of it.

- **Ask about the code, not the person.** "This loop runs a query per user, which could be slow with 10,000 users. Could we fetch them in one query?" works better than "You made this slow."
- **Explain why.** "Use a `Map` here" teaches nothing. "A `Map` keeps insertion order and allows any key type, which we need for the IDs" teaches something.
- **Say how much it matters.** Label comments: *blocking* (must change before merge), *suggestion* (worth doing, your call), *nit* (tiny, ignore if you like). Without labels, every comment feels like a demand.
- **Offer a way forward.** A short code snippet or a link beats a vague "this could be cleaner."
- **Say what's good.** One honest "nice, this is much easier to follow" helps the author know what to keep doing.

## Keep it moving

A review that waits two days costs more than the bugs it catches. Aim to respond within a working day, even if only to say when you'll look properly. Big pull requests get worse reviews, because reviewers skim after a few hundred lines. If a PR is huge, it's fair to ask for it to be split.

When a thread goes back and forth more than twice, stop typing and talk for five minutes. Then write the decision in the PR so others can see it.

## Being reviewed

- **Review your own PR first.** Read the diff in the review tool before asking anyone. You'll catch leftover debug logs and half the obvious problems.
- **Write a description** that says what changed, why, and how you tested it. Point reviewers to the tricky part.
- **Keep it small.** One idea per pull request.
- **Assume good intent.** A comment is about the code. If you disagree, explain your reasoning; if the reviewer is right, say thanks and change it.

<!-- quiz -->

## What should a reviewer check first?

- Variable names and formatting
- [x] Whether the change solves the right problem correctly
- Whether comments end with a period

Check the expensive things first. Polishing names is wasted effort if the approach has to change.

## Which comment is most useful to the author?

- "This is wrong."
- "Use a Map."
- [x] "Suggestion: a Map keeps insertion order, which we need for the IDs here."

It says how much it matters, what to change, and why, so the author can decide and learn.

## A review thread has gone back and forth three times. What's the best next step?

- Approve it to end the discussion
- Keep replying until someone gives up
- [x] Talk it through briefly, then record the decision in the PR

A short conversation settles most disagreements faster than text, and writing down the outcome keeps everyone informed.

<!-- practice -->

## Problem

Rewrite these three review comments so they are clear and kind, and label each as blocking, suggestion or nit:

1. "Why would you do it like this?"
2. "Bad name."
3. "This will break."

## Solution

There are many good versions. For example:

1. **Suggestion:** "I see this builds the list by hand. Would `groupBy` from our utils work here? It's already tested and would save about 15 lines."
2. **Nit:** "`data` is a bit vague. Maybe `unpaidInvoices`, so readers know what's in it without scrolling up?"
3. **Blocking:** "If `user.address` is null (guest checkout), this line throws. Could we handle that case and add a test for it?"

Each one says how much it matters, points at something specific, and gives a reason or a next step.
