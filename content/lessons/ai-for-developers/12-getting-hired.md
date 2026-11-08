---
category: Technology
topic: Artificial intelligence / AI for developers
title: Getting hired in AI
level: Intermediate
reading_minutes: 6
---

Courses and certificates are everywhere, so they don't set you apart. What does: **proof you've built something real and measured it.** This lesson turns the path into a plan.

## Pick a lane

From lesson 1: if you're a working web or backend developer, **AI engineer** is the shortest route. You already have most of the skills, and you add the AI-specific ones. **ML engineer** takes longer: plan on months of Python, ML fundamentals and PyTorch before you're competitive. Many people start with AI engineering and move deeper over time.

## Build three projects, not ten

Hiring managers would rather see three solid projects than ten tutorials. Good ones:

1. **A RAG app over real documents** (a product manual, a law, your city's council minutes), with citations, an "I don't know" path, and an eval showing retrieval and answer quality.
2. **A tool-using assistant** that does something useful with an API, with guardrails: step limits, input validation, approval for risky actions.
3. **Something with your own data and a model you trained or fine-tuned:** a scikit-learn model on a public dataset, or a small fine-tuned model compared against prompting a large one.

Your existing work counts too. Adding an AI feature to a product with real users, like Pisara, is stronger than any tutorial project.

## Write it up

For each project, a short README or blog post covering:

- the problem and who it's for,
- how it works (a diagram helps),
- **how you measured it**, and the numbers,
- what failed, what you changed, and what you'd do next,
- what it costs to run.

The measuring and the honest trade-offs are what make reviewers take it seriously.

## What interviews look like

- **Coding:** regular software engineering questions, often in Python.
- **System design with AI:** "Design a support bot for 1 million users." Expect to discuss retrieval, model choice, evals, latency, cost, failure modes and safety, which is everything in this path.
- **Debugging and judgment:** "Answers got worse after a change. What do you do?" (Check the eval, look at failures, check retrieval first.)
- **For ML roles:** ML fundamentals (overfitting, metrics, bias), and sometimes implementing a small model or training loop.
- **Your projects:** be ready to go deep on why you made each decision.

## Stay current, carefully

The field moves fast, but the fundamentals in this path change slowly. Follow a few good sources, such as provider documentation and engineering blogs, and try new models on your own evals instead of trusting announcements.

## Your first month

- **Week 1:** Python and NumPy refresh. Call a model API from code and log the token usage.
- **Week 2:** build the RAG project's first version with pgvector or a hosted vector store.
- **Week 3:** write 50 eval cases for it, measure, improve, and measure again.
- **Week 4:** write it up, publish the code, and start the next project.

<!-- quiz -->

## What sets a candidate apart most in AI hiring?

- Many online certificates
- [x] Real projects with measured results and honest write-ups
- Knowing the newest model names

Projects with evals and clear trade-offs show you can do the job, which certificates can't.

## For a working web developer, which AI role is usually the fastest route?

- Research scientist
- [x] AI engineer
- Data scientist

AI engineering builds on software engineering skills you already have, plus AI-specific ones you can learn in weeks to months.

## In an AI system design interview, what should you expect to discuss?

- Only which model is best
- [x] Retrieval, evals, cost, latency, failure modes and safety
- How to train a model from scratch

AI system design is about the whole system around the model, not just the model.

<!-- practice -->

## Problem

Write a one-paragraph plan for your first AI portfolio project: what it does, what data it uses, and how you'll measure whether it works.

## Solution

There's no single right answer. Here's an example of the shape to aim for:

> **Ask the Manual:** a chatbot that answers questions about my dishwasher's 80-page manual. I'll split the PDF into chunks by section, embed them into Postgres with pgvector, and answer with citations to the page. To measure it, I'll write 40 real questions with the correct page and answer, then track how often the right section is retrieved in the top 5 and how often the final answer is correct, before and after each change.

A strong plan names a real problem, real data and a concrete measure. If yours has those three, it's a good start.
