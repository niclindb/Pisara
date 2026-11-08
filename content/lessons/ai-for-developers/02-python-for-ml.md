---
category: Technology
topic: Artificial intelligence / AI for developers
title: Python for machine learning
level: Beginner
reading_minutes: 6
---

Almost all ML code is written in Python. Python itself isn't fast, but the libraries everyone uses are written in fast languages underneath, and Python makes them pleasant to drive. If you already code in another language, you can be productive in a week.

## NumPy: fast arrays

**NumPy** gives you the **array**: a grid of numbers that you work on all at once instead of looping.

```python
import numpy as np

prices = np.array([12.0, 8.5, 30.0, 4.25])
with_tax = prices * 1.2          # every element at once
print(with_tax.mean())           # 16.425
print(prices[prices > 10])       # [12. 30.]
```

That style is called **vectorized** code. Writing `prices * 1.2` instead of a `for` loop isn't just shorter: it runs in optimized machine code, often hundreds of times faster. ML is mostly arithmetic on big arrays, so this habit matters.

Arrays can have more dimensions. A batch of 32 color photos, 224 by 224 pixels, is an array with **shape** `(32, 224, 224, 3)`. Checking shapes is the most common debugging step in ML code.

## pandas: tables

**pandas** handles tabular data, like a spreadsheet you control with code. The main object is a **DataFrame**.

```python
import pandas as pd

df = pd.read_csv("orders.csv")
df.head()                                   # first rows
df["total"].describe()                      # count, mean, min, max...
df[df["country"] == "FI"]                   # filter rows
df.groupby("country")["total"].sum()        # totals per country
```

Real data is messy, and a large share of ML work is cleaning it: missing values, duplicates, wrong types. pandas is where that happens.

## Notebooks

ML work is exploratory: load data, look, try something, look again. **Jupyter notebooks** suit this. You run code in cells, and charts and tables appear right under each cell. Most tutorials and Kaggle examples come as notebooks. For anything you'll ship, move the code into normal files with tests.

## The rest of the toolbox

- **Matplotlib** (and friends) for charts. Always plot your data before modeling it.
- **scikit-learn** for classic machine learning (lesson 4).
- **PyTorch** for deep learning (lesson 5).
- A virtual environment manager such as **venv** or **uv**, so each project gets its own library versions.

## Coming from JavaScript or TypeScript?

The biggest adjustments are indentation as syntax, no braces, and thinking in whole arrays instead of loops. Type hints exist in Python (`def total(xs: list[float]) -> float:`) and are worth using in anything that lives longer than a notebook.

<!-- quiz -->

## Why is `prices * 1.2` on a NumPy array better than a Python `for` loop?

- [x] It runs in optimized code underneath, often far faster
- It uses less memory in every case
- Python doesn't have loops

Vectorized operations hand the work to fast compiled code, which matters when arrays hold millions of numbers.

## What would you use to load a CSV file and total sales per country?

- NumPy
- [x] pandas
- Matplotlib

pandas DataFrames are built for tables: reading files, filtering rows and grouping.

## An array has shape `(32, 224, 224, 3)`. What does 32 most likely mean?

- 32 pixels wide
- 32 colors
- [x] 32 images in the batch

Image batches are usually shaped (batch size, height, width, color channels).

<!-- practice -->

## Problem

Given `temps = np.array([18.5, 21.0, 25.5, 19.0, 30.0])`, write one line each to: convert every value to Fahrenheit (F = C × 9/5 + 32), find the average Celsius temperature, and get only the days above 20 °C.

## Solution

```python
fahrenheit = temps * 9 / 5 + 32     # [65.3 69.8 77.9 66.2 86. ]
average = temps.mean()              # 22.8
warm = temps[temps > 20]            # [21.  25.5 30. ]
```

No loops needed. `temps > 20` makes an array of True/False values, and using it as an index keeps only the True positions. This is called **boolean masking**.
