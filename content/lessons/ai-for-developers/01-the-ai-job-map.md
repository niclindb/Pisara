---
category: Technology
topic: Artificial intelligence / AI for developers
title: The AI job map
level: Beginner
reading_minutes: 5
---

"AI job" covers very different work. Before you decide what to learn, it helps to know which job you're aiming at, because each one needs a different mix of skills.

## AI engineer

**What they do:** build products and features on top of existing models, usually large language models from providers like Anthropic, OpenAI or Google, or open models run in-house. A support bot that answers from a company's help pages, a tool that turns meeting notes into tickets, a coding assistant inside an app.

**Day to day:** writing prompts and the code around them, connecting models to company data and tools, building tests (called **evals**) that show whether answers are good, and keeping cost and speed under control.

**Background:** mostly software engineering. Strong web or backend developers move into this role fastest, because most of the work is good engineering around a model, not training one.

## ML engineer

**What they do:** train, fine-tune and deploy models. A fraud detector for a bank, a recommendation system for a shop, a smaller model fine-tuned to do one task cheaply.

**Day to day:** preparing data, running training jobs on GPUs, measuring models, and putting them into production where they run reliably at scale.

**Background:** Python, the core ideas of machine learning, a deep learning framework (almost always PyTorch), and production skills like cloud, containers and monitoring.

## Data scientist

**What they do:** answer business questions with data. Some of that is machine learning, much of it is statistics, experiments and clear charts.

**Background:** statistics, SQL, Python and good communication. Machine learning is one tool among several.

## Research scientist

**What they do:** invent new methods and push what models can do. They work at AI labs and large tech companies.

**Background:** usually a PhD or a strong publication record, and deep math. It's the hardest door to walk through without that background.

## Where the roles meet

The lines blur. Many teams call the same job by different names, and an AI engineer who learns fine-tuning starts to overlap with an ML engineer. Two things show up in every role:

- **Python**, the common language of the field.
- **Measuring results.** Every AI system is uncertain. The people who get hired can show *how good* their system is, with numbers, not just that it works on one example.

This path starts with those shared foundations, then follows the AI engineer route, with the ML engineer's core skills along the way.

<!-- quiz -->

## Which role mostly builds product features on top of existing models?

- Research scientist
- [x] AI engineer
- Data scientist

AI engineers connect existing models to data, tools and users. They rarely train models from scratch.

## What do ML engineers do that AI engineers usually don't?

- Write any code at all
- [x] Train and fine-tune models themselves
- Talk to users

ML engineers prepare data and run training. AI engineers mostly use models that someone else trained.

## Which skill matters in every AI role?

- A PhD
- Knowing every model's release date
- [x] Measuring how well a system works

AI systems are uncertain, so showing results with numbers, not one good example, is what every team looks for.

<!-- practice -->

## Problem

Read three AI job ads (search "AI engineer" and "ML engineer" on any job site). For each, list the top five skills it asks for and decide which role on this page it really is, whatever its title says.

## Solution

You'll probably notice:

- **AI engineer** ads mention LLM APIs, prompting, RAG, agents, evals, TypeScript or Python, and shipping product features.
- **ML engineer** ads mention PyTorch, training pipelines, GPUs, model serving, MLOps and data pipelines.
- Titles don't always match. A "Machine learning engineer" ad that's all about LLM APIs and RAG is really an AI engineer job.

Keep your list. Comparing it with your own skills shows you what to learn first.
