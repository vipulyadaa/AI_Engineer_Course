# Latency

> **Phase 07 · VECTOR DATABASES · Topic 17**

## 1. Definition

The time from query to retrieved chunks. In a RAG system it's usually a small fraction of end-to-end latency, which is why optimizing it in isolation is often the wrong priority.

## 2. Simple Explanation

Vector search takes tens of milliseconds. Generation takes seconds. If you're optimizing retrieval before you've looked at the whole budget, you're optimizing the smallest term.

The exception is reranking, which is a retrieval-stage cost that can genuinely rival generation.

## 3. How It Works

**Where the time actually goes:**

```
Query embedding        20-50 ms   ← network call, often forgotten
ANN search              5-30 ms
Payload fetch           5-20 ms
Reranking (cross-enc) 100-500 ms  ← the real retrieval cost
                      ──────────
Retrieval total       130-600 ms

Generation (streaming, TTFT)  500-2000 ms
Generation (complete)        2000-8000 ms
```

**Two things this makes obvious:**

1. **Query embedding is a network round trip** and is comparable to the ANN search itself. Caching it for repeated queries is free latency.
2. **Reranking dominates retrieval.** Everything else is noise by comparison.

## 4. Practical Example

**What actually reduces perceived latency:**

```
1. STREAM the generation
   Time to first token is what users perceive. Streaming turns
   a 4-second wait into a 700 ms wait plus reading time.
   Bigger effect than every retrieval optimization combined.

2. CACHE query embeddings
   Banking FAQ traffic is heavily repeated. An exact-match
   cache on the normalized query removes an entire network
   round trip for a large share of traffic.

3. RUN retrievals concurrently
   Dense and sparse in parallel → max(a, b), not a + b.

4. RERANK FEWER
   Cross-encoder cost is linear in candidates. 50 → 20 cuts
   rerank time by 60% and usually costs little recall.

5. TUNE ef_search to the recall target
   Not to the maximum. The curve is steeply non-linear.
```

**Measure percentiles, not averages:**

```
p50  45 ms     ← what a dashboard average suggests
p95 180 ms
p99 900 ms     ← what a meaningful fraction of users experience

A p99 of 900 ms with a p50 of 45 usually means:
  · cold cache / cold index pages
  · a slow shard in scatter-gather
  · garbage collection or contention
  · unusually restrictive filters forcing a wider search

The p99 causes are structural. Averages hide all of them.
```

**On the budget question:** if the end-to-end target is 3 seconds and generation takes 2, retrieval has 1 second — which the numbers above fit comfortably, with reranking included. Knowing that ordering prevents spending a week on ANN tuning to save 15 ms.

## 5. Why It Matters

- **Retrieval is a small share of end-to-end latency** — optimize with that in view.
- **Streaming beats every retrieval optimization** for perceived speed.
- **p99 is where the structural problems show**, and averages hide them.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Optimizing ANN before generation** | Wrong term of the sum |
| **Averages instead of percentiles** | Hides cold starts, slow shards, contention |
| **Sequential hybrid retrieval** | Doubles retrieval latency unnecessarily |
| **Reranking too many candidates** | Linear cost, sharply diminishing returns |
| **Uncached query embeddings** | A full round trip on repeated queries |
| **Cold index pages** | First queries after deploy are slow |

**On cold starts:** memory-mapped indexes fault pages in on first access, so the first queries after a deploy or restart can be an order of magnitude slower. Warming the index with a set of representative queries before routing traffic removes a p99 spike that otherwise looks mysterious.

**On latency versus quality:** every retrieval latency reduction trades against recall — lower ef_search, fewer rerank candidates, smaller top-k. The right framing is a budget: decide the end-to-end target, allocate retrieval its share, and spend that allocation on whatever buys the most recall. Optimizing latency without a target just makes quality worse for no stated benefit.

## 7. Interview Answer

> "The first thing I'd say is that retrieval is usually a small share of end-to-end latency. Query embedding is twenty to fifty milliseconds, ANN search five to thirty, payload fetch five to twenty — so a hundred milliseconds or less before reranking. Generation is seconds. Optimizing ANN search in isolation is optimizing the smallest term.
>
> The exception is reranking. A cross-encoder over fifty candidates is a hundred to five hundred milliseconds, which dominates everything else in retrieval. So if I'm cutting retrieval latency, that's where the budget actually is — and reducing candidates from fifty to twenty cuts it by sixty percent while usually costing little recall.
>
> What actually moves perceived latency most is streaming the generation. Time to first token is what a user experiences, so streaming turns a four-second wait into seven hundred milliseconds plus reading time. That's a bigger effect than every retrieval optimization combined, and it's worth saying before discussing ef_search.
>
> After that: cache query embeddings, because it's a full network round trip and banking FAQ traffic is heavily repeated, so an exact-match cache on the normalized query removes it for a large share of traffic. Run dense and sparse retrieval concurrently so it's the max rather than the sum. And tune ef_search to the recall target rather than the maximum, since the curve is steeply non-linear.
>
> On measurement, I'd look at percentiles, not averages. A p50 of forty-five milliseconds with a p99 of nine hundred usually means something structural — cold index pages after a deploy, a slow shard in scatter-gather, garbage collection, or unusually restrictive filters forcing a wider search. Averages hide all of those. Cold starts specifically are worth warming for: memory-mapped indexes fault pages in on first access, so warming with representative queries before routing traffic removes a p99 spike that otherwise looks inexplicable.
>
> And I'd frame the whole thing as a budget. Decide the end-to-end target, give retrieval its share, and spend that allocation on whatever buys the most recall — because every latency reduction here trades against quality, and optimizing without a target just makes answers worse for no stated benefit."

## 8. Likely Follow-ups

**Q: Where does retrieval latency actually go?**
Query embedding is twenty to fifty milliseconds as a network call, ANN search five to thirty, payload fetch five to twenty. Then reranking at a hundred to five hundred, which dominates everything else. Without reranking, retrieval is well under a hundred milliseconds and rarely the bottleneck.

**Q: What reduces latency most?**
Streaming the generation, which changes perceived latency far more than any retrieval change. Then caching query embeddings, running dense and sparse retrieval concurrently, and reranking fewer candidates. ANN parameter tuning is last because it's the smallest term.

**Q: Why percentiles rather than averages?**
Because the interesting failures live in the tail. A p50 of forty-five milliseconds alongside a p99 of nine hundred points at cold index pages, a slow shard, contention, or restrictive filters widening the search. An average reports a healthy number while a meaningful fraction of users wait a second.

**Q: What causes latency spikes after a deploy?**
Cold index pages. Memory-mapped indexes fault pages in on first access, so the first queries after a restart can be an order of magnitude slower. Warming the index with representative queries before routing traffic removes that spike.

**Q: How do you trade latency against quality?**
As a budget. Set the end-to-end target, allocate retrieval a share, and spend it where it buys the most recall — usually more rerank candidates rather than a higher ef_search. Cutting latency without a target just lowers recall in exchange for nothing anyone asked for.

## 9. Common Mistakes

- Tuning ANN parameters before looking at the end-to-end budget.
- Reporting average latency instead of p95 and p99.
- Running hybrid retrieval sequentially.
- Reranking far more candidates than the recall gain justifies.
- Not warming the index after deploys.

## 10. What to Remember

- **Retrieval is a small share of end-to-end latency** — generation dominates.
- **Reranking is the real retrieval cost**; everything else is noise beside it.
- **Streaming beats every retrieval optimization** for perceived speed.
- **Measure p95 and p99** — averages hide cold starts and slow shards.
- **Treat it as a budget** and spend retrieval's share on recall.
