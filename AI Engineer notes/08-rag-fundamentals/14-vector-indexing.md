# Vector Indexing

> **Phase 08 · RAG FUNDAMENTALS · Topic 14**

## 1. Definition

Building a data structure that finds the nearest vectors to a query vector quickly. Exact search is linear in corpus size and too slow at scale, so production systems use **approximate** nearest-neighbour (ANN) indexes that trade a little recall for a lot of speed.

## 2. Simple Explanation

Comparing a query against a million vectors one by one is a million dot products per request. That's too slow.

An ANN index organizes the vectors in advance — into a navigable graph or into clusters — so a search only examines a small fraction of them. You give up exactness: the index might miss a true nearest neighbour occasionally. In exchange, search goes from linear to roughly logarithmic.

## 3. How It Works

**The main index types:**

| Index | Idea | Trade-off |
|---|---|---|
| **Flat** | Exact brute-force comparison | Perfect recall, linear time. Fine under ~100k vectors |
| **HNSW** | Multi-layer navigable graph; traverse from coarse to fine | Best recall/latency balance. High memory |
| **IVF** | Cluster vectors; search only the nearest clusters | Lower memory, needs training, tunable |
| **IVF-PQ** | IVF plus product quantization (compressed vectors) | Huge memory savings, some accuracy loss |
| **ScaNN** | Google's anisotropic quantization approach | Strong performance; behind Vertex AI Vector Search |

**HNSW parameters you'll be asked about:**

| Parameter | Effect |
|---|---|
| `M` | Connections per node. Higher = better recall, more memory |
| `ef_construction` | Effort at build time. Higher = better graph, slower build |
| `ef_search` | Candidates explored per query. **Tunable at query time** — the main recall/latency dial |

That last one matters: `ef_search` lets you trade recall for latency per request without rebuilding the index.

## 4. Practical Example

**ANN recall is a real, measurable loss that most teams never measure:**

```
500,000 chunks, 768 dimensions

Index      ef_search   recall@10 vs exact   p95 latency   memory
Flat          —              1.000            420 ms      1.5 GB
HNSW          40             0.923             8 ms       2.8 GB
HNSW         100             0.971            14 ms       2.8 GB
HNSW         200             0.989            26 ms       2.8 GB
IVF-PQ      nprobe=32        0.912             6 ms       0.3 GB
```

**The point:** at `ef_search=40` you're silently losing about 8% of true nearest neighbours. That compounds with every other recall loss in your pipeline. Measuring ANN recall against exact search on a sample is a step almost nobody takes, and it's cheap.

**Metadata filtering interacts with the index**, and this is the subtle part:

```
Pre-filter (filter, then search the subset)
  → correct results, but can be slow if the filter is very selective,
    because the graph structure doesn't help within an arbitrary subset

Post-filter (search, then discard non-matching)
  → fast, but you asked for top-10 and got 3 after filtering.
    Silently under-retrieves.
```

For access control you **must** pre-filter. Post-filtering both leaks and under-retrieves.

## 5. Why It Matters

- **ANN recall loss is invisible** unless you measure it, and it stacks with every other recall loss upstream.
- **Index choice is a memory-versus-quality decision** at scale — HNSW is fast and hungry, IVF-PQ is compact and lossier.
- **Filtering strategy is a security decision**, not just a performance one.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Never measuring ANN recall** | Silent loss compounding with everything else |
| **Post-filtering for access control** | Leaks, and silently returns fewer results than requested |
| **HNSW memory blowout** | Graph structure adds significant overhead beyond raw vectors |
| **IVF not trained on representative data** | Cluster centroids misplaced; recall suffers |
| **Rebuilding on every update** | Some index types handle incremental inserts badly |
| **Wrong distance metric** | Cosine vs. L2 vs. dot product must match how the model was trained |
| **Using ANN when Flat would do** | Under ~100k vectors, exact search is fast enough and simpler |

