# MRR (Mean Reciprocal Rank)

> **Phase 12 · RAG EVALUATION · Topic 03**

## 1. Definition

The average of `1/rank` of the **first** correct result across queries. It measures how highly the first relevant item is ranked, rewarding systems that put the right answer near the top.

## 2. Simple Explanation

Recall@k asks "was the correct chunk in the top-k?" — a yes or no. MRR asks "how high was it?"

Rank 1 scores 1.0. Rank 2 scores 0.5. Rank 10 scores 0.1. Getting the answer to rank 1 instead of rank 3 matters, and recall@5 can't see that difference.

## 3. How It Works

```
             1    n     1
MRR  =  ───────  Σ  ──────────
            n    i=1   rankᵢ

rankᵢ = position of the FIRST correct result for query i
        (0 if no correct result appears)
```

```
Query   first correct at rank   reciprocal
  1            1                  1.000
  2            3                  0.333
  3            2                  0.500
  4         not found             0.000
  5            1                  1.000
                                 ───────
                          MRR =   0.567
```

**The reciprocal is steep:**

```
rank:  1     2     3     4     5     10    20
1/r:  1.00  0.50  0.33  0.25  0.20  0.10  0.05

Moving rank 5 → rank 1 gains 0.80.
Moving rank 20 → rank 10 gains only 0.05.
```

That steepness is the point — MRR cares intensely about the top few positions and barely at all beyond.

## 4. Practical Example

**Where MRR and recall@k disagree, and what that tells you:**

```
System A:  correct chunk at rank 1 for 60% of queries,
                            rank 8 for 35%,  not found 5%
           recall@10 = 0.95    MRR ≈ 0.64

System B:  correct chunk at rank 3 for 95% of queries,
                            not found 5%
           recall@10 = 0.95    MRR ≈ 0.32

Same recall@10. Very different systems.

A is better if you use top-3 in the prompt.
B is more consistent, and better if you use top-5 and
the position within the context doesn't matter much.
```

**When MRR is the right metric:** when only the top result matters — a single-answer lookup, a "jump to the right document" feature, or a reranker evaluated on whether it promotes the correct chunk to first place.

**When it's the wrong metric:** when the answer needs several chunks. MRR only looks at the *first* correct result and ignores everything after it, so a system retrieving all five needed facts scores the same as one retrieving only the first.

## 5. Why It Matters

- **It's position-sensitive** where recall@k is binary, which matters given the "lost in the middle" effect.
- **It's the natural metric for reranker evaluation** — did the reranker promote the correct chunk to the top?
- **It's a standard IR metric**, so interviewers expect familiarity.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Only counts the first correct result** | Multi-fact answers need MAP or full recall instead |
| **Insensitive beyond the top few** | Rank 20 vs. rank 50 is nearly indistinguishable |
| **Binary relevance** | No notion of "more relevant" vs. "somewhat relevant" — use NDCG for that |
| **Zero for missed queries** | Correct, but it means MRR conflates ranking quality with coverage |
| **Hard to interpret absolutely** | MRR 0.64 isn't intuitively meaningful the way recall 0.95 is |

**MRR conflates two things**, which is worth being explicit about: a low MRR could mean the correct chunk ranks poorly, or that it isn't retrieved at all. Reporting recall@k alongside MRR separates those — recall tells you coverage, MRR tells you ranking quality among what was covered.

## 7. Interview Answer

> "MRR is the mean reciprocal rank — the average of one over the rank of the first correct result. It measures how *highly* the right answer is ranked, where recall@k only measures whether it made the cut.
>
> The reciprocal is steep by design. Rank 1 scores 1.0, rank 2 scores 0.5, rank 10 scores 0.1. So moving a result from rank 5 to rank 1 gains 0.8, while moving it from rank 20 to rank 10 gains 0.05. It cares intensely about the top few positions and barely at all beyond.
>
> Where it's useful is when only the top result matters — a single-answer lookup, or evaluating a reranker on whether it promotes the correct chunk to first place. It's also relevant given the lost-in-the-middle effect: a chunk at rank 1 gets used more reliably than the same chunk at rank 5, and recall@5 treats those identically.
>
> Where it's the wrong metric is multi-fact answers. MRR only looks at the *first* correct result and ignores everything after it, so a system that retrieves all five needed facts scores the same as one that retrieves only the first. For that I'd use MAP or a full-recall variant.
>
> One thing I'd be explicit about: MRR conflates ranking quality with coverage, because a missed query contributes zero. A low MRR could mean the chunk ranks badly or that it isn't retrieved at all. Reporting recall@k alongside it separates those."

## 8. Likely Follow-ups

**Q: MRR or recall@k?**
Both, for different questions. Recall@k tells you coverage — is the answer available at all. MRR tells you ranking quality among what you found. They can disagree sharply: two systems with identical recall@10 can have very different MRR, meaning one consistently ranks the answer near the top and the other doesn't.

**Q: When is MRR the wrong metric?**
When the answer requires multiple chunks, because MRR only considers the first correct result and ignores the rest. A system retrieving all five needed facts scores identically to one retrieving only the first. MAP or full recall@k handles that case.

**Q: What's the difference from MAP?**
MAP — mean average precision — accounts for *all* relevant results and their positions, not just the first. So it rewards retrieving several relevant chunks and ranking all of them well. MRR is the special case where you only care about the first. MAP is the right choice for multi-fact questions.

**Q: How do you handle queries where nothing correct is retrieved?**
Score them zero, which is standard. But that means MRR mixes ranking quality with coverage — a zero could be "ranked badly" or "not retrieved." I'd report recall@k alongside so the two are separable, and optionally report MRR over only the queries where something was retrieved, clearly labeled.

**Q: Why is MRR good for evaluating a reranker?**
Because a reranker's job is precisely to promote the correct chunk toward rank 1, and MRR's steep reciprocal rewards exactly that. Comparing MRR before and after reranking directly measures what the reranker contributed, in a way recall@k — which may not change at all — cannot.

## 9. Common Mistakes

- Using MRR for multi-fact questions where several chunks are needed.
- Reporting MRR without recall@k, conflating ranking quality with coverage.
- Expecting MRR to distinguish rank 20 from rank 50 — it barely does.
- Treating an MRR value as intuitively interpretable in absolute terms.
- Using MRR when relevance is graded rather than binary — NDCG fits better there.

## 10. What to Remember

- **Average of `1/rank` of the first correct result.** Position-sensitive where recall@k is binary.
- **Steeply weighted toward the top** — rank 5 → rank 1 matters enormously; rank 50 → 20 barely.
- **Right for single-answer lookups and reranker evaluation.**
- **Wrong for multi-fact answers** — use MAP or full recall instead.
- **Report with recall@k**, since MRR conflates ranking quality with coverage.
