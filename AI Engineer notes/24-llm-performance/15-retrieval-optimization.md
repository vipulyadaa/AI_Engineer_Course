# Retrieval Optimization (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 15**

## 1. Definition

Reducing the latency of the retrieval stages — query embedding, ANN search, reranking, and payload fetch — which together sit in front of time to first token and count as the same wait to the user.

> The cost angle is in [25-llm-cost-optimization/11](../25-llm-cost-optimization/11-retrieval-optimization.md). This topic is the latency breakdown.

## 2. Simple Explanation

Retrieval happens before the model does anything, so its latency is added directly to what the user waits for.

Within retrieval, the intuitive culprit — the vector search — is usually the smallest component. Reranking is typically the largest.

## 3. How It Works

```
TYPICAL RETRIEVAL BREAKDOWN

  query embedding      20-50 ms   ← a network round trip
  ANN search            5-30 ms   ← usually the smallest
  payload fetch         5-20 ms
  reranking          100-300 ms   ← usually the largest
                    ──────────
                     130-400 ms

Then TTFT, then generation.
```

**Reranking dominates retrieval latency**, and ANN search — the part that feels tunable — is often noise by comparison. That inversion is what misdirects optimization effort.

## 4. Practical Example

**Reranking, where the time actually is:**

```
Cross-encoder cost is linear in candidates.

  rerank 50 → 300 ms
  rerank 20 → 120 ms
  rerank 10 →  60 ms

Measure where recall@5 starts falling — typically flat from
50 down to around 20, because the reranker is reordering
candidates the retriever already surfaced, and those ranked
20-50 rarely reach the final 5.

So 50 → 20 is often 180 ms saved for no measurable recall
loss. That's the largest retrieval-side latency win
available.
```

**Parallelism, which is free:**

```
SEQUENTIAL
  embed → dense search → BM25 search → fuse → rerank
  = embed + max-of-nothing + ... sum of both searches

PARALLEL
  embed → (dense ‖ BM25) → fuse → rerank
  = embed + max(dense, BM25) + fuse + rerank

Hybrid retrieval running sequentially wastes the time of
whichever branch is faster. It's a few lines of async code
and it's frequently sequential because that's how it was
first written.
```

**Query embedding caching:**

```
20-50 ms is a network round trip comparable to the ANN
search itself. An exact-match cache on normalized query
text removes it entirely for repeated questions.

No correctness risk — identical text, identical vector.
Keyed by embedding model version so a model change
invalidates automatically.

The safest latency win in the system and routinely skipped.
```

**Cold index pages:** memory-mapped indexes fault pages in on first access, so the first requests after a deploy can be an order of magnitude slower. Warming with representative queries before routing traffic removes a p99 spike that reads as a deploy regression.

## 5. Why It Matters

- **Reranking dominates retrieval latency**; ANN search is usually noise.
- **Reranking fewer candidates** is the largest retrieval-side win.
- **Hybrid branches should run in parallel** — free, and often sequential by default.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Tuning ANN parameters first** | Usually the smallest component |
| **Reranking 50 candidates by default** | Linear cost, little recall gain |
| **Sequential hybrid retrieval** | Sum instead of max |
| **No query embedding cache** | A round trip per repeated question |
| **Cold index after deploy** | First requests an order of magnitude slower |
| **Restrictive filters degrading ANN** | Recall loss appearing as a quality problem |

**On ANN parameters:** `ef_search` or `nprobe` does trade latency for recall, and it's tunable at query time without rebuilding. But when ANN search is fifteen milliseconds of a four-hundred-millisecond retrieval stage, halving it saves seven milliseconds. It's worth setting correctly from a measured recall sweep and not worth optimizing for latency.

**On the filtered-recall interaction:** a restrictive permission filter can strand an ANN graph walk, which shows up as a recall problem rather than a latency one — but the mitigation, per-tenant namespaces, improves both, since a smaller graph is faster to search as well as more complete.

## 7. Interview Answer

