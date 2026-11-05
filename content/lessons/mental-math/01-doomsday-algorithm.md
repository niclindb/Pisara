---
category: Math
topic: Mental math
title: "The Doomsday algorithm: any date's weekday in your head"
level: Beginner
reading_minutes: 5
---

What day of the week was July 20, 1969? With one short trick, invented by the mathematician John Conway, you can answer in under a minute without a calendar.

## The big idea

In any year, a set of easy-to-remember dates all fall on the **same weekday**. Conway called that weekday the year's **doomsday**. Find the doomsday, jump to the nearest easy date, and count from there.

## The easy dates

| Month | Doomsday | How to remember |
|---|---|---|
| April, June, August, October, December | 4/4, 6/6, 8/8, 10/10, 12/12 | Doubles |
| May and September | 5/9 and 9/5 | "I work 9 to 5 at the 7-Eleven" |
| July and November | 7/11 and 11/7 | Same rhyme |
| March | 3/14 | Pi Day |
| February | Last day of February (28th, or 29th in a leap year) | |
| January | 3rd (4th in a leap year) | "3 years out of 4 it's the 3rd" |

## Weekdays as numbers

Count Sunday as 0: **Sun 0, Mon 1, Tue 2, Wed 3, Thu 4, Fri 5, Sat 6**. Adding 7 to a day lands on the same day, so you can always drop 7s.

## Step 1: the century's anchor

| Years | Anchor day |
|---|---|
| 1700s | Sunday |
| 1800s | Friday |
| 1900s | Wednesday |
| 2000s | Tuesday |

The pattern repeats every 400 years, so the 2100s are Sunday again.

## Step 2: the year's doomsday

Take the last two digits of the year (call it *yy*) and add up three numbers:

1. **a** = how many 12s fit in *yy*
2. **b** = what's left over
3. **c** = how many 4s fit in **b**

Add **a + b + c** to the anchor day, dropping 7s as you go.

**Example: 2026.** 26 ÷ 12 = 2, remainder 2. 2 ÷ 4 = 0. So 2 + 2 + 0 = 4. Tuesday + 4 = **Saturday**. Every easy date in 2026 (4/4, 6/6, 7/11, and the rest) is a Saturday.

## Step 3: count to your date

Pick the easy date in the same month and count the gap, dropping 7s.

**Example: November 5, 2026.** The doomsday is Saturday, so 11/7 is a Saturday. The 5th is two days earlier, so it's a **Thursday**.

## Back to the Moon

**July 20, 1969.** The 1900s anchor is Wednesday. 69 ÷ 12 = 5, remainder 9, and 9 ÷ 4 = 2. So 5 + 9 + 2 = 16, which drops to 2. Wednesday + 2 = Friday, so 7/11 was a Friday. The 20th is 9 days later, which drops to 2: Friday + 2 = **Sunday**.

## One thing to watch

Leap years only change January and February. A year is a leap year if it divides by 4, except century years, which must divide by 400. So 2000 was a leap year and 1900 was not.

<!-- quiz -->

## Which of these dates is always a doomsday?

- 6/7
- 7/6
- [x] 6/6
- 1/1

The even doubles (4/4, 6/6, 8/8, 10/10, 12/12) always share the year's doomsday.

## In a leap year, which January date is the doomsday?

- Jan 3
- [x] Jan 4
- Jan 10
- Jan 31

It's the 3rd in normal years and the 4th in leap years, because the extra day comes later in February.

## The doomsday in 2026 is Saturday. What day is Christmas, December 25, 2026?

- Thursday
- [x] Friday
- Saturday
- Sunday

12/12 is a Saturday. The 25th is 13 days later, and 13 drops to 6. Saturday + 6 = Friday.

<!-- practice -->

## Problem

What day of the week was January 1, 2000?

## Solution

The 2000s anchor is Tuesday, and *yy* is 0, so the doomsday is Tuesday. 2000 divides by 400, so it's a leap year and the January doomsday is the 4th. January 1 is 3 days before a Tuesday: **Saturday**.

## Problem

On what weekday did the Titanic sink, on April 15, 1912?

## Solution

The 1900s anchor is Wednesday. 12 ÷ 12 = 1, remainder 0, and 0 ÷ 4 = 0, so add 1: the doomsday is Thursday. 4/4 was a Thursday. The 15th is 11 days later, which drops to 4. Thursday + 4 = **Monday**.

## Problem

Pi Day lands on March 14. What day of the week is March 15, 2041?

## Solution

The 2000s anchor is Tuesday. 41 ÷ 12 = 3, remainder 5, and 5 ÷ 4 = 1. So 3 + 5 + 1 = 9, which drops to 2. Tuesday + 2 = Thursday, so 3/14 is a Thursday and 3/15 is a **Friday**.

## Problem

What day of the week was July 4, 1776?

## Solution

The 1700s anchor is Sunday. 76 ÷ 12 = 6, remainder 4, and 4 ÷ 4 = 1. So 6 + 4 + 1 = 11, which drops to 4. Sunday + 4 = Thursday, so 7/11 was a Thursday. July 4 is exactly 7 days earlier, so it was also a **Thursday**.
