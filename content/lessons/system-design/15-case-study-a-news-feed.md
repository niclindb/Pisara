---
category: Technology
topic: System design
title: "Case study: a news feed"
level: Advanced
reading_minutes: 9
---

A home feed, the scrolling list of posts from people you follow, looks like one database query: "posts by people I follow, newest first." At small scale, it is. At the scale of a large social network, that query becomes impossible to run on every page load, and the design turns into a careful choice of when to do the work: when a post is written, or when a feed is read. This case study works through that choice and the problems that follow it.

## 1. Requirements

**Functional:**

- Users create posts (text, plus optional photos).
- Users follow other users.
- Users see a home feed of posts from people they follow, newest first, paginated as they scroll.
- Later: rank the feed by relevance instead of time.

**Non-functional:**

- **Fast reads:** the first page of the feed in under 200 ms at p99.
- **Read-heavy:** far more feed loads than posts.
- **Freshness:** a new post should appear in followers' feeds within a few seconds. A minute late occasionally is acceptable.
- **Highly available:** a stale feed is better than an error. Lean toward availability over consistency (lesson 9).

## 2. Estimates

- **100 million** daily active users, each loading the feed 10 times a day: 1 billion loads a day, about **10,000 per second**, **30,000** at peak.
- **10 million** posts a day: about **100 per second**.
- Average user has **200 followers**, but the distribution is extremely skewed: most have dozens, a few have tens of millions.
- Post metadata at 1 KB: 10 GB a day, about **3.6 TB a year**. Photos go to object storage and a CDN (lesson 4), so they're not part of this design's database load.

The key ratio: 100 writes per second against 10,000 reads per second. Reads must be cheap.

## 3. The simple design, and where it breaks

Store `posts` (id, author_id, text, created_at) and `follows` (follower_id, followee_id). To build a feed:

```sql
select p.* from posts p
join follows f on f.followee_id = p.author_id
where f.follower_id = $me
order by p.created_at desc
limit 20;
```

This is **fan-out on read** (the "pull" model): gather followees' posts when the feed is requested. It's simple, always fresh, and writing a post is a single insert.

At 30,000 feed loads a second, each merging recent posts from hundreds of followees spread across many database shards, it falls over. Every load is a scatter-gather query, and the work is repeated for every reload even when nothing changed.

## 4. Fan-out on write

Flip it around: do the work when a post is created. Keep a **precomputed feed** for every user: a list of post IDs, newest first, stored in Redis (or a wide-column store). When someone posts:

1. Save the post.
2. Put a "fan out post 123" job on a queue (lesson 10).
3. Fan-out workers look up the author's followers and **prepend** the post ID to each follower's feed list, trimming each list to, say, the latest 800 IDs.

Reading a feed is now one fast lookup: fetch the first 20 IDs from my list. That's the "push" model.

**What it costs:** write amplification. 100 posts a second × 200 followers = **20,000 feed inserts per second**, which is fine for a sharded Redis cluster. And the storage for 100 million users × 800 IDs × 8 bytes is about **640 GB**, spread across the cluster.

## 5. The celebrity problem

Push breaks for one kind of user. An account with **50 million followers** posts, and that's 50 million feed inserts for one post. The fan-out takes many minutes, so followers see the post late and in a different order, and the queue backs up behind it, delaying everyone else's posts too.

The standard answer is a **hybrid**:

- **Normal accounts** (say, under 100,000 followers) are pushed into followers' feeds as above.
- **Celebrity accounts** are not fanned out. Their posts are fetched at read time: when I load my feed, the service reads my precomputed list, plus the recent posts of the handful of celebrities I follow (from a cache, since everyone requests the same celebrity posts), and merges them by time.

Each read does a little more work, but only for the few high-follower accounts each user follows, and those posts are among the most cached objects in the system.

## 6. Not wasting work on inactive users

Many registered users haven't opened the app in months. Pushing posts into their feeds wastes most of the fan-out. Only fan out to followers active in the last 30 days or so. When a dormant user returns, **rebuild** their feed once with a pull query, slower that one time, then switch them back to push.

## 7. Reading the feed: hydration and pagination

The feed list holds post IDs, not posts. To render a page, the feed service **hydrates** them: batch-fetches the 20 posts, their authors and their like counts from caches, falling back to the databases on misses. Storing IDs rather than copies means:

