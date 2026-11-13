---
category: Technology
topic: Software engineering career
title: Estimating and scoping work
level: Intermediate
reading_minutes: 6
---

"How long will this take?" is one of the hardest questions in software, and everyone gets it wrong sometimes. The goal isn't a perfect number. It's an estimate people can plan around, with the risks said out loud, and a scope you can change when reality shows up.

## Why estimates go wrong

- **Unknowns.** You don't know what you'll find in the old code until you open it.
- **Forgotten work.** Tests, code review, deploys, migrations, docs, and answering questions about it afterwards.
- **Optimism.** People estimate the time for things to go right, not the time things usually take.
- **Interruptions.** Nobody gets eight focused hours a day. Five is good.

## Break it down

Big tasks hide work. Split the job into pieces of a day or less, each one something you can describe concretely: "add the `due_date` column and migration," not "backend stuff." If you can't break a piece down, that's the risky part, and it's worth a short **spike**: a time-boxed experiment (say, half a day) to find out how hard it really is.

Then add the work people forget. A useful check list: tests, review rounds, deploy, monitoring, docs, and one round of fixes after real users touch it.

## Give a range, and say what it depends on

A single number sounds precise and is usually wrong. A range tells people both your best guess and how unsure you are.

> "Two to four days. Two if the payments API does what its docs say, four if we have to work around it. I'll know by Wednesday."

That sentence gives a range, names the biggest risk, and promises a date when the estimate will get better. It's far more useful than "three days."

Use your own history. If your last five "two day" tasks took three to four days, your estimates run about 1.5 to 2 times short. Multiply until your history says otherwise.

## Scope is the lever

Time, quality and scope are linked. When a deadline is fixed, cutting scope is usually the only honest option: pushing harder or skipping tests just moves the cost later.

- **Find the smallest useful version.** What must exist for a user to get value? Export to CSV first, PDF later.
- **Sort the list into must, should and could.** Build the musts first so that whatever happens, something useful ships.
- **Cut early, out loud.** "We can ship search by the 15th if we leave out filters for now" is a plan. Missing the date silently is a surprise.

## When you're running late

Say so as soon as you know, not on the due date. Bring options with the news: a smaller scope, a later date, or help on a specific piece. People forgive a late task much more easily than a late warning.

<!-- quiz -->

## Why is a range better than a single number?

- Ranges are always longer, so you're never late
- [x] It shows your best guess and how unsure you are
- Managers prefer vague answers

A range with the main risk named lets people plan for both the likely and the slower outcome.

## A task has a big unknown you can't break down. What should you do?

- Pick a large number to be safe
- Start building and hope it's fine
- [x] Run a short, time-boxed spike to learn how hard it is

A spike turns an unknown into something you can estimate, for a small, fixed cost.

## The deadline is fixed and the work won't fit. What's usually the best move?

- Skip the tests to save time
- [x] Cut scope early and agree on the smallest useful version
- Work late and say nothing

Cutting scope keeps quality and the date. Skipping tests or staying silent only moves the problem later.

<!-- practice -->

## Problem

Your manager asks how long it will take to add "forgot password" to a web app. Break it into pieces and give an estimate the way this lesson suggests.

## Solution

One reasonable breakdown:

- Form to request a reset link (half a day)
- Create a single-use token that expires, and store it (half a day)
- Send the email, using the existing mail setup (half a day, more if there isn't one)
- Page to set a new password, with validation (half a day)
- Tests, including expired and reused tokens (half a day)
- Review, deploy and one round of fixes (half a day)

That's about three days of focused work. Said out loud:

> "Three to five days. Three if our email sending already works in production, five if we have to set it up. I'll know which by tomorrow afternoon."

The pieces show you thought about the whole job, the range shows your confidence, and the named risk tells your manager what could change it.
