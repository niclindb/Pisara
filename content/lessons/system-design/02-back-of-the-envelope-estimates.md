---
category: Technology
topic: System design
title: Back-of-the-envelope estimates
level: Beginner
reading_minutes: 6
---

Before you decide whether you need a cache, five servers or five hundred, you need to know roughly how much work the system does. Not exactly: a good estimate is right to within a factor of ten, takes two minutes, and fits on the back of an envelope. This lesson shows the handful of numbers and shortcuts that make that possible.

## The one conversion to memorize

A day has 86,400 seconds. Round it to **100,000** (10^5). Now any "per day" number becomes "per second" by dropping five zeros:

- 1 million requests a day ≈ **10 per second**
- 100 million a day ≈ **1,000 per second**
- 1 billion a day ≈ **10,000 per second**

The rounding makes your answer about 15% low, which doesn't matter at this precision. What matters is that you can do it in your head.

Traffic is never flat. Users sleep, wake, and pile in at lunch. Multiply the average by **2 to 3** for the daily peak, and more for known spikes (a product launch, a sports final). Design for the peak.

## Latency numbers worth knowing

These are rough figures for modern hardware. The exact values shift every few years; the ratios between them are what you need.

| Operation | Roughly |
|---|---|
| Read from main memory | 100 nanoseconds |
| Read 1 MB sequentially from memory | 10 microseconds |
| Random read from an SSD | 100 microseconds |
| Round trip within one data center | 0.5 milliseconds |
| Read 1 MB sequentially from an SSD | 1 millisecond |
| Simple indexed database query (including network) | 1 to 5 milliseconds |
| Round trip from the US to Europe | 80 to 150 milliseconds |

Three lessons hide in this table:

- **Memory is about a thousand times faster than an SSD.** That's why caches exist.
- **Network hops inside a data center are cheap; across oceans they're not.** One cross-Atlantic round trip costs as much as hundreds of local ones. That's why CDNs and regional deployments exist.
- **A page that makes 50 sequential database calls at 2 ms each takes 100 ms before doing anything else.** Watch for chains of calls, not just slow ones.

## Sizes worth knowing

- A short text record (a user row, a tweet-sized post with metadata): **about 1 KB**
- A compressed photo from a phone: **1 to 3 MB**; a thumbnail: **20 to 200 KB**
- A minute of HD video: **tens of MB**
- 1,000 KB ≈ 1 MB, 1,000 MB ≈ 1 GB, 1,000 GB ≈ 1 TB, 1,000 TB ≈ 1 PB

## Worked example: a photo-sharing app

Say there are **10 million daily active users**. Each one opens the feed 20 times a day, and one user in ten posts a photo each day.

**Reads:** 10 million × 20 = 200 million feed loads a day. Drop five zeros: **2,000 per second** on average, about **5,000 at peak**.

**Writes:** 10 million × 0.1 = 1 million photos a day, or **about 10 per second**. Reads outnumber writes 200 to 1. This app is read-heavy, which already tells you caching and replicas will pay off and write scaling won't be the first problem.

**Photo storage:** 1 million photos × 2 MB = **2 TB a day**, or roughly **700 TB a year**. That's far too much for a database. Photos belong in object storage (like Amazon S3), with only their metadata in the database.

**Metadata storage:** 1 million rows × 1 KB = 1 GB a day, about **365 GB a year**. That fits comfortably on one database server for years.

**Bandwidth:** each feed load shows maybe 10 thumbnails at 200 KB. 200 million loads × 10 × 200 KB = 400 TB a day. Divide by 100,000 seconds: **4 GB per second**, or about 32 gigabits per second. No single server sends that. This is the number that tells you to serve images from a CDN.

In five lines of arithmetic, you've learned that this design needs object storage, a CDN, and read-scaling, and that it doesn't yet need a sharded database. That's what estimates are for.

## Tips

- **Say your assumptions out loud** and round aggressively: 86,400 becomes 100,000, 2.7 becomes 3.
- **Use powers of ten.** 3 × 10^6 × 2 × 10^3 = 6 × 10^9 is easier than juggling commas.
- **Sanity-check against known facts.** One modern server handles a few thousand simple web requests per second; one PostgreSQL server handles thousands of writes a second. If your design needs 400 servers for 2,000 requests a second, something's off.
- **Stop when the decision is clear.** If the answer is "far below one server" or "far above," more precision changes nothing.

<!-- quiz -->

## About how many requests per second is 50 million requests a day?

- 50
- [x] 500
- 5,000
- 50,000

A day is about 100,000 seconds, so drop five zeros: 50,000,000 / 100,000 = 500.

## Roughly how much faster is reading from memory than a random read from an SSD?

- About 2 times
- About 10 times
- [x] About 1,000 times

About 100 nanoseconds against about 100 microseconds. That gap is why caching in memory pays off so well.

## An app stores 1 million new 3 MB photos a day. What does that estimate tell you?

- The photos should go in the main database
- [x] The photos need object storage, since that's about 1 PB a year
- One server's disk will hold them for years

1 million × 3 MB is 3 TB a day, about 1 PB a year. Files at that scale go to object storage, with only metadata in the database.

<!-- practice -->

## Problem

A messaging app has 50 million daily active users. Each sends 40 messages a day, averaging 200 bytes of text plus 300 bytes of metadata. Messages are kept forever. Estimate: (a) messages per second at average and peak, (b) storage added per year, (c) whether one database server could take the write load.

## Solution

### (a) Messages per second

50 million × 40 = 2 billion messages a day. Divide by 100,000: **20,000 per second** on average. With a peak factor of about 3: **around 60,000 per second**.

### (b) Storage per year

Each message is about 500 bytes. 2 billion × 500 bytes = 1 TB a day. Over a year: **about 365 TB**, before replication. Most systems keep three copies, so plan for **over 1 PB of disk**.

### (c) One database?

No. A single relational database handles thousands of writes a second, not 60,000, and it can't hold 365 TB a year either. This workload needs data split across many machines (sharding, lesson 8) or a database built for it, such as Cassandra. The estimate makes that call in a minute, before any argument about technology.
