---
category: Technology
topic: System design
title: Observability and SLOs
level: Intermediate
reading_minutes: 7
---

A design isn't finished when it's deployed. It's finished when you can tell, at any moment, whether it's working, and find out why when it isn't. Teams that skip this learn about outages from angry customers. This lesson covers the three kinds of signal a system should emit, how to decide what "working" means in numbers, and how to ship changes without breaking things.

## Three kinds of signal

**Metrics** are numbers measured over time: requests per second, error rate, latency, CPU use, queue depth. They're cheap to store and fast to query, which makes them right for dashboards and alerts. They tell you *that* something is wrong and roughly where.

**Logs** are records of individual events: "user 42 failed to log in: wrong password." They carry detail metrics can't, and they tell you *what* happened. Write them as **structured** data (JSON with consistent fields like `user_id`, `request_id`, `duration_ms`) rather than free text, so you can filter and count them. Watch the volume: logging every request at high traffic gets expensive quickly.

**Traces** follow one request across every service it touches. Each step records a **span** with its start, duration and parent, all sharing one **trace ID** passed along in request headers. A trace shows you that a slow checkout spent 40 ms in the app, 900 ms waiting on the inventory service, and 30 ms in the database. In a system of many services, traces answer *where* in a way the other two can't. **OpenTelemetry** is the common open standard for emitting all three.

## What to measure

Two short checklists cover most services.

**For anything that serves requests**, the "golden signals":

- **Traffic:** requests per second.
- **Errors:** the share of requests that fail.
- **Latency:** how long requests take, *for successful and failed requests separately*. A fast error isn't good latency.
- **Saturation:** how full the service is: CPU, memory, connection pools, queue depth.

**For resources** like disks and queues: utilization, saturation and errors.

## Percentiles, not averages

Average latency hides the experiences that matter. If 98 requests take 50 ms and 2 take 5 seconds, the average is about 150 ms, which describes nobody.

Use **percentiles**. The **p50** (median) is the typical request. The **p99** is the latency that 99% of requests beat, the slowest 1%. Those slow requests often belong to your heaviest users, with the most data, and a single page that makes 20 backend calls hits a p99-slow call on nearly one load in five. Track p50, p95 and p99, and set targets on the tail.

## SLIs, SLOs and error budgets

To decide whether a service is "working," define it in numbers.

- A **service level indicator (SLI)** is a measurement of user experience. For example: the share of requests that succeed in under 300 ms.
- A **service level objective (SLO)** is the target for it over a window. For example: 99.9% of requests over 30 days.
- An **SLA** (agreement) is a contract with customers, with penalties. It's set looser than the SLO so you have warning before you owe anyone money.

What do the nines mean over a 30-day month?

| SLO | Allowed failure per month |
|---|---|
| 99% | about 7 hours |
| 99.9% | about 43 minutes |
| 99.99% | about 4 minutes |

Each extra nine costs far more than the last: 4 minutes a month leaves no time for a human to even notice a problem, so it demands automation everywhere.

The gap between perfect and the SLO is the **error budget**. A 99.9% SLO gives you 0.1% of requests to "spend" each month. While budget remains, ship features quickly. When it's running out, slow down and spend effort on reliability. This turns the eternal argument between moving fast and staying stable into a number both sides agreed to in advance.

Don't aim for 100%. Users can't tell 99.99% from 100% through their own flaky Wi-Fi, and chasing it freezes development.

## Alerting that people trust

- **Alert on symptoms, not causes.** Page someone when users are affected (error rate up, latency up, SLO budget burning fast), not because CPU is at 80%, which may be perfectly fine.
- **Alert on how fast the error budget is burning.** A burn rate that would use a month's budget in two days is urgent; one that would take three weeks can wait for a ticket.
- **Every page must be actionable.** If the response to an alert is "ignore it," delete the alert. Noisy alerts train people to ignore the real ones.
- **Link each alert to a runbook:** what it means, what to check, how to mitigate.

## Shipping without breaking things

Most outages are caused by changes. A few practices limit the damage:

- **Canary releases:** send a new version to 1% of traffic, compare its error rate and latency to the old version, then widen gradually. Roll back automatically if it's worse.
- **Feature flags:** deploy code switched off, then turn it on for a few users, separately from the deploy. Turning a flag off is faster than a rollback.
- **Backwards-compatible database changes:** add a column, deploy code that writes both, backfill, switch reads, then remove the old column in a later release. Never ship a schema change the currently running code can't handle.
- **Blameless postmortems:** after an incident, write down what happened, why the system allowed it, and what will change. Focus on the system, not who pressed the button, or people stop telling you what really happened.

<!-- quiz -->

## Why track p99 latency instead of only the average?

- The average is harder to compute
- [x] The average hides the slow requests some users regularly experience
- p99 is always lower than the average

A small share of very slow requests barely moves the average, but those users, often your heaviest, feel every one.

## A service has a 99.9% availability SLO over 30 days. About how much downtime does that allow?

- About 4 minutes
- [x] About 43 minutes
- About 7 hours

0.1% of 30 days is about 43 minutes. That's the month's error budget.

## Which alert is best to page an engineer at night?

- CPU on one server is above 80%
- Disk is 50% full
- [x] The checkout error rate is burning the monthly error budget fast

Page on symptoms users feel. High CPU or half-full disks might be fine and belong on a dashboard or a daytime ticket.

<!-- practice -->

## Problem

You run the API for a food-delivery app. Today you have CPU and memory graphs, and logs written as plain text on each server. Last month, an outage went unnoticed for 25 minutes until customers complained on social media. Propose: (a) two SLIs and SLOs for the API, (b) the alerts you'd add, (c) changes to logging and tracing, and (d) one change to how you deploy.

## Solution

### (a) SLIs and SLOs

- **Availability:** share of API requests that don't return a server error (5xx). SLO: 99.9% over 30 days.
- **Latency:** share of "place order" requests that complete in under 500 ms. SLO: 99% over 30 days. Ordering gets its own SLI because it's the money path; browsing menus could get a looser one.

### (b) Alerts

- **Fast burn:** page the on-call engineer if the availability budget is burning at a rate that would use up a month's budget in about two days, measured over the last hour. This would have caught last month's outage within minutes.
- **Slow burn:** open a ticket if the budget is burning at a rate that would run out within the month.
- Remove or demote CPU and memory alerts to dashboards, unless they're paired with a user-facing symptom.

### (c) Logging and tracing

- Switch to **structured JSON logs** shipped to a central log service, with `request_id`, `user_id`, `route`, `status` and `duration_ms` on every line.
- Add **OpenTelemetry tracing** across the API, the restaurant service and the payment service, so a slow order shows which call was slow.
- Put the trace ID in every log line, so you can jump from a trace to its logs and back.

### (d) Deploys

Use **canary releases**: route 5% of traffic to the new version for 15 minutes, compare its error rate and latency against the old version, and roll back automatically if either is worse. Most bad deploys then affect a small slice of users for minutes instead of everyone for half an hour.
