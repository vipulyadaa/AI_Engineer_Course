# Vector Indexing

> **Phase 07 · VECTOR DATABASES · Topic 03**

## 1. Definition

Building a data structure over a set of vectors so that nearest-neighbour queries examine only a small fraction of them. The index is what turns a linear scan into a sublinear search, at the cost of some recall.

## 2. Simple Explanation

Without an index, answering a query means comparing against every vector. An index organizes the vectors in advance so the search can skip most of them.

Every vector index family does this one of three ways: **partition** the space and search a few partitions, **build a graph** and walk it toward the query, or **compress** the vectors so more comparisons fit in the same time and memory.

## 3. How It Works

**The three families:**

| Family | Idea | Example |
|---|---|---|
| **Partitioning** | Cluster vectors; search the nearest few clusters | IVF |
| **Graph** | Link each vector to neighbours; greedily walk downhill | HNSW |
| **Compression** | Shrink vectors so comparisons are cheap | PQ, SQ |

**They compose.** IVF-PQ partitions *and* compresses. HNSW is often combined with scalar quantization. Real systems usually use a hybrid.

**The build/query trade-off every index exposes:**

```
BUILD TIME  ──  how long indexing takes, and how much memory
QUERY TIME  ──  latency at a given recall
RECALL      ──  fraction of true top-k actually returned
MEMORY      ──  resident footprint

You can improve any one by sacrificing another.
No index escapes this.
```

## 4. Practical Example

**Choosing, in practice:**

```
Flat (no index)
  exact · slow at scale · <100k vectors · a valid baseline

HNSW
  best recall/latency · high memory · slow build
  → the default for most RAG systems

IVF
  lower memory · needs training on a sample · tunable nprobe
  → large corpora where HNSW's RAM cost is prohibitive

IVF-PQ
  massive compression · noticeable recall loss
  → billion-scale, where you can't hold raw vectors

ScaNN (Google)
  what Vertex AI Vector Search uses under the hood
```

**The parameter that actually matters is the query-time one:**

```
HNSW:  ef_search    — how wide the graph walk is
IVF:   nprobe       — how many clusters to scan

Both trade latency for recall AT QUERY TIME, without rebuilding.

That's the important property: you can tune recall in production
by changing one number, no re-index required. Build-time
parameters (M, ef_construction, nlist) can't be changed without
rebuilding.
```

**How to set it:** sweep the query-time parameter, measure recall against exact search at each setting, and pick the smallest value meeting your recall target. That's a half-day of work that most teams skip and then guess at.

## 5. Why It Matters

- **The index is the difference** between a demo and a production system at scale.
- **Query-time parameters are tunable without rebuilding** — the single most useful operational fact about vector indexes.
- **Recall loss is silent** and compounds with every other recall loss in the pipeline.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Default parameters, never measured** | Unknown recall, usually lower than assumed |
| **Tuning for latency alone** | Recall quietly collapses |
| **Over-tuning for recall** | Latency and cost balloon for marginal gain |
| **Rebuild required for build-time params** | Expensive to discover late |
| **Index degradation after many deletes** | Graph quality erodes |
| **Ignoring build time** | Re-indexing a large corpus can take hours |

**On measuring recall:** build an exact flat index over the same vectors, run a few hundred sampled production queries against both, and compute top-k overlap. It's a few lines of code and it turns an unknown into a number. Without it, a 0.85-recall index looks identical to a 0.99-recall one from the outside.

**On deletes:** graph indexes handle deletion by tombstoning, and the graph's connectivity degrades as tombstones accumulate. A corpus with heavy churn needs periodic rebuilds, which is an operational cost worth planning for rather than discovering.

## 7. Interview Answer

> "A vector index is a structure that lets a nearest-neighbour query examine a small fraction of the vectors instead of all of them. There are three families and they compose.
>
> Partitioning — cluster the vectors and search only the nearest few clusters, which is IVF. Graph-based — link each vector to neighbours and greedily walk toward the query, which is HNSW. And compression — shrink the vectors so more comparisons fit in the same memory and time, which is product or scalar quantization. Real systems combine them: IVF-PQ partitions and compresses; Vertex AI Vector Search uses ScaNN, which is in this space.
>
> For most RAG systems HNSW is the default because it gives the best recall-latency curve. The cost is memory — it holds vectors and graph structure in RAM — and slow build times. IVF is what you move to when that RAM cost is prohibitive, and IVF-PQ at billion scale where you can't hold raw vectors at all.
>
> The operationally important fact is that both have a *query-time* parameter that trades latency for recall without rebuilding — ef_search for HNSW, nprobe for IVF. So you can tune recall in production by changing one number. Build-time parameters like M or nlist can't be changed without a full rebuild, which is worth knowing before you pick them.
>
> How I'd actually set it: build an exact flat index over the same vectors, run a few hundred sampled production queries against both, and compute top-k overlap at each parameter setting. Then pick the smallest value that meets the recall target. That's half a day of work, and it's the difference between knowing your recall is 0.97 and assuming it. From the outside an 0.85-recall index looks identical to a 0.99 one — the loss is completely silent, and it compounds with every other recall loss upstream.
>
> One operational thing I'd plan for: graph indexes tombstone on delete and connectivity degrades as tombstones accumulate, so a high-churn corpus needs periodic rebuilds."

## 8. Likely Follow-ups

**Q: What are the main index types?**
Partitioning like IVF, which clusters and searches the nearest few clusters. Graph-based like HNSW, which links vectors to neighbours and walks toward the query. And compression like product quantization, which shrinks vectors so more comparisons fit. They compose — IVF-PQ does both, and ScaNN behind Vertex AI Vector Search is in this space.

**Q: Which would you default to?**
HNSW for most RAG systems, because it gives the best recall-versus-latency curve. I'd move to IVF when memory becomes the constraint, since HNSW keeps vectors and graph structure in RAM, and to IVF-PQ at billion scale where holding raw vectors isn't possible at all.

**Q: Can you change recall without rebuilding?**
Yes, through the query-time parameter — ef_search for HNSW, nprobe for IVF. Both widen the search to raise recall at the cost of latency, with no re-index. Build-time parameters like M, ef_construction, or nlist do require a rebuild, which is why they deserve more thought upfront.

**Q: How do you know what recall your index gives?**
Build an exact flat index over the same vectors, run a few hundred sampled production queries against both, and compute the top-k overlap. That's your ANN recall. Without measuring it you're guessing, and the difference between 0.85 and 0.99 is invisible from outside the system.

**Q: What breaks over time?**
Graph indexes tombstone deleted vectors and connectivity degrades as tombstones accumulate, so recall drifts down in a high-churn corpus. Periodic rebuilds fix it, but that's an operational cost and a re-index window that should be planned rather than discovered.

## 9. Common Mistakes

- Running default index parameters and never measuring recall.
- Tuning only for latency, letting recall collapse silently.
- Not knowing which parameters are query-time versus build-time.
- Ignoring index degradation from accumulated deletes.
- Underestimating build time and memory for a large corpus.

## 10. What to Remember

- **Three families:** partition (IVF), graph (HNSW), compress (PQ) — and they compose.
- **HNSW is the sensible default**; IVF and IVF-PQ when memory forces it.
- **Query-time parameters (ef_search, nprobe) tune recall without rebuilding.**
- **Measure recall against exact search.** Otherwise it's an unknown.
- **Graph indexes degrade with deletes** — plan periodic rebuilds.
