---
category: Technology
topic: System design
title: Databases and indexes
level: Intermediate
reading_minutes: 7
---

The database is usually the hardest part of a system to change later. App servers can be replaced in an afternoon; moving billions of rows to a different database takes months. So it's worth choosing deliberately, and understanding what happens inside it when you run a query. This lesson covers the main families of databases, how indexes make queries fast, and the two storage engines underneath almost all of them.

## Relational databases: the default

**Relational databases** (PostgreSQL, MySQL, SQL Server) store data in tables with a defined schema, link tables with keys, and let you query across them with SQL.

What makes them the right default:

- **Transactions.** Several changes either all happen or none do. Moving money between two accounts can't leave one debited and the other not credited.
- **Constraints.** The database itself refuses bad data: duplicate emails, orders for customers that don't exist, negative quantities.
- **Flexible queries.** You don't need to know every question in advance. Joins, filters and aggregates work on any combination of columns.
- **Maturity.** Decades of tooling, and engineers who know how to run them.

A single relational server goes a long way, often to millions of users. Start here unless you have a specific reason not to.

## NoSQL: four different tools

"NoSQL" lumps together several kinds of database that each give up some relational features to gain something else.

- **Key-value stores** (Redis, DynamoDB in its simplest use): get and put a value by key, extremely fast, easy to spread across machines. You can only look things up by key.
- **Document stores** (MongoDB, Firestore): store JSON-like documents that can nest and vary in shape. They suit data read and written as one unit, like a product with its variants. Joins across documents are weak or missing.
- **Wide-column stores** (Cassandra, ScyllaDB, Bigtable): built for enormous write volumes spread across many machines, with data organized by a partition key you choose up front. Excellent for time series, event logs and messages. You must design tables around the queries you'll run, because ad hoc queries are slow or impossible.
- **Graph databases** (Neo4j): store nodes and the relationships between them, for queries like "friends of friends who live in Oslo." Niche, but unbeatable when relationships are the data.

The trade, roughly: NoSQL systems tend to scale out more easily, and you pay with weaker transactions, no joins, and having to know your access patterns in advance. Many large systems use both: a relational database for core records, and something else for one specific heavy workload.

## Indexes: how queries get fast

Without an index, finding `WHERE email = 'ada@example.com'` means reading every row in the table, a **full table scan**. With 100 million rows, that's seconds of work. An **index** is a separate sorted structure that maps column values to rows, so the database can jump straight to the match, the way a book's index takes you to a page.

The most common kind is the **B-tree**: a shallow, wide tree of sorted keys. Each step down narrows the search, and even a billion rows needs only about four or five steps. Because keys are sorted, a B-tree handles exact matches, ranges (`created_at > '2026-01-01'`), and sorting (`ORDER BY created_at`) well.

Indexes aren't free:

- **Every write updates every index on the table.** A table with eight indexes does nine writes for each insert.
- **They take disk and memory.** Large indexes that don't fit in memory lose much of their speed.

So index for the queries you actually run, and check with the database's `EXPLAIN` command that a query uses the index you expect.

### Composite indexes and column order

An index can cover several columns, like `(user_id, created_at)`. It's sorted by the first column, then by the second within each first value, like a phone book sorted by last name, then first name. That means:

- It serves `WHERE user_id = 7 ORDER BY created_at DESC`, perfectly: jump to user 7, read in order.
- It serves `WHERE user_id = 7` alone.
- It does **not** help `WHERE created_at > '2026-01-01'` alone, just as a phone book doesn't help you find everyone named "Ada."

Put the column you filter by equality first, and the one you sort or range over second.

## Under the hood: B-trees vs. LSM trees

Databases store data on disk using one of two main designs, and the choice shapes what they're good at.

**B-tree engines** (PostgreSQL, MySQL's InnoDB) update data **in place**: find the page that holds the row, change it. Reads are fast and predictable because each key lives in one spot. Writes are random disk updates, which limits write throughput.

**LSM-tree engines** (Cassandra, RocksDB, ScyllaDB) never update in place. New writes go to an in-memory buffer, which is flushed to disk as a new sorted file when full. Background **compaction** merges files and discards old versions. Writes are fast, sequential appends. Reads may need to check several files (helped by small filters that rule out files quickly), and compaction uses disk and CPU in the background.

The short version: **B-trees favor reads, LSM trees favor writes.** That's a big part of why Cassandra suits a firehose of messages or sensor readings, and PostgreSQL suits an order system that's read constantly.

## Choosing, in practice

Ask these in order:

1. **Do I need transactions across several records, or strict constraints?** Use a relational database.
2. **Is one access pattern enormous** (millions of writes a second, or petabytes) **and simple** (by key, or by key and time)? Consider a wide-column or key-value store for that part.
3. **Do I need search?** Full-text search, typo tolerance and relevance ranking belong in a search engine like Elasticsearch or OpenSearch, kept in sync from the main database.
4. **Otherwise,** PostgreSQL, well indexed.

<!-- quiz -->

## A table has an index on (user_id, created_at). Which query can't use it efficiently?

- WHERE user_id = 7
- WHERE user_id = 7 ORDER BY created_at DESC
- [x] WHERE created_at > '2026-01-01'

The index is sorted by user_id first. Without a user_id to jump to, the created_at values are scattered across the whole index.

## Why are LSM-tree databases like Cassandra good at heavy write loads?

- They skip writing to disk
- [x] Writes go to memory and are flushed as sequential appends, instead of random updates in place
- They store fewer columns

Sequential appends are much cheaper than updating scattered pages on disk. Background compaction tidies up later.

## What's the main cost of adding many indexes to a table?

- Reads become slower
- [x] Every insert and update must also update each index
- The table can no longer use transactions

Indexes speed up reads at the cost of extra work on every write, plus disk and memory.

<!-- practice -->

## Problem

You're building an online store. It needs: (1) customers, products, orders and payments; (2) a product search box with typo tolerance ("snekers" should find sneakers); (3) a clickstream log recording every page view, about 20,000 events per second, used for analytics. Choose storage for each, and design the index for this query on the orders table: "show customer 42's most recent 20 orders."

## Solution

### Storage

1. **Customers, products, orders, payments: PostgreSQL.** Placing an order touches several tables (order, line items, stock, payment) and must succeed or fail as a whole. Constraints catch bad data. These volumes fit one well-sized server for a long time.
2. **Search: Elasticsearch or OpenSearch**, fed from PostgreSQL by a background job or change stream whenever a product changes. Search engines handle typo tolerance, word stemming and relevance ranking, which SQL `LIKE` can't. PostgreSQL remains the source of truth; the search index can lag a few seconds and be rebuilt any time.
3. **Clickstream: not the main database.** 20,000 events a second, append-only, rarely updated, read in bulk. Send events to a stream like Kafka (lesson 10), then into a wide-column store or, more often, an analytics warehouse (BigQuery, ClickHouse, Snowflake). Keeping this load off PostgreSQL protects checkout.

### The index

```sql
create index orders_customer_recent on orders (customer_id, created_at desc);

select * from orders
where customer_id = 42
order by created_at desc
limit 20;
```

The database jumps to customer 42's section of the index and reads the first 20 entries in order. No scan, no sort. Equality column first, sort column second.
