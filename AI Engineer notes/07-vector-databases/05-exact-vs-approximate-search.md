# Exact vs Approximate Search

> **Phase 07 · VECTOR DATABASES · Topic 05**

## 1. Definition

Exact search compares the query against every vector and guarantees the true top-k. Approximate search examines a fraction and returns a probable top-k. The choice is a correctness-versus-latency decision that depends on the task, not on corpus size alone.

## 2. Simple Explanation

Exact is a full scan: always right, cost linear in corpus size. Approximate is a shortcut: nearly always right, cost roughly logarithmic.

The question isn't "which is better" — it's whether your application can tolerate occasionally missing a true neighbour.

## 3. How It Works

| | Exact (flat) | Approximate (ANN) |
|---|---|---|
| Guarantee | True top-k | Probable top-k |
| Cost per query | O(N · d) | ~O(log N · d) |
| Index build | None | Minutes to hours |
| Memory | Vectors only | Vectors + index structure |
| Tunable | No | Yes, at query time |
| Filter behaviour | Unaffected | Can degrade sharply |

**That last row is underrated.** Exact search with a restrictive filter actually gets *faster* — fewer vectors to score. ANN with a restrictive filter gets *worse*, because the index structure assumed the full population.

## 4. Practical Example

**The decision, in practice:**

```
CORPUS SIZE
  < 100k      exact is fine — tens of ms, nothing to tune
  100k-1M     either; exact viable if latency budget allows
  > 1M        ANN

TASK
  Deduplication              → exact
  Entity / record matching   → exact
  Compliance clause lookup   → exact, or ANN + high recall
  RAG retrieval              → ANN
  Recommendation             → ANN

FILTER SELECTIVITY
  Highly restrictive filters → exact over the filtered subset
                               can beat ANN outright
```

**The hybrid that production systems actually use:**

```
If the metadata filter leaves few enough candidates,
brute-force them exactly. Otherwise use the ANN index.

  filtered_count = estimate(filter)
  if filtered_count < 10_000:
      exact_scan(filter)        # fast AND exact
  else:
      ann_search(filter)

Some vector databases do this automatically. It's worth knowing
because it inverts the usual intuition: for a narrow tenant or a
single-department corpus, exact search is both faster and better.
```

**Exact search as a measurement tool:** even in a system that serves ANN, keep an exact index available offline. It's the only way to compute ANN recall, and it costs nothing to maintain over a sampled subset.

## 5. Why It Matters

- **The task, not the corpus size, is the primary decider** — some tasks can't tolerate approximation at any size.
- **Filter selectivity inverts the usual answer**, which is a genuinely non-obvious point.
- **Exact search is the measurement baseline** for everything ANN does.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Reaching for ANN by reflex** | Below ~100k, exact is simpler and better |
| **ANN for exactness-critical tasks** | A correctness bug, not a latency trade |
| **Assuming ANN is always faster** | Under a narrow filter, exact often wins |
| **Exact search at scale** | Linear cost; degrades under load, not just per query |
| **No exact baseline retained** | ANN recall becomes unmeasurable |

**On "degrades under load":** an exact scan costing 200 ms at one query per second costs far more than 200 ms at a hundred queries per second, because they contend for the same memory bandwidth. Latency measured on an idle system is not the number that matters — this is the reason exact search fails in production earlier than a single-query benchmark suggests.

**On the correctness framing:** for deduplication, approximate means duplicates survive. For entity resolution, it means records don't merge. Framing those as correctness bugs rather than quality trade-offs is what distinguishes a considered answer.

## 7. Interview Answer

> "Exact search compares against every vector and guarantees the true top-k, at cost linear in corpus size. Approximate examines a fraction and returns a probable top-k at roughly logarithmic cost. The decision depends on the task more than on corpus size.
>
> On size, below about a hundred thousand vectors exact is genuinely fine — tens of milliseconds, exact results, no index to build or tune. Past a million, ANN. In between it depends on the latency budget.
>
> But the task matters more. Deduplication, entity resolution, record matching — those need the actual nearest neighbour, and approximate means duplicates survive or records fail to merge. That's a correctness bug, not a latency trade-off. RAG retrieval and recommendation tolerate approximation well, because retrieval feeds a pipeline that's robust to missing the eighth-best result.
>
> The non-obvious factor is filter selectivity, and it inverts the usual intuition. Exact search with a restrictive filter gets *faster* — fewer vectors to score. ANN with a restrictive filter gets *worse*, because the index structure assumed the full population and the graph walk gets stranded. So for a narrow tenant or a single-department corpus, an exact scan over the filtered subset can be both faster and exact. Some vector databases switch automatically based on estimated filter cardinality, and that hybrid is what I'd want in a permissioned system where every query is filtered.
>
> One caveat on exact search that benchmarks hide: a scan costing two hundred milliseconds at one query per second costs much more at a hundred, because concurrent scans contend for the same memory bandwidth. Latency measured on an idle system isn't the number that matters, which is why exact search fails in production earlier than a single-query benchmark suggests.
>
> And I'd keep an exact index available offline regardless, over a sampled subset — it's the only way to measure what recall the ANN index is actually giving me."

## 8. Likely Follow-ups

**Q: When is exact search the right choice?**
Below roughly a hundred thousand vectors, where it's fast enough and has nothing to tune. And for any task needing the true nearest neighbour — deduplication, entity resolution, record matching — where approximation causes wrong results rather than slightly worse ones, regardless of corpus size.

**Q: Isn't ANN always faster?**
Not under a restrictive filter. Exact search over a filtered subset scores fewer vectors so it gets faster, while an ANN graph walk gets stranded when most of the graph is excluded and recall collapses. For narrow tenants, exact over the filtered subset is often both faster and better.

**Q: How do you decide between them?**
Task first — does it need the true nearest neighbour or just good candidates. Then corpus size, then filter selectivity. In a permissioned system I'd want the hybrid: estimate the filtered cardinality per query and brute-force exactly when it's small, use the ANN index otherwise.

**Q: What does exact search cost under load?**
More than a single-query benchmark shows. Concurrent scans contend for memory bandwidth, so a 200 ms scan at one QPS is much worse at a hundred QPS. That throughput ceiling is usually why exact search fails in production before per-query latency becomes the complaint.

**Q: Should you keep an exact index if you serve ANN?**
Yes, over a sampled subset, offline. It's the only way to compute ANN recall — run the same queries against both and compare top-k overlap. It costs almost nothing and turns your index quality from an assumption into a measured number.

## 9. Common Mistakes

- Choosing ANN by reflex at small corpus sizes.
- Using ANN where exactness is a correctness requirement.
- Assuming ANN wins under restrictive filters.
- Benchmarking exact search on an idle system.
- Not retaining an exact baseline for recall measurement.

## 10. What to Remember

- **Exact: guaranteed, O(N). Approximate: probable, ~O(log N), tunable.**
- **The task decides first** — dedup and entity resolution can't approximate.
- **Restrictive filters invert it:** exact gets faster, ANN gets worse.
- **Exact search degrades under concurrency**, not just per query.
- **Keep an exact baseline** — it's how you measure ANN recall at all.
