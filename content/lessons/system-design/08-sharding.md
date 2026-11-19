---
category: Technology
topic: System design
title: Sharding
level: Intermediate
reading_minutes: 7
---

Replication gives you more copies of the same data. Eventually that's not enough: the data is too big for one machine, or the writes are too many for one leader. The next step is to **shard** (or partition) the data, giving each machine a different slice. It's the most powerful scaling tool in this course and the one to put off longest, because it changes how every query works.

## What sharding means

You choose a **shard key**, such as `user_id`, and a rule that maps each key to a shard. All of user 42's data lives on one shard; user 43's might live on another. Each shard is an ordinary database, usually with its own replicas, holding a fraction of the rows and taking a fraction of the writes.

Four shards give you roughly four times the storage and write capacity. That only holds if the data and traffic spread evenly, and if most queries need just one shard. Both depend on the shard key.

## Range sharding

Assign contiguous ranges of the key to each shard: user IDs 1 to 1,000,000 on shard A, the next million on shard B, and so on. Or by time: January's events on one shard, February's on the next.

**You gain:** range queries stay on one or a few shards ("all orders from last week").

**You pay:** **hot spots**. If the key grows over time, like an auto-incrementing ID or a timestamp, every new write goes to the last shard while the others sit idle. Range sharding works best when the key has no such pattern, like usernames alphabetically, and even then some ranges end up busier than others.

## Hash sharding

Run the key through a hash function and use the result to pick a shard: `shard = hash(user_id) % number_of_shards`.

**You gain:** an even spread. Sequential IDs scatter randomly across shards.

**You pay:** range queries now touch every shard, since neighboring keys land in unrelated places. And there's a bigger problem with the `%` rule: change the number of shards from 4 to 5 and almost every key maps to a different shard. Adding capacity would mean moving nearly all your data.

## Consistent hashing

**Consistent hashing** fixes the reshuffling problem. Picture the range of hash values as a circle. Each shard is placed at several points around it. To find a key's shard, hash the key to a point on the circle and walk clockwise to the next shard point.

When you add a shard, it takes over only the arcs just before its new points, a fair share of keys from its neighbors, and every other key stays put. Going from 4 shards to 5 moves about a fifth of the data instead of nearly all of it. Placing each shard at many points (**virtual nodes**) keeps the arcs even, so load stays balanced.

Cassandra, DynamoDB and many caches use this idea. A common, simpler variant in practice: split the data into a fixed, large number of logical partitions up front (say 1,024), and assign partitions to machines. Adding a machine means moving some whole partitions to it, and the key-to-partition rule never changes.

## Choosing the shard key

This is the decision that's hardest to undo. A good shard key:

- **Spreads data and traffic evenly.** Avoid keys where a few values dominate.
- **Keeps related data together.** If almost every query is "this user's stuff," sharding by user ID means each query touches one shard.
- **Appears in most queries.** A query without the shard key must ask every shard (a **scatter-gather** query), which gets slower as you add shards.

For a multi-tenant business app, the tenant (company) ID is often ideal: tenants never query each other's data. For a messaging app, the conversation ID keeps each chat's messages together.

## Hot keys

Even a good key can have one value that's much busier than the rest: a celebrity's account, a viral post, a giant customer. One shard melts while the others idle. Options:

- **Cache aggressively** in front of hot reads, so they rarely reach the shard.
- **Split the hot key:** append a small random suffix (`post_123#0` to `post_123#9`) to spread writes for one key across ten places, and combine them when reading. This suits counters well.
- **Give giant tenants their own shard.**

## What gets harder

Sharding has costs you live with daily:

- **Cross-shard queries** are slow and complex. "Top 10 posts across all users" must ask every shard and merge the results.
- **Cross-shard transactions** are hard. Transferring credit between users on different shards can't use a simple database transaction. You need techniques like two-phase commit (slow and fragile) or a saga of steps with compensating actions.
- **Unique constraints across shards** can't be enforced by any one database. Global IDs need a scheme like UUIDs or Snowflake-style IDs (a timestamp plus a machine number plus a counter).
- **Rebalancing** means moving data while serving traffic, a careful operation.

That's why the advice is to exhaust simpler options first: indexes, a bigger machine, read replicas, caching, archiving old data, and moving heavy workloads (analytics, logs) elsewhere. When you do shard, databases that shard for you, like Vitess for MySQL, Citus for PostgreSQL, or natively distributed databases like CockroachDB, spare you writing the routing yourself.

<!-- quiz -->

## Why does sharding by auto-incrementing order ID with range sharding cause trouble?

- Order IDs aren't unique
- [x] All new orders go to the last shard, so it gets all the writes
- Range sharding can't store numbers

Sequential keys put every new write at the end of the range, creating a hot spot while other shards sit idle.

## With hash(key) % 4, what happens when you add a fifth shard?

- Only the new keys go to the new shard
- [x] Most existing keys map to a different shard and must move
- Nothing; the modulus ignores the shard count

Changing the divisor changes almost every result. Consistent hashing or fixed logical partitions avoid this.

## Most queries in a team-chat app ask for messages in one channel. Which shard key fits best?

- Message ID
- Timestamp
- [x] Channel ID

Sharding by channel keeps each channel's messages on one shard, so the common query touches one machine.

<!-- practice -->

## Problem

A multi-tenant project-management app stores tasks for 20,000 companies in one PostgreSQL database. It's near the limits of the largest machine available. Most companies have a few thousand tasks, but five enterprise customers have tens of millions each. Every query in the app is scoped to one company, except an internal admin dashboard that shows totals across all companies. Propose a sharding plan, and explain how you'd handle the big customers and the dashboard.

## Solution

### Shard key: company ID

Every product query already filters by company, so each one hits exactly one shard. Tenants never share data, so cross-shard transactions don't come up in normal use.

### Mapping

Use a lookup table (a **directory**) from company ID to shard, rather than a pure hash. It's a small table, cached everywhere, and it lets you place and move individual companies deliberately. Start with, say, 8 shards, each with its own replica for failover.

### The big customers

A hash would put each enterprise customer on a random shard, potentially two on the same one, overloading it. With a directory, give each of the five **its own shard** (or put them on the largest machines), and pack the 19,995 smaller companies across the rest. If one enterprise customer outgrows even a dedicated shard, shard *within* that customer by project ID.

### The dashboard

Don't run cross-shard aggregates on the live shards. Stream changes from every shard into an analytics warehouse, and point the dashboard there. Its numbers can be minutes old, which an internal dashboard can accept.

### Before cutting over

Check whether cheaper fixes would buy a year: archiving completed tasks older than two years, moving attachments to object storage, and adding read replicas. Sharding is the right end state here, but it's worth knowing how much runway you have.
