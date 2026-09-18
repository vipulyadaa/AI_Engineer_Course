# Approximate Nearest Neighbor Search (ANN)

> **Phase 07 · VECTOR DATABASES · Topic 04**

## 1. Definition

Finding vectors that are *probably* among the nearest neighbours, rather than provably the nearest, in exchange for orders-of-magnitude lower latency. The quality of the approximation is measured as recall against exact search.

## 2. Simple Explanation

Exact search guarantees the true top-k but costs a full scan. ANN examines a small, well-chosen fraction of the corpus and returns *most* of the true top-k.

For retrieval, "most" is almost always enough — the generator sees several chunks, a reranker reorders them, and missing the 8th-best result rarely changes the answer.

## 3. How It Works

```
Exact:  compare against all N vectors        → guaranteed top-k
ANN:    compare against ~√N or fewer         → probable top-k

Mechanism (whichever family):
  1. Narrow the candidate set structurally
     (nearest clusters, or a graph walk)
  2. Score only those candidates
  3. Return the best k found
```

**Recall is the metric:**

```
recall@k = |ANN top-k ∩ exact top-k| / k

recall@10 = 0.95 → on average 9.5 of the true top 10 returned
```

**Tune it at query time:** ef_search (HNSW) or nprobe (IVF) widens the candidate set — higher recall, higher latency, no rebuild.

## 4. Practical Example

**The recall/latency curve is sharply non-linear, which is the useful part:**

```
HNSW on a 5M-vector corpus (illustrative shape):

  ef_search   recall@10   latency
     16         0.82        3 ms
     64         0.95        7 ms
    128         0.98       12 ms
    256         0.99       22 ms
    512         0.995      41 ms

0.82 → 0.95 costs 4 ms.
0.99 → 0.995 costs 19 ms.

Diminishing returns are steep. The right operating point is
usually well short of maximum recall.
```

**Why 95% recall is usually fine in RAG:**

```
Retrieval isn't the final answer — it feeds a pipeline:

  · you retrieve top-20, not top-1
  · a reranker reorders them anyway
  · the generator sees 5-8 chunks
  · hybrid search gives a second, independent path
    to the same document

Missing the 8th-best vector result rarely changes the output.

WHERE IT'S NOT FINE:
  · deduplication and near-duplicate detection — you need
    the actual nearest
  · compliance lookups where a specific clause must be found
  · entity resolution and record matching
```

**That distinction is the substantive point.** ANN's acceptability is a property of the *application*, not of the index.

## 5. Why It Matters

- **ANN is what makes vector search viable at scale** — exact search isn't an option past a certain size.
- **The non-linear recall curve** means the right operating point is empirical, not maximal.
- **Whether approximation is acceptable depends on the task**, and knowing the exceptions shows real judgment.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unmeasured recall** | The default assumption is always too optimistic |
| **Chasing maximum recall** | Steeply diminishing returns for large latency cost |
| **Filtered search collapsing recall** | Restrictive filters break the index's assumptions |
| **Using ANN for exact-match tasks** | Dedup, entity resolution need exactness |
| **Recall compounding with upstream losses** | 0.9 ANN × 0.8 chunking recall = 0.72 |

**On filtered search — the failure mode that surprises people:** a graph index walks through vectors; if a restrictive metadata filter excludes most of the graph, the walk gets stranded and recall drops far below the unfiltered number. A filter matching 0.1% of the corpus can turn 0.95 recall into 0.4. Measure recall *under realistic filters*, not on the open corpus, because in an access-controlled system every query is filtered.

**On compounding:** ANN recall multiplies with every other recall loss — chunking that split the answer, an embedding that missed the match, a top-k that was too small. A 0.95 index is not costing you 5% end-to-end; it's costing 5% of whatever survived the earlier stages.

## 7. Interview Answer

> "ANN finds vectors that are probably among the nearest neighbours rather than provably the nearest, trading a little recall for orders-of-magnitude lower latency. It works by narrowing the candidate set structurally — nearest clusters in IVF, a graph walk in HNSW — then scoring only those candidates.
>
> The metric is recall at k: the overlap between what ANN returns and what exact search would have returned. And the curve is sharply non-linear. On a five-million-vector HNSW index, going from 0.82 to 0.95 recall might cost four milliseconds; going from 0.99 to 0.995 costs twenty. So the right operating point is usually well short of maximum, and it's an empirical decision — sweep the query-time parameter, measure against exact search, pick the cheapest setting that meets the target.
>
> Ninety-five percent is usually fine for RAG specifically, because retrieval isn't the final answer. You retrieve top-twenty, a reranker reorders, the generator sees five to eight chunks, and hybrid search gives a second independent path to the same document. Missing the eighth-best vector result rarely changes the output.
>
> Where that reasoning doesn't hold is tasks where you need the *actual* nearest: deduplication, entity resolution, record matching, or a compliance lookup where one specific clause must be found. There approximation is a correctness problem, not a latency trade. Whether ANN is acceptable is a property of the application, not of the index.
>
> The failure mode I'd flag is filtered search. A graph index walks through vectors, so if a restrictive metadata filter excludes most of the graph the walk gets stranded and recall drops far below the unfiltered number — a filter matching a tenth of a percent of the corpus can take 0.95 recall down to 0.4. In an access-controlled system every query is filtered, so I'd measure recall under realistic filters rather than on the open corpus.
>
> And I'd remember it compounds. ANN recall multiplies with chunking recall and embedding recall — a 0.95 index costs 5% of whatever already survived the earlier stages."

## 8. Likely Follow-ups

**Q: How do you measure ANN quality?**
Recall at k — the overlap between the ANN result and what exact search returns for the same query. Build a flat exact index over the same vectors, run a few hundred sampled production queries against both, and compute the average overlap. It's cheap and it converts an assumption into a number.

**Q: Is 95% recall acceptable?**
For RAG, usually yes — you retrieve top-twenty, a reranker reorders, the generator sees several chunks, and hybrid search provides a second path to the same document. For deduplication, entity resolution, or a compliance lookup where one specific clause must be found, no — those need exactness.

**Q: Why not just maximize recall?**
Because the curve is steeply non-linear. The last few percent can cost several times the latency of everything before it, and in RAG that recall rarely changes the generated answer. Sweeping the parameter and picking the cheapest setting that meets the target is strictly better than maxing it out.

**Q: What happens with metadata filters?**
Recall can collapse. A graph index walks through vectors, so a restrictive filter excludes most of the graph and the walk gets stranded — a filter matching a tenth of a percent of the corpus can drop recall from 0.95 to 0.4. Since every query in an access-controlled system is filtered, recall should be measured under realistic filters.

**Q: How does ANN recall interact with the rest of the pipeline?**
It multiplies. If chunking already lost the answer or the embedding missed the match, ANN recall applies to what remains — so 0.95 doesn't mean 5% end-to-end loss, it means 5% of whatever survived upstream. That's why I'd measure end-to-end retrieval recall as well as index recall.

## 9. Common Mistakes

- Never measuring recall against exact search.
- Assuming the unfiltered recall number holds under filters.
- Maximizing recall past the point of diminishing returns.
- Using ANN where exactness is a correctness requirement.
- Treating index recall as the end-to-end retrieval recall.

## 10. What to Remember

- **Probably-nearest, not provably-nearest** — measured as recall@k against exact search.
- **The recall/latency curve is steeply non-linear.** Pick the cheapest setting meeting the target.
- **95% is usually fine for RAG**, because retrieval feeds a pipeline.
- **Not fine for dedup, entity resolution, or specific-clause compliance lookups.**
- **Filters can collapse recall** — measure under realistic filters.
