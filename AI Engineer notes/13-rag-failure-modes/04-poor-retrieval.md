# Failure Mode: Poor Retrieval

> **Phase 13 · RAG FAILURE MODES · Topic 04**

## 1. Definition

The right chunks don't reach the context — whether because they weren't found, ranked too low, or were filtered out. It's the dominant cause of bad RAG answers and the hard ceiling on everything downstream.

## 2. Simple Explanation

If the answer isn't in the context, the answer can't be right.

That's why "poor retrieval" isn't one problem but a category, and why the first job is always determining *which* retrieval failure you have — they have completely different fixes.

## 3. How It Works

**The five sub-failures:**

| Sub-failure | Signature | Fix |
|---|---|---|
| **Not indexed** | Direct search finds nothing | Ingestion: parsing, chunking, loading |
| **Wrong representation** | Rank > 100 despite being correct | Hybrid retrieval, enrichment, embedding model |
| **Ranking** | Rank 20–100 | Reranking, hybrid |
| **k too low** | Rank just outside k | Raise k; rerank from a larger candidate set |
| **Over-filtered** | Empty or tiny result set | Soften extracted filters; check ACL and dates |

**The diagnostic, which takes minutes:**

```
1. Does the correct chunk exist in the index?
     Search directly for distinctive terms.
     No → ingestion. Check the source system.
2. What rank does it get?
     >100 → representation.  20-100 → ranking.  just >k → k.
3. Was it filtered?
     Log candidate counts before and after filtering.
```

## 4. Practical Example

**The measurement that separates ranking from retrieval:**

```
 k     recall@k
 5       0.71
20       0.94
50       0.96

recall@20 − recall@5 = 0.23
  → 23 points recoverable by reranking. Worth adding.

Contrast:
 5       0.58
20       0.62
50       0.63
  → almost no gap. Reranking buys nothing. The problem is
    upstream: chunking, enrichment, or the need for hybrid.
```

**Sliced by query type, the specific fixes become visible:**

```
Overall recall@5 = 0.88

  factual_lookup      0.94   fine
  exact_identifier    0.61   → add BM25
  comparison          0.67   → add multi-query decomposition
  conversational      0.72   → add query rewriting

Three distinct, targeted fixes. The aggregate suggested none of them.
```

**The production default that addresses most of these:**

```
ACL + date pre-filter
  → hybrid: BM25 top-20 ∥ dense top-20 → RRF
  → cross-encoder rerank → top-4

~250ms added over naive retrieval, and it covers exact identifiers,
paraphrase, and ranking in one architecture.
```

## 5. Why It Matters

- **Retrieval recall is the hard ceiling** on end-to-end quality.
- **The sub-failures need opposite fixes** — adding a reranker to a recall problem buys latency and nothing else.
- **Slicing reveals targeted fixes** that the aggregate hides.

## 6. Trade-offs / Failure Modes

| Anti-pattern | Why it fails |
|---|---|
| **Adding a reranker for a recall problem** | It only reorders what was retrieved |
| **Raising k indiscriminately** | Masks the problem; adds cost and distraction |
| **Tuning the prompt** | Can't add information that isn't in the context |
| **Swapping the embedding model first** | Expensive, requires full re-embed, often not the cause |
| **Debugging from aggregates** | Hides which query type is failing |
| **Not logging filter counts** | Over-filtering is invisible |

**The fix order that works:**

```
1. Verify content is indexed          (free)
2. Check embedding config bugs        (free)
3. Add title/heading enrichment       (free, re-index)
4. Add BM25 → hybrid retrieval        (biggest single win in enterprise)
5. Add reranking                      (if the recall gap justifies it)
6. Query rewriting / multi-query      (if query-type slices show it)
7. Sweep chunk size                   (last, because it's a full re-index)
```

## 7. Interview Answer

> "Poor retrieval means the right chunks don't reach the context, and it's the dominant cause of bad RAG answers — it's a hard ceiling, because no prompt engineering adds information that isn't there.
>
> But it's a category, not one problem. There are five sub-failures: the content isn't indexed at all, it's indexed but the representation doesn't match the query, it's ranked too low, k is too low, or it was filtered out. They need completely different fixes, so the first job is determining which one you have.
>
> The diagnostic takes minutes. Does the correct chunk exist in the index — if not, it's ingestion. If it exists, what rank does it get: over a hundred is a representation problem, twenty to a hundred is ranking, just outside k means k is too low. And was it filtered out, which needs candidate counts logged before and after filtering or it's invisible.
>
> The measurement that separates ranking from retrieval is recall at multiple k. A large gap between recall@20 and recall@5 means reranking will recover it. Almost no gap means reranking buys nothing and the problem is upstream.
>
> And I'd always slice by query type. An overall recall@5 of 0.88 might be 0.61 on exact identifiers, 0.67 on comparisons, and 0.72 on conversational follow-ups — pointing at BM25, multi-query decomposition, and query rewriting respectively. Three targeted fixes the aggregate suggested none of.
>
> My fix order is: verify indexing, check embedding config bugs, add heading enrichment, add BM25 for hybrid, then reranking, then query transformation, and sweep chunk size last because it's a full re-index."

## 8. Likely Follow-ups

**Q: How do you know whether to add a reranker?**
Compare recall at your candidate count to recall at your final k. A large gap is exactly the headroom reranking can recover. If recall@20 is 0.94 and recall@5 is 0.71, that's 23 points and clearly worth it. If they're 0.62 and 0.58, the problem is upstream and a reranker buys latency, not quality.

**Q: What's the biggest single improvement in enterprise RAG?**
Adding BM25 for hybrid retrieval, usually. Enterprise queries contain identifiers, codes, and rare proper nouns constantly, and dense retrieval handles those structurally badly. Second is heading enrichment, which is free and often as large.

**Q: Why not just raise k?**
Because it masks the problem rather than fixing it, and it has real costs — more input tokens on every query, and irrelevant chunks that distract the model. If the correct chunk is at rank 40, raising k to 50 puts it in context buried among 49 others. Reranking from a larger candidate set gets the recall without the context cost.

**Q: How do you find over-filtering?**
Log candidate counts before and after filtering on every request. Without that, a query where six of ten results were stripped by an ACL or an over-eager extracted filter looks identical to a coverage gap — the model just gets fewer chunks with no signal anything is missing.

**Q: What if recall is fine but answers are still bad?**
Then it's not retrieval, and I'd stop working on it. Check groundedness and answer relevance to distinguish hallucination from off-target generation, and look at whether the correct chunk landed mid-context where attention is weakest, or whether irrelevant chunks are creating conflicts.

## 9. Common Mistakes

- Adding a reranker to a recall problem.
- Raising k instead of fixing ranking.
- Tuning the prompt when the chunk was never retrieved.
- Debugging from aggregate recall without slicing by query type.
- Not logging candidate counts around filtering.

## 10. What to Remember

- **Five sub-failures, five different fixes.** Diagnose before fixing.
- **recall@high-k minus recall@low-k** tells you if reranking will help.
- **Slice by query type** — the aggregate hides targeted fixes.
- **Fix order:** verify indexing → config bugs → enrichment → hybrid → rerank → query transform → chunk size.
- **Hybrid retrieval is usually the biggest enterprise win.**
