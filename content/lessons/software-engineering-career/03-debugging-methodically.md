---
category: Technology
topic: Software engineering career
title: Debugging methodically
level: Beginner
reading_minutes: 6
---

Most debugging time is lost to guessing: changing something that looks suspicious, running it, and changing something else. A method is faster, especially for the bugs that matter most, the ones that make no sense at first.

## 1. Reproduce it

You can't fix what you can't see. Find the exact steps, input and environment that make the bug happen. Write them down. If it only happens sometimes, note what differs between good and bad runs: the user, the time, the data, the browser, the server.

The best reproduction is a **failing test**. It proves the bug exists, and once it passes, it proves you fixed it and keeps the bug from coming back.

## 2. Read what the system already told you

Before touching code, read the full error message and stack trace, top to bottom. Find the first line that's in *your* code. Check the logs around the same time. A surprising number of bugs are explained right there, by a message people skimmed.

## 3. Narrow it down

Bugs live somewhere specific. Your job is to shrink the area where they can hide.

- **Split the path in half.** Data goes from form to API to database to page. Check it at the middle. If it's already wrong at the API, the database and page are innocent.
- **Use history.** If it worked last week, something changed. `git bisect` checks out commits halfway between a good and a bad one until it finds the exact commit that broke it. With 1,000 commits in between, that takes about 10 steps.
- **Make the input smaller.** If a 5,000-row file crashes the import, try half the rows, then half again, until you find the one row that does it.

## 4. Form a guess, then test it

Say your theory in one sentence: "The date is parsed in UTC, so users east of London see yesterday." Then think of a check that would prove it *wrong*, and run it. Change **one thing at a time**. If you change three things and the bug goes away, you don't know which one fixed it, or whether the others broke something else.

## 5. Fix the cause, not the symptom

Wrapping the crash in a `try` block hides the bug. Ask why the bad value got there in the first place. Then look for the same mistake elsewhere: if one page parses dates wrong, others might too.

## Habits that help

- **Keep notes** while you debug: what you tried and what you saw. It stops you repeating checks, and it's ready to paste into the ticket.
- **Explain it out loud.** Describing the problem step by step to a colleague, or to a rubber duck on your desk, often reveals the wrong assumption halfway through.
- **Question what you "know."** "The config is definitely loaded" is exactly the kind of belief to check.
- **Take a break** after an hour without progress. Fresh eyes find things.
- **Ask for help with context:** what you expected, what happened, how to reproduce it, and what you've ruled out.

<!-- quiz -->

## What's the most useful first step with a new bug?

- Change the code that looks suspicious
- [x] Reproduce it reliably, ideally with a failing test
- Restart the server

A reliable reproduction lets you check every theory, and a failing test proves the fix.

## The bug appeared sometime in the last 500 commits. What finds the cause fastest?

- Reading all 500 commits
- [x] git bisect, which halves the range at each step
- Reverting the newest commit and hoping

Halving 500 commits takes about 9 steps, much faster than reading each one.

## Why change only one thing at a time?

- Tools only allow one change
- [x] So you know which change fixed or broke something
- It's a style rule

With several changes at once, you can't tell cause from coincidence.

<!-- practice -->

## Problem

Users report that some order totals on the receipt page are off by one cent. The order database has the correct totals. Describe how you would track this down.

## Solution

One methodical approach:

1. **Reproduce:** find an affected order and open its receipt. Note the database total and the shown total. Write a test that renders that receipt and expects the correct amount.
2. **Narrow down:** the database is right and the page is wrong, so check the middle. Log the value the API returns for that order. If the API is right, the bug is in the page; if not, it's in the API.
3. **Guess and test:** "Prices are added on the page as floating point numbers, which can't store most decimals exactly. A total of 1.005 is really 1.00499999..., so it rounds down to 1.00 instead of up to 1.01." Check it: sum the line items for the bad order in a console and see if you get the same wrong total.
4. **Fix the cause:** store and add money as whole cents (integers), and format to dollars only when displaying. Make the test pass.
5. **Look for siblings:** search for other places that add prices with floats, such as invoices and emails.
