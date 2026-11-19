---
category: Technology
topic: System design
title: How to approach a design
level: Beginner
reading_minutes: 6
---

Ask ten engineers to "design Instagram" and the weak answers all start the same way: someone draws a load balancer. The strong answers start with a question. System design isn't a search for the correct diagram. It's a series of decisions, each made for a reason you can say out loud. This lesson gives you the order to make them in.

## Why the order matters

Every part of a system costs something. A cache costs freshness. A second database costs consistency. A queue costs immediacy. If you add parts before you know what the system must do, you pay those costs for nothing, and you can't defend the design when someone asks "why is that there?"

So the work goes in four steps: **requirements, estimates, a simple design, then the hard parts.**

## Step 1: Pin down the requirements

Requirements come in two kinds.

**Functional requirements** are what the system does, from a user's point of view. For a photo-sharing app:

- Users upload a photo with a caption.
- Users follow other users.
- Users see a feed of recent photos from people they follow.

Keep this list short. Three to five features is plenty, and saying what you're *leaving out* ("no comments, no stories, no direct messages for now") is part of a good answer.

**Non-functional requirements** are how well it must do it. These drive almost every design decision, so ask about each one:

- **Scale:** how many users, how many of them active each day, how many actions each?
- **Latency:** how fast must the feed load? 200 milliseconds? Two seconds?
- **Availability:** what does an hour of downtime cost? A social feed being down is embarrassing. A payment system being down loses money.
- **Consistency:** if I post a photo, must my followers see it instantly, or is a few seconds fine?
- **Durability:** can we ever lose a photo? (No.) Can we lose a "like"? (Maybe, rarely.)

Notice that different features can have different answers. Photos must never be lost; like counts can be approximate. Splitting requirements this finely is what lets you use cheap, simple parts where they're good enough.

## Step 2: Estimate the load

Turn the requirements into numbers: requests per second, storage per year, bandwidth. You don't need precision, only the right order of magnitude. The difference between 10 requests per second and 10,000 is the difference between one server and a fleet. The next lesson covers how to do this quickly.

## Step 3: Draw the simplest design that works

Start with the smallest thing that meets the requirements: a client, an app server, a database. Then walk each feature through it. "A user uploads a photo: the app stores the file, writes a row with the caption, returns." "A user opens their feed: the app queries photos from followed users, newest first."

Define the main API calls and the main tables as you go. They make the design concrete and expose problems early. If the feed query needs to join a billion-row table against a list of 500 followed accounts on every page load, you'll see it here.

## Step 4: Find the bottlenecks and fix them one at a time

Now hold the simple design up against your numbers. Where does it break first?

- If reads overwhelm the database, add a cache or read replicas.
- If one server can't handle the traffic, add more behind a load balancer.
- If an action is slow, ask whether the user needs to wait for it, or whether it can go on a queue.
- If one machine dying takes the whole system down, add a second.

Fix the worst problem, then look again. Each part you add should point back to a number or a requirement. That's the difference between a design and a collage of technologies.

## The habit that ties it together: name the trade-off

Every time you add or choose something, say what it costs. "I'll cache the feed for 30 seconds, so a new post may take up to 30 seconds to appear, which the requirements allow." This one sentence shows you understand the part, the requirement and the price. Interviewers listen for it, and so do the colleagues who'll run your system at 3 a.m.

## A note on "big company" designs

It's tempting to copy what Netflix or Google publish. Those designs exist because those companies have problems most systems never will. A single well-tuned PostgreSQL server handles thousands of writes per second and tens of thousands of simple reads. Many successful products run for years on one primary database. Scale up when the numbers say so, not before.

<!-- quiz -->

## Which of these is a non-functional requirement?

- Users can follow other users
- Users can upload a photo with a caption
- [x] The feed should load in under 300 milliseconds

Functional requirements say what the system does. Non-functional ones say how well, how fast or how reliably it must do it, and they drive most design choices.

## Why estimate load before drawing the design?

- Estimates are required before any code is written
- [x] The numbers decide which parts the design actually needs
- It makes the diagram look more complete

Ten requests per second and ten thousand need very different designs. Without numbers, you can't tell which parts are worth their cost.

## A teammate proposes sharding the database for a new internal tool with 200 users. What's the best response?

- Agree, since sharding is always the scalable choice
- [x] Ask what number makes sharding necessary, since one database likely handles this easily
- Suggest a second region instead

Sharding adds real complexity. Each part of a design should answer a requirement or a number, and 200 users don't ask for this one.

<!-- practice -->

## Problem

You're asked to design a simple version of a ride-hailing app. Before any architecture, write down three functional requirements, four non-functional requirements, and two features you'd explicitly leave out. For one non-functional requirement, explain how it would change the design.

## Solution

One reasonable answer:

### Functional

- A rider requests a ride from a pickup point to a destination.
- Nearby drivers see the request, and one accepts it.
- Rider and driver see each other's location live until pickup.

### Non-functional

- **Scale:** say 1 million rides a day in one country, with peaks at rush hour about 3 times the average.
- **Latency:** a driver's location should update on the rider's screen within a couple of seconds.
- **Availability:** high. If requests fail, riders take another app.
- **Consistency:** a ride must be accepted by exactly one driver, never two.

### Left out

- Payments and pricing (assume a fixed fare for now).
- Ratings, ride sharing and scheduled rides.

### How one requirement shapes the design

"Exactly one driver accepts a ride" needs a strong guarantee in one place. The accept step should be an atomic update in the database, such as `update rides set driver_id = $1 where id = $2 and driver_id is null`, and only the driver whose update changed a row wins. Location updates, by contrast, can be lossy and slightly stale, so they can go through a fast in-memory store without that guarantee. One requirement asks for care; the other lets you cut corners.
