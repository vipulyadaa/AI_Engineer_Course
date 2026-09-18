# HNSW (Hierarchical Navigable Small World)

> **Phase 07 · VECTOR DATABASES · Topic 06**

## 1. Definition

A graph-based ANN index where vectors are nodes connected to their approximate neighbours, arranged in layers. Search enters at a sparse top layer, greedily walks toward the query, and descends — giving logarithmic-ish search at high recall.

## 2. Simple Explanation

Think of it as a road network with motorways and local streets. The top layer has few nodes and long edges — you cross most of the space in a few hops. Lower layers are denser with shorter edges, letting you refine.

You start at the top, move to whichever neighbour is closer to the query, and when you can't improve, drop a layer and repeat. The bottom layer contains every vector.

## 3. How It Works

```
Layer 2:   A ─────────── F            (few nodes, long edges)
             ╲         ╱
Layer 1:   A ── C ──── F ── H         (more nodes)
             ╲  │    ╱ │   ╱
Layer 0:   A─B─C─D─E─F─G─H─I─J        (ALL vectors)

SEARCH:
  1. Enter at the top layer's entry point
  2. Greedily move to the neighbour closest to the query
  3. No closer neighbour → descend one layer
  4. At layer 0, explore a candidate set of size ef_search
  5. Return the best k found

INSERT:
  · assign a maximum layer at random (exponentially decaying)
  · search down to find neighbours at each layer
  · connect to up to M neighbours, pruning to keep diversity
```

**Why it works:** the "small world" property — a graph with mostly local edges plus a few long ones has short paths between any two nodes. The layers supply those long-range links deterministically.

## 4. Practical Example

**The three parameters and what they actually do:**

| Parameter | When | Effect |
|---|---|---|
| **M** | Build | Edges per node. Higher = better recall, more memory |
| **ef_construction** | Build | Search width during insert. Higher = better graph, slower build |
| **ef_search** | **Query** | Candidate set size. Higher = better recall, slower query |

```
Typical starting point:
  M = 16, ef_construction = 200, ef_search = tuned

M = 16 works well for most corpora. M = 32-64 helps on
high-dimensional or hard datasets, at ~2-4× the memory.

ef_search MUST be >= k. Setting ef_search = 10 for top-10
gives poor recall; ef_search = 64-128 is a common operating range.
```

**Memory is the real cost:**

```
5M vectors × 768 dims × 4 bytes        = 15.4 GB  (vectors)
5M nodes × ~M×2 edges × 4 bytes         ≈ 0.6 GB  (graph, M=16)
                                        ─────────
                                         ~16 GB resident

Doubling M to 32 adds ~0.6 GB of graph — modest.
The vectors dominate, which is why quantization targets them.
```

**The deletion problem:**

```
HNSW has no clean delete. Implementations tombstone the node
and filter it from results — but the node stays in the graph
as a routing waypoint.

Consequence: after heavy churn, the graph is full of nodes
that route traffic but return nothing. Recall drifts down
and latency drifts up, silently.

Fix: periodic full rebuild. Plan for it.
```

## 5. Why It Matters

- **It's the default index** in most vector databases, so the parameters come up constantly.
- **ef_search is tunable at query time**, which is the practically useful property.
- **The delete behaviour** is a real operational issue that most explanations skip.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **High memory** | Vectors held in RAM; the dominant cost |
| **Slow build** | Large corpora take hours; inserts are not cheap |
| **No clean delete** | Tombstones degrade the graph over time |
| **ef_search < k** | Poor recall; a common misconfiguration |
| **Filtered search** | Restrictive filters strand the graph walk |
| **Not disk-friendly** | Random access patterns punish SSD-backed variants |

**On filtered search:** this is HNSW's sharpest weakness. The walk traverses nodes; if a filter excludes most of them, the greedy search runs out of eligible neighbours and terminates early with poor results. A filter matching 0.1% of the corpus can drop recall from 0.95 to under 0.5. Mitigations: filtered-HNSW variants that consider eligibility during traversal, or falling back to an exact scan when the filtered set is small.

