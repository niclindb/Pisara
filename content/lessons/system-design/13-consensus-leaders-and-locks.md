---
category: Technology
topic: System design
title: Consensus, leaders and locks
level: Advanced
reading_minutes: 8
---

Several lessons have quietly relied on machines agreeing on something: which database node is the leader, which worker holds a job, which write came first. On one machine, agreement is trivial. Across machines that can crash, pause and lose messages, it's one of the hardest problems in computing. You'll rarely build it yourself, but you'll use it constantly, and misusing it causes some of the worst bugs in distributed systems. This lesson explains what's going on underneath.

## Why agreement is hard

Three things make distributed agreement difficult:

- **Messages can be delayed or lost,** and you can't tell a slow node from a dead one. No reply after 10 seconds might mean it crashed, or that the network is congested, or that the reply is on its way.
- **Processes pause.** A garbage-collection pause, a virtual machine being migrated, or a laptop lid closing can freeze a process for seconds, and then it carries on, unaware time passed.
- **Clocks disagree.** Every machine's clock drifts, and clock-sync corrections can make one jump forwards or even backwards.

A node therefore can't trust its own belief that it's the leader, or that its lock is still valid, or that its timestamp is later than another machine's.

## Consensus in plain words: Raft

**Consensus** is getting a group of nodes to agree on a value, or a sequence of values, even when some fail. **Raft** is the most widely used algorithm for it, inside etcd, Consul, CockroachDB and many others. Here's its core idea, simplified.

**Majorities.** A cluster has an odd number of nodes, usually 3 or 5. Every decision needs a **majority** (a quorum): 2 of 3, or 3 of 5. Any two majorities overlap in at least one node, so two conflicting decisions can't both win. A 5-node cluster keeps working with any 2 nodes down; a 3-node cluster tolerates 1.

**Terms and elections.** Time is divided into numbered **terms**. Each term has at most one leader. Followers expect regular heartbeats from the leader; if they hear nothing for a randomized timeout, one becomes a candidate, increments the term, and asks for votes. Each node votes once per term, and only for a candidate whose log is at least as up to date as its own. A candidate with a majority becomes leader.

**Log replication.** The leader appends each change to its log and sends it to followers. Once a majority have stored an entry, it's **committed**: it will never be lost or changed, because any future leader must have it to win an election.

**Stale leaders lose.** If an old leader was cut off and comes back, it sees messages with a higher term number and steps down. Any writes it tried to make while cut off never reached a majority, so they never committed.

The cost: every write needs a majority to respond, so latency is at least one round trip to the nearest majority, and if a majority is unreachable, the cluster stops accepting writes. It chooses consistency over availability, by design.

## Use a coordination service

You almost never implement Raft. Instead, you use a **coordination service** that implements it, such as **etcd**, **ZooKeeper** or **Consul**, for the small amount of data that must be agreed on:

- **Leader election:** which instance of a service is the active one.
- **Configuration and membership:** which shards live where, which nodes are alive.
- **Locks and leases.**

These stores are deliberately small and slow-ish. Use them for coordination metadata, not for application data.

## Leader election and leases

A common need: run several copies of a scheduler for redundancy, but only one should actually act. The usual approach is a **lease**: a lock with an expiry. A node acquires the lease ("I'm leader for 10 seconds"), renews it every few seconds, and if it dies, the lease expires and another node takes over.

The trap: a leader acquires a 10-second lease, then a garbage-collection pause freezes it for 15 seconds. Its lease expires; another node becomes leader. The first node wakes up, still believing it's the leader, and acts. Now two leaders are acting at once. Checking "is my lease still valid?" right before acting doesn't help, because the pause can happen just after the check.

## Fencing tokens

The fix is to have the *resource being protected* reject stale leaders, since the leader can't reliably know it's stale.

