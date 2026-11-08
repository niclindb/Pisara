---
category: Technology
topic: Artificial intelligence
title: "Attention: the idea behind transformers"
level: Advanced
reading_minutes: 6
---

Almost every major chatbot runs on a design called the **transformer**, introduced by Google researchers in a 2017 paper titled "Attention Is All You Need." Its key idea, **attention**, is why language models suddenly got so much better.

## The problem: meaning depends on context

Take the word "bank":

- "She sat on the river *bank*."
- "He deposited money at the *bank*."

Same token, different meaning. To understand it, a model has to look at the other words. And the clue can be far away: "The trophy didn't fit in the suitcase because **it** was too big." What does "it" mean? The trophy. Change "big" to "small," and "it" becomes the suitcase.

Earlier models read text one word at a time, passing a summary forward as they went, a bit like hearing a long sentence and only remembering a fading impression of the start. Distant clues got lost, and reading in strict order was slow to train.

## The idea: let every token look at every other token

In a transformer, each token gets to ask: *which other tokens in this text matter for understanding me?*

Roughly, for every token the model computes three things:

- a **query**: what it's looking for ("I'm 'it', I need the noun I refer to"),
- a **key**: what it offers to others ("I'm 'trophy', a noun, a thing that can be big"),
- a **value**: the information it passes on if chosen.

Each token compares its query with every other token's key. Good matches get a high **attention score**. The token then takes in a blend of the others' values, weighted by those scores. So "it" pulls in a lot from "trophy" and very little from "the."

## Many heads, many layers

A transformer runs many attention calculations side by side, called **attention heads**. Different heads tend to pick up different relationships: one may link pronouns to nouns, another may track which verb goes with which subject. Then the whole thing is stacked in dozens of layers, each refining the meaning built by the layer before.

Nobody assigns these jobs. Like the features in lesson 3, they emerge from training on next-token prediction.

## Why it changed everything

- **Long-range understanding:** any token can look directly at any other, however far apart.
- **Speed:** all tokens can be processed at once instead of one by one, which suits modern chips. That made it practical to train far bigger models on far more text.
- **It keeps improving with scale:** researchers found that bigger transformers, trained on more data with more computing power, kept getting better in fairly predictable ways. That finding drove the race to build ever larger models.

## The cost: the context window

Every token comparing itself with every other one gets expensive as text grows: double the text, and you roughly quadruple the comparisons. So each model has a **context window**, a limit on how many tokens it can consider at once. Text beyond the window is simply not seen. Windows have grown from a few thousand tokens to hundreds of thousands or more, but the limit is still why very long conversations can lose track of early details.

<!-- quiz -->

## What problem does attention mainly solve?

- Making models use less electricity
- [x] Letting each word use clues from anywhere in the text to work out its meaning
- Storing facts in a database

Attention lets every token look at every other token, so distant context can shape meaning.

## In "The trophy didn't fit in the suitcase because it was too big," what should "it" pay the most attention to?

- [x] trophy
- suitcase
- fit
- because

The trophy was too big to fit. A good attention head links "it" to "trophy" here, and to "suitcase" if the sentence ends "too small."

## Why does a model have a context window limit?

- [x] Comparing every token with every other gets much more expensive as text grows
- The company wants to save storage
- Models can only read one paragraph at a time

The work grows roughly with the square of the text length, so there's a practical cap on how much text a model can attend to at once.

<!-- practice -->

## Problem

In the sentence "The chef who trained in Paris cooked the dinner herself," which earlier word does "herself" need to attend to most, and which nearby word could mislead a model that only looks at close neighbors?

## Solution

"Herself" refers to **the chef**, at the start of the sentence.

A model that only looked at nearby words would mostly see "dinner" and "cooked," and "Paris" sits in between. With attention, "herself" can compare its query directly with every earlier token's key and find that "chef" is the person who matches, however many words sit between them.

## Problem

A conversation with a chatbot has grown to 300,000 tokens, and the model's context window is 200,000 tokens. What happens to the earliest part of the conversation, and what could you do about it?

## Solution

Whatever falls outside the window isn't seen at all. Depending on how the app handles it, the oldest messages get dropped or replaced by a shorter summary, so the model may forget details from the start.

To keep important details in play, start a new conversation with a short summary of what matters, or paste the key information again near your current question.
