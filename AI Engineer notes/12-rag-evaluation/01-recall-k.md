# Recall@k

> **Phase 12 · RAG EVALUATION · Topic 01**

## 1. Definition

The fraction of questions for which at least one correct source chunk appears in the top-k retrieved results. It's the primary retrieval metric in RAG because it's a **hard upper bound** on end-to-end answer quality.

## 2. Simple Explanation

Did the right chunk make it into the context?

If it didn't, the answer cannot be correct — no prompt, no reranker, no better model fixes it. That's why recall@k is the first thing to measure and the number that caps everything else.

## 3. How It Works

```
recall@k = (questions where ≥1 correct chunk is in top-k) / (total questions)
```

1. **Build an eval set** — questions paired with their known correct source chunk IDs.
2. **Run retrieval** for each question.
3. **Check** whether any correct chunk ID is in the top-k.
4. **Average** across questions.

**Measure at several k, because the shape is the diagnostic:**

```
 k     recall@k
 1       0.52
 3       0.79
 5       0.88
10       0.94
20       0.96
50       0.97   ← plateau

recall@20 (0.96) − recall@5 (0.88) = 0.08
→ 8 points recoverable by reranking.

If recall@50 is only 0.62, that's your CEILING regardless of
anything downstream. The problem is ingestion, chunking, or
the embedding model — not ranking.
```

## 4. Practical Example

**Building the eval set — the part that takes the work:**

```python
eval_set = [
    {
      "question": "What's the international wire fee for Premier accounts?",
      "correct_chunk_ids": ["policy-fees-2026#3.2:0"],
      "query_type": "factual_lookup",
      "product": "international_transfers",
    },
    ...
]
```

**Sourcing questions:** sample from production logs rather than inventing them. Invented questions use the documents' own vocabulary, which inflates recall — it's a subtle form of leakage.

**Slice the metric, always:**

```
Overall recall@5 = 0.88

  factual_lookup       0.94  (n=180)
  exact_identifier     0.61  (n=40)   ← needs BM25
  comparison           0.67  (n=25)   ← needs multi-query
  policy_conditions    0.91  (n=55)

The aggregate hides two specific fixable problems.
```

**Variants worth knowing:**

| Metric | Measures |
|---|---|
| **recall@k** | Was *any* correct chunk retrieved? |
| **Full recall@k** | Were *all* correct chunks retrieved? Matters for multi-fact answers |
| **MRR** | How *highly* was the first correct chunk ranked? |
| **NDCG@k** | Ranking quality with graded relevance |

## 5. Why It Matters

- **It's the ceiling.** Every downstream metric is bounded by it.
- **Measuring it at several k separates ranking problems from retrieval problems** — the single most useful diagnostic in RAG.
- **It's measurable without an LLM judge**, so it's cheap and deterministic.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Eval questions written from the documents** | Leakage — they use the source vocabulary, inflating recall |
| **Aggregate only** | Hides that one query type is failing badly |
| **Measured at one k** | Loses the ranking-vs-retrieval diagnostic |
| **Ambiguous ground truth** | Several chunks could reasonably answer; binary correctness is crude |
| **"Any correct chunk" is too lenient** | For multi-fact answers you need *all* of them |
| **Eval set never refreshed** | Query distribution drifts; the set stops representing production |

**On ground truth ambiguity:** with overlapping chunks or parent-child retrieval, several chunk IDs may legitimately answer a question. Record all acceptable chunk IDs, or evaluate at section level rather than chunk level — otherwise you'll penalize correct retrievals.

**Recall@k doesn't measure precision.** You can achieve recall@50 = 0.99 and have a terrible system, because 50 chunks won't fit in context and 49 are noise. Always pair it with precision@k or with end-to-end answer quality.

## 7. Interview Answer

> "Recall@k is the fraction of questions where at least one correct source chunk appears in the top-k. It's the primary retrieval metric because it's a hard upper bound — if the right chunk isn't in the context, the answer can't be correct, and nothing downstream recovers it.
>
> The most useful thing about it is measuring at several k values, because the shape is diagnostic. If recall@20 is 0.96 and recall@5 is 0.88, that eight-point gap is exactly what reranking can recover. If recall@50 is only 0.62, that's my ceiling regardless of reranking — the problem is upstream in ingestion, chunking, or the embedding model.
>
> Building the eval set is the real work, and there's a trap: if I write the questions by reading the documents, they use the source vocabulary and recall is inflated. That's a subtle form of leakage. I'd sample questions from production logs instead.
>
> And I'd always slice rather than reporting an aggregate. A recall@5 of 0.88 overall might be 0.94 on factual lookups and 0.61 on exact-identifier queries — which points directly at needing BM25. The aggregate hides the specific fixable problem.
>
> One caveat: recall@k says nothing about precision. I could get recall@50 of 0.99 with a terrible system, because fifty chunks won't fit in context and forty-nine are noise. So I'd pair it with precision@k or with end-to-end groundedness."

## 8. Likely Follow-ups

**Q: How do you build the eval set?**
Sample questions from production logs so they reflect real phrasing, then have someone identify the correct source chunks for each. A hundred or more questions is a reasonable start. Tag each with a query type so you can slice. And keep a portion untouched as a final test set, separate from whatever you iterate against.

**Q: Why measure at multiple k?**
Because the gap between recall at high k and low k separates a ranking problem from a retrieval problem, and those have completely different fixes. A large gap means reranking will help. Both low means the content isn't being retrieved at all, and no reranker touches that.

**Q: What if several chunks could answer the question?**
Record all acceptable chunk IDs as correct, or evaluate at section level rather than chunk level. With overlapping chunks or parent-child retrieval, multiple IDs legitimately answer the same question, and binary single-chunk ground truth penalizes correct retrievals unfairly.

**Q: Is recall@k enough on its own?**
No. It ignores precision entirely — recall@50 of 0.99 with fifty chunks in context is a bad system. It also doesn't tell you whether the model used the retrieved chunk correctly. I'd pair it with precision@k for retrieval quality and groundedness for end-to-end quality.

**Q: How do you avoid leakage in the eval set?**
Don't write questions by reading the source documents — they'll use the documents' vocabulary and inflate recall. Sample from production query logs instead. If you must write questions, have someone write them from a description of the topic rather than from the chunk text, and validate that the phrasing distribution resembles real queries.

## 9. Common Mistakes

- Writing eval questions from the source documents.
- Measuring at one k only, losing the diagnostic.
- Reporting the aggregate without slicing by query type.
- Treating recall@k as sufficient without any precision measure.
- Using single-chunk ground truth when several chunks legitimately answer.

## 10. What to Remember

- **Fraction of questions where a correct chunk is in the top-k.** A hard ceiling on everything downstream.
- **Measure at several k** — the gap separates ranking problems from retrieval problems.
- **Sample eval questions from production logs**, not from the documents.
- **Always slice by query type.** Aggregates hide specific fixable failures.
- **Pair it with precision** — high recall at high k can still be a bad system.