Each time the lock or lease is granted, the coordination service hands out a **fencing token**: a number that increases with every grant. The holder includes its token with every write. The storage system remembers the highest token it has seen and **rejects** any write with a lower one.

In the scenario above: node A got token 33, paused, and node B then got token 34 and wrote. When A wakes and writes with token 33, storage rejects it. Split brain is prevented at the point where it would do damage.

This is also why a plain Redis lock (`SET key value NX PX 10000`) is fine for **efficiency** (avoiding duplicate work, where an occasional duplicate is harmless) but unsafe for **correctness** (where two holders would corrupt data), unless the resource checks a fencing token.

## Time and ordering

Since clocks disagree, be careful with time across machines:

- **Don't order events from different machines by wall-clock timestamp.** A clock 50 ms fast on one server can make a later write look earlier. "Last write wins" by timestamp silently drops data when clocks skew.
- **Measure durations with a monotonic clock** (one that only moves forward, like `performance.now()` or `time.monotonic()`), never by subtracting wall-clock times.
- **Use logical ordering when order matters:** a single leader assigning sequence numbers, a database's log position, or a **Lamport clock**, a counter each node increments and passes along with messages, so causally related events get increasing numbers.

Some systems invest heavily to bound clock uncertainty: Google's Spanner uses GPS and atomic clocks and waits out the remaining uncertainty before committing. Most systems don't, and shouldn't pretend their clocks are that good.

<!-- quiz -->

## Why do consensus clusters usually have 3 or 5 nodes rather than 4?

- Even numbers can't elect a leader
- [x] A 4-node cluster needs 3 for a majority, so it tolerates only 1 failure, the same as 3 nodes
- Raft only supports odd numbers

Majority of 4 is 3, leaving room for one failure, no better than 3 nodes. Five nodes tolerate two failures.

## A lock holder pauses for 15 seconds, its 10-second lease expires, and another node gets the lock. What stops the first node's late write?

- Checking the lease right before writing
- [x] The storage rejecting writes with a lower fencing token than it has seen
- A longer garbage-collection pause

The paused node can't know it's stale. The resource rejects its older token, so only the current holder's writes succeed.

## Why is "last write wins" by wall-clock timestamp risky across servers?

- Timestamps take too much storage
- [x] Clocks on different machines drift, so a later write can carry an earlier timestamp and be discarded
- Databases can't sort by time

Clock skew of even a few milliseconds can reorder writes and silently drop the newer one.

<!-- practice -->

## Problem

A billing system runs a nightly job that charges every customer whose subscription renews that day. For redundancy, it runs on three servers, and a Redis lock is meant to ensure only one runs the job. Last month, some customers were charged twice. Explain how that could happen despite the lock, and redesign the job so double charges can't occur.

## Solution

### How it happened

The Redis lock has an expiry. One plausible sequence: server A takes the lock (expiry 60 seconds) and starts charging. A long pause (garbage collection, a slow network call, the VM being migrated) or a long-running job outlasts the expiry. The lock expires; server B acquires it and starts the same job. A resumes, unaware, and both charge the same customers. Redis locks can also be lost on a Redis failover. The lock was fine for avoiding duplicate work, but correctness depended on it.

### Redesign

Make the charges themselves safe, so the lock only saves effort:

- **One row per charge, with a unique key:** before charging, insert a row into `charges` with a unique constraint on `(subscription_id, billing_period)`. If the insert fails, someone already did this charge: skip it.
- **Idempotency key to the payment provider:** pass `subscription_id + billing_period` as the payment API's idempotency key, so even if two attempts reach the provider, it charges once.
- **Record state transitions:** move each charge row from `pending` to `succeeded` or `failed` with conditional updates, so a crash mid-run can be resumed safely by any server.
- **Keep leader election, done properly:** elect the job runner via etcd or a database advisory lock, and if you keep a lock-protected step, check a fencing token where the write happens.

Now running the job twice, or on two servers at once, wastes some effort but can't charge anyone twice.
