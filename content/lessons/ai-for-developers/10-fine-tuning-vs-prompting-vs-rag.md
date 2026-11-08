---
category: Technology
topic: Artificial intelligence / AI for developers
title: Prompting, RAG or fine-tuning?
level: Advanced
reading_minutes: 6
---

There are three main ways to make a model do what your product needs: change what you **tell** it (prompting), change what it **sees** (RAG), or change the **model itself** (fine-tuning). Picking the right one, and in the right order, is a design decision teams get wrong in both directions.

## Prompting

Instructions, examples and context in the request.

- **Best for:** behavior, tone, format and task rules.
- **Cost to change:** minutes. Edit the text, rerun your evals.
- **Limits:** the context window, and the cost of a long prompt on every request (which prompt caching softens).

Start here. Today's models follow detailed instructions well, and a carefully written prompt with a few examples gets most products most of the way.

## RAG

Retrieve the relevant knowledge for each request (lesson 8).

- **Best for:** facts the model doesn't know: your documents, data that changes, anything private.
- **Cost to change:** update the documents, and answers change the same day.
- **Limits:** quality depends on retrieval, and it adds moving parts.

## Fine-tuning

Train an existing model further on your own examples, so the behavior is baked into its weights.

- **Best for:** a narrow, repeated task where you need consistent output at high volume, a specialized style or format, or getting a **smaller, cheaper model** to match a bigger one on your one task.
- **Cost to change:** you need hundreds to thousands of good examples, a training run, and new evals. Any change means doing it again.
- **Limits:** it's poor at teaching *facts*. A fine-tuned model may pick up your product names but still get details wrong, and it can't know about anything new. That's RAG's job.

## LoRA: fine-tuning without retraining everything

Updating all of a large model's billions of weights is expensive. **LoRA** (low-rank adaptation) freezes the original weights and trains small extra matrices alongside them, often well under 1% of the size. It's much cheaper, fits on smaller GPUs, and you can keep several adapters for different tasks on one base model. Many fine-tuning services and open-source tools use it, often on open-weight models from the Hugging Face hub.

## A simple order of decisions

1. **Prompt well** and build an eval.
2. If the model lacks **knowledge**, add **RAG**.
3. If it has the knowledge but still can't do the **task** reliably, or you need it **cheaper and faster at scale**, consider **fine-tuning**, and compare against your eval.

They also combine: a fine-tuned small model can answer from retrieved documents, with a short prompt.

## Distillation

A common reason to fine-tune: use a big, capable model to produce high-quality answers for thousands of your inputs, check them, then fine-tune a small model on those pairs. The small model learns to do that one task nearly as well, for a fraction of the cost per request. This is called **distillation**. Check your provider's terms before training on its outputs.

<!-- quiz -->

## Your bot needs to know this week's updated price list. What's the best approach?

- Fine-tune the model every week
- [x] RAG: retrieve the current prices for each question
- Write all prices in the system prompt by hand

Fine-tuning is poor at facts and slow to update. Retrieval picks up changes as soon as the data changes.

## What does LoRA do?

- Trains a new model from scratch
- [x] Freezes the base model and trains small extra matrices
- Compresses a model's training data

LoRA adapts a model cheaply by training a small number of added weights instead of all of them.

## When is fine-tuning most likely to pay off?

- When the model is missing knowledge about your documents
- When you're still figuring out the task
- [x] When a narrow task runs at high volume and a cheaper model must handle it consistently

Fine-tuning shines for well-defined, repeated tasks, often to make a small model good enough to replace a big one.

<!-- practice -->

## Problem

For each case, pick prompting, RAG, fine-tuning, or a combination:

1. A legal team wants answers about their 4,000 internal contracts.
2. A startup's bot must always reply in their quirky brand voice.
3. A company classifies 5 million product reviews a day, and the big model is too expensive.

## Solution

1. **RAG.** The knowledge is large, private and changes as contracts are added. Retrieve the relevant clauses, and require citations so lawyers can check them.
2. **Prompting first:** describe the voice and include a few example replies in the system prompt. Fine-tune only if evals show the voice still slips.
3. **Fine-tuning (distillation):** label a sample with the big model, check the labels, and fine-tune a small model on them. Run both on your eval to confirm the small one is good enough before switching.
