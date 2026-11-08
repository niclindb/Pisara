---
category: Technology
topic: Artificial intelligence
title: How machines learn from examples
level: Beginner
reading_minutes: 5
---

Imagine teaching a child what a dog is. You don't give a definition. You point at dogs, and now and then at cats, and say which is which. Machine learning works a lot like that.

## The ingredients

- **Data:** lots of examples, such as 100,000 photos.
- **Labels:** the right answer for each example, such as "dog" or "cat." People often add these by hand.
- **A model:** a program with many adjustable settings. At first the settings are random, so its guesses are random too.

## Training: guess, check, adjust

Training repeats one simple loop, millions of times:

1. Show the model an example: a photo.
2. The model makes a guess: "cat, 70% sure."
3. Compare the guess with the label: it was a dog.
4. Nudge the model's settings slightly, so that next time it leans a bit more toward the right answer.

No single nudge does much. But after millions of them, the settings end up capturing what separates dogs from cats: ear shapes, snouts, fur patterns. Nobody wrote those rules down. The model found them in the data.

## The real test: examples it hasn't seen

A model that just memorized its training photos would be useless on your new photo. So before training starts, people set aside some labeled examples that the model never sees during training: the **test set**. Scoring the finished model on those shows how well it **generalizes**, meaning how well it handles new examples.

Memorizing instead of learning is called **overfitting**. It's like a student who memorizes last year's exam answers and then fails a new exam on the same material.

## Garbage in, garbage out

A model can only learn what its data shows it. If every dog photo was taken outdoors and every cat photo indoors, the model might learn "grass means dog" instead of anything about dogs. Gaps and slants in the data become gaps and slants in the model. This is one source of **bias** in AI: a hiring model trained on past decisions can copy the unfairness in those decisions.

## Not every model needs labels

Labeling is slow and costly, so some methods learn without it. A chatbot, for example, learns by reading huge amounts of text and practicing predicting the next word. The text supplies its own answers. You'll see how that works in lesson 4.

<!-- quiz -->

## During training, what happens after the model makes a wrong guess?

- A programmer rewrites its rules by hand
- The example is thrown away
- [x] Its settings are nudged a little toward the right answer

Training is a loop of guess, check, and small adjustments. Millions of small nudges add up to a useful model.

## Why do people keep a test set the model never sees during training?

- To make training faster
- [x] To check whether it handles new examples, not just ones it memorized
- To give the model extra practice at the end

Scoring on unseen examples shows whether the model has learned general patterns or just memorized its training data.

## A model learned "grass means dog" because most dog photos were taken outdoors. What went wrong?

- [x] The training data had a misleading pattern
- The model had too many settings
- The model wasn't shown any cat photos

Models pick up whatever patterns separate the labels, including accidental ones. Better, more varied data fixes it.

<!-- practice -->

## Problem

You want to train a model that spots ripe bananas from photos taken at your local shop. What data and labels would you collect, and what's one way the data could accidentally mislead the model?

## Solution

You'd collect many photos of bananas at every stage (green, yellow, spotty, brown) and label each one "ripe" or "not ripe." Set some aside as a test set.

One way it could go wrong: if all the ripe bananas were photographed in the morning light and the green ones in the evening, the model might learn the lighting instead of the banana. Mixing up the times, angles, and backgrounds across both labels avoids that.
