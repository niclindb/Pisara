---
category: Technology
topic: Artificial intelligence
title: Getting good answers from a chatbot
level: Intermediate
reading_minutes: 5
---

The same chatbot can give you a vague, generic reply or a sharp, useful one. The difference is usually in what you ask. Writing a good request is often called **prompting**, and it's mostly common sense applied carefully.

## Why context matters so much

A chatbot knows nothing about you except what's in the conversation. It predicts the most fitting reply to *your words*. A short, vague prompt fits a generic answer. A specific prompt fits a specific answer.

Compare:

> Write an email about the meeting.

> Write a short, friendly email to my team of five moving Thursday's 2pm planning meeting to Friday at 10am, because the client call ran over. Ask them to reply if Friday doesn't work.

The second one leaves far less to guess.

## Five habits that help

**1. Say who it's for and why.** "Explain inflation to a 12-year-old" gets a very different answer from "explain inflation for an economics exam."

**2. Give it the material.** Paste in the document, data, or email thread you're asking about. It's more accurate working from your text than from memory.

**3. Show an example.** If you want a certain style or format, include a sample: "Write three more product descriptions like this one: …" Models are very good at following a pattern.

**4. Ask for the format you want.** A table, a checklist, three options, under 100 words. Say so.

**5. For hard problems, ask it to work step by step.** Since the model writes one token at a time, writing out the steps gives it room to work through the problem before the final answer. Many newer models do this on their own, often called **reasoning** or "thinking" before they reply.

## Treat it as a conversation

Your first prompt rarely gets the perfect result, and that's fine. Follow up:

- "Make it shorter and less formal."
- "The second idea is closest. Give me three variations of it."
- "What did you assume about my situation? Ask me what you need to know."

That last one is especially useful. Asking the chatbot to ask *you* questions often surfaces details you didn't think to mention.

## Keep your judgment switched on

Good prompting gets better answers, not guaranteed-true ones. Everything from the last lesson still applies: check facts that matter, and don't paste in private information you wouldn't want stored by the company running the service.

<!-- quiz -->

## Why does a vague prompt tend to get a generic answer?

- The chatbot is being lazy
- [x] With little to go on, the most fitting reply is a generic one
- Short prompts are processed by a smaller model

The model only knows what's in the conversation. More specific context makes a more specific answer the best fit.

## You want five quiz questions in the same style as one you wrote. What's the best approach?

- Describe the style in one word
- [x] Include your question as an example and ask for five more like it
- Ask for quiz questions and hope they match

Showing an example is one of the most reliable ways to get a particular style or format.

## Why can asking a chatbot to work step by step help on hard problems?

- It makes the model use a bigger computer
- [x] Writing out the steps gives it room to work through the problem before answering
- It switches the model into a calculator

The model writes one token at a time, so laying out the intermediate steps helps it reach a better final answer.

<!-- practice -->

## Problem

Improve this prompt: "Plan a trip."

## Solution

One good version:

> Plan a 3-day trip to Lisbon for two adults in late April. We like food, walking, and history, and don't want to rent a car. Our budget is about €150 a day each, not counting flights. Give me a day-by-day plan in a short list for each day, with one restaurant suggestion per evening. Ask me anything you need to know first.

It adds the where, when, who, interests, limits, budget, and format, and it invites the chatbot to ask questions. Your version will differ, but if it answers those same questions, it'll get a much more useful plan. Do check opening hours and prices yourself, since those change and the model may be out of date.
