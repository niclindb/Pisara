---
category: Technology
topic: System design
title: "Case study: a rate limiter"
level: Intermediate
reading_minutes: 9
---

This is the first of three case studies, each worked the way you'd work it in a design review or interview: requirements, estimates, a simple design, then the hard parts. The subject here is a **rate limiter** for a public API: a service that decides, for every incoming request, whether the caller has exceeded their allowance. It's small enough to design completely, and it touches caching, consistency, failure handling and API design.

## 1. Requirements

**Functional:**

- Limit each API key to a number of requests per time window, for example 100 per minute on the free plan and 1,000 per minute on the paid plan.
- Some endpoints get their own, tighter limits: 5 login attempts per minute per IP address.
- Rejected requests get HTTP **429 Too Many Requests**, with a `Retry-After` header saying when to try again.
- Clients can see their remaining allowance in response headers.

**Non-functional:**

- **Fast:** the check runs on every request, so it must add only a millisecond or two.
- **Accurate enough:** a few percent over the limit at the edges is fine; double the limit is not.
- **Shared across servers:** a client spreading requests over 20 API servers still gets one allowance.
- **Never the cause of an outage:** if the limiter breaks, the API should keep working.

## 2. Estimates

Say the API serves **50,000 requests per second** at peak from **1 million** active API keys.

- Each request needs one limiter check: 50,000 checks a second. One Redis node handles on the order of 100,000 simple operations per second, so a small Redis cluster covers it, with room to grow.
- State per key is tiny: a counter or two and a timestamp, under 100 bytes. 1 million keys × 100 bytes = **100 MB**. It fits in memory easily.

So this is a high-throughput, small-data problem: perfect for an in-memory store.

## 3. Choosing an algorithm

Several algorithms count requests, each trading accuracy, memory and burst behavior differently.

**Fixed window counter.** One counter per key per calendar minute (`key:12:04`). Increment; reject above the limit. It's simple and cheap, but bursty at the boundaries: a client can send 100 requests at 12:04:59 and 100 more at 12:05:00, 200 in two seconds.

**Sliding window log.** Store a timestamp for every request, drop those older than a minute, and count the rest. Perfectly accurate, but memory grows with the limit: 1,000 timestamps per key on the paid plan.

**Sliding window counter.** Keep the current and previous fixed-window counts, and weight the previous one by how much of it still overlaps the last 60 seconds. 15 seconds into the current minute, the estimate is `current + previous × 0.75`. It's nearly as accurate as the log with just two numbers per key. A good default.

**Token bucket.** Each key has a bucket holding up to *B* tokens, refilled at *R* tokens per second. Each request takes a token; an empty bucket means rejection. It allows short bursts up to *B* while enforcing an average rate *R*, which matches how real clients behave (a page load fires 10 calls at once, then nothing). It needs two numbers per key: tokens and last refill time. Many API providers use it.

**Choice:** a **token bucket** for API keys (burst-friendly, cheap), and a **sliding window counter** for login attempts, where a steady, strict count matters more than bursts.

## 4. The design

The limiter runs as **middleware in the API gateway** (or each API server), not as a separate network service. That saves a network hop on every request.

1. A request arrives. The middleware identifies the caller (API key, or IP for unauthenticated routes) and looks up its plan's limits, cached in memory and refreshed every minute.
2. It sends one command to **Redis** that refills and takes a token, atomically.
3. If allowed, the request proceeds, with headers like `RateLimit-Remaining: 42`. If not, it returns 429 with `Retry-After`.

## 5. The hard parts

### Race conditions

Two API servers handle requests for the same key at the same instant. Both read "1 token left," both allow, both write "0." The client got two requests for one token: the lost update from lesson 9.

The fix is to make read-modify-write a single atomic step in Redis. Redis runs a **Lua script** atomically: no other command runs in the middle. The script reads the bucket, computes the refill from elapsed time, takes a token if available, writes it back, sets an expiry so idle keys clean themselves up, and returns the result. One round trip, no races.

### Clocks

