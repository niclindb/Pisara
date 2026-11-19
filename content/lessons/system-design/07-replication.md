---
category: Technology
topic: System design
title: Replication
level: Intermediate
reading_minutes: 7
---

Your database lives on one machine. That machine will fail one day, and before it does, it may run out of room to serve all your reads. **Replication**, keeping copies of the same data on several machines, addresses both problems. It also introduces a new one: the copies are never perfectly in step. This lesson is about getting the benefits while managing the gap.

## Why replicate

- **Survive failures.** If one machine dies, another has the data and can take over.
- **Scale reads.** Several copies can each answer queries.
- **Be closer to users.** A copy in Europe answers European users without a trip across the Atlantic.

## Leader and followers

The most common setup is **single-leader replication**. One node, the **leader** (or primary), accepts all writes. It records each change in a log and streams that log to the **followers** (replicas), which apply the same changes in the same order.

Reads can go to any node. Writes go only to the leader. This is how PostgreSQL, MySQL and most managed cloud databases replicate, and it's easy to reason about because there's exactly one place where the order of writes is decided.

## Synchronous or asynchronous

The key question is when the leader tells the client "your write succeeded."

**Synchronous replication:** the leader waits until a follower confirms it has the change. If the leader then dies, the follower definitely has every acknowledged write. The cost: every write waits for a network round trip, and if the follower is slow or down, writes stall.

**Asynchronous replication:** the leader confirms as soon as it has written the change locally, and followers catch up on their own. Writes are fast and unaffected by slow followers. The cost: if the leader dies, the last few writes it confirmed may not have reached any follower, and they're lost.

A common middle ground is **semi-synchronous**: wait for one follower, stream to the rest asynchronously. You always have two up-to-date copies without waiting on every node.

## Replication lag and what it does to users

With asynchronous followers, there's a delay, usually milliseconds, sometimes seconds under heavy load, between a write on the leader and its appearance on a follower. That **replication lag** produces some strange experiences.

**Not seeing your own write.** A user edits their bio, the page reloads, the read goes to a lagging follower, and the old bio appears. The user assumes the save failed and edits again. The fix is **read-your-writes consistency**. Some ways to get it:

- Read the user's *own* data from the leader, and everyone else's data from followers.
- After a user writes, send their reads to the leader for the next few seconds.
- Remember the log position of the user's last write, and only read from a follower that has reached it.

**Time going backwards.** A user refreshes a comment thread twice. The first read hits an up-to-date follower and shows a new comment; the second hits a lagging one and the comment vanishes. The fix is **monotonic reads**: route each user to the same follower consistently (for example, by hashing their user ID), so their view only moves forward.

These anomalies are why "just add read replicas" is never quite free. Decide, page by page, which reads can tolerate lag.

## Failover

When the leader fails, a follower must be **promoted** to take its place, and clients must start sending writes to it. This is **failover**, and it's harder than it sounds:

- **Detecting failure.** A leader that doesn't answer for 30 seconds might be dead, or might be overloaded, or the network between it and the monitor might be broken. Too short a timeout causes needless failovers; too long means more downtime.
- **Choosing the new leader.** Ideally the most up-to-date follower. With async replication, any writes it lacks are lost.
- **Avoiding two leaders.** If the old leader was only cut off, not dead, it may come back still believing it's the leader and accept writes. Two leaders accepting conflicting writes is called **split brain**, and it corrupts data. Systems prevent it by making sure the old leader is shut off ("fencing") before the new one takes writes. Lesson 13 covers how.

Managed databases handle failover for you in roughly 30 to 120 seconds. Your app still needs to retry failed writes and reconnect during that window.

## Multi-leader and leaderless

Two other designs exist for special needs.

**Multi-leader replication** lets several nodes accept writes, typically one per region, and sync with each other. Users write to a nearby leader, so writes are fast everywhere and each region survives the others going offline. The catch is **write conflicts**: two people edit the same record in different regions at the same moment. Something must decide who wins, whether "last write wins" by timestamp (which silently drops one edit), merging, or asking the user. Collaborative editors and offline-capable apps live with this; most systems avoid it.

**Leaderless replication** (Cassandra, DynamoDB) sends each write to several nodes at once and reads from several too. With **N** copies, a write waits for **W** nodes to confirm, and a read asks **R** nodes. If **W + R > N**, at least one node in every read has the latest write. A common choice is N = 3, W = 2, R = 2: any one node can be down and reads and writes still succeed and stay current.

<!-- quiz -->

## A user saves their profile, the page reloads, and the old profile appears. What's the likely cause?

- The leader rejected the write
- [x] The read went to a follower that hadn't caught up yet
- The database lost the write in a failover

This is replication lag. Reading a user's own data from the leader, at least right after they write, avoids it.

## What's the main risk of asynchronous replication?

- Writes are slower than with synchronous replication
- [x] If the leader fails, recently confirmed writes may be lost
- Followers can't serve reads

The leader confirms before any follower has the change, so a crash at the wrong moment loses those writes.

## With 3 copies (N = 3), which settings guarantee a read sees the latest write?

- W = 1, R = 1
- W = 1, R = 2
- [x] W = 2, R = 2

When W + R is greater than N, the nodes written to and the nodes read from must overlap in at least one node holding the latest value.

<!-- practice -->

## Problem

A social app runs PostgreSQL with one leader and two asynchronous read replicas, and sends all reads to the replicas. Users complain about two things: (1) after posting a comment, it's often missing when the page reloads; (2) the leader failed last month, and a few minutes of new sign-ups disappeared. Explain each problem and propose fixes, with their costs.

## Solution

### (1) Missing comments: read-your-writes

The reload reads from a replica that hasn't received the comment yet. Options:

- **Send a user's reads to the leader for a short window after they write**, say 10 seconds, tracked in their session. Cost: a little more load on the leader, only for active writers.
- **Show the comment optimistically** in the app right after posting, without waiting for a read. Cost: the screen briefly shows something the server hasn't confirmed, which is fine for comments.
- **Wait for the replica to catch up** by recording the leader's log position after the write and reading only from a replica past it. Cost: more complexity; worth it if this pattern is everywhere.

### (2) Lost sign-ups: async replication on failover

With asynchronous replicas, the leader confirmed sign-ups that hadn't reached either replica, and the promoted replica never had them. Options:

- **Semi-synchronous replication:** the leader waits for one replica to confirm each write. A failover to that replica loses nothing. Cost: every write takes an extra round trip (under a millisecond within one data center) and stalls if that replica is down, so keep the second replica as a standby that can take over the synchronous role.
- **Use a managed database with synchronous standby in another zone**, which provides this setup and automatic failover. Cost: higher price.

Sign-ups are worth protecting; a few milliseconds per write is a small price.
