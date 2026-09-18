# Recall vs Speed Trade-off

> **Phase 07 · VECTOR DATABASES · Topic 18**

## 1. Definition

The core tuning decision in ANN search: examining more candidates raises recall and latency together. The relationship is steeply non-linear, so the right operating point is empirical, not maximal.

## 2. Simple Explanation

Every ANN index has one knob that controls how hard it looks — `ef_search` in HNSW, `nprobe` in IVF. Turn it up and you find more of the true neighbours, more slowly.

The first few turns buy a lot of recall cheaply. The last few cost a lot for very little. The job is finding where that changes.

## 3. How It Works

```
recall
  1.00 ┤                            ╭──────────  ← expensive, ~flat
  0.95 ┤                   ╭────────
  0.90 ┤          ╭────────
  0.80 ┤     ╭────
  0.60 ┤  ╭──
       └──┴──┴────┴────────┴────────┴──────────→ latency
```

**The procedure:**

```
1. Build an exact index over the same vectors
2. Sample 200-500 real production queries
3. For each candidate parameter value:
       run both, compute recall@k, record p95 latency
4. Plot recall against latency
5. Pick the smallest parameter meeting the recall target
```

**Use production queries, not synthetic ones.** Real queries have the length distribution, vocabulary, and filter patterns that determine where the curve sits. A synthetic benchmark measures a workload you don't have.

## 4. Practical Example

**Setting the recall target from the pipeline, not by feel:**

```
The question isn't "what recall do I want" — it's "what recall
does the downstream pipeline need".

  · retrieve top-20, rerank to top-5 → the reranker fixes
    ordering but cannot recover a chunk ANN never returned
  · hybrid search gives a second, independent path — BM25
    can catch what dense retrieval missed
  · the generator sees 5-8 chunks; one missing marginal chunk
    usually doesn't change the answer

So 0.95 recall@20 is typically sufficient, and the honest way
to confirm it is to measure END-TO-END answer quality at
several ANN settings — not index recall alone.
```

**That last point is the strongest version of this answer:** sweep ef_search and measure groundedness and answer correctness on a golden set at each value. If answer quality is flat from ef_search 64 to 256, the extra latency buys nothing regardless of what index recall says.

**Where the target must be higher:**

```
· No reranker            → retrieval ordering IS final ordering
· No hybrid              → no second path to the document
· Small top-k (3-5)      → every slot matters
· Compliance lookups     → a specific clause must be found
```

**And the interaction that changes everything:**

```
Restrictive filters move the whole curve. A parameter giving
0.95 recall unfiltered may give 0.6 under a tenant filter.

So the sweep must be run WITH realistic filters, and the
operating point may need to be filter-dependent — a higher
ef_search when the filter is selective.
```

## 5. Why It Matters

- **It's the single tuning decision** that most affects both quality and cost.
- **The target should come from end-to-end answer quality**, not from index recall in isolation.
- **Filters move the curve**, so an unfiltered sweep gives the wrong operating point.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Never measuring** | Defaults chosen by the library, not by you |
| **Maximizing recall** | Large latency cost for no answer-quality gain |
| **Synthetic benchmark queries** | Measures a workload you don't serve |
| **Sweeping without filters** | Wrong operating point for production |
| **Index recall as the only metric** | Doesn't capture what the user experiences |
| **Set once, never revisited** | Corpus growth shifts the curve |

**On revisiting:** the curve moves as the corpus grows. A parameter tuned at one million vectors gives lower recall at ten million, because the same search width covers a smaller fraction of a denser space. I'd re-run the sweep at each significant growth step, or automate it as part of the index build.

**On cost:** higher ef_search means more CPU per query, which at scale is a direct infrastructure bill. Framing the trade-off as recall versus *cost* rather than recall versus latency is often more persuasive, because the latency difference may be imperceptible while the cost difference is a line item.

## 7. Interview Answer

