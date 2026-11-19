---
category: Technology
topic: System design
title: Scaling the web tier
level: Beginner
reading_minutes: 7
---

Your app runs on one server, and it's getting slow at lunchtime. You have two choices: buy a bigger server, or buy more servers. The second sounds obviously better, but it only works if your code is ready for it. This lesson covers both options, what "ready" means, and how to stop static files from reaching your servers at all.

## Vertical scaling: a bigger machine

**Vertical scaling** (scaling up) means more CPU, more memory, faster disks, on the same machine.

**You gain:** simplicity. No code changes, no new parts. Cloud providers rent machines with hundreds of cores and terabytes of memory, so the ceiling is higher than most people think.

**You pay:** there's still a ceiling, prices climb steeply near it, and one machine is still one machine. When it fails or reboots for an upgrade, you're down.

Scaling up is a perfectly good first move, especially for databases, which are hard to split. For web servers, though, there's a better option.

## Horizontal scaling: more machines

**Horizontal scaling** (scaling out) means running several identical copies of your app behind a load balancer.

**You gain:** nearly unlimited capacity (add more copies), and resilience (if one copy dies, the others carry on). You can also deploy new versions one copy at a time.

**You pay:** you need a load balancer, and your app must not care which copy handles which request. That property has a name.

## Statelessness: the price of admission

A server is **stateless** when it keeps nothing between requests that another server would need. Every request carries, or can look up, everything needed to handle it.

Here's what breaks if you're not stateless. Say a user logs in and the server stores their session in its own memory. Their next request goes to a different server, which has never heard of them, and they're logged out. Or a user uploads a profile photo, which is saved to server A's disk. Server B gets the next request to show it and finds nothing.

The fix is to move state out of the app servers into shared places:

- **Sessions** go in a shared store like Redis, or into a signed token (such as a JWT or a signed cookie) that the client sends with each request.
- **Uploaded files** go to object storage (below), never the local disk.
- **Anything else long-lived** goes in the database or cache.

Once servers are stateless, they're interchangeable. You can add, remove or replace any of them at any time, which unlocks the next two ideas.

You may see **sticky sessions**, where the load balancer always sends a user to the same server. They're a crutch for apps that aren't stateless yet. They work until that server dies, at which point those users lose their state anyway, and they spread load unevenly.

## Autoscaling

With interchangeable servers, you can let the platform add and remove them automatically. **Autoscaling** watches a metric, often average CPU use, and adjusts the number of servers to keep it near a target, such as 60%.

A few things make it work well:

- **Scale on the right signal.** CPU is the default, but if your servers mostly wait on other services, request count or queue length may track load better.
- **Leave headroom.** A new server takes time to start, from seconds for a container to minutes for a virtual machine. Targeting 60% rather than 90% leaves room to absorb a spike while new capacity boots.
- **Set a minimum.** Keep at least two servers, in different zones, so one failure never leaves you with none.
- **Remember the database.** Autoscaling 10 web servers to 100 also multiplies the connections they open to the database. Databases have connection limits, so use a **connection pooler** (like PgBouncer) between them.

## Getting static files off your servers

A lot of traffic isn't really app logic: images, videos, JavaScript bundles, stylesheets. Two services handle it far better than your servers.

**Object storage** (Amazon S3, Google Cloud Storage, Supabase Storage and others) stores files of any size, cheaply, with very high durability, and with no disks for you to manage. Upload a file, get a key, and fetch it by key later. A common pattern: your app gives the client a **pre-signed URL**, a short-lived link that lets it upload directly to storage, so large uploads never pass through your servers at all.

A **CDN** (content delivery network, like Cloudflare, Fastly or CloudFront) runs servers in hundreds of cities. When a user requests an image, the nearest CDN server returns its cached copy; only on a miss does it fetch from your storage (the **origin**). Users get files from a few milliseconds away instead of across a continent, and your origin sees a small fraction of the traffic.

The usual difficulty with a CDN is updating cached files. The standard trick is to never update them: give each version of a file a new name, like `app.3f9a2c.js` or `photo-42-v2.jpg`, and let the old one expire. Unique names can be cached for a year with no risk of serving stale content.

## Putting it together

Users fetch static assets from a CDN backed by object storage. Dynamic requests go through a load balancer to an autoscaling group of stateless app servers, spread across at least two zones. Sessions live in Redis; files in object storage; everything else in the database. That shape scales a surprisingly long way, and what usually breaks next is the database, which is where the following lessons go.

<!-- quiz -->

## Users of a newly scaled-out app are randomly logged out. What's the most likely cause?

- The load balancer is using round robin
- [x] Sessions are stored in each server's memory, so other servers don't recognize them
- The CDN is caching the login page

Once requests can land on any server, state like sessions must live somewhere shared, such as Redis or a signed token.

## Why do teams give static files names like app.3f9a2c.js?

- It compresses the file
- It hides the file from search engines
- [x] Each version gets a new name, so CDNs can cache files for a long time without serving stale ones

A changed file gets a new name, so nothing ever needs to be cleared from the cache.

## Autoscaling grew your web servers from 10 to 80, and now the database is refusing connections. What helps most?

- Turning off autoscaling
- [x] Putting a connection pooler between the servers and the database
- Adding a CDN

Each server opens its own connections. A pooler shares a small set of database connections among many servers.

<!-- practice -->

## Problem

A small recipe site runs on one server. It stores user sessions in memory and saves uploaded recipe photos to the server's disk. Traffic is growing, and the owner wants to run three servers behind a load balancer. List everything that has to change first, and say what the site gains once it's done.

## Solution

### Changes before adding servers

1. **Sessions:** move them out of memory into Redis, or switch to signed cookies or tokens. Otherwise users are logged out whenever a request reaches a different server.
2. **Photos:** move existing photos from the local disk to object storage, and change uploads to write there, ideally directly from the browser using pre-signed URLs. Otherwise a photo uploaded to one server is missing on the others.
3. **Serve photos and assets through a CDN** in front of object storage, with versioned file names for CSS and JavaScript.
4. **Health check:** add an endpoint like `/health` so the load balancer can stop sending traffic to a broken server.
5. **Check for other local state:** scheduled jobs that should run once (not once per server), in-memory caches that must agree, or log files written to disk that should go to a log service instead.

### What it gains

Any server can handle any request, so the site survives one server failing, can deploy one server at a time without downtime, and can add servers (or autoscale) as traffic grows. Photo traffic, likely most of the bytes, no longer touches the servers at all.
