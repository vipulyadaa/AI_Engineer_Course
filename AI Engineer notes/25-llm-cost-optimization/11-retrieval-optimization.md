# Retrieval Optimization (Cost)

> **Phase 25 · LLM COST OPTIMIZATION · Topic 11**

## 1. Definition

Reducing the cost of the retrieval stage itself — index serving, embedding calls, and reranking — as distinct from reducing the context those retrievals produce.

## 2. Simple Explanation

Retrieval has its own bill, separate from the model calls.

The vector index runs continuously whether or not anyone queries it. Every query embeds. Every reranked candidate costs. Those are smaller than generation but they're continuous, which makes them easy to overlook.

## 3. How It Works

```
WHERE RETRIEVAL COSTS SIT

INDEX SERVING       per hour, scaling with index size and
                    replicas — billed whether used or not
QUERY EMBEDDING     per request, a model call
RERANKING           per candidate, per request
PAYLOAD FETCH       storage reads
EMBEDDING (ingest)  one-time, then incremental
```

**Index serving is the one that surprises people** — a low-traffic system still pays for a continuously running index.

## 4. Practical Example

**Query embedding caching, which is free money on FAQ traffic:**

```
Banking FAQ traffic is heavily repeated. The same question
in the same words arrives many times a day.

An exact-match cache on the normalized query text → its
embedding removes an entire model call for a large share
of traffic.

  · no correctness risk — identical text, identical vector
  · no threshold to tune
  · no invalidation needed unless the embedding model
    version changes
  · keyed by model version, so a model change invalidates
    it automatically

It's the safest cache in the system and it's routinely
not implemented.
```

**Reranking cost, which scales with candidates:**

```
Cross-encoder cost is linear in candidates.

  rerank 50 → rerank 20  = 60% less reranking cost
                           and usually little recall loss

Measure it: run the golden set reranking 50, 30, 20, 10
candidates and find where recall@5 starts falling. That
inflection is your operating point.

Typically recall is flat from 50 down to around 20, because
the reranker is reordering candidates the retriever already
surfaced — and the ones ranked 20-50 rarely make the final 5.
```

**Index cost reduction:**

```
QUANTIZATION      int8 is ~4× less memory for modest recall
                  cost — often removes the need to shard,
                  which is a large infrastructure saving

REDUCED DIMENSIONS  256 instead of 768 is ~3× less storage;
                  test the quality cost on a golden set

REPLICA COUNT     sized for QPS, not for comfort. An
                  over-provisioned index bills continuously.

Quantization first — it's a configuration change where
sharding is a distributed system.
```

**Incremental re-embedding:** a content hash per chunk means re-ingestion only re-embeds what changed. Without it, every re-index pays the full corpus embedding cost — which is the largest one-time expense in the pipeline, paid repeatedly.

## 5. Why It Matters

- **Index serving bills continuously**, independent of traffic.
- **Query embedding caching** is the safest cache available and routinely skipped.
- **Reranking cost is linear in candidates**, with a measurable inflection.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No query embedding cache** | A model call per repeated question |
| **Reranking 50 candidates by default** | Linear cost with little recall gain |
| **Over-provisioned index replicas** | Continuous billing for idle capacity |
| **Sharding before quantizing** | A distributed system instead of a flag |
| **No content-hash embedding cache** | Full corpus cost on every re-index |
| **Index cost unmeasured** | Invisible against model spend |

**On measuring separately:** retrieval costs are small relative to generation, which means they disappear in an aggregate bill. Tracking index serving, embedding, and reranking as separate line items is what makes them visible — and at low traffic volumes the index can actually be the largest single cost, which nobody expects.

**On the quantization-before-sharding ordering:** quantization is a configuration change that reduces memory roughly fourfold for a modest recall cost. Sharding is a distributed system with scatter-gather latency bound by the slowest node. Taking the flag before the distributed system is almost always right, and it frequently removes the need for sharding entirely.

## 7. Interview Answer

> "Retrieval has its own bill separate from the model calls — index serving, query embedding, reranking, and payload reads. They're smaller than generation but they're continuous, which makes them easy to overlook.
>
> Index serving is the one that surprises people, because it bills per hour whether or not anyone queries it. At low traffic volumes the index can actually be the largest single cost, which nobody expects — and that only becomes visible if you track it as a separate line item rather than looking at an aggregate bill.
>
> The saving I'd implement first is query embedding caching. Banking FAQ traffic is heavily repeated — the same question in the same words arrives many times a day — so an exact-match cache on normalized query text to its embedding removes an entire model call for a large share of traffic. It's the safest cache in the system: identical text gives an identical vector, so there's no correctness risk, no threshold, and no invalidation needed unless the embedding model version changes. Key it by model version and that invalidation happens automatically. It's routinely not implemented.
>
> Reranking cost is linear in candidates, so going from fifty to twenty is sixty percent off reranking with usually little recall loss. I'd measure it — run the golden set reranking fifty, thirty, twenty, and ten candidates and find where recall at five starts falling. Typically it's flat from fifty down to around twenty, because the reranker is reordering candidates the retriever already surfaced and the ones ranked twenty to fifty rarely make the final five.
>
> For index cost, quantization before sharding. Int8 is roughly four times less memory for a modest recall cost, and it frequently removes the need to shard entirely. That matters because quantization is a configuration flag and sharding is a distributed system with scatter-gather latency bound by your slowest node. Taking the flag before the distributed system is almost always right.
>
> Reduced dimensions are the next lever — 256 instead of 768 is about three times less storage — but I'd test the quality cost on a golden set rather than assume it.
>
> And on ingestion, a content hash per chunk means re-ingestion only re-embeds what changed. Without it every re-index pays the full corpus embedding cost, which is the largest one-time expense in the pipeline — paid repeatedly."

## 8. Likely Follow-ups

**Q: What's the surprising retrieval cost?**
Index serving, because it bills per hour regardless of traffic. At low volumes the continuously-running index can be the largest single cost in the system, which only becomes visible if you track it separately rather than looking at an aggregate bill.

**Q: What's the safest cache to add?**
Query embedding caching — normalized query text to its vector. Identical text gives an identical embedding, so there's no correctness risk, no threshold to tune, and no invalidation except on a model version change. It's routinely skipped.

**Q: How do you reduce reranking cost?**
Fewer candidates. Cost is linear, so fifty to twenty is sixty percent off. Measure where recall@5 starts falling — typically flat from fifty down to around twenty, because candidates ranked twenty to fifty rarely make the final five anyway.

**Q: Quantization or sharding first?**
Quantization. Int8 is roughly four times less memory for a modest recall cost and frequently removes the need to shard entirely. It's a configuration flag where sharding is a distributed system with scatter-gather latency bound by the slowest node.

**Q: What about ingestion cost?**
A content hash per chunk so re-ingestion only re-embeds what changed. Without it, every re-index pays the full corpus embedding cost — which is the largest one-time expense in the pipeline, and paying it repeatedly is entirely avoidable.

## 9. Common Mistakes

- No query embedding cache on repetitive traffic.
- Reranking fifty candidates without measuring the inflection.
- Sharding before trying quantization.
- Over-provisioned index replicas billing continuously.
- No content-hash cache, so every re-index costs full price.

## 10. What to Remember

- **Index serving bills continuously** — often the largest cost at low volume.
- **Query embedding caching is the safest cache** and usually missing.
- **Reranking is linear in candidates** — measure the recall inflection.
- **Quantize before sharding** — a flag beats a distributed system.
- **Content-hash the embedded text** so re-indexing is incremental.