> "Every ANN index has one knob controlling how hard it searches — ef_search for HNSW, nprobe for IVF — and turning it up raises recall and latency together. The relationship is steeply non-linear: the first increments buy a lot of recall cheaply, the last buy almost nothing expensively. So the right setting is empirical.
>
> The procedure is: build an exact index over the same vectors, sample two to five hundred real production queries, run both at each candidate parameter value, and plot recall against p95 latency. Then take the smallest value meeting the target. Real queries matter — synthetic ones have different lengths, vocabulary, and filter patterns, so they measure a workload you don't serve.
>
> The part I'd emphasize is where the target comes from. It shouldn't be picked by feel; it should come from what the downstream pipeline needs. If I retrieve top-twenty and rerank to five, the reranker fixes ordering but can't recover a chunk ANN never returned. Hybrid search gives a second independent path, so BM25 can catch what dense missed. And the generator sees five to eight chunks, so one missing marginal chunk rarely changes the answer. That's why 0.95 at top-twenty is usually enough.
>
> But the honest way to confirm it is to sweep ef_search and measure end-to-end answer quality — groundedness and correctness on a golden set — at each value, not index recall alone. If answer quality is flat from sixty-four to two-fifty-six, the extra latency buys nothing whatever the recall number says. Index recall is a proxy; answer quality is the thing.
>
> Where I'd set it higher: no reranker, so retrieval ordering is final; no hybrid, so there's no second path; a small top-k where every slot matters; or compliance lookups where one specific clause must be found.
>
> Two things that trip people up. Filters move the whole curve — a setting giving 0.95 unfiltered can give 0.6 under a tenant filter — so the sweep has to run with realistic filters, and the operating point may need to vary with filter selectivity. And the curve shifts as the corpus grows, because the same search width covers a smaller fraction of a denser space, so I'd re-run the sweep at each significant growth step rather than tuning once.
>
> One framing point: at scale this is really recall versus cost, not recall versus latency. The latency difference may be imperceptible while the CPU difference is a line item, and that's usually the more persuasive way to put it."

## 8. Likely Follow-ups

**Q: How do you find the right operating point?**
Build an exact index, sample a few hundred real production queries, sweep the query-time parameter measuring recall and p95 latency at each value, and pick the smallest setting meeting the target. Real queries matter because their lengths, vocabulary, and filters determine where the curve sits.

**Q: What recall target would you set?**
Whatever the downstream pipeline needs. With a reranker, hybrid retrieval, and five to eight chunks reaching the generator, 0.95 at top-twenty is typically sufficient. Without a reranker or hybrid, or with a very small top-k, it needs to be higher because there's no second chance.

**Q: Is index recall the right metric?**
It's a proxy. The better test is sweeping the parameter and measuring end-to-end answer quality — groundedness and correctness on a golden set — at each setting. If answer quality is flat across a range, the extra latency and cost buy nothing regardless of what index recall shows.

**Q: How do filters affect the trade-off?**
They move the whole curve. A setting giving 0.95 unfiltered can give 0.6 under a selective tenant filter, because the graph walk strands. So the sweep must run with realistic filters, and the operating point may legitimately vary with filter selectivity rather than being one global value.

**Q: Do you need to retune over time?**
Yes. As the corpus grows, the same search width covers a smaller fraction of a denser space, so recall drifts down at a fixed parameter. I'd re-run the sweep at each significant growth step, or build it into the index pipeline so the parameter is chosen against the target automatically.

## 9. Common Mistakes

- Accepting library defaults without measuring.
- Maximizing recall past the point answer quality stops improving.
- Sweeping with synthetic queries or without filters.
- Treating index recall as the goal rather than answer quality.
- Tuning once and never revisiting as the corpus grows.

## 10. What to Remember

- **One knob, steeply non-linear** — first increments cheap, last ones expensive.
- **Sweep with real queries and realistic filters** against an exact baseline.
- **Set the target from end-to-end answer quality**, not index recall alone.
- **Higher target without a reranker or hybrid** — there's no second path.
- **Retune as the corpus grows.** The curve moves.
