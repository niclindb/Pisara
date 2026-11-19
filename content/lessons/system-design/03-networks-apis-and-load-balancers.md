---
category: Technology
topic: System design
title: Networks, APIs and load balancers
level: Beginner
reading_minutes: 7
---

When you type a web address and press Enter, a request crosses half a dozen systems before your code sees it. Knowing what those systems are, and what each one is good at, lets you put work in the right place: caching at the edge, routing at the load balancer, logic in your servers. This lesson follows one request from start to finish.

## 1. DNS: finding the address

Computers talk to IP addresses, not names. **DNS** (the Domain Name System) turns `api.example.com` into an address like `203.0.113.7`.

Answers are cached at every step, in the browser, the operating system and the user's internet provider, for as long as the record's **TTL** says. Two consequences for design:

- **DNS changes are slow to spread.** If you point a name at a new server with a one-hour TTL, some users keep hitting the old one for an hour. Lower the TTL before a planned move.
- **DNS can do coarse routing.** "Geo DNS" returns a different address depending on where the user is, sending Europeans to a European data center. It's cheap and global, but slow to react when something fails.

## 2. TCP and TLS: opening a connection

With an address in hand, the client opens a **TCP** connection, which guarantees bytes arrive in order and none go missing. Then a **TLS** handshake sets up encryption (the "S" in HTTPS).

Each handshake costs at least one network round trip. To a server across an ocean, that's over 100 ms before the first byte of the actual request. That's why:

- Clients **reuse connections** for many requests instead of opening new ones.
- **HTTP/2** sends many requests over one connection at once, and **HTTP/3** (built on a protocol called QUIC) cuts handshake round trips further.
- Ending TLS close to the user, at a CDN or edge location, makes sites feel faster even when the server is far away.

## 3. The load balancer: picking a server

Unless your system is tiny, the address DNS returned belongs to a **load balancer**, not an app server. It spreads requests across a pool of identical servers, and it stops sending traffic to any server that fails its **health check** (a small request, like `GET /health`, sent every few seconds).

Load balancers come in two kinds, named after the network layer they understand:

**Layer 4 (transport)** balancers see only IP addresses and ports. They forward whole connections without reading them. They're extremely fast and protocol-agnostic, but they can't make decisions based on what's inside the request.

**Layer 7 (application)** balancers read the HTTP request itself. They can route `/api/*` to one pool and `/images/*` to another, terminate TLS, add headers, retry a failed request on another server, and apply rate limits. They do more work per request, but that's rarely the bottleneck.

Most web systems put a layer 7 balancer (like NGINX, Envoy, or a cloud application load balancer) in front of their app servers.

How does it choose a server?

- **Round robin:** each server in turn. Simple, and fine when requests cost about the same.
- **Least connections:** the server with the fewest open requests. Better when some requests are slow, like file uploads alongside quick lookups.
- **Hashing on a key** (such as user ID): the same user always lands on the same server. Useful when a server keeps something in memory per user, but a server dying or joining reshuffles users. Lesson 8 shows how consistent hashing limits that reshuffling.

The load balancer itself could be a single point of failure, so it's run as a redundant pair or as a managed cloud service that is redundant internally.

## 4. The API: the contract with clients

The request finally reaches your code. What it looks like is your **API** design, and there are three common styles.

**REST over HTTP with JSON** models the system as resources with URLs, acted on with HTTP methods: `GET /photos/42`, `POST /photos`, `DELETE /photos/42`. It's the default for public APIs: every language and tool speaks it, responses are readable, and `GET` responses can be cached by browsers and CDNs.

**gRPC** sends compact binary messages over HTTP/2, with the methods and message types defined in a schema file that generates client and server code. It's faster and strictly typed, and supports streaming in both directions. It's popular for service-to-service calls inside a company, and awkward for browsers.

**GraphQL** gives clients one endpoint where they ask for exactly the fields they want. It suits apps with many screens needing different slices of the same data. The cost: caching is harder, and one innocent-looking query can trigger a lot of database work, so servers need limits on query depth and cost.

Whatever the style, a few habits make APIs survive contact with real traffic:

- **Paginate every list.** Never return "all comments." Use a **cursor** (an opaque marker for "where you left off") rather than page numbers, which shift when items are added.
- **Make retries safe.** Networks drop responses, so clients retry. A `POST /payments` retried twice must not charge twice. Have the client send an **idempotency key**, a unique ID per intended action, and have the server remember which keys it has already processed.
- **Version deliberately.** Adding a field is safe; renaming or removing one breaks old clients, including phones that haven't updated in a year.

## The whole path

Browser → DNS lookup → TCP and TLS handshake (often at a CDN edge) → layer 7 load balancer → one of several app servers → database or cache → back the same way. Each hop is a place to add speed, add a check, or add a failure. You'll meet all of them again.

<!-- quiz -->

## What can a layer 7 load balancer do that a layer 4 one can't?

- Forward TCP connections
- [x] Route requests by URL path, like sending /api to one pool and /images to another
- Spread traffic across several servers

A layer 4 balancer only sees addresses and ports. Reading the HTTP request, including its path and headers, is what layer 7 means.

## Why do API clients send an idempotency key with a payment request?

- To encrypt the payment
- To make the request faster
- [x] So a retried request isn't processed twice

If the response is lost and the client retries, the server sees the same key, recognizes the action, and returns the original result instead of charging again.

## You move your site to a new server. Some users still reach the old one for an hour. What's the likely cause?

- The load balancer's health check failed
- [x] DNS answers were cached for the record's TTL
- TLS certificates take an hour to issue

Resolvers and browsers keep DNS answers until the TTL expires. Lowering the TTL a day before a move makes the switch quick.

<!-- practice -->

## Problem

Your product has a public REST API used by a mobile app, plus 20 internal services that call each other thousands of times per second. A teammate wants to switch everything to gRPC for speed. What would you recommend, and why? Also: the mobile app's "list orders" endpoint currently returns every order a customer has ever placed. What would you change?

## Solution

### Split by audience

- **Internal service-to-service calls:** gRPC is a good fit. Both ends are your code, the schema catches mistakes at build time, binary messages are smaller and faster to parse, and HTTP/2 keeps connections efficient at thousands of calls a second.
- **Public mobile API:** keep REST with JSON, at least for now. It's easy to debug, works with every HTTP tool, and `GET` responses can be cached by CDNs. Switching would break existing app versions in the field, which you can't force to update. If performance matters, measure first: the cost is usually database work, not JSON parsing.

### Fix the list endpoint

Returning everything grows without limit: a customer with 5,000 orders gets a huge, slow response. Add **cursor pagination**: `GET /orders?limit=20`, returning 20 orders plus a `next_cursor` (for example, an encoded "created before this timestamp and ID"). The app requests the next page with that cursor. Unlike `?page=3`, a cursor doesn't skip or repeat items when new orders arrive between requests. Keep the old behavior for old app versions for a while, with a hard cap, then retire it.