**On build cost:** ef_construction = 200 on ten million vectors is hours of CPU. That matters for the re-index-after-model-change scenario, and it's a reason to build new indexes offline and cut over rather than rebuild in place.

## 7. Interview Answer

> "HNSW is a graph index. Vectors are nodes connected to their approximate neighbours, arranged in layers — the top layer is sparse with long edges, lower layers are denser with shorter ones, and the bottom layer holds every vector.
>
> Search enters at the top, greedily moves to whichever neighbour is closer to the query, and when it can't improve, drops a layer and repeats. At the bottom it explores a candidate set of size ef_search and returns the best k. The reason it works is the small-world property — a graph with mostly local edges plus a few long ones has short paths between any two nodes, and the layers supply those long-range links deterministically.
>
> Three parameters. M is edges per node, set at build time — sixteen is a good default, thirty-two to sixty-four for harder or higher-dimensional data. ef_construction is the search width during insert, typically two hundred, which trades build time for graph quality. And ef_search is the query-time knob that trades latency for recall without any rebuild. One easy mistake: ef_search must be at least k, and setting it to ten for top-ten retrieval gives poor recall — sixty-four to a hundred and twenty-eight is a common operating range.
>
> The real cost is memory, and it's the vectors, not the graph. Five million vectors at 768 dimensions is about fifteen gigabytes; the graph at M equals sixteen adds well under one. That's why quantization targets the vectors rather than the structure.
>
> Two things I'd raise that get skipped. First, HNSW has no clean delete — implementations tombstone the node but it stays in the graph as a routing waypoint, so after heavy churn the graph is full of nodes that route traffic and return nothing. Recall drifts down and latency up, silently. The fix is a periodic full rebuild, which needs planning because ef_construction of two hundred on ten million vectors is hours of CPU.
>
> Second, filtered search is HNSW's sharpest weakness. The walk traverses nodes, so a restrictive filter strands it — a filter matching a tenth of a percent can take recall from 0.95 to under 0.5. That matters a lot in a permissioned system where every query is filtered, and the mitigations are filtered-HNSW variants that check eligibility during traversal, or falling back to an exact scan when the filtered set is small."

## 8. Likely Follow-ups

**Q: How does HNSW search work?**
It enters at a sparse top layer, greedily moves to the neighbour closest to the query, and descends a layer when no neighbour improves. At the bottom layer it explores a candidate set of size ef_search and returns the best k. The layered structure provides long-range links so the walk crosses the space quickly.

**Q: What are the parameters?**
M — edges per node, build-time, default around sixteen. ef_construction — search width during insert, typically two hundred, trading build time for graph quality. And ef_search — the query-time candidate set size, which trades latency for recall with no rebuild. Only the last can be changed in production.

**Q: What's HNSW's main weakness?**
Memory, and filtered search. It keeps vectors in RAM, so scale is bounded by that. And a restrictive metadata filter strands the graph walk — recall can fall from 0.95 to under 0.5 — which matters in any access-controlled system where every query carries a filter.

**Q: How does deletion work?**
Badly. There's no clean removal, so implementations tombstone the node and filter it from results while leaving it in the graph as a routing waypoint. Over time a high-churn corpus accumulates nodes that route traffic but return nothing, degrading recall and latency silently. Periodic full rebuilds are the fix.

**Q: When would you not use HNSW?**
When memory is the binding constraint — IVF or IVF-PQ hold far less resident. When the corpus churns heavily enough that constant rebuilds are impractical. And when most queries carry highly restrictive filters, where an exact scan over the filtered subset is both faster and more accurate.

## 9. Common Mistakes

- Setting ef_search below k.
- Assuming filtered search performs like unfiltered.
- Ignoring graph degradation from tombstoned deletes.
- Underestimating build time when planning a re-index.
- Tuning M when ef_search is the parameter that's actually free to change.

## 10. What to Remember

- **Layered proximity graph**; greedy walk down from a sparse top layer.
- **M and ef_construction are build-time; ef_search is the query-time knob.**
- **ef_search ≥ k**, typically 64–128.
- **Memory is dominated by the vectors**, not the graph.
- **No clean delete and weak filtered search** — the two operational gotchas.