- **Edits** show up immediately, since the post is fetched fresh.
- **Deleted posts** are skipped at hydration time; no need to remove them from millions of lists right away.
- **Unfollows and blocks** are filtered at read time, then cleaned up from the list in the background.

For pagination, use a **cursor**: the last post ID or timestamp seen. "Give me 20 posts older than post 8,812,345" is stable even as new posts are prepended; page numbers would shift and show duplicates.

Like and comment counts are eventually consistent counters (lesson 9). A count a few seconds stale harms no one.

## 8. Ranking

Moving from newest-first to "most relevant first" changes the read path into two steps:

1. **Candidate generation:** gather a few hundred recent candidates, which is exactly what the precomputed feed plus celebrity posts already provide.
2. **Ranking:** a model scores each candidate using features like how often I interact with the author, the post's early engagement, its age, and its type. The top results are returned.

Ranking adds latency, so precompute features, cache the ranked first page for a minute or two, and fall back to time order if the ranking service is slow, which is graceful degradation from lesson 11.

## 9. Failure modes

- **Fan-out lag:** monitor queue depth and age of the oldest job. If lag grows, add workers, and fall back to pull for affected users.
- **Redis feed loss:** the feed lists are a cache of data that can be recomputed from posts and follows. A lost shard means slower rebuilds for those users, not lost data.
- **Thundering reads on a viral post:** hydrated posts are cached, with request coalescing, so a single post fetched by millions hits the database once per expiry.

## Summary

Hybrid fan-out: push post IDs into per-user feed lists in a sharded Redis cluster for ordinary authors, pull and merge celebrity posts at read time, skip inactive users, hydrate IDs into posts from caches, paginate with cursors, and rank candidates as a separate step with time order as the fallback. The central trade-off is where to spend work, at write time or read time, and the answer is "it depends on the author."

<!-- quiz -->

## What's the main cost of fan-out on write?

- Feeds load slowly
- [x] Each post becomes many writes, one per follower, which is extreme for accounts with millions of followers
- Posts can't be edited

Push makes reads cheap by doing the work at write time. For huge accounts, that work becomes impractical.

## How does the hybrid design handle a celebrity with 50 million followers?

- It fans out their posts more slowly
- It limits them to 100,000 followers
- [x] Their posts aren't pushed; followers' feeds pull and merge them at read time

Each reader merges a few celebrity posts from a shared cache instead of one post triggering 50 million writes.

## Why store post IDs in feed lists instead of full copies of posts?

- IDs are encrypted
- [x] Edits and deletions take effect without updating millions of lists
- Copies can't be stored in Redis

The feed is hydrated from the posts themselves at read time, so they're always current, and the lists stay small.

<!-- practice -->

## Problem

Extend the feed design with "notifications": when someone you follow goes live on video, you get a push notification within 30 seconds. One creator with 20 million followers goes live several times a week. Design the notification fan-out, and explain how you'd keep that one creator from delaying notifications for everyone else.

## Solution

### The basic flow

1. The live-video service publishes a `went_live` event (creator ID, stream ID) to a log like Kafka.
2. A notification fan-out service consumes it, pages through the creator's followers in batches of, say, 1,000, and for each batch enqueues a "send notifications" job.
3. Sender workers filter out users who've muted the creator or disabled notifications, then call the mobile push services (Apple and Google) in batches.
4. Each notification carries an ID of `stream_id + user_id`, and senders record sent IDs, so retries don't notify anyone twice (at-least-once plus idempotency, lesson 10).

### Estimates for the big creator

20 million notifications in 30 seconds is about 670,000 per second. That's demanding but achievable with enough sender workers and batched push calls, and both Apple and Google accept high volumes from one sender.

### Keeping one creator from blocking everyone

- **Separate queues by size:** route fan-out jobs for very large audiences to their own queue and worker pool. Small creators' notifications, which are the majority of events, flow through the normal queue unaffected.
- **Batch jobs, not giant ones:** a 20-million-follower fan-out is 20,000 small jobs, processed in parallel and retryable individually, rather than one job that takes minutes and fails as a whole.
- **Prioritize recently active users:** send to followers active in the last day first. They're most likely to tune in, and the long tail of dormant followers can arrive a little later.
- **Precompute the audience:** for the largest creators, keep the list of notification-eligible followers already filtered, so fan-out doesn't re-scan settings for 20 million users each time.
- **Autoscale on queue age,** not just depth, so the 30-second goal drives capacity.
