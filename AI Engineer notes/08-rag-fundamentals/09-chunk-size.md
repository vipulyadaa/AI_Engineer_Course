# Chunk Size

> **Phase 08 · RAG FUNDAMENTALS · Topic 09**

## 1. Definition

How much text goes into each retrievable unit, usually measured in tokens. It's the single most consequential tuning parameter in a RAG pipeline, and it must be chosen by measurement rather than intuition.

## 2. Simple Explanation

Chunk size controls a trade-off between **precision of the embedding** and **completeness of the content**.

A small chunk produces a sharp, specific vector — but it may not contain enough to answer the question. A large chunk contains more — but its vector is an average over several topics, so it matches everything vaguely and nothing precisely.

## 3. How It Works

**What changes as size moves:**

| | Small (~200 tokens) | Medium (~600) | Large (~1500) |
|---|---|---|---|
| Embedding specificity | High | Good | Blurred |
| Self-contained meaning | Often lacks context | Usually complete | Complete |
| Precision of retrieval | High | Good | Low |
| Context budget used | Low per chunk | Moderate | High |
| top-k needed | Higher | Moderate | Lower |
| Index size / cost | Larger | Moderate | Smaller |

**Why large chunks blur:** an embedding is a single vector summarizing all the text. A 1500-token chunk covering fees, eligibility, and dispute procedure produces a vector that sits between all three — closer to a generic "account policy" region than to any specific question.

**Practical starting points:**

```
Prose / policy documents     500–800 tokens
FAQ pairs                    one Q&A pair per chunk, regardless of length
Tables                       one table (or one logical section) per chunk
Code                         one function or class
Chat / ticket transcripts    one exchange or one logical turn group
Legal / contracts            one clause or sub-clause
```

## 4. Practical Example

**Sweeping chunk size against an eval set** — this is how the decision should actually be made:

```
120 held-out questions with known correct source sections

chunk_size   recall@5   groundedness   avg context tokens
   256         0.74         0.81              1,280
   512         0.86         0.88              2,560
   800         0.89         0.91              4,000
  1200         0.87         0.86              6,000
  2000         0.81         0.79             10,000

→ 800 is the peak for recall and groundedness.
  512 gives 97% of the quality at 64% of the context cost.
```

That last line is the real decision. If this runs at high volume, 512 may be the better production choice — you're trading three points of recall for a 36% reduction in per-query token cost.

**The common misdiagnosis:** a team sees poor answers, assumes the LLM is the problem, and swaps models. The actual cause is 2000-token chunks whose embeddings don't discriminate. Sweeping chunk size would have found it in an afternoon.

## 5. Why It Matters

- **It's the highest-leverage single parameter** in most RAG systems.
- **It's also a cost lever** — chunk size × top-k determines the input tokens on every query, forever.
- **It interacts with everything** — top-k, reranking, and whether parent-child retrieval is worth adding.

## 6. Trade-offs / Failure Modes

| Too small | Too large |
|---|---|
| Facts split across boundaries | Embedding averages multiple topics |
| Pronouns lose their referent ("it charges $45") | Mostly irrelevant filler in the context |
| Need high top-k to reassemble an answer | Answer buried; models attend worse to long mid-context spans |
| Larger index, more vectors | Fewer, blunter retrieval units |

| Other failures | Detail |
|---|---|
| **Uniform size across content types** | A table and a paragraph need different treatment |
| **Measuring in characters, not tokens** | Token count is what the context window and cost are denominated in |
| **Tuning without an eval set** | You're guessing, and the guess is usually too large |
| **Never re-tuning** | The right size shifts as the corpus and query mix change |

## 7. Interview Answer

> "Chunk size controls a trade-off between embedding precision and content completeness. A small chunk gives a sharp, specific vector but may not contain enough to answer the question. A large chunk contains more, but its vector is an average over several topics, so it matches everything vaguely and nothing precisely.
>
> My starting point for prose is five to eight hundred tokens, but I'd treat that as a hypothesis and sweep it against an eval set — say 256, 512, 800, 1200 — measuring recall@k and groundedness for each. The right value depends on document type and query style, so there's no universal answer.
>
> The thing I'd add is that the sweep also exposes a cost decision. In a typical result, 800 tokens might peak on quality while 512 gives about ninety-seven percent of it at sixty-four percent of the context cost. At high volume that's the better production choice, and it's a decision you can only make if you've measured.
>
> The misdiagnosis I'd watch for: teams see poor answers, assume the LLM is at fault, and swap models — when the real cause is two-thousand-token chunks whose embeddings don't discriminate. Sweeping chunk size would have found it in an afternoon.
>
> And I'd avoid a uniform size across content types. A fee table and a policy paragraph need different treatment — the table stays whole regardless of its token count."

## 8. Likely Follow-ups

**Q: What's a good default?**
500–800 tokens for prose, with 10–15% overlap. But I'd treat that as where the sweep starts, not where it ends. Structured content overrides it entirely — one FAQ pair, one table, one function, regardless of length.

**Q: How does chunk size interact with top-k?**
Inversely, on context budget. Small chunks need a higher k to assemble a complete answer; large chunks need a lower k to stay within budget. What actually matters is `chunk_size × k` — the total context tokens — so the two should be tuned together. A common good configuration is smaller chunks with a higher k plus a reranker to restore precision.

**Q: Do long-context models make chunk size irrelevant?**
No, they change the constraint rather than removing it. You can afford more and larger chunks, but retrieval precision still matters — models attend worse to information buried in the middle of a very long context, and cost still scales with tokens. Long context makes chunking more forgiving, not unnecessary.

**Q: Should chunk size vary within a corpus?**
Yes, by content type. Tables stay whole. Code splits on function boundaries. FAQ pairs stay together. Prose gets the swept default. A single size applied uniformly is a simplification that costs quality on the structured content, which is often where the precise answers live.

**Q: How do you know your chunk size is wrong?**
Two signatures. If recall@k is low but recall at a much higher k is fine, chunks may be too large and blurry — the right content is there but ranks poorly. If retrieved chunks are individually relevant but the model still can't answer, they're probably too small and the answer is split across chunks that didn't all get retrieved. I'd also just read the retrieved chunks for failing questions, which usually makes it obvious.

## 9. Common Mistakes

- Picking a size by intuition and never measuring.
- Measuring in characters instead of tokens.
- Using one size for prose, tables, and code alike.
- Tuning chunk size and top-k independently when what matters is their product.
- Assuming long-context models make it irrelevant.

## 10. What to Remember

- **Trade-off: embedding precision vs. content completeness.**
- **Start at 500–800 tokens for prose**, then sweep against an eval set.
- **Structured content overrides the default** — table, FAQ pair, or function per chunk.
- **Tune with top-k together** — `chunk_size × k` is the real budget.
- **Too large is the more common error**, and it presents as "the LLM is bad."
