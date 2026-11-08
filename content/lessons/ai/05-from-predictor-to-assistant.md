---
category: Technology
topic: Artificial intelligence
title: From text predictor to helpful assistant
level: Intermediate
reading_minutes: 5
---

A model that only predicts the next token isn't an assistant yet. Ask it "How do I boil an egg?" and it might continue with three more questions, as if it were writing a quiz, because that's a perfectly likely continuation. Turning a predictor into a helpful assistant takes more training stages.

## Stage 1: Pretraining

This is the part from the last lesson. The model practices next-token prediction on a vast amount of text. It's by far the most expensive stage: it can take thousands of specialized chips running for weeks or months.

The result is called a **base model**. It knows a great deal about language and the world, but it has no idea it's supposed to answer you. It just continues text.

## Stage 2: Fine-tuning on examples

Next, the model trains further on a much smaller set of carefully written conversations: a question, then a good answer. People write many of these by hand.

From these, the model picks up the *format* of being an assistant: when it sees a question, the likely continuation is a clear, helpful answer. This is called **fine-tuning**, or **instruction tuning**.

## Stage 3: Learning from feedback

Writing perfect example answers for everything is impossible. It's much easier for a person to compare two answers and say which is better.

So the model writes several answers to the same prompt, and people (or another model following written guidelines) rank them. Training then nudges the model toward the kinds of answers that rank well. A common name for this is **reinforcement learning from human feedback**, or **RLHF**.

This stage shapes much of a chatbot's personality: being helpful and polite, saying when it's unsure, and declining harmful requests. Developers often write down the values and rules they want, and use them to guide the feedback.

## What this means for you

- The knowledge mostly comes from pretraining. The *behavior* mostly comes from the later stages.
- A chatbot can sound confident and friendly because it was rewarded for answers people liked, which isn't the same as being rewarded for answers that were checked to be true.
- Different companies make different choices in these stages, which is why chatbots built on similar technology can feel quite different to talk to.

<!-- quiz -->

## What does pretraining give a model?

- A friendly personality
- [x] Broad knowledge of language and the world
- The ability to refuse harmful requests

Pretraining on huge amounts of text gives the model its knowledge. The later stages shape how it behaves.

## Why do developers ask people to compare two answers instead of writing the perfect one?

- It's required by law
- [x] It's much easier to judge which answer is better than to write the best one
- Comparing answers makes the model smaller

Ranking is quick and scales well, so it can cover far more situations than hand-written examples.

## A base model is asked "How do I boil an egg?" and replies with more questions. Why?

- It's broken
- It doesn't know about eggs
- [x] It only continues text and hasn't learned to act as an assistant

A base model just predicts likely continuations. Fine-tuning and feedback teach it to answer.

<!-- practice -->

## Problem

You're giving feedback to help train an assistant. For the prompt "Is it safe to eat raw cookie dough?", which reply would you rank higher, and why?

A: "Yes! Cookie dough is delicious, enjoy."

B: "It's best not to. Raw flour and raw eggs can carry bacteria that cause food poisoning. Many shops sell dough made with heat-treated flour and no eggs, which is meant to be eaten raw."

## Solution

**B** should rank higher. It's accurate, explains why, and offers a useful alternative. A sounds friendly but is wrong and could make someone ill.

Feedback like this, repeated across many thousands of prompts, is how an assistant learns to put accuracy and usefulness ahead of just sounding pleasant. It's also a reminder that the people giving feedback need to know the facts, or the model can learn to sound right instead of being right.
