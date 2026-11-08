---
category: Technology
topic: Artificial intelligence
title: Neural networks without the math
level: Beginner
reading_minutes: 5
---

Most of today's AI, from face recognition to chatbots, runs on **neural networks**. The name comes from the brain, but the idea is much simpler than a brain.

## One tiny decision-maker

Start with a single unit, sometimes called a **neuron**. It takes in a few numbers, gives each one a **weight** (how much it matters), adds them up, and passes on a result.

Say it's deciding whether you'll enjoy a film. Inputs: is it a comedy, is it short, is your friend in it. If you love comedies, "comedy" gets a big weight. If you don't care about length, "short" gets a weight near zero. The weighted total is the unit's verdict.

A single unit can only learn simple rules like that one.

## Stacking them in layers

A neural network connects thousands or billions of these units in **layers**:

- The **input layer** takes in the raw data, such as the brightness of every pixel in a photo.
- **Hidden layers** in the middle each combine the layer before them.
- The **output layer** gives the answer, such as "dog: 92%."

Something interesting happens in the middle. In an image model, early layers tend to respond to edges and spots of color. Later layers combine those into shapes like eyes or wheels, and later still into whole objects. Nobody designs this. It emerges from training.

Networks with many layers are called **deep**, which is where the term **deep learning** comes from.

## Learning means adjusting weights

The weights are the network's knowledge. Training (from the last lesson) is the process of finding good values for them:

1. The network makes a guess.
2. A formula measures how wrong it was.
3. A method called **backpropagation** works out which way to nudge each weight to make the error a little smaller.
4. Every weight gets its small nudge. Then the next example.

Large chatbots have hundreds of billions of weights, which is why training them takes huge amounts of computing power and electricity.

## Why it's hard to explain what a network "knows"

The knowledge is spread across all those weights, not written down anywhere as rules. You can't open a network and read "dogs have floppy ears." Researchers are working on ways to look inside, a field called **interpretability**, but for now these systems are largely black boxes, even to the people who build them.

<!-- quiz -->

## What is a weight in a neural network?

- [x] A number saying how much one input matters
- The total size of the network
- The answer the network gives

Each connection has a weight. Training adjusts the weights, and together they hold everything the network has learned.

## What makes a network "deep"?

- It was trained for a long time
- [x] It has many layers between input and output
- It understands what it's doing

"Deep" just means many layers. Deeper networks can build up more complex patterns, layer by layer.

## Why can't you simply read the rules a trained network learned?

- The company keeps them secret
- The network forgets them after training
- [x] Its knowledge is spread across millions of weights, not written as rules

There's no list of rules inside, just numbers. That's why understanding what a network has learned is an active research area.

<!-- practice -->

## Problem

A single unit decides whether to bring an umbrella. Its inputs are "rain forecast" (1 for yes, 0 for no) with weight 3, and "cloudy" (1 or 0) with weight 1. It says "bring it" when the total is 2 or more. What does it decide on a cloudy day with no rain forecast? And on a clear day with rain forecast?

## Solution

- Cloudy, no rain forecast: 0 × 3 + 1 × 1 = **1**. That's under 2, so it says **leave it**.
- Clear, rain forecast: 1 × 3 + 0 × 1 = **3**. That's 2 or more, so it says **bring it**.

The bigger weight on the forecast means it matters more to the decision. Training a network is a search for weights like these, across millions of units at once.
