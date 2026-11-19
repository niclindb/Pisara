---
category: Technology
topic: System design
title: "Case study: a chat app"
level: Advanced
reading_minutes: 11
---

Chat seems simple: someone types, someone else sees it. But a good chat app makes promises that are hard to keep together: messages arrive in real time, in the right order, on every device, exactly once, even when phones drop off the network mid-send. This final case study brings together real-time connections, sharding, ordering, idempotency and failure handling.

## 1. Requirements

**Functional:**

- One-to-one chats and group chats of up to 500 members.
- Messages arrive in real time when the recipient is online, and as a push notification when they're not.
- Full history, synced across a user's phone, tablet and laptop.
- Receipts: sent, delivered, read.
- Presence: "online" or "last seen 5 minutes ago."

**Non-functional:**

- **Low latency:** under 300 ms from send to delivery when both users are online.
- **Ordering:** everyone sees a conversation's messages in the same order.
- **No loss, no duplicates:** a message the sender saw as "sent" is never lost, and flaky networks never make it appear twice.
- **Durable** forever, and available even if parts of the system fail.

## 2. Estimates

- **50 million** daily active users, sending 40 messages a day: 2 billion messages a day, about **20,000 per second**, **60,000** at peak. (This is the practice problem from lesson 2.)
- At about 500 bytes each, that's **1 TB a day**, around **365 TB a year** before replication. That rules out a single relational database: this needs a store built for heavy, append-mostly writes.
- At peak, maybe **10 million** devices hold open connections. A well-tuned server can hold on the order of 100,000 idle connections, so about **100 connection servers**, plus headroom.

## 3. Real-time connections

Plain request-response HTTP can't push a message to a client the moment it arrives. Options:

- **Polling** ("anything new?" every few seconds): simple, but slow and wasteful.
- **Long polling:** the server holds each request open until there's news. Better, but awkward.
- **WebSockets:** one persistent, two-way connection per device. The standard choice for chat.

Devices connect to a fleet of **gateway servers** whose only job is holding connections. Unlike the stateless web servers of lesson 4, gateways are **stateful**: each knows which devices are connected to it. To deliver a message, the system must find the right gateway, so each gateway records its connections in a **session registry**, a Redis map from user ID to the gateway(s) holding their devices, with short TTLs refreshed by heartbeats.

## 4. Storing messages

Messages are written once, rarely changed, and almost always read as "the latest messages in this conversation" or "messages after the one I last saw." That's the access pattern wide-column stores (lesson 6) are built for.

Use Cassandra or ScyllaDB with a table like:

- **Partition key:** `conversation_id`, so a conversation's messages live together, and sharding (lesson 8) spreads conversations evenly.
- **Clustering key:** `seq`, the message's sequence number within the conversation, sorted descending, so "latest 50" is a single fast read.
- Columns: `message_id`, `sender_id`, `body`, `sent_at`.

Very long-lived, busy group chats can grow huge partitions, so add a time bucket to the partition key (`conversation_id`, `month`) when needed.

## 5. Ordering

Timestamps from phones can't order messages: device clocks are wrong all the time (lesson 13). Timestamps from different servers can't either. Instead, each conversation gets a **sequence number** assigned in one place.

Route all writes for a conversation to the chat-service instance that owns it (by hashing `conversation_id`), which assigns the next `seq` (or use an atomic counter per conversation in Redis). Every member's device sorts by `seq`, so everyone sees the same order. Ordering is only guaranteed *within* a conversation, which is all users can perceive.

## 6. Sending a message, step by step

1. The sender's app creates a **client message ID** (a random UUID) and sends the message over its WebSocket. The app shows it with a clock icon.
2. The gateway forwards it to the chat service that owns the conversation.
3. The chat service checks the client message ID against recent IDs for that conversation. If it's a retry of a message already stored, it returns the original result: **idempotency**, so a resend after a dropped connection never creates a duplicate.
4. It assigns `seq` and writes the message to the database. Only after the write is durable does it acknowledge the sender, whose app switches to a single check mark: **sent**.
5. It then delivers to each recipient: look up their devices in the session registry and push the message to those gateways, which push it down the WebSockets. For recipients with no live connection, it enqueues a **push notification**.
6. A recipient's device acknowledges receipt, and the sender gets a **delivered** receipt. When the recipient opens the chat, a **read** receipt follows. Receipts are just small messages flowing the other way, and can be batched ("read up to seq 812").

If the sender's connection drops before step 4's acknowledgment, the app resends with the same client message ID until it gets one. Combined with step 3, that gives exactly-once *effects* from at-least-once delivery, the pattern from lesson 10.

## 7. Sync across devices and reconnects

Each device remembers, per conversation, the highest `seq` it has. When it reconnects, after a tunnel, a flight or a gateway crash, it asks: "for my conversations, send me everything after these sequence numbers." The server reads those ranges from the message store.

