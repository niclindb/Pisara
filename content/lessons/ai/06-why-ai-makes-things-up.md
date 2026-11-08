---
category: Technology
topic: Artificial intelligence
title: Why AI makes things up
level: Intermediate
reading_minutes: 5
---

Ask a chatbot for sources on an obscure subject, and it may give you a neat list of books with authors, titles, and years. Some of them may not exist. This is called a **hallucination**: the model states something false, fluently and confidently.

## Why it happens

Remember what the model is trained to do: produce the most fitting next token. For a question it knows well, the fitting answer is usually the true one, because the truth showed up many times in its training text.

For something rare, the model has little to go on. But it still has to write *something*, and a made-up citation in the right format fits the pattern perfectly. It isn't lying. It has no separate step that checks facts against the world before it writes.

## Common traps

- **Specific details:** exact numbers, dates, quotes, page numbers, and citations.
- **Obscure topics:** small towns, minor historical figures, niche research.
- **Recent events:** a model learns from text up to its **training cutoff** date. Without a search tool, it may not know what happened after that, and may guess.
- **Leading questions:** "Why did Einstein win two Nobel Prizes?" may get a confident explanation, though he won one.
- **Long arithmetic:** it predicts digits as tokens, so long calculations can drift unless it uses a calculator tool.

## How it's getting better

Many chatbots can now search the web or read documents you give them, then answer from that text. This is often called **grounding**, or **retrieval**. It cuts down on made-up facts, especially when the bot shows its sources. Training also increasingly rewards saying "I'm not sure." But no current system is free of hallucinations.

## How to protect yourself

1. **Check what matters.** For anything medical, legal, financial, or that you'll repeat publicly, confirm it with a reliable source.
2. **Follow the links.** If it cites a source, open it and see whether it really says that.
3. **Give it the material.** Paste in the document and ask questions about that text, rather than relying on what it remembers.
4. **Ask it to flag uncertainty.** "Tell me which parts you're less sure of" often helps.
5. **Be suspicious of perfect detail on obscure topics.** That's exactly where invention happens.

A good mental model: a chatbot is like a very well-read friend who answers instantly and never likes to say "I don't know." Great for ideas, drafts, and explanations. Worth double-checking on facts.

<!-- quiz -->

## Why does a chatbot sometimes invent a source that doesn't exist?

- It's trying to trick you
- [x] It writes text that fits the pattern, without checking facts against the world
- Its internet connection failed

The model produces likely-looking text. A fake citation in the right format can look just as likely as a real one.

## Which of these is a chatbot most likely to get wrong?

- What a cat is
- How to say "thank you" in Spanish
- [x] The exact page number of a quote from an obscure book

Common knowledge appears many times in training text. Precise details about rare things are where models are most likely to invent.

## What's the most reliable way to get accurate answers about a specific report?

- Ask the question twice
- [x] Give it the report and ask about that text
- Tell it to be very confident

Answering from text you provide (grounding) is much more reliable than relying on the model's memory.

<!-- practice -->

## Problem

A chatbot tells you: "A 2019 Harvard study by Dr. Ellen Marsh found that people who drink green tea live 7.4 years longer." What would you do before sharing this with anyone?

## Solution

Treat it as unverified. Several warning signs: a very specific number, a named researcher, and a big claim.

Search for the study yourself: the author's name, the university, and the year. Check whether it exists and whether it really says that. If you can't find it, assume it was invented. Even if a real study exists, check what it actually measured, because claims often get exaggerated as they're retold, by people and by chatbots alike.
