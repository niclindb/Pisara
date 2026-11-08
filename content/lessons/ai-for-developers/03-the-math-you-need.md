---
category: Technology
topic: Artificial intelligence / AI for developers
title: The math you actually need
level: Beginner
reading_minutes: 6
---

You don't need a math degree to build with AI, and libraries do the heavy lifting. But four ideas come up constantly, and knowing them turns ML from magic into something you can reason about and debug.

## 1. Vectors: lists of numbers that mean something

A **vector** is just a list of numbers, like `[0.2, -1.3, 0.8]`. In ML, almost everything becomes a vector: a house as `[bedrooms, size, age]`, a word or a sentence as hundreds of numbers called an **embedding**.

Once things are vectors, you can measure how close they are. Two sentences with similar meanings get embeddings that point in similar directions. That's the basis of semantic search and RAG (lesson 8).

## 2. The dot product: how much two vectors agree

Multiply matching positions and add them up:

`[1, 2, 3] · [4, 0, -1] = 1×4 + 2×0 + 3×(−1) = 1`

That's the weighted sum from the neural network lesson: inputs times weights, added up. A big positive dot product means the vectors point the same way. **Cosine similarity**, the usual way to compare embeddings, is the dot product after scaling both vectors to length 1, so it runs from −1 (opposite) to 1 (same direction).

## 3. Matrices: many dot products at once

A **matrix** is a grid of numbers. Multiplying a vector by a matrix does a whole batch of dot products in one go, one per row. A layer of a neural network is essentially a matrix multiply followed by a simple function. GPUs are good at AI because they're very good at multiplying big matrices.

You'll mostly meet this as **shape errors**: a matrix of shape (3, 4) can multiply a vector of length 4, but not one of length 3. The inner sizes must match.

## 4. Gradients: which way is downhill

Training needs a way to adjust millions of weights to reduce the error, or **loss**. The **gradient** says, for every weight, which direction makes the loss go up, and how steeply. Step each weight the *opposite* way, a little, and the loss goes down. That's **gradient descent**.

Picture standing on a hillside in fog. You can't see the valley, but you can feel the slope under your feet. Take a small step downhill, feel again, repeat. The size of each step is the **learning rate**: too big and you overshoot the valley, too small and training takes forever.

You never compute gradients by hand. PyTorch does it automatically. You just need to know what it's doing.

## A little probability

Models usually output probabilities: "spam: 0.93." Two ideas help:

- **Probabilities sum to 1** across the options. A model choosing among cat, dog and bird might say 0.7, 0.2, 0.1. The function that turns raw scores into probabilities like this is called **softmax**.
- **A probability isn't a promise.** A model can be 93% confident and wrong. How well its confidence matches reality is called **calibration**.

## Want to go deeper?

For intuition, watch a visual series on linear algebra and neural networks (3Blue1Brown's are a favorite). For practice, reimplement a dot product, cosine similarity and one step of gradient descent in NumPy. That's enough math to start.

<!-- quiz -->

## What is the dot product of [2, 1] and [3, 4]?

- 7
- [x] 10
- 24
- [6, 4]

2×3 + 1×4 = 6 + 4 = 10. Multiply matching positions, then add.

## In gradient descent, which way does each weight move?

- In the direction of the gradient
- [x] Opposite the gradient, so the loss goes down
- In a random direction

The gradient points uphill, toward higher loss. Training steps the other way.

## What happens if the learning rate is far too large?

- Training becomes perfectly accurate
- [x] Steps overshoot, and the loss can jump around instead of falling
- Nothing changes

Huge steps leap past the low point. Too small, and training crawls. Picking the learning rate is a real part of the job.

<!-- practice -->

## Problem

Compute the cosine similarity of `a = [3, 4]` and `b = [6, 8]`, and of `a = [3, 4]` and `c = [4, −3]`. What does each result tell you?

## Solution

Cosine similarity = (a · b) ÷ (length of a × length of b).

- **a and b:** a · b = 18 + 32 = 50. Length of a = 5, length of b = 10. 50 ÷ 50 = **1**. They point in exactly the same direction (b is just a scaled up).
- **a and c:** a · c = 12 − 12 = 0. So the similarity is **0**. They're at right angles: unrelated.

With embeddings, scores near 1 mean "very similar meaning," and scores near 0 mean "unrelated."
