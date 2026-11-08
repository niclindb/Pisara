---
category: Technology
topic: Artificial intelligence / AI for developers
title: Calling a language model from code
level: Intermediate
reading_minutes: 6
---

Most AI engineering starts with one API call. Model providers like Anthropic, OpenAI and Google all work in a similar way: you send a list of messages, you get a message back. The examples here use Anthropic's TypeScript SDK, and the ideas carry over to the others.

## The basic call

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const response = await client.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 1024,
  system: "You write short, friendly product descriptions for a garden shop.",
  messages: [{ role: "user", content: "A stainless steel trowel with an oak handle." }],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}
```

Three parts matter:

- **`system`**: standing instructions that shape every reply: the role, rules, tone and format. This is where most of your prompt engineering lives.
- **`messages`**: the conversation so far, alternating `user` and `assistant`. The API keeps no memory between calls, so **you send the whole history every time**.
- **`max_tokens`**: a cap on the reply's length. If the reply hits it, it's cut off mid-sentence, so check why the model stopped (`stop_reason`) before trusting the output.

## Tokens are your cost and your limit

You pay per token, with separate prices for **input** (everything you send) and **output** (what the model writes). Output usually costs several times more per token. Prices are quoted per million tokens, so a single call is cheap, but sending a long document on every request of a busy app adds up fast. Each response reports its token counts in `usage`, so log them from day one.

Every model also has a **context window**: the most tokens it can take in at once, history included. Long chats eventually have to be trimmed or summarized.

## Streaming

A long reply can take many seconds to finish. Instead of making people stare at a spinner, **stream** it: the API sends text as it's written, and your UI shows it word by word. Every serious chat interface does this. The SDKs have streaming helpers that also give you the complete message at the end.

## Getting structured data back

Apps usually need data, not prose: a category, a list of fields, a score. Asking for JSON in the prompt mostly works, but "mostly" breaks production code. Providers now offer **structured outputs**, where you supply a JSON schema and the reply is guaranteed to match it. Validate anyway, and decide what your code does when a field is empty.

## Handle failure like any network call

- **Rate limits** (HTTP 429) and temporary server errors happen. The SDKs retry a couple of times by default. Back off and retry, and show a friendly message if it still fails.
- **Refusals:** a model can decline a request. Check the stop reason instead of assuming there's an answer.
- **Keys:** keep the API key on your server, never in browser code, where anyone can copy it.

## Choosing a model

Providers offer several sizes. Bigger models reason better and cost more. Smaller ones are faster and cheaper, and are often good enough for classification, extraction or short replies. Many models can also "think" before answering, trading time and tokens for better answers on hard problems. Start with a capable model to see what's possible, then measure whether a cheaper setting holds quality on your evals (lesson 9).

<!-- quiz -->

## Why do you send the full conversation history with every request?

- It makes replies faster
- [x] The API doesn't remember earlier calls
- The provider charges less for long requests

Each call starts fresh. The model only knows what's in that request, so your app keeps the history and resends it.

## Where should standing rules like tone and format usually go?

- In the first user message only
- [x] In the system prompt
- In `max_tokens`

The system prompt holds instructions that apply to the whole conversation.

## Why should an API key never be in your browser code?

- It slows the page down
- Browsers can't make API calls
- [x] Anyone can read browser code and use your key

Anything sent to the browser can be copied. Call the model from your server and keep the key there.

<!-- practice -->

## Problem

Your app summarizes a 20,000-token report each time a user opens it, and 1,000 users open it each day. The summary is about 500 tokens. Roughly how many input and output tokens is that per day, and what's one simple way to cut the cost?

## Solution

- Input: 20,000 × 1,000 = **20 million tokens a day**.
- Output: 500 × 1,000 = **500,000 tokens a day**.

The report doesn't change between users, so **generate the summary once and store it**. Then it's one call instead of a thousand. When the input repeats but each question differs (users asking about the same report), providers' **prompt caching** cuts the cost of resending the same long prefix.
