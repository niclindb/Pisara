---
category: Technology
topic: Artificial intelligence / AI for developers
title: Your first model with scikit-learn
level: Beginner
reading_minutes: 6
---

**scikit-learn** is the standard library for classic machine learning: models that work on tables of numbers, like predicting churn, prices or fraud. Not every problem needs a neural network, and in interviews you're expected to know this toolkit.

## The whole workflow in a dozen lines

This trains a model to tell whether a tumor is malignant or benign, using a small dataset that ships with scikit-learn:

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

X, y = load_breast_cancer(return_X_y=True)   # 569 rows, 30 measurements each

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)                  # learn from the training rows

predictions = model.predict(X_test)          # guess the held-out rows
print(accuracy_score(y_test, predictions))   # about 0.95
print(classification_report(y_test, predictions))
```

Every scikit-learn model follows the same pattern: create it, `fit` it on training data, `predict` on new data. Swapping in a different model is one line.

- **X** is the input: one row per example, one column per **feature** (measurement).
- **y** is the label you want to predict.
- `train_test_split` holds back 20% as a test set. `stratify=y` keeps the same share of each label in both parts.

## Accuracy isn't enough

Suppose 1 in 100 card payments is fraud. A model that always says "not fraud" is 99% accurate and completely useless. So you look at more than accuracy:

- **Precision:** of the payments the model flagged, how many were really fraud? Low precision means annoying false alarms.
- **Recall:** of all the real fraud, how much did the model catch? Low recall means fraud slips through.

There's usually a trade-off between the two, and which matters more depends on the problem. Missing a tumor is worse than an extra check, so a medical model favors recall. A spam filter that hides real email is worse than letting some spam through, so it favors precision.

A **confusion matrix** lays out all four counts: true positives, false positives, true negatives and false negatives. `classification_report` prints precision and recall for each class.

## Start simple

Good practice is to begin with a **baseline**: the simplest thing that could work, even "always predict the most common label." Then try a simple model like logistic regression, then something stronger like a random forest or gradient boosting. Each step has to beat the last one on the test set to earn its complexity.

For tables of data, tree-based models (random forests, gradient boosting with libraries like XGBoost or LightGBM) are still often the best choice, even today.

<!-- quiz -->

## What does `model.fit(X_train, y_train)` do?

- Tests the model on new data
- [x] Trains the model on the training examples and their labels
- Splits the data into training and test sets

`fit` learns from the training data. `predict` then uses what it learned on new rows.

## 1% of payments are fraud. A model that always says "not fraud" has what accuracy?

- 1%
- 50%
- [x] 99%

It's right on every honest payment, so 99% accurate, while catching zero fraud. That's why precision and recall matter.

## For a model that screens for a serious disease, which matters most?

- Precision
- [x] Recall
- Training speed

Missing a real case (low recall) is worse than an extra follow-up test (lower precision), so screening favors recall.

<!-- practice -->

## Problem

A fraud model flags 50 payments. 40 of them are really fraud. There were 80 fraudulent payments in total. What are its precision and recall?

## Solution

- **Precision** = true fraud among flagged ÷ all flagged = 40 ÷ 50 = **80%**.
- **Recall** = fraud caught ÷ all fraud = 40 ÷ 80 = **50%**.

So when it raises an alarm it's usually right, but it misses half the fraud. To catch more, you could lower the threshold for flagging, which will raise recall and likely lower precision.

## Problem

In the code above, change the model to `LogisticRegression(max_iter=5000)` from `sklearn.linear_model`. What else in the code has to change?

## Solution

Only the import and the line that creates the model:

```python
from sklearn.linear_model import LogisticRegression

model = LogisticRegression(max_iter=5000)
```

`fit`, `predict` and the metrics stay exactly the same. That shared interface is the main reason scikit-learn is so pleasant for trying several models quickly.