**On the distance metric:** most modern embedding models are trained with cosine similarity and output normalized vectors. If vectors are unit-normalized, cosine and dot product rank identically and L2 also produces the same ordering — but if they aren't normalized, the choice changes results. Match the metric to how the model was trained.

## 7. Interview Answer

> "Vector indexing is how you find nearest neighbours fast. Exact search is linear in corpus size, so at scale you use an approximate nearest-neighbour index that trades a little recall for a lot of speed.
>
> HNSW is the usual choice — a multi-layer navigable graph you traverse from coarse to fine. It has the best recall-latency balance, at the cost of memory. IVF with product quantization is the alternative when memory is the constraint, since it compresses vectors substantially at some accuracy cost. And below a hundred thousand vectors I'd just use flat exact search, because it's fast enough and has no recall loss to reason about.
>
> The thing I'd raise that most teams skip: measure your ANN recall against exact search on a sample. At a typical HNSW setting you might be silently losing eight percent of true nearest neighbours, and that compounds with every other recall loss upstream. `ef_search` is tunable per query, so once you've measured it you can trade recall against latency deliberately rather than accepting a default.
>
> The other decision I'd call out is metadata filtering, because it's a security question. Pre-filtering means the search only considers documents the caller is entitled to. Post-filtering means you search everything and discard afterwards — which both risks leakage and silently under-retrieves, since you asked for ten results and got three. For access control it has to be pre-filtering, and most vector databases support it natively during the search."

## 8. Likely Follow-ups

**Q: HNSW vs. IVF — how do you choose?**
HNSW when you want the best recall-latency trade-off and can afford the memory, which is most cases under a few million vectors. IVF, especially with product quantization, when memory or cost is the binding constraint at very large scale — it compresses vectors dramatically. IVF also needs a training step on representative data to place cluster centroids, which HNSW doesn't.

**Q: How do you measure whether your index is losing recall?**
Sample a few hundred queries, run them against both the ANN index and an exact flat search over the same vectors, and compute the overlap in top-k. That overlap is your ANN recall. It's cheap to run and it's the only way to know what the index is costing you — and it tells you whether raising `ef_search` is worth the latency.

**Q: How does metadata filtering work with ANN indexes?**
Pre-filtering restricts the candidate set before or during the graph traversal, which is correct but can get slow when the filter is very selective — the graph's structure doesn't help within an arbitrary subset. Post-filtering searches everything then discards, which is fast but under-retrieves and leaks. Most production vector databases implement filtered search natively, and that's what you want for access control.

**Q: What distance metric should you use?**
Whatever the embedding model was trained with, which for most modern models is cosine. If vectors are unit-normalized — and most models output normalized vectors — cosine, dot product, and L2 all produce the same ranking, so the choice is mostly about implementation efficiency. If they aren't normalized, the metrics diverge and using the wrong one degrades results.

**Q: How do you handle updates to the index?**
Depends on the index type. HNSW supports incremental inserts reasonably but degrades over many deletes, since deleted nodes leave holes in the graph — periodic rebuilds help. IVF handles inserts fine but cluster centroids drift as the distribution changes, so retraining occasionally matters. I'd use soft deletes with a tombstone filter and rebuild on a schedule rather than trying to keep the structure perfect continuously.

## 9. Common Mistakes

- Never measuring ANN recall against exact search.
- Post-filtering for access control.
- Using ANN when the corpus is small enough for exact search.
- Not matching the distance metric to the embedding model's training.
- Ignoring that HNSW degrades after many deletions.

## 10. What to Remember

- **ANN trades recall for speed.** HNSW for balance, IVF-PQ for memory, Flat under ~100k.
- **Measure ANN recall against exact search** — the loss is silent and compounds.
- **`ef_search` is a per-query recall/latency dial** you can tune without rebuilding.
- **Pre-filter for access control**, never post-filter.
- **Match the distance metric** to how the embedding model was trained.
