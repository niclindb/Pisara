---
category: Technology
topic: System design
goal: Design systems that scale and stay up, and explain the trade-off behind every part you choose.
---

A full path through system design, from the first questions you ask to complete designs of real products. You'll learn to estimate load on the back of an envelope, scale web servers, cache well, choose and grow a database, replicate and shard data, reason about consistency, move work onto queues and streams, keep systems up when parts fail, and watch them in production. It ends with three worked case studies that pull it all together, the way a design review or an interview would.

It builds on the "System design basics" lesson in Software engineering career, but starts from the beginning, so you don't need it first.

<!-- outline -->

1. How to approach a design (Beginner): requirements, the shape of an answer, starting simple
2. Back-of-the-envelope estimates (Beginner): latency numbers, requests per second, storage and bandwidth math
3. Networks, APIs and load balancers (Beginner): DNS, HTTP, REST vs. gRPC, layer 4 vs. layer 7 balancing
4. Scaling the web tier (Beginner): vertical vs. horizontal, stateless servers, autoscaling, CDNs and object storage
5. Caching in depth (Intermediate): cache layers, read and write patterns, eviction, invalidation, stampedes
6. Databases and indexes (Intermediate): relational vs. NoSQL, B-trees vs. LSM trees, picking indexes
7. Replication (Intermediate): leaders and followers, sync vs. async, lag, failover
8. Sharding (Intermediate): hash and range keys, consistent hashing, hot keys, rebalancing
9. Consistency, CAP and transactions (Advanced): consistency models, CAP and PACELC, isolation levels
10. Queues, streams and async work (Intermediate): queues vs. logs, delivery guarantees, idempotency, backpressure
11. Designing for failure (Advanced): timeouts, retries with jitter, circuit breakers, rate limits, redundancy
12. Observability and SLOs (Intermediate): metrics, logs and traces, SLIs, SLOs and error budgets, safe deploys
13. Consensus, leaders and locks (Advanced): Raft in plain words, leader election, fencing tokens, clocks
14. Case study: a rate limiter (Intermediate): token bucket vs. sliding window, Redis, failing open or closed
15. Case study: a news feed (Advanced): fan-out on write vs. read, celebrities, ranking, pagination
16. Case study: a chat app (Advanced): WebSockets, message ordering, delivery receipts, presence, storage