This makes live delivery a **speed optimization**, not the source of truth. If a real-time push is lost, because a gateway died mid-delivery, say, the next sync fills the gap. Correctness comes from durable storage plus cursors; speed comes from WebSockets.

## 8. Group chats

A message to a 500-member group is **stored once** in the conversation's partition, not once per member. Delivery fans out to the members' online devices and push notifications for the rest. This is fan-out on read for storage and fan-out on write for delivery, the same trade-off as the news feed, settled differently because group sizes are capped. For very large groups or broadcast channels, skip per-member pushes for inactive members and let them sync when they open the app.

## 9. Presence

Presence is high volume and low value per update, so treat it cheaply:

- Each connected device sends a **heartbeat** every 30 seconds or so; the gateway sets a Redis key `presence:{user}` with a TTL of about a minute. No heartbeat means the key expires: offline, with a "last seen" time.
- Don't broadcast every change to every contact. Send presence only for the conversations a user has open, and fetch it on demand when they open one.
- Tolerate staleness: "online" being 30 seconds out of date is fine. Presence is eventually consistent by design.

## 10. Failure modes

- **A gateway crashes:** 100,000 devices disconnect at once. They must reconnect with **exponential backoff and jitter** (lesson 11), or the reconnect wave knocks over the next gateway. They then sync from their cursors, so no messages are lost.
- **The chat service owner for a conversation fails:** ownership moves to another instance (leader election, lesson 13). Sequence numbers must never repeat, so the new owner reads the highest stored `seq` before assigning more, or the counter lives in a replicated store.
- **Push notification providers slow down:** notifications go through their own queue, so delays there never slow live delivery.
- **A region fails:** replicate the message store across regions. Users reconnect to another region; recent messages may take a moment to appear, an availability-over-consistency choice for reads, while writes for each conversation still go through its single owner.

## Summary

Stateful WebSocket gateways with a session registry; a chat service that owns each conversation, deduplicates by client message ID and assigns sequence numbers; messages stored once per conversation in a wide-column store partitioned by conversation; acknowledgment only after a durable write; live pushes for speed and cursor-based sync for correctness; presence via heartbeats and TTLs. Most of what makes it work is the idea from lesson 10, applied end to end: deliver at least once, and make every step idempotent.

That's the end of the path. The habits that carried every case study are the ones from lesson 1: requirements before boxes, numbers before parts, and a named trade-off for every choice.

<!-- quiz -->

## Why does a chat app order messages by a per-conversation sequence number instead of the sender's timestamp?

- Timestamps take more storage
- [x] Device clocks are often wrong, so timestamps can put messages in the wrong order
- Sequence numbers are encrypted

One place assigns increasing numbers per conversation, so every member sees the same order regardless of anyone's clock.

## A phone loses signal right after sending, and the app resends the message. What prevents a duplicate?

- The WebSocket closes the old connection
- [x] The server recognizes the client message ID and returns the original result
- Messages are only sent once per minute

The client message ID makes sending idempotent: retries are safe because the server stores each ID once.

## A gateway crashes mid-delivery. Why are no messages lost?

- Gateways write every message to their local disk
- [x] Messages are already stored durably, and devices sync everything after their last sequence number when they reconnect
- The sender is asked to type it again

Live delivery is only the fast path. Durable storage plus per-device cursors guarantees the gaps get filled.

<!-- practice -->

## Problem

Add message editing and deletion ("delete for everyone") to the chat design. Edits and deletions must reach every member's devices, including ones offline for a week, and must not break ordering or sync. Describe how you'd model them and how they flow.

## Solution

### Model them as events, not in-place changes

Don't silently overwrite or remove the stored message. If you did, a device that synced up to `seq` 900 last week would never learn that message 850 changed, because its cursor is past it.

Instead, an edit or deletion is a **new event in the conversation**, with its own sequence number:

- `{type: "edit", target: message_id, new_body: "...", seq: 1201}`
- `{type: "delete", target: message_id, seq: 1202}`

### Flow

1. The editing device sends the event with a client event ID, for idempotency, like any message.
2. The conversation owner checks permission (only the sender can edit; maybe only within a time limit), assigns the next `seq`, and stores the event.
3. It's delivered live to online members like any message. Their apps apply it to the target message in place.
4. A device offline for a week reconnects and syncs everything after its cursor, including the edit and delete events, and applies them in order. Nothing is missed, because every change has moved the sequence forward.

### Storage and reads

For fast history loading, also update the original message row (store the latest body, an `edited` flag, or a `deleted` tombstone with the body removed), so a fresh device loading history sees the current state without replaying every event. The event remains the source of truth for sync.

### Details worth naming

- **Deletion means removing content:** blank the body in storage, not just hide it in the app, and let backups age out on their normal schedule. Users expect "delete" to mean deleted.
- **Ordering between edits:** two edits to the same message are ordered by their `seq`, so every device ends up with the same final text.
- **Push notifications** already sent can't be recalled on every platform; send a silent update so the app removes or updates them where it can.
