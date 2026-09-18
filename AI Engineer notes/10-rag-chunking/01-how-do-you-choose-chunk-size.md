# How Do You Choose Chunk Size?

> **Phase 10 · RAG CHUNKING · Topic 01**

## 1. Definition

Chunk size is chosen by **measurement against an eval set**, not by intuition or a default. You sweep candidate sizes, measure retrieval recall and answer groundedness for each, and pick the point that balances quality against context cost.

## 2. Simple Explanation

There's no universal right answer, because the right size depends on your documents and your questions.

Short factual lookups over structured policy documents want smaller chunks. Questions requiring reasoning across a passage want larger ones. The only way to know is to try several and measure.

## 3. How It Works

1. **Build an eval set** — 100+ real questions with their known correct source sections.
2. **Sweep sizes** — typically 256, 512, 800, 1200, 2000 tokens.
3. **Re-index at each size** (this is the slow part, so automate it).
4. **Measure per size:**
   - `recall@k` — is the correct chunk retrieved?
   - `groundedness` — can the model answer correctly from what it got?
   - average context tokens per query (the cost side)
5. **Pick the knee**, not the peak — the point where quality is near-maximum and cost is still reasonable.

**Starting points before you sweep:**

| Content | Start at |
|---|---|
| Prose / policy | 500–800 tokens |
| FAQ | one Q&A pair, regardless of length |
| Tables | one table |
| Code | one function or class |
| Legal | one clause |
| Transcripts | one speaker turn or topic segment |

## 4. Practical Example

```
120 eval questions, top-k = 5

size    recall@5   groundedness   avg context tokens   cost index
 256      0.74        0.81              1,280            1.00
 512      0.86        0.88              2,560            2.00
 800      0.89        0.91              4,000            3.13
1200      0.87        0.86              6,000            4.69
2000      0.81        0.79             10,000            7.81

Peak quality:  800
Best value:    512  — 97% of the quality at 64% of the context cost
```

**The decision depends on volume.** At 1,000 queries/day, take 800 and the extra quality. At 1,000,000 queries/day, 512 saves a substantial amount of money for three points of recall — and you might recover those three points with a reranker instead.

**Note the shape:** quality rises, peaks, then *falls*. Bigger is not monotonically better — past the peak the embedding blurs across topics and retrieval gets worse.

## 5. Why It Matters

- **It's the highest-leverage single parameter** in the ingestion pipeline.
- **It's also a permanent cost decision** — `chunk_size × top_k` is your input token bill on every query, forever.
- **Sweeping it is cheap** relative to the alternatives people try first, like swapping models.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Choosing by intuition** | Usually lands too large; embeddings blur |
| **Measuring in characters** | Tokens are what cost and context limits are denominated in |
| **Not sweeping at all** | The default in a tutorial is not tuned for your corpus |
| **Optimizing recall only** | Ignores the context cost side of the trade |
| **Uniform size for all content types** | Tables and code need structural boundaries, not token counts |
| **Never re-tuning** | The right size shifts as the corpus and query mix evolve |
| **Exceeding the embedding model's max input** | Silent truncation; content indexed but unretrievable |

**That last one is worth checking first.** If your embedding model caps at 512 tokens and you chunk at 800, the tail of every chunk is silently dropped — and your sweep will show 800 performing worse for a reason that has nothing to do with chunk size theory.

## 7. Interview Answer

> "I'd choose it by measurement, not intuition. Build an eval set of a hundred or more real questions with their known correct source sections, sweep candidate sizes — 256, 512, 800, 1200 — re-index at each, and measure recall@k and groundedness plus the average context tokens per query.
>
> What you typically see is that quality rises, peaks, then falls. Bigger isn't monotonically better: past the peak the embedding averages across too many topics and retrieval gets worse. So there's a genuine optimum rather than a 'more is better' direction.
>
> The decision isn't purely quality though. In a typical sweep, 800 tokens might peak on recall while 512 gives about ninety-seven percent of the quality at sixty-four percent of the context cost. At low volume I'd take the quality; at a million queries a day I'd take 512 and try to recover the three points of recall with a reranker instead, which is cheaper.
>
> Starting points before sweeping: five to eight hundred tokens for prose, but structured content overrides that entirely — one FAQ pair, one table, one function, regardless of token count.
>
> One thing I'd check before running the sweep: that chunk size is under the embedding model's max input. If the model caps at 512 and I chunk at 800, the tail of every chunk is silently truncated, and the sweep results would be misleading for a reason unrelated to chunk size."

## 8. Likely Follow-ups

**Q: What if you can't build an eval set?**
Then build a small one — even 30 questions with known sources is far better than guessing, and you can write them in an afternoon by sampling real user queries and having someone identify the correct section. Without any measurement, chunk size is a guess, and it's the parameter that most affects quality.

**Q: How does chunk size interact with top-k?**
What matters is their product, since `chunk_size × k` is your context budget. Small chunks need a higher k to assemble a complete answer; large chunks need a lower k to stay in budget. I'd sweep them together rather than independently — a common good configuration is smaller chunks with a higher k plus a reranker.

**Q: Should chunk size vary within a corpus?**
Yes, by content type. Tables stay whole, code splits on functions, FAQ pairs stay together, and prose gets the swept default. A uniform token count applied to everything is a simplification that costs quality precisely on the structured content where the exact answers live.

**Q: How often do you re-tune?**
When the corpus composition changes significantly, when the query mix shifts, or when you change the embedding model — since a different model has different optimal granularity. I'd also re-check after major chunking strategy changes. It's not a frequent task, but treating it as a one-time decision is a mistake.

**Q: What signals tell you the size is wrong?**
If recall@5 is low but recall@20 is fine, chunks may be too large and blurry — the content is there but ranks poorly. If retrieved chunks are individually relevant but the model still can't answer, they're likely too small and the answer is split across chunks that weren't all retrieved. Reading the retrieved chunks for failing questions usually makes it obvious.

## 9. Common Mistakes

- Picking a size from a tutorial default and never measuring.
- Measuring in characters rather than tokens.
- Optimizing recall without accounting for context cost.
- Sweeping chunk size and top-k independently.
- Not checking chunk size against the embedding model's input limit.

## 10. What to Remember

- **Sweep and measure.** 256 / 512 / 800 / 1200, scoring recall@k and groundedness.
- **Quality peaks then falls** — bigger is not monotonically better.
- **Pick the knee, not the peak**, weighing context cost at your query volume.
- **Structured content overrides the number** — one table, one FAQ, one function.
- **Check chunk size < embedding model max input** before anything else.
