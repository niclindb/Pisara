---
category: Technology
topic: System design
title: Consistency, CAP and transactions
level: Advanced
reading_minutes: 8
---

Two people book the last seat on a flight at the same moment. Both see "1 seat left," both click "Book," and both get a confirmation. Whether that can happen depends on two separate questions this lesson untangles: what **consistency** your distributed data promises across machines, and what **isolation** your transactions promise across concurrent users. Engineers mix these up constantly, and the bugs they cause are the expensive kind.

## Consistency models: what a read can return

When data lives on several machines, a "consistency model" is the contract for what a read may return. From strongest to weakest:

**Linearizable (strong consistency).** The system behaves as if there were one copy of the data. Once a write completes, every later read, from anyone, anywhere, sees it. This is what most people intuitively expect. It's needed for things like "is this username taken?", "who holds this lock?", and "is this seat sold?" It costs coordination: nodes must agree before answering, which adds latency and means some requests fail when nodes can't reach each other.

**Causal consistency.** If one event could have caused another, everyone sees them in that order. A reply never appears before the comment it answers. Unrelated events can appear in different orders to different people. It's cheaper than linearizability and enough for many social features.

**Session guarantees.** Promises about one user's own view: **read-your-writes** (you see your own changes) and **monotonic reads** (your view never goes backwards). Lesson 7 showed how to get them with replicas. Often these are all users actually notice.

**Eventual consistency.** If writes stop, all copies eventually agree. Until then, a read may return anything recent-ish. It's fast and highly available, and fine for like counts, view counts and recommendations.

The practical skill is matching each piece of data to the weakest model that's still correct for it. Strong consistency everywhere is slow; eventual consistency everywhere double-books seats.

## CAP: what happens when the network splits

Networks between machines fail: a cable is cut, a switch reboots, a data center loses its link. This is a **network partition**: nodes are running but can't reach each other.

The **CAP theorem** says that during a partition, a replicated system must choose:

- **Consistency (C):** refuse requests it can't answer correctly, so no one sees stale or conflicting data. Some users get errors.
- **Availability (A):** answer every request using whatever data the reachable nodes have. Everyone gets a response, but some responses are stale, and conflicting writes may need reconciling later.

You can't have both while partitioned (the P). People sometimes summarize CAP as "pick two of three," which is misleading: partitions aren't optional, so the real choice is C or A *when one happens*. A bank ledger chooses C. A shopping cart or social feed often chooses A.

## PACELC: the choice you make every day

Partitions are rare. **PACELC** extends CAP to cover normal days: if there's a **P**artition, choose **A** or **C**; **E**lse, choose **L**atency or **C**onsistency.

Even with a healthy network, keeping copies strongly consistent means waiting for other nodes on every write, and sometimes on reads. Skipping that wait makes requests faster but allows stale reads. This everyday trade-off matters more than the partition case for most designs. DynamoDB, for example, lets you choose per read: an eventually consistent read is cheaper and faster; a strongly consistent one costs more.

## Transactions and ACID

Inside one database, a **transaction** groups operations with four guarantees, **ACID**:

- **Atomicity:** all of the transaction's changes happen, or none do.
- **Consistency:** the database's rules (constraints) hold before and after.
- **Isolation:** concurrent transactions don't see each other's half-finished work.
- **Durability:** once committed, changes survive a crash.

Note that the C in ACID is about constraints, unrelated to the C in CAP. Isolation is where the subtle bugs live.

## Isolation levels and the anomalies they allow

Perfect isolation would mean transactions behave as if they ran one at a time. That's slow, so databases offer weaker **isolation levels**, each allowing some anomalies.

**Read committed** (PostgreSQL's default): you never see uncommitted data. But two transactions can each read a value, change it in application code, and write it back, so one change silently overwrites the other. This is a **lost update**. Two users adding $10 to a balance of $100 can leave it at $110 instead of $120.

**Repeatable read / snapshot isolation:** each transaction sees a consistent snapshot as of its start. It prevents rows changing under you mid-transaction. It still allows **write skew**: two transactions read the same data, each makes a decision based on it, and each writes to a *different* row, together breaking a rule. The classic example: a hospital requires at least one doctor on call. Two on-call doctors each check "is anyone else on call?", see yes, and both go off call. Neither wrote the other's row, so no conflict is detected.

**Serializable:** the database guarantees the result matches *some* one-at-a-time order, aborting transactions when it detects a conflict. No anomalies, at the cost of more aborted transactions to retry.

## Fixing the seat-booking bug

Back to the last seat. Several correct approaches, from simplest:

- **An atomic conditional update:** `update flights set seats_left = seats_left - 1 where id = $1 and seats_left > 0`. If it changed zero rows, the seat's gone. The database does the check and write as one step.
- **A unique constraint:** a `bookings` table with a unique index on (flight, seat). The second insert fails. Let the database enforce the rule.
- **Lock the row:** `select ... for update` inside the transaction, so the second booker waits until the first commits, then sees the true count.
- **Serializable isolation:** run the check-then-book transaction as serializable, and retry when the database aborts it.

The pattern to avoid is read, decide in application code, then write, without one of these protections. It works perfectly in testing, where nothing is concurrent, and fails in production.

<!-- quiz -->

## During a network partition, a system keeps answering all requests but some return stale data. What has it chosen?

- Consistency over availability
- [x] Availability over consistency
- Neither; partitions don't affect it

CAP says that while partitioned, a system can refuse some requests to stay correct, or answer all of them and risk being stale. This one chose to answer.

## Two users add $10 to a $100 balance at once, and it ends at $110. What anomaly is this?

- Write skew
- Dirty read
- [x] Lost update

Both read $100, both wrote $110, and one update was lost. An atomic update like balance = balance + 10 prevents it.

## Two on-call doctors each see the other is on call, and both go off call. Which isolation level reliably prevents this?

- Read committed
- Repeatable read
- [x] Serializable

This is write skew: each transaction writes a different row, so snapshot isolation doesn't see a conflict. Serializable isolation detects it.

<!-- practice -->

## Problem

You're designing a ticketing site for concerts. For each piece of data, choose a consistency level and justify it: (a) seats sold for a show; (b) the number of people currently viewing the event page; (c) a user's own list of purchased tickets; (d) the event description, which organizers occasionally edit. Then explain how you'd stop two buyers from getting the same seat.

## Solution

### Consistency per data

- **(a) Seats sold: strong (linearizable) consistency.** Selling a seat twice means refunds, angry fans and a crowded aisle. During a partition, it's better to refuse a purchase than to oversell. These writes go to one leader database.
- **(b) Viewer count: eventual.** It's a rough number for urgency. Approximate and a few seconds old is fine, so keep it in a counter in Redis, or even estimate it.
- **(c) My tickets: read-your-writes.** Right after buying, the user must see their ticket, or they'll panic and buy again. Read this page from the leader, or right after purchase show the ticket from the purchase response itself.
- **(d) Event description: eventual,** cached at the CDN for a minute or two. A short delay after an edit harms no one.

### Preventing double sales

Put a unique constraint on `(show_id, seat_id)` in the tickets table, so the database rejects the second sale outright. Because payment takes time, add a short **hold**: when a buyer picks a seat, insert a hold row (also unique per seat) with an expiry of, say, 10 minutes; checkout converts the hold into a ticket. Expired holds are released by a background job. The rule that matters, "one seat, one ticket," is enforced by the database, not by application code that reads and then writes.
