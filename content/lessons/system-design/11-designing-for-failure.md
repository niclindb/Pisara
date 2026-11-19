---
category: Technology
topic: System design
title: Designing for failure
level: Advanced
reading_minutes: 7
---

In a large system, something is always broken. Disks fail, a deploy ships a bug, a dependency slows to a crawl, a whole data center loses power. You can't prevent all of it, so good designs assume failure and limit its reach. The most dangerous failures aren't the clean crashes, either. They're the slow ones, where a struggling part drags everything connected to it down. This lesson covers the patterns that stop that.

## How one slow service takes down everything

Imagine your checkout service calls a recommendations service to show "you might also like." Recommendations gets slow: requests that took 50 ms now take 30 seconds. Checkout's threads all end up waiting on it. New checkout requests queue behind them, then time out. Users retry, adding more load. Within minutes checkout is down, over a feature nobody needed to complete a purchase.

This is a **cascading failure**, and each pattern below breaks one link in that chain.

## Timeouts on every call

The first defense: **never wait forever**. Every network call needs a timeout, and many libraries default to none or to minutes.

Set timeouts from what the caller can afford, not from what the callee usually takes. If your page must respond in 1 second and calls three services in sequence, each gets well under that. A useful starting point is a little above the dependency's normal 99th-percentile latency.

Remember that a timeout doesn't mean the operation failed, only that you stopped waiting. The payment may have gone through. That's one more reason operations should be idempotent.

## Retries, carefully

Many failures are brief: a dropped packet, a server mid-restart. Retrying fixes them. But naive retries are how small problems become outages: if every client retries three times immediately, a struggling service suddenly gets four times the traffic.

Retry well:

- **Only retry what's safe:** idempotent operations, and errors that might succeed next time (timeouts, 503s), not ones that won't (400 Bad Request).
- **Back off exponentially:** wait 100 ms, then 200, then 400, giving the service room to recover.
- **Add jitter:** randomize each wait. Without it, all clients that failed together retry together, in synchronized waves.
- **Cap attempts,** and use a **retry budget**: retries may add at most, say, 10% to normal traffic.
- **Retry at one layer only.** If the app retries three times, the service mesh retries three times, and the client retries three times, one failure becomes 27 requests.

## Circuit breakers

When a dependency is clearly down, retrying every call just wastes time and adds load. A **circuit breaker** wraps calls to a dependency and tracks failures:

- **Closed** (normal): calls go through. If failures exceed a threshold, say 50% of the last 20 calls, the breaker **opens**.
- **Open:** calls fail instantly without touching the dependency, so callers get a quick answer and the dependency gets breathing room.
- **Half-open:** after a cool-down, a few trial calls go through. If they succeed, the breaker closes; if not, it opens again.

Failing fast is the point: a quick "unavailable" lets the caller fall back immediately instead of tying up threads for 30 seconds.

## Graceful degradation

Decide in advance what each feature does when a dependency fails. Usually something useful is possible:

- Recommendations down: show bestsellers from a cache, or nothing.
- Personalized feed down: show a popular, non-personalized feed.
- Search down: show category browsing.
- Payment provider down: that one's essential. Show a clear error and keep the cart.

Separate **critical** dependencies (the feature can't work without them) from **optional** ones (it's better with them), and never let an optional one take down a critical path.

## Bulkheads

Ships are divided into sealed compartments so one leak doesn't sink the ship. In software, **bulkheads** give each dependency its own limited pool of resources, such as a separate connection pool or thread pool. If recommendations hangs, it can exhaust only its own 20 connections, and checkout's calls to payments still have theirs.

## Rate limiting and load shedding

Sometimes the problem is simply too much traffic: a spike, a misbehaving client, or retry storms.

- **Rate limiting** caps how many requests a client may make (lesson 14 designs one). It protects you from any single user or bot.
- **Load shedding** protects the service as a whole: when it's at capacity, reject excess requests immediately with a 503, rather than accepting everything and serving all of it too slowly. Shed the least important traffic first, like background refreshes before checkout.

A server that's 10% over capacity and accepts everything can end up serving almost nothing, because every request times out after doing its work. Saying no early keeps it useful.

## Redundancy across failure domains

A **failure domain** is a set of things that fail together: a server, a rack, a data center (an **availability zone** in cloud terms), a region. Redundancy only helps if copies are in different domains.

- Run at least two of everything critical, in **different zones**. Zones within a region are close enough for synchronous replication and fail independently.
- **Multi-region** setups survive a whole region going down, at much higher cost and complexity: data must replicate across long distances, so you face the consistency trade-offs from lesson 9 directly.
- Watch for **hidden shared dependencies**: two "independent" services that both depend on the same DNS provider, auth service or config system fail together.

## Rehearse it

Redundancy you've never tested often doesn't work. Teams run **failover drills**, and some practice **chaos engineering**: deliberately killing instances or injecting latency in production, in small controlled doses, to prove the system copes. The first drill usually finds something, which is exactly why you run it.

<!-- quiz -->

## Why add random jitter to retry delays?

- To make retries faster
- [x] So clients that failed at the same moment don't all retry at the same moment
- To skip retries that would fail

Without jitter, clients retry in synchronized waves that can knock a recovering service down again.

## What does an open circuit breaker do?

- Sends every call to the dependency twice
- [x] Fails calls immediately without calling the dependency, until a cool-down passes
- Restarts the dependency

Failing fast frees the caller to use a fallback and gives the struggling dependency time to recover.

## An app retries 3 times, its HTTP library retries 3 times, and the service mesh retries 3 times. What's the risk?

- Requests will never be retried
- [x] One failing call can turn into 27 requests, amplifying an outage
- Timeouts stop working

Retries multiply across layers. Retry at one layer, with a budget.

<!-- practice -->

## Problem

A product page calls four services: product details (essential), price and stock (essential), reviews (nice to have), and recommendations (nice to have). Last week, the reviews service slowed to 20-second responses, and the whole product page went down for 40 minutes. Explain why that happened, then redesign how the page calls its dependencies.

## Solution

### Why it went down

Calls to reviews had no effective timeout. Each product page request held a thread or connection while waiting 20 seconds. The page servers' pools filled with requests stuck on reviews, so new requests, even ones that would never need reviews, queued and timed out. Users and clients retried, adding load. A nice-to-have feature took down the essential path.

### The redesign

- **Timeouts:** product and price calls get, say, 300 ms; reviews and recommendations get 150 ms. The page has a total budget of about 800 ms.
- **Call in parallel:** fetch all four at once, not one after another, so the page takes as long as the slowest essential call.
- **Degrade gracefully:** if reviews time out or fail, render the page without them (or load them afterwards in the browser). Same for recommendations, falling back to a cached "popular in this category" list.
- **Circuit breakers** on reviews and recommendations: once they're clearly failing, skip them instantly instead of paying 150 ms each time.
- **Bulkheads:** separate connection pools per dependency, so a hang in reviews can't use up the connections that price and product need.
- **Retries:** at most one quick retry with jitter, only for the essential, idempotent reads, and only at one layer.
- **Essential failures:** if product details or price can't be fetched, show a clear error page fast rather than a broken or wrong page. Never show a cached price at checkout without re-checking it.

With these, the same reviews incident shows up as a missing reviews section for 40 minutes, which most users won't notice.
