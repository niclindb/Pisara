---
category: Technology
topic: System design
title: Queues, streams and async work
level: Intermediate
reading_minutes: 7
---

When a user uploads a video, they don't want to watch a spinner while it's transcoded into six formats. When a payment succeeds, the receipt email, the analytics event and the warehouse notification don't need to finish before the "Thank you" page appears. Moving work out of the request and into the background is one of the most useful moves in system design. This lesson covers the two main tools for it, queues and logs, and the guarantees you can and can't get from them.

## Why go asynchronous

A message system sits between a **producer** (the code that has work) and a **consumer** (the code that does it). That separation buys several things:

- **Fast responses.** The request only records the work; the slow part happens later.
- **Absorbing spikes.** If 50,000 jobs arrive in a minute, they wait in line rather than overwhelming the workers. Workers drain the backlog at their own pace.
- **Surviving failures.** If the email provider is down, jobs wait and retry instead of failing the sign-up.
- **Decoupling.** The checkout service publishes "order placed" without knowing who cares. Shipping, email and analytics each subscribe. Adding a fourth subscriber doesn't touch checkout.

The cost: the work happens *later*, and things that happen later can fail later, out of sight. Async systems need monitoring and retry logic that synchronous code doesn't.

## Message queues

A **message queue** (RabbitMQ, Amazon SQS, Google Cloud Tasks, or a jobs table in your database) holds jobs until a worker takes one. Each message goes to **one** consumer. When the worker finishes, it **acknowledges** the message, and the queue deletes it. If the worker crashes without acknowledging, the message becomes visible again after a timeout, and another worker gets it.

Queues are the natural fit for **tasks**: send this email, resize this image, generate this report. Add workers to go faster; each takes the next job.

## Logs (streams)

A **log** (Apache Kafka, Amazon Kinesis, Redpanda) is an append-only, ordered sequence of events that's kept for days or forever. Consumers don't remove messages; each consumer **group** simply tracks how far it has read (its **offset**).

That small difference changes a lot:

- **Many independent readers.** Shipping, analytics and fraud detection each read the same "order placed" events at their own pace.
- **Replay.** A new service can start from the beginning and build its state from history. A buggy consumer can be fixed and rewound.
- **Ordering.** Events are ordered within a **partition**. Choose the partition by key, such as order ID, and all events for one order arrive in order.

The price is operational complexity, and throughput per partition is bounded by one consumer at a time, so you scale by adding partitions.

**Rule of thumb:** use a queue for jobs that should each be done once by someone; use a log for events that several systems need to know about, or that you'll want to replay.

## Delivery guarantees

Networks and processes fail between "do the work" and "confirm it was done." So every message system gives one of these guarantees:

- **At most once:** a message is never redelivered, so a crash can lose it.
- **At least once:** a message is redelivered until acknowledged, so a crash after doing the work but before acknowledging means it's done **twice**.
- **Exactly once:** each message's effect happens once. True end-to-end exactly-once delivery isn't possible over an unreliable network in general. Systems that advertise it achieve it within their own boundaries, for example Kafka transactions between Kafka topics, not across your email provider.

In practice, you choose **at-least-once delivery plus idempotent consumers**, which gives exactly-once *effects*.

## Making consumers idempotent

An idempotent operation has the same result whether it runs once or five times. Techniques:

- **Natural idempotence:** "set status to shipped" is safe to repeat; "add 1 to count" is not.
- **Deduplication by ID:** each message carries a unique ID. The consumer records processed IDs, in the same database transaction as its work where possible, and skips IDs it has seen.
- **Conditional writes:** "mark order 42 paid *if it's still pending*."
- **Idempotency keys for external calls:** many payment APIs accept a key and refuse to charge twice for it.

## The dual-write problem and the outbox

A common bug: an order service saves the order to its database, then publishes "order placed" to Kafka. If it crashes between the two, the order exists but no one hears about it. Reverse the order and you might announce an order that was never saved.

The **transactional outbox** pattern fixes this. In the same database transaction that saves the order, insert the event into an `outbox` table. A separate process reads the outbox and publishes to the message system, marking rows sent. Either both the order and its event are saved, or neither is. Delivery is at-least-once, so consumers stay idempotent.

## When consumers fall behind

- **Backpressure.** If producers outpace consumers forever, the backlog grows without limit. Watch **queue depth** and **consumer lag** (how far behind the newest message consumers are) and alert on them. Autoscale workers on queue depth, and if needed, make producers slow down or reject work.
- **Retries with backoff.** Retry a failed message after a delay that grows each time (1 s, 2 s, 4 s...), so a struggling downstream service isn't hammered.
- **Dead-letter queues.** After several failed attempts, move the message aside to a **dead-letter queue** instead of retrying forever. A single malformed message ("poison pill") can otherwise block a partition or burn workers indefinitely. Someone inspects the dead letters, fixes the cause, and replays them.

<!-- quiz -->

## Three teams each need to react to every "order placed" event, and a new team may want past events. Which fits best?

- A message queue, where each message goes to one worker
- [x] A log like Kafka, where each consumer group tracks its own position
- A cron job that emails each team

A log keeps events so several consumer groups can read the same ones independently, and new ones can replay history.

## A worker charges a card, then crashes before acknowledging the message. With at-least-once delivery, what happens?

- The message is lost
- [x] The message is redelivered, so the charge runs again unless the worker is idempotent
- The queue refunds the charge

At-least-once means redelivery until acknowledged. Pass the payment provider an idempotency key so a second attempt doesn't charge twice.

## What does the transactional outbox pattern solve?

- Slow consumers
- [x] An order being saved without its event being published, or the reverse
- Messages arriving out of order

Saving the event in the same transaction as the data guarantees both or neither. A separate process publishes from the outbox.

<!-- practice -->

## Problem

A video platform's upload endpoint currently saves the video and then transcodes it into five resolutions before responding, which takes up to 4 minutes and often times out. Redesign the flow. Address: what the user sees, how jobs are run, what happens if a transcoding worker crashes mid-job, and how a job that always fails is handled.

## Solution

### The new flow

1. The client uploads the original file directly to object storage using a pre-signed URL.
2. The client calls `POST /videos` with the storage key. In one database transaction, the server inserts a `videos` row with status `processing` and an outbox row for a `transcode` job. It responds immediately with the video ID.
3. The user sees "Processing, we'll notify you when it's ready," and the page polls status or listens for a push notification.

### Running jobs

An outbox relay publishes one job per resolution to a queue (SQS or similar). A pool of transcoding workers autoscales on queue depth. Each worker writes its output to a deterministic path, like `videos/{id}/720p.mp4`, and marks that resolution done. When all five are done, the video's status flips to `ready`, and a notification event is published.

### Crashes

If a worker dies mid-job, it never acknowledges, so the message reappears after its visibility timeout (set longer than a normal transcode) and another worker picks it up. Because output paths are deterministic and "mark 720p done" is a conditional update, redoing a job just overwrites the same file and sets the same flag: the work is idempotent.

### A job that always fails

A corrupt upload will fail every time. After, say, 5 attempts with exponential backoff, the message goes to a dead-letter queue. The video's status becomes `failed`, the user is told to try another file, and the team gets an alert if dead letters pile up, which might signal a bug rather than a bad file.
