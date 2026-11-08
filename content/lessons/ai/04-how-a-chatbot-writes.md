---
category: Technology
topic: Artificial intelligence
title: How a chatbot writes, one word at a time
level: Beginner
reading_minutes: 5
---

When a chatbot answers you, it isn't looking up a stored reply. It's building the answer one small piece at a time, by guessing what comes next.

## Text becomes tokens

A chatbot reads and writes **tokens**: chunks of text that are often a whole word, sometimes part of a word, a space, or a punctuation mark. "Unbelievable!" might be split into "un," "believ," "able," and "!" In English, a token averages roughly three quarters of a word.

Each token is turned into a list of numbers, because neural networks only work with numbers.

## The core skill: predict the next token

Underneath, the model behind a chatbot, called a **large language model** or **LLM**, does one thing. Given some text, it predicts which token is likely to come next.

Give it "The capital of France is" and it rates every possible next token. " Paris" gets a very high score. " a" gets a lower one. " banana" gets almost nothing.

## Writing a whole answer

To write a full reply, it repeats that step in a loop:

1. Read everything so far: your message plus whatever it has written.
2. Score every possible next token.
3. Pick one.
4. Add it to the end, and go back to step 1.

That's why replies appear word by word on the screen. The model really is producing them in order, and it can't go back and change a word it has already written.

## A little randomness

If it always took the single top-scoring token, its writing would be flat and repetitive. So it usually **samples**: it picks among the likely tokens, weighted by their scores. A setting often called **temperature** controls how adventurous it is. Low temperature sticks to the safest choices. High temperature takes more chances.

That's why asking the same question twice can give two different answers.

## Where the knowledge comes from

To predict the next token well across every kind of text, the model has to pick up a lot: grammar, facts, styles, even some reasoning patterns. It learns them by practicing on an enormous amount of text, often a large slice of the public internet plus books and code. Each sentence is its own practice question: hide the next token, guess it, check, adjust.

But notice what it's trained to do: produce text that *fits*, not text that's *checked*. Keep that in mind for lesson 6.

<!-- quiz -->

## What does a large language model fundamentally do?

- Searches the web for each answer
- [x] Predicts the next token, over and over
- Looks up replies in a database of answers

At its core, it scores possible next tokens, picks one, adds it, and repeats.

## Why can the same question get different answers?

- [x] The model samples among likely next tokens, with some randomness
- The model changes its training every time
- Someone at the company edits each reply

Sampling with some randomness keeps the writing varied, so each run can take a different path.

## What is a token?

- A password used to log in
- [x] A chunk of text, such as a word or part of a word
- A whole sentence

Models read and write in tokens. Common words are often one token, and longer or rarer words get split into pieces.

<!-- practice -->

## Problem

Play language model. For the text "Every morning I drink a cup of", list three likely next words and one very unlikely one. Then explain why a model might still pick something other than the top choice.

## Solution

Likely: "coffee," "tea," "hot." Very unlikely: "gravel."

A model usually samples among the likely options instead of always taking the top one, so it might write "tea" even if "coffee" scored highest. At a higher temperature it would be more willing to pick less common options, which can make writing more varied, and occasionally odder.
