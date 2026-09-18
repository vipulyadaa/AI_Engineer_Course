# How Do You Know Whether Retrieval Is Good?

> **Phase 12 · RAG EVALUATION · Topic 17**

## 1. Definition

Measure recall@k against a golden dataset of questions with known correct sources, at several k values, sliced by query type. That combination tells you both *whether* retrieval works and *which* part is broken.

## 2. Simple Explanation

"Is retrieval good?" isn't one question. It's three:

1. **Is the right content in the index at all?** (coverage)
2. **Does it get retrieved?** (recall)
3. **Does it rank highly among what's retrieved?** (precision/ranking)

Each has a different fix, and only measuring at several k values separates them.

## 3. How It Works

**The core measurement:**

```
recall@k = questions where a correct chunk is in the top-k / total questions
```

**Measured at several k, the shape is diagnostic:**

```
 k     recall@k
 1       0.52
 3       0.79
 5       0.88
20       0.96
50       0.97   ← plateau

recall@50 = 0.97  → coverage and representation are fine.
recall@20 − recall@5 = 0.08 → 8pp recoverable by reranking.

If recall@50 were 0.62, that's the CEILING — and it's an
ingestion, chunking, or embedding problem. Reranking can't help.
```

**Sliced, the aggregate's lies become visible:**

```
Overall recall@5 = 0.88

  factual_lookup       0.94  (n=180)
  policy_conditions    0.91  (n=55)
  comparison           0.67  (n=25)   ← needs multi-query
  exact_identifier     0.61  (n=40)   ← needs BM25

Two specific, fixable problems the aggregate hides.
```

## 4. Practical Example

**The three-question diagnostic on a single failure:**

```
Question that failed. Run:

1. Search the index directly for distinctive terms.
   Nothing found → the chunk isn't indexed.
     → Check the source system. If it's there, it's an ingestion
       bug: parse failure, zero-chunk document, unreconciled delete.

2. Found, but what rank?
   Rank 47   → ranking problem. Rerank, or add hybrid.
   Rank 400+ → representation problem. Is it an exact-identifier
               query needing BM25? Is the chunk missing the
               vocabulary connecting it to the question?
   Rank 6, k=5 → k is just too low.

3. Was it filtered out?
   Check ACL, date, and any extracted filters.
   Log candidate counts before and after filtering, or
   over-filtering is invisible.
```

**The proxy signals when you don't have labeled ground truth:**

```
Production, no labels available:

  % of queries with top score below threshold   → coverage gaps
  context relevance (LLM judge, sampled)        → retrieval quality
  escalation rate                               → downstream impact
  clustering of failed queries                  → where the gaps are
```

## 5. Why It Matters

- **Retrieval recall is the hard ceiling** on end-to-end quality.
- **The multi-k measurement separates ranking problems from retrieval problems**, which need opposite fixes.
- **Slicing reveals specific fixable failures** that aggregates hide.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Measuring at one k** | Loses the ranking-vs-retrieval diagnostic |
| **Aggregate only** | Hides that one query type is failing badly |
| **Eval questions written from documents** | Vocabulary leakage inflates recall |
| **No coverage check** | Zero-chunk documents look like retrieval failures |
| **Not logging filter counts** | Over-filtering is invisible |
| **Recall only, no precision** | recall@50 of 0.99 with 50 noisy chunks is a bad system |

**The coverage check people skip:** before concluding retrieval is bad, verify that the content is actually in the index. A batch of scanned PDFs producing zero chunks presents exactly as a retrieval quality problem, and no amount of retrieval tuning fixes it.

## 7. Interview Answer

> "I'd measure recall@k against a golden dataset — questions with their known correct source chunks — at several k values, sliced by query type.
>
> The multi-k measurement is the key diagnostic. If recall@50 is 0.97 but recall@5 is 0.88, coverage and representation are fine and the eight-point gap is a ranking problem that reranking can recover. If recall@50 is only 0.62, that's my ceiling — reranking can't help, and the problem is upstream in ingestion, chunking, or the embedding model. Those are opposite fixes, and one number at one k can't distinguish them.
>
> Slicing matters as much. An overall recall@5 of 0.88 might be 0.94 on factual lookups and 0.61 on exact-identifier queries, which points directly at needing BM25. The aggregate hides a specific fixable problem.
>
> For an individual failure, I'd run a three-step check. Does the chunk exist in the index at all — if not, that's an ingestion bug, and I'd verify against the source system. If it exists, what rank does it get — rank forty-seven is a ranking problem, rank four hundred is a representation problem. And was it filtered out, which requires logging candidate counts before and after filtering or it's invisible.
>
> In production without labeled ground truth, I'd use proxies: the fraction of queries where the top score is below threshold as a coverage signal, sampled context relevance from an LLM judge, and clustering of failed queries to find where the gaps are."

## 8. Likely Follow-ups

**Q: What's the single most useful retrieval measurement?**
recall@k at several k values. The absolute numbers tell you whether retrieval works; the gap between high-k and low-k tells you whether the problem is ranking or retrieval — which determines whether a reranker will help or be pure latency.

**Q: How do you measure retrieval quality without labeled data?**
Proxies. Context relevance judged by an LLM on sampled production traffic. The fraction of queries whose top similarity score falls below threshold, as a coverage signal. Escalation rate as a downstream indicator. And clustering failed queries to find systematic gaps. None is as good as labeled recall@k, but all are available on live traffic.

**Q: What if recall is high but answers are still bad?**
Then it's a generation problem, and I'd check groundedness and answer relevance. High recall with low groundedness means hallucination despite good context. High on both with low answer relevance means the prompt isn't focusing the model on the question. Either way the fix is downstream, and further retrieval tuning would waste effort.

**Q: How do you check coverage?**
Assert on chunks-per-document at ingestion and alert when it drops. Track the fraction of source documents that produced chunks. And for a specific failure, search the source system for the same terms — if the content is there and not in the index, it's an ingestion bug, not a retrieval problem.

**Q: Is recall@k enough on its own?**
No. recall@50 of 0.99 sounds excellent and is useless if fifty chunks won't fit in context and forty-nine are noise. I'd pair it with precision@k or context relevance, and with end-to-end groundedness, because low precision manifests as degraded answers even when recall is high.

## 9. Common Mistakes

- Measuring recall at one k only.
- Reporting the aggregate without slicing by query type.
- Concluding retrieval is bad without verifying the content is indexed.
- Not logging candidate counts before and after filtering.
- Treating high recall at high k as sufficient.

## 10. What to Remember

- **recall@k against a golden dataset, at several k, sliced by query type.**
- **The high-k/low-k gap** separates ranking problems from retrieval problems.
- **Check coverage first** — zero-chunk documents look exactly like retrieval failures.
- **Three-step failure diagnostic:** in the index? what rank? filtered out?
- **Pair recall with precision** — high recall at high k can still be a bad system.
