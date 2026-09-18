# Semantic Caching (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 09**

## 1. Definition

Serving a cached response when a new query is semantically similar to a previous one. From a performance perspective the question is whether the lookup cost and hit rate justify it, given that the lookup is paid on every miss.

> The correctness and threshold design is in [25-llm-cost-optimization/06](../25-llm-cost-optimization/06-semantic-caching.md). This topic is the latency arithmetic.

## 2. Simple Explanation

A semantic cache lookup isn't free — it's an embedding call plus a vector search, and you pay it whether or not you get a hit.

So the latency benefit depends on the hit rate, and below a certain rate the cache makes the system slower on average.

## 3. How It Works

```
LOOKUP COST (paid on every request)
  embed the query        20-50 ms   ← unless already cached
  cache vector search     5-15 ms
                         ────────
                         25-65 ms

HIT   saves the full request      ~3,000 ms
MISS  costs the lookup            ~25-65 ms, wasted

EXPECTED SAVING
  = hit_rate × 3,000 − 65

Break-even at roughly a 2% hit rate. Above that it's
clearly worth it on latency.
```

**The break-even is low**, which is the reassuring part — but it assumes the query embedding is needed anyway, which changes the arithmetic.

## 4. Practical Example

**The arithmetic detail that matters:**

```
The query has to be embedded for RETRIEVAL regardless.

So if the cache lookup reuses that same embedding, the
marginal lookup cost is only the vector search — 5-15 ms,
not 25-65.

Sequence it correctly:
  1. embed the query (needed anyway)
  2. check the semantic cache with that vector
  3. on miss, proceed to retrieval with the same vector

Done this way the cache is nearly free on a miss, and the
break-even hit rate drops to well under 1%.

Embedding twice — once for the cache, once for retrieval —
is the implementation error that makes the arithmetic look
marginal.
```

**That sequencing point is the practical contribution.**

**Where the latency win is largest:**

```
A hit removes:
  retrieval    200 ms
  reranking    300 ms
  TTFT         600 ms
  generation 1,900 ms
             ────────
             3,000 ms → ~15 ms

That's a 200× improvement for those requests, which at a
30-40% hit rate on FAQ traffic meaningfully moves the p50.
```

**What it does to p99:**

```
Cache hits are fast and consistent. Misses are unchanged.

So a cache IMPROVES p50 substantially and does almost
nothing for p99 — the slow requests were misses anyway.

That's worth knowing when the complaint is about tail
latency: caching is the wrong fix for a p99 problem, and
it's an easy thing to reach for because it obviously helps
the average.
```

## 5. Why It Matters

- **Reusing the retrieval embedding** drops the break-even hit rate below 1%.
- **A hit is a ~200× improvement** for that request.
- **Caching improves p50 and barely touches p99** — wrong fix for tail latency.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Embedding twice** | Doubles the lookup cost unnecessarily |
| **Low hit rate on long-tail traffic** | Lookup cost with little return |
| **Expecting it to fix p99** | Slow requests were misses anyway |
| **Threshold too low for speed** | Fast wrong answers |
| **Cache search not indexed** | Lookup grows with cache size |
| **No hit rate monitoring** | Can't tell whether it's earning its place |

**On cache index size:** the cache is itself a vector index, so it needs the same treatment — an ANN index rather than a linear scan, and a bounded size with eviction. An unbounded cache eventually has a lookup slower than the retrieval it was meant to avoid, which is a failure mode that arrives gradually and is easy to miss.

**On measuring it honestly:** the metric is the change in p50 and the hit rate, measured after deployment rather than estimated. An FAQ workload caches well and a long-tail or investigative workload doesn't — and the difference is large enough that it's worth measuring on real traffic before committing to the complexity.

## 7. Interview Answer

> "From a performance perspective the question is whether the lookup cost and hit rate justify it, because the lookup is paid on every request whether or not you get a hit.
>
> A naive implementation costs an embedding call plus a vector search — twenty-five to sixty-five milliseconds — against a hit saving roughly three seconds. That breaks even around a two percent hit rate, which is already low.
>
> But the detail that matters is that the query has to be embedded for retrieval regardless. So if the cache lookup reuses that same embedding, the marginal cost is only the vector search — five to fifteen milliseconds. Sequence it as: embed the query, check the semantic cache with that vector, and on a miss proceed to retrieval with the same vector. Done that way the cache is nearly free on a miss and the break-even drops to well under one percent.
>
> Embedding twice — once for the cache and once for retrieval — is the implementation error that makes the arithmetic look marginal, and it's easy to introduce because the cache feels like a separate component.
>
> The win on a hit is large: retrieval, reranking, TTFT, and generation all disappear, so three seconds becomes about fifteen milliseconds. At a thirty to forty percent hit rate on FAQ traffic that meaningfully moves the p50.
>
> The thing I'd be clear about is what it does to p99. Cache hits are fast and consistent; misses are unchanged. So caching improves p50 substantially and does almost nothing for p99, because the slow requests were misses anyway. If the complaint is about tail latency, caching is the wrong fix — and it's an easy thing to reach for, because it obviously helps the average and people assume that carries through.
>
> Two operational points. The cache is itself a vector index, so it needs an ANN index rather than a linear scan, and a bounded size with eviction. An unbounded cache eventually has a lookup slower than the retrieval it was meant to avoid — a failure that arrives gradually and is easy to miss because it degrades rather than breaks.
>
> And I'd measure the hit rate on real traffic rather than estimating it. An FAQ workload caches well and a long-tail or investigative workload doesn't, and the difference is large enough to decide whether the complexity is worth taking on at all."

## 8. Likely Follow-ups

**Q: What does the lookup cost?**
An embedding plus a vector search if implemented naively — twenty-five to sixty-five milliseconds, paid on every request including misses. But the query is embedded for retrieval anyway, so reusing that embedding drops the marginal cost to just the vector search.

**Q: What's the break-even hit rate?**
Around two percent naively, and well under one percent if the retrieval embedding is reused. That's low enough that the latency case is easy — the harder question is the correctness risk from false hits, which is a separate discussion.

**Q: Does it help p99?**
Barely. Hits are fast and misses are unchanged, so it improves p50 substantially while the slow requests — which were misses — stay slow. Reaching for caching to fix a tail latency complaint is a common and unproductive move.

**Q: What's the implementation error?**
Embedding the query twice, once for the cache lookup and once for retrieval. It doubles the lookup cost and makes the arithmetic look marginal when it isn't. Sequencing it so one embedding serves both is what makes the cache nearly free on a miss.

**Q: What degrades over time?**
An unbounded cache index. The cache is itself a vector index, so without an ANN structure and eviction the lookup grows until it's slower than the retrieval it was avoiding — and it degrades gradually rather than breaking, so it's easy to miss.

## 9. Common Mistakes

- Embedding the query separately for the cache lookup.
- Expecting semantic caching to improve p99.
- An unbounded cache with a linear-scan lookup.
- Lowering the threshold to raise the hit rate.
- Estimating the hit rate rather than measuring it on real traffic.

## 10. What to Remember

- **The lookup is paid on every miss** — sequence it to reuse the retrieval embedding.
- **Break-even is under 1%** when implemented correctly.
- **A hit is ~200×** for that request; misses are unchanged.
- **It improves p50, not p99** — wrong fix for tail latency.
- **The cache is a vector index** — index it and bound it.
