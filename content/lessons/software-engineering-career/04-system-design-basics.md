---
category: Technology
topic: Software engineering career
title: System design basics
level: Intermediate
reading_minutes: 7
---

System design is choosing the parts of a system and how they connect. There's rarely a right answer, only trade-offs: every part you add makes something better and something else harder. Good engineers can name both sides. This lesson covers three parts you'll meet in almost every system: caches, databases and queues.

## Start from the requirements

Before drawing boxes, ask:

- **How many users, and how many requests per second?** 100 users and 10 million users need different designs.
- **More reads or more writes?** A news site is read-heavy. A sensor network is write-heavy.
- **How fresh must data be?** Can a profile page be 30 seconds out of date? Can a bank balance?
- **What happens if it's down for a minute?** Annoying, or lost money?

Most systems never need the big-company design. Start simple, and add parts when a number tells you to.

## Caching

A **cache** keeps a copy of data somewhere faster than where it came from: in memory, in Redis, or at a CDN close to the user.

**You gain:** speed and less load on the database. Reading from memory takes well under a millisecond; a database query might take 10 to 100.

**You pay:** the copy can be **stale**. When the real data changes, the cache still holds the old version until it expires or you remove it. Deciding when to clear cached data is famously hard.

Common patterns:

- **Cache-aside:** the app checks the cache first; on a miss, it reads the database and stores the result with an expiry time (a **TTL**, time to live).
- **Short TTLs** for data that changes often, long ones for data that rarely does.
- **Don't cache** what must be exact, like stock counts at checkout, unless you check again before committing.

## Choosing a database

**Relational databases** (PostgreSQL, MySQL) store data in tables with a fixed structure, enforce relationships, and support **transactions**: several changes that all happen or none do. They're the right default for most apps.

**Document stores** (MongoDB, DynamoDB) store flexible records, often as JSON, and spread across many machines more easily. They suit data that's read and written as a whole, at very large scale, but joins and multi-record transactions get harder.

Some trade-offs to name in any design:

- **Indexes** make reads fast and writes a little slower. Add them for the queries you actually run.
- **Read replicas** are copies of the database that take read traffic. They scale reads, but a replica can lag a moment behind, so a user might not see their own change right away.
- **Sharding** splits data across machines by a key, such as user ID. It scales writes, but queries across shards get complicated. Put it off as long as you can.

## Queues

A **queue** lets one part of a system hand work to another without waiting for it. The web server puts a job on the queue ("send welcome email," "resize this photo") and responds to the user right away. Separate **workers** take jobs off the queue and do them.

**You gain:** fast responses, and resilience to spikes. If 10,000 photos arrive at once, they wait in line instead of crashing the server. If the email service is down, jobs wait and retry.

**You pay:** the work happens *later*, so the user may not see the result instantly. Jobs can fail and be retried, so the same job might run twice. Design jobs to be **idempotent**: running one twice has the same effect as running it once. Check "already sent?" before sending.

## Putting it together

A typical read-heavy web app: users hit a load balancer, which spreads traffic across several identical app servers. The servers read through a cache in front of a PostgreSQL database with a read replica, and push slow work onto a queue for workers. Each part is there because a requirement asked for it.

<!-- quiz -->

## What's the main cost of adding a cache?

- It makes every read slower
- [x] Users might see stale data
- It deletes data from the database

A cache is a copy, and copies can fall behind the real data until they expire or are cleared.

## Why put "send welcome email" on a queue instead of sending it during sign-up?

- Emails must be sent at night
- [x] The user gets a fast response, and the email can retry if the mail service is down
- Queues make emails arrive sooner

A queue moves slow or unreliable work out of the request, at the cost of it happening a little later.

## What does it mean for a job to be idempotent?

- It runs very fast
- It never fails
- [x] Running it twice has the same effect as running it once

Queues can deliver a job more than once, so idempotent jobs keep a retry from charging a card twice.

<!-- practice -->

## Problem

You're designing a URL shortener: users submit a long URL and get a short link. Visitors who open the short link are redirected. Expect about 1,000 new links a day and 1 million redirects a day. Sketch a design and name one trade-off for each part you add.

## Solution

One reasonable design:

- **Requirements first:** it's heavily read (1,000 redirects for every new link). Redirects must be fast. A new link can take a second to work everywhere.
- **Database:** one PostgreSQL table with `short_code` (unique, indexed) and `long_url`. A few hundred thousand rows a year is small. *Trade-off:* the unique index slows writes slightly, which doesn't matter at 1,000 a day.
- **Cache:** keep popular codes in Redis with a long TTL, since links rarely change. Most redirects never touch the database. *Trade-off:* if a link is edited or deleted, remove it from the cache too, or visitors keep getting the old target.
- **Queue:** record click counts by putting a "clicked" event on a queue, so the redirect doesn't wait for analytics. *Trade-off:* counts appear a little late, and retries could double-count unless each event has an ID.
- **What to skip:** sharding and multiple regions. Nothing in these numbers asks for them yet.
