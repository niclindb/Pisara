---
category: Technology
topic: System design
title: Caching in depth
level: Intermediate
reading_minutes: 8
---

Caching is the single most effective tool for making a system faster, and the most common source of bugs where users see the wrong thing. The idea is simple: keep a copy of data somewhere quicker to reach. Everything hard about it comes from one fact: a copy can disagree with the original. This lesson covers where caches go, how to read and write through them, and how to keep them from hurting you.

## Where caches live

A single page load can pass through several caches, each closer to the user than the last:

- **Browser cache:** the user's own device keeps responses according to HTTP headers like `Cache-Control: max-age=3600`. Fastest possible, but you can't clear it remotely.
- **CDN:** copies at edge servers near users (lesson 4). Great for anything that's the same for everyone.
- **Application cache:** a shared in-memory store such as **Redis** or **Memcached**, sitting next to your servers. This is what people usually mean by "the cache."
- **In-process cache:** a small map inside each server's memory. No network hop at all, but each server has its own copy, so they can disagree.
- **Database cache:** the database keeps hot pages in memory itself. You get this for free, which is one reason a well-sized database is faster than you'd expect.

The closer to the user, the faster, and the harder to invalidate.

## Reading through a cache

**Cache-aside** (also called lazy loading) is the most common pattern, and the app does all the work:

1. Look up the key in the cache.
2. On a **hit**, return it.
3. On a **miss**, read from the database, store the result in the cache with a TTL, and return it.

Only data someone asked for gets cached, and if the cache goes down, the app still works, just slower. The cost is that every miss pays for two trips, and the first request after an expiry is slow.

**Read-through** is the same idea, but the cache library or service fetches from the database on a miss so the app only talks to the cache. It's tidier code with the same behavior.

## Writing through a cache

When data changes, the cache must find out. There are three main approaches.

**Write, then invalidate** (pairs with cache-aside): update the database, then **delete** the cache key. The next read misses and loads the fresh value. Deleting is safer than updating the cached value directly, because two concurrent writers that each update the cache can finish in the wrong order and leave the older value there.

**Write-through:** write to the cache and the database together, as part of the same operation. Reads are always fresh and fast, but every write pays for both, and you cache data that might never be read.

**Write-back** (write-behind): write to the cache only, and flush to the database later in batches. Writes are very fast, and many updates to the same key collapse into one. But if the cache node dies before flushing, those writes are gone. Use it only for data you can afford to lose, like view counters, or with a cache that's itself replicated and durable.

## Eviction: what to throw out

Memory is limited, so when the cache fills, something must go. The policy decides what:

- **LRU (least recently used):** drop whatever hasn't been touched for longest. The default almost everywhere, and a good fit for most workloads.
- **LFU (least frequently used):** drop what's been used least often. Better when a few items stay popular for a long time.
- **TTL-based:** items simply expire after a set time, whether or not memory is full.

In practice you set a TTL on every key and let the cache use LRU as memory fills. A TTL is your safety net: even if an invalidation is missed, stale data can't outlive it.

## Measure the hit rate

A cache's value comes from its **hit rate**, the share of reads it answers. The math is unforgiving. If the cache takes 1 ms and the database takes 20 ms:

- 90% hit rate: 0.9 × 1 + 0.1 × 21 = about **3 ms** average
- 50% hit rate: 0.5 × 1 + 0.5 × 21 = about **11 ms** average

A cache with a poor hit rate adds a network hop and complexity for little gain. If yours is low, look at whether keys are too specific (each one is requested once), TTLs are too short, or the cache is too small.

## Three ways caches fail

**Stampede (thundering herd).** A very popular key expires. In the next instant, a thousand requests miss at once, and all of them hit the database for the same row. Fixes:

- **Request coalescing:** let only one request fetch the value while others wait for it (a short lock on the key does this).
- **Refresh early:** recompute popular values shortly before they expire, in the background.
- **Jitter TTLs:** add a random few seconds to each expiry so keys set together don't all expire together.

**Penetration.** Requests for keys that don't exist, such as a bot trying random IDs, always miss and always hit the database. Cache the "not found" result too, with a short TTL.

**Cold start.** After a restart or deploy, the cache is empty, and the full read load falls on a database sized for 10% of it. Warm the cache with the most popular keys before sending traffic, or bring traffic up gradually.

## When not to cache

- **Data that must be exact at the moment of a decision:** inventory at checkout, account balances before a transfer. You can show a cached value, but check the real one inside the transaction.
- **Data that's rarely read twice:** caching it just evicts things that would have been reused.
- **When the database isn't the problem.** Add an index or fix a slow query first. A cache hides a problem; it doesn't fix it, and the problem returns the moment the cache is cold.

<!-- quiz -->

## Why delete the cache key after a database update, rather than writing the new value into the cache?

- Deleting is faster than writing
- [x] Two concurrent updates can write to the cache in the wrong order and leave the old value; a delete just forces a fresh read
- Caches can't be overwritten

Deleting means the next read loads whatever the database holds now, so the order of concurrent writers doesn't matter.

## A product page is cached for 60 seconds. When it expires, the database briefly overloads. What's this called?

- Cache penetration
- [x] A cache stampede
- Write-back

Many requests miss at the same moment and all go to the database. Coalescing requests or refreshing the value before it expires prevents it.

## Which data is the safest fit for write-back caching?

- Bank transfers
- Orders and payments
- [x] Page view counters

Write-back can lose recent writes if the cache fails before flushing, so it suits data where losing a few updates is acceptable.

<!-- practice -->

## Problem

A news site serves article pages from a PostgreSQL database. Popular articles get 5,000 reads per second for a few hours after publishing. Editors sometimes fix typos in published articles and expect the fix to appear within a minute. The site currently has no cache, and the database is struggling. Design the caching, and say how you'd handle a breaking story that gets 50,000 reads per second the moment it's published.

## Solution

### Layers

- **CDN** in front of the whole site, caching article pages for anonymous readers with `Cache-Control: max-age=60`. Most traffic is anonymous and identical, so this absorbs the bulk of it. The 60-second maximum age meets the editors' one-minute requirement without any purging, though you can also purge the article's URL on edit for an instant fix.
- **Redis** for the article data behind the page, using cache-aside with a TTL of a few minutes plus random jitter, so articles published together don't expire together.

### Updates

When an editor saves, update the database, then delete the article's Redis key and purge its URL from the CDN. The TTLs are a safety net if a purge fails.

### The breaking story

The danger is a stampede the moment it's published: the cache is empty, and tens of thousands of requests miss together.

- **Warm the cache on publish:** the publish action writes the article into Redis and requests it once through the CDN, before it's linked from the homepage.
- **Coalesce at the CDN:** most CDNs can collapse concurrent misses for the same URL into one request to the origin. Turn it on.
- **Coalesce in the app too:** on a Redis miss, take a short lock on the key so only one server queries the database while the rest wait a few milliseconds and retry the cache.

With those in place, the database sees roughly one query per article per expiry, no matter how popular the story gets.
