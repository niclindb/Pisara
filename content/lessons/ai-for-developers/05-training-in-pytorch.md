---
category: Technology
topic: Artificial intelligence / AI for developers
title: Training a network in PyTorch
level: Intermediate
reading_minutes: 6
---

**PyTorch** is the framework most of the AI world uses to build and train neural networks, from student projects to the largest language models. Its core is small: tensors, automatic gradients, and a training loop you write yourself.

## Tensors

A **tensor** is PyTorch's array, like a NumPy array with two extra powers: it can live on a **GPU**, and it can track the math done to it so gradients can be computed automatically.

```python
import torch

t = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
print(t.shape)        # torch.Size([2, 2])
t = t.to("cuda")      # move to a GPU, if you have one
```

## A complete training loop

This teaches a small network to fit a noisy straight line. Every PyTorch training script, however big, has this same skeleton:

```python
import torch
from torch import nn

torch.manual_seed(0)
x = torch.linspace(-1, 1, 100).unsqueeze(1)        # 100 inputs, shape (100, 1)
y = 3 * x + 0.5 + 0.1 * torch.randn_like(x)        # targets: a noisy line

model = nn.Sequential(nn.Linear(1, 16), nn.ReLU(), nn.Linear(16, 1))
loss_fn = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

for step in range(500):
    prediction = model(x)              # 1. forward pass: make guesses
    loss = loss_fn(prediction, y)      # 2. measure how wrong they are
    optimizer.zero_grad()              # 3. clear old gradients
    loss.backward()                    # 4. compute new gradients
    optimizer.step()                   # 5. nudge every weight downhill
    if step % 100 == 0:
        print(step, round(loss.item(), 4))
```

The loss starts around 3 and falls close to 0.01, the level of the noise we added. The network has learned the line.

## What each piece does

- **`nn.Linear(1, 16)`** is a layer: a matrix multiply plus a bias. Here, 1 input to 16 hidden units.
- **`nn.ReLU()`** is an **activation function**. It keeps positive values and zeroes out negative ones. Without activations between layers, stacking layers would collapse into one big linear function and couldn't learn curves.
- **`MSELoss`** (mean squared error) measures the average squared gap between prediction and target. For classification you'd use `CrossEntropyLoss` instead.
- **`Adam`** is an **optimizer**: a smarter version of plain gradient descent that adapts the step size for each weight.
- **`loss.backward()`** is where PyTorch's **autograd** works out every gradient, however deep the network.

## Real training adds a few things

- **Batches:** real datasets don't fit in memory at once, so a `DataLoader` feeds the model small batches, and one full pass over the data is an **epoch**.
- **A validation set**, checked every epoch, to spot overfitting: training loss keeps falling while validation loss starts rising.
- **GPUs:** move the model and each batch to the GPU with `.to("cuda")`. Training big models is mostly a fight for GPU memory and time.
- **Pretrained models:** in practice you rarely train from scratch. You start from a model someone already trained, often from the **Hugging Face** hub, and fine-tune it on your data (lesson 10).

<!-- quiz -->

## In the training loop, what does `loss.backward()` do?

- Moves the model to the GPU
- [x] Computes the gradient of the loss for every weight
- Updates the weights

`backward()` computes gradients. `optimizer.step()` is what actually changes the weights.

## Why does a network need activation functions like ReLU between layers?

- To make training faster on GPUs
- [x] Without them, stacked layers act like a single linear function and can't learn curves
- To stop the weights from changing

Linear layers stacked directly on each other can be collapsed into one. Activations add the bends that let networks learn complex patterns.

## Training loss keeps falling but validation loss starts rising. What's happening?

- [x] The model is overfitting
- The learning rate is too small
- The model needs more layers

It's memorizing the training data and getting worse on new examples. Stop earlier, add data, or simplify the model.

<!-- practice -->

## Problem

Someone's training loop prints a loss that never goes down. Looking at their code, the loop has `prediction = model(x)`, `loss = loss_fn(prediction, y)` and `loss.backward()`, but nothing else. What's missing?

## Solution

Two lines:

```python
optimizer.zero_grad()   # before backward()
optimizer.step()        # after backward()
```

Without `optimizer.step()`, the gradients are computed but the weights never change, so the loss stays flat. Without `zero_grad()`, gradients from every step pile up on top of each other, which makes the updates wrong once `step()` is added.
