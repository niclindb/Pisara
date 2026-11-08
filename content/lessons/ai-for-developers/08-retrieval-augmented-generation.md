---
category: Technology
topic: Artificial intelligence / AI for developers
title: Retrieval-augmented generation (RAG)
level: Intermediate
reading_minutes: 6
---

A model doesn't know your company's documents, your product's manual or anything written after its training. You could paste everything into every request, but that's slow, costly and soon too big for the context window. **Retrieval-augmented generation**, or **RAG**, solves this: find the few passages that matter for each question, and give the model just those.

## The pipeline

**Ahead of time (indexing):**

1. **Split** your documents into **chunks**, often a few hundred words each, ideally along headings or paragraphs so each chunk makes sense on its own.
2. **Embed** each chunk: an **embedding model** turns the text into a vector that captures its meaning (lesson 3).
3. **Store** the vectors with their text in a **vector database**.

**For each question (querying):**

1. Embed the question the same way.
2. **Retrieve** the chunks whose vectors are closest to the question's, usually the top 3 to 10 by cosine similarity.
3. **Generate:** send the model the question plus those chunks, with instructions to answer only from them.

## Storing vectors

You don't need an exotic database. **Postgres with the pgvector extension**, which Supabase supports, handles a lot of real-world RAG:

```sql
create extension if not exists vector;

create table doc_chunks (
  id        bigserial primary key,
  source    text not null,          -- which document it came from
  content   text not null,
  embedding vector(1024)            -- the size depends on your embedding model
);

-- The 5 chunks closest in meaning to the question (<=> is cosine distance)
select source, content
from doc_chunks
order by embedding <=> $1
limit 5;
```

Embedding models come from several providers (such as Voyage AI, OpenAI or Google) and open-source projects. Use the same model for indexing and for questions, or the vectors won't be comparable.

## The prompt

```text
Answer the question using only the documents below.
Cite the source of each fact in brackets, like [returns-policy.md].
If the documents don't contain the answer, say you don't know.

<documents>
[returns-policy.md] Items can be returned within 30 days...
[shipping.md] Orders over €50 ship free within Finland...
</documents>

Question: Can I return a jacket I bought five weeks ago?
```

Asking for citations lets users check answers. Telling the model it may say "I don't know" cuts down on made-up answers.

## Where RAG goes wrong

Most failures are **retrieval** failures: the right passage never reached the model. So measure retrieval on its own (did the right chunk land in the top 5?) before blaming the model. Common fixes:

- **Better chunking:** chunks that are too small lose context, and chunks that are too big bury the answer.
- **Hybrid search:** combine vector search with plain keyword search, which is better at exact names, codes and product numbers.
- **Reranking:** retrieve 30 candidates cheaply, then use a stronger model to pick the best 5.
- **Metadata filters:** restrict to the right product, language or date, and to documents this user is allowed to see.

With today's very large context windows, small document sets can sometimes just be sent whole, especially with prompt caching. RAG matters when the material is large, changes often, or needs per-user access control.

<!-- quiz -->

## What's the main job of the retrieval step in RAG?

- To train the model on your documents
- [x] To find the few passages most relevant to the question
- To translate the question into SQL

Retrieval picks the relevant chunks, so the model gets the right context without reading everything.

## Why must you use the same embedding model for documents and questions?

- [x] Vectors from different models aren't comparable
- Different models are slower
- It's a legal requirement

Each embedding model has its own "map" of meaning. Distances only make sense within one map.

## A RAG bot gives wrong answers. What should you check first?

- Switch to the largest model available
- [x] Whether the right passages were retrieved at all
- Make the prompt longer

Most RAG failures happen before the model sees anything. If the answer wasn't in the retrieved chunks, no model can give it.

<!-- practice -->

## Problem

Users of a RAG bot for a hardware shop ask "Do you stock part ZX-4410?" and get "I don't know," even though the part is in the catalog. Vector search returns chunks about similar-sounding parts. What would you change?

## Solution

Exact codes like "ZX-4410" are a weak spot for vector search: embeddings capture meaning, and a product code has little "meaning" to capture. Add **keyword search** (Postgres full-text search, or a plain match on a part-number column) and combine it with vector search. That's hybrid search. Even better, detect part numbers in the question and look them up directly in the catalog table, then pass the result to the model.