> "Retrieval sits in front of time to first token, so its latency is added directly to what the user waits for — they don't distinguish retrieval time from model time.
>
> The breakdown usually surprises people. Query embedding is twenty to fifty milliseconds, a network round trip. ANN search is five to thirty. Payload fetch is five to twenty. And reranking is a hundred to three hundred — typically the largest component by a wide margin.
>
> So the part that feels tunable, the vector index, is often noise by comparison. That inversion is what misdirects effort: people tune ef_search while reranking fifty candidates.
>
> The largest retrieval-side win is reranking fewer candidates. Cross-encoder cost is linear, so fifty to twenty is roughly a hundred and eighty milliseconds saved. And recall is typically flat from fifty down to around twenty, because the reranker is reordering candidates the retriever already surfaced — the ones ranked twenty to fifty rarely reach the final five. So that's usually free latency, though I'd measure where recall at five starts falling rather than assume the inflection.
>
> Second is parallelism. Hybrid retrieval running dense and BM25 sequentially costs the sum; running them concurrently costs the max. It's a few lines of async code and it's frequently sequential simply because that's how it was first written.
>
> Third, query embedding caching. Twenty to fifty milliseconds is comparable to the ANN search itself, and an exact-match cache on normalized query text removes it for repeated questions — identical text gives an identical vector, so there's no correctness risk, and keying by embedding model version makes invalidation automatic. It's the safest latency win available and routinely skipped.
>
> On ANN parameters — ef_search does trade latency for recall and it's tunable at query time. But when ANN search is fifteen milliseconds of a four-hundred-millisecond stage, halving it saves seven. It's worth setting correctly from a measured recall sweep and not worth optimizing for latency.
>
> Two operational points. Cold index pages: memory-mapped indexes fault in on first access, so the first requests after a deploy can be an order of magnitude slower. Warming with representative queries before routing traffic removes a p99 spike that otherwise reads as a deploy regression.
>
> And there's an interaction worth knowing: a restrictive permission filter can strand an ANN graph walk, which presents as a recall problem rather than a latency one. The mitigation — per-tenant namespaces — improves both, because a smaller graph is faster to search as well as more complete."

## 8. Likely Follow-ups

**Q: What dominates retrieval latency?**
Reranking, typically a hundred to three hundred milliseconds. ANN search is usually five to thirty — noise by comparison. That inversion misdirects effort, because the index feels like the tunable part while the reranker is where the time actually is.

**Q: What's the biggest retrieval-side win?**
Reranking fewer candidates. Cost is linear, so fifty to twenty saves around a hundred and eighty milliseconds, and recall is typically flat down to about twenty because candidates ranked below that rarely reach the final five.

**Q: What's commonly left sequential?**
Hybrid retrieval. Running dense and BM25 one after another costs the sum where concurrent execution costs the max. It's a few lines of async code, and it stays sequential because that's how it was first written and nobody revisits it.

**Q: Is ANN parameter tuning worth it for latency?**
Not really. `ef_search` trades latency for recall, but when ANN search is fifteen milliseconds of a four-hundred-millisecond stage, halving it saves seven. Set it correctly from a recall sweep; don't optimize it for latency.

**Q: What causes a post-deploy latency spike?**
Cold index pages faulting in on first access, which can make the first requests an order of magnitude slower. Warming the index with representative queries before routing traffic removes it — otherwise it's investigated as a deploy regression.

## 9. Common Mistakes

- Tuning ANN parameters before measuring the breakdown.
- Reranking fifty candidates by default.
- Running hybrid retrieval branches sequentially.
- No query embedding cache.
- Not warming the index before routing traffic.

## 10. What to Remember

- **Reranking dominates; ANN search is usually noise.**
- **Fewer rerank candidates** is the largest retrieval-side win.
- **Run hybrid branches in parallel** — max, not sum.
- **Cache query embeddings** — the safest win, routinely skipped.
- **Warm the index after deploys** to remove the p99 spike.
