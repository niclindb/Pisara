---
category: Technology
topic: Artificial intelligence / AI for developers
title: Shipping AI to production
level: Advanced
reading_minutes: 6
---

A demo that works on your laptop is the easy part. Production means real users, real costs and things going wrong at 3am. Most of what makes AI features production-ready is ordinary engineering, applied to a component that's slow, costly and unpredictable.

## Speed

Model calls take seconds, not milliseconds. Users notice.

- **Stream** responses so the first words appear quickly. Time to first token matters more than total time.
- **Use the smallest model that passes your evals** for each step. A quick classification doesn't need the biggest model.
- **Do work in parallel** where steps don't depend on each other, and **in the background** where users don't need to wait, such as summarizing documents ahead of time.
- **Keep prompts lean.** Every input token adds a little time and cost.

## Cost

- **Log token usage per feature and per user** from day one. Surprises are usually one feature or one heavy user.
- **Cache:** store answers to repeated requests, and use your provider's prompt caching for long, repeated prefixes like a big system prompt or document.
- **Batch** work that isn't urgent. Providers offer batch APIs at a large discount for jobs that can wait hours.
- **Set limits:** per-user quotas and a maximum number of steps for agents, so one bug or abuser can't run up a huge bill.

## Reliability

- **Retries with backoff** for rate limits and temporary errors, and a **timeout** on every call.
- **A fallback:** a second model or provider, or a graceful non-AI path ("We couldn't generate a summary right now").
- **Validate outputs** before using them: schema checks on JSON, allowed values for categories, length limits.
- **Pin model versions** and treat a model change like a dependency upgrade: run evals first, then roll out gradually.

## Monitoring

You can't unit-test your way to confidence, so watch what happens:

- Log inputs, outputs, model, latency, tokens and errors for every call, with care for privacy (below).
- Track quality signals: thumbs up and down, how often users retry or edit the output, escalations to a human.
- **Sample real conversations every week** and add the bad ones to your eval set.

## Safety and security

- **Prompt injection:** any text from outside (user messages, web pages, emails, uploaded files) can contain instructions. Never let model output directly trigger risky actions, keep tools on least privilege, and check permissions in your own code.
- **Don't trust output in your UI:** render model text as text, not raw HTML, so it can't inject scripts.
- **Abuse:** rate-limit, and consider moderation for user-facing chat.

## Privacy

- Know what your provider does with your data: retention, whether it's used for training, and where it's processed. Business API terms usually differ from consumer chat apps.
- Send the minimum. Strip personal details the model doesn't need.
- Tell users when they're talking to AI, and follow the rules that apply to you, such as the GDPR and the EU AI Act in Europe.

<!-- quiz -->

## Why does streaming make an AI feature feel faster even if the total time is the same?

- It uses a faster model
- [x] Users see the first words almost immediately instead of waiting for the whole reply
- It skips the slow part of the answer

Time to first token shapes how fast it feels. Streaming shows progress right away.

## A model upgrade is available. What's the safe way to adopt it?

- Switch everything over as soon as it's released
- Never change models
- [x] Run your evals on it, then roll it out gradually while watching quality

New models can change behavior in ways that matter to your product. Treat it like any risky dependency upgrade.

## Why render model output as plain text instead of HTML?

- Plain text loads faster
- [x] So output can't inject scripts or markup into your page
- Models can't produce HTML

Model output is untrusted, especially when it reflects user input or retrieved content.

<!-- practice -->

## Problem

Your AI summary feature's bill doubled this month, but the number of users barely changed. List the first three things you'd check.

## Solution

1. **Token logs per feature and per user:** is it one feature, one customer, or one runaway script? A single heavy user or a retry loop is a common culprit.
2. **Prompt size:** did a change make every request bigger, such as more retrieved chunks, a longer system prompt, or a whole conversation history being resent?
3. **Model and retries:** did someone switch to a pricier model, or are failures being retried many times? Also check that caching still works, since a small change at the start of a prompt (like a timestamp) can stop prompt caching from matching.

Then add an alert on daily spend so next time you find out in a day, not a month.