Refill depends on elapsed time. If each API server passes its own clock time, skew between servers produces slightly wrong refills. Use the Redis server's clock (the `TIME` command inside the script) so all calculations use one clock.

### Scaling Redis

Shard keys across a Redis cluster by API key (lesson 8). Each key's bucket lives on one node, so its operations stay atomic. Add a replica per shard for failover; losing a few seconds of counters in a failover is acceptable.

### Hot keys and latency

A single huge customer sending 20,000 requests per second hammers one Redis node. Options: give each API server a small **local allowance** it can spend without asking Redis (for example, take 50 tokens at a time and hand them out locally). This cuts Redis traffic dramatically, at the cost of slight overshoot. That trade is fine under "accurate enough."

### When Redis is down: fail open or closed?

If the limiter can't reach Redis, it must choose:

- **Fail open:** allow the request. The API stays up; limits are briefly unenforced.
- **Fail closed:** reject the request. Limits hold, but a limiter failure becomes a full outage.

For general API limits, **fail open**, perhaps falling back to a crude per-server in-memory limit, because the limiter exists to protect the API, not to take it down. For the **login limit**, which defends against password guessing, consider failing closed or falling back to a strict local limit, since an open window invites attack. Use a short timeout (a few milliseconds) and a circuit breaker on Redis calls, so a slow Redis doesn't slow every request.

### Being friendly to clients

Return clear headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` on 429), document the limits, and recommend that clients retry with exponential backoff and jitter. Good clients then smooth out their own traffic.

## Summary

Token bucket per API key in a sharded Redis cluster, updated atomically with a Lua script using Redis's clock; enforced in gateway middleware; local token batching for hot keys; fail open for general limits and fail safe for login. Each choice traces back to a requirement: speed, shared state, accuracy that's good enough, and never causing an outage.

<!-- quiz -->

## What's the weakness of a fixed window counter?

- It needs a timestamp for every request
- [x] A client can send a full limit just before a window ends and another just after
- It can't be stored in Redis

At the boundary between two windows, a client can briefly get twice the limit.

## Why run the token-bucket update as a Lua script in Redis?

- Lua is faster than Redis commands
- [x] The read, refill and decrement happen atomically, so concurrent requests can't both spend the same token
- It encrypts the counters

Without atomicity, two servers can read the same count and both allow a request: a lost update.

## Redis is unreachable. Why might general API limits fail open?

- Failing open is more secure
- [x] The limiter exists to protect the API, so it shouldn't turn its own failure into a full outage
- Clients can't send requests when Redis is down

Briefly unenforced limits are usually better than rejecting all traffic. Security-critical limits like logins may choose differently.

<!-- practice -->

## Problem

A paid plan allows 600 requests per minute per API key, and customers complain that legitimate bursts get rejected: their dashboard fires 40 calls at once on page load, then is idle. You use a sliding window counter today. Propose a token bucket configuration that allows the bursts but still enforces 600 per minute on average, and explain what a client sending a steady 15 requests per second would experience.

## Solution

### Configuration

- **Refill rate R = 10 tokens per second.** 10 × 60 = 600 per minute on average, which matches the plan.
- **Bucket size B = 60 tokens.** A full bucket covers a 40-call page load with room to spare, and allows one more burst soon after. A bigger bucket lets a client front-load more, so keep it a modest multiple of the burst you actually want to allow.

### The dashboard client

The bucket is full (60) while the client is idle. A page load takes 40 tokens, leaving 20, and refills at 10 per second, so after 4 seconds it's full again. Page loads are never rejected unless the user reloads several times within a few seconds.

### The steady 15 per second client

It spends 15 tokens a second but gets only 10 back. The bucket drains by 5 per second, so the 60 tokens last about 12 seconds. After that, about one request in three is rejected with 429 and a `Retry-After` of a fraction of a second. If the client backs off properly, it settles at 10 requests per second, exactly the plan's rate. Over any minute, it gets at most 600 plus the bucket size, which is the intended average with a burst allowance.
