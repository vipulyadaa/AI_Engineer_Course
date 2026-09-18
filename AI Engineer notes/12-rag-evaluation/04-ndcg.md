# NDCG (Normalized Discounted Cumulative Gain)

> **Phase 12 · RAG EVALUATION · Topic 04**

## 1. Definition

A ranking metric that handles **graded relevance** — where documents can be highly relevant, partially relevant, or irrelevant — and discounts gains by position, so relevant results ranked lower contribute less.

## 2. Simple Explanation

Recall@k and MRR treat relevance as binary: a chunk is either correct or it isn't.

Reality is graded. A chunk stating the exact fee is highly relevant. A chunk about the fee schedule generally is somewhat relevant. A chunk about a different product's fee is barely relevant. NDCG captures that, and also rewards putting the most relevant items first.

## 3. How It Works

**Three steps:**

```
1. DCG — sum the relevance gains, discounted by position

              k    relᵢ
   DCG@k  =   Σ  ─────────
             i=1  log₂(i+1)

2. IDCG — the DCG of the ideal ranking (most relevant first)

3. NDCG = DCG / IDCG          → always in [0, 1]
```

**Worked example, relevance graded 0–3:**

```
Retrieved ranking:  rel = [3, 1, 2, 0, 1]

DCG = 3/log₂(2) + 1/log₂(3) + 2/log₂(4) + 0/log₂(5) + 1/log₂(6)
    = 3/1.00 + 1/1.58 + 2/2.00 + 0 + 1/2.58
    = 3.00 + 0.63 + 1.00 + 0.00 + 0.39  =  5.02

Ideal ranking:      rel = [3, 2, 1, 1, 0]
IDCG = 3.00 + 1.26 + 0.50 + 0.43 + 0  =  5.19

NDCG@5 = 5.02 / 5.19 = 0.967
```

**The normalization is what makes NDCG comparable across queries** — a query with only one relevant document and a query with ten both score on the same 0–1 scale.

## 4. Practical Example

**Where graded relevance matters:**

```
Query: "What's the international wire fee for Premier accounts?"

Chunk                                          grade
"Premier international transfers: $25"           3    exact answer
"Fee schedule overview: see §3 for transfers"    1    points toward it
"Premier domestic wires: $0"                     0    wrong fact
"International transfer processing times"        1    related context
"Retail international transfers: $45"            0    wrong product

Binary metrics would score the first as "correct" and the rest
as "wrong," losing the distinction between "points toward the
answer" and "actively misleading."
```

**When NDCG earns its complexity:**

| Use NDCG when | Use recall@k / MRR when |
|---|---|
| Relevance is genuinely graded | Relevance is naturally binary |
| Ranking order within the retrieved set matters | Only membership in top-k matters |
| Comparing rerankers precisely | Quick diagnostic, cheap labeling |
| You have the budget for graded labels | Labeling budget is tight |

**The practical caveat:** graded relevance labels are substantially more expensive than binary ones, and annotators disagree more on a 0–3 scale than on yes/no. For most RAG systems, recall@k plus groundedness gives more actionable signal per unit of labeling effort.

## 5. Why It Matters

- **It's the standard IR ranking metric**, so familiarity is expected in interviews.
- **It captures graded relevance and position together**, which binary metrics can't.
- **It's the right metric for comparing rerankers precisely**, where ordering quality is the whole point.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expensive labeling** | Graded relevance per chunk per query; far costlier than binary |
| **Annotator disagreement** | A 0–3 scale has more borderline cases than yes/no |
| **Harder to interpret** | NDCG 0.87 doesn't map to an intuitive statement the way recall 0.87 does |
| **Log discount is arbitrary** | log₂ is convention, not derived from user behavior |
| **Doesn't measure coverage** | A query where nothing relevant exists needs separate handling |
| **Overkill for most RAG systems** | recall@k + groundedness is usually more actionable |

**The honest position for a RAG interview:** know what NDCG is and when it applies, but recognize that for most RAG systems the actionable metrics are recall@k for retrieval and groundedness for generation. NDCG is more valuable in classical search ranking, where ordering *is* the product, than in RAG where the top few chunks all go into the same prompt.

## 7. Interview Answer

> "NDCG handles graded relevance and position together. Instead of treating a chunk as correct or not, you grade it — say zero to three — then discount each gain by its position with a logarithmic factor, so relevant results ranked lower contribute less. Then you normalize by the ideal ranking's score, which puts everything on a zero-to-one scale comparable across queries.
>
> The normalization is the important part: a query with one relevant document and a query with ten both score on the same scale, which recall@k and raw DCG don't give you.
>
> Where it earns its complexity is when relevance is genuinely graded and ordering matters — comparing rerankers precisely, for instance, where the whole job is getting the ordering right.
>
> Where I'd push back is on using it as the default RAG metric. Graded labels are substantially more expensive than binary ones, and annotators disagree more on a zero-to-three scale than on yes/no. And in RAG the top few chunks all go into the same prompt, so the ordering within them matters less than in classical search where ranking *is* the product.
>
> So for most RAG systems I'd measure recall@k for retrieval and groundedness for generation, because those give more actionable signal per unit of labeling effort. I'd bring in NDCG when I'm specifically evaluating ranking quality — comparing reranker models, or a search feature where the ordering is what the user sees."

## 8. Likely Follow-ups

**Q: Why the logarithmic discount?**
It encodes the assumption that users attend less to lower-ranked results, with diminishing sensitivity — the gap between rank 1 and 2 matters more than between 9 and 10. The log₂ base is convention rather than derived from user behavior. Other discount functions exist; the log is standard because it's simple and roughly matches observed click patterns in search.

**Q: Why normalize?**
So scores are comparable across queries. A query with one relevant document has a much lower maximum possible DCG than one with ten, so raw DCG can't be averaged meaningfully. Dividing by the ideal DCG puts everything in [0,1], where 1.0 means "perfectly ranked given what's available."

**Q: NDCG or recall@k for RAG?**
Recall@k for most RAG work, because it's cheap to label, directly interpretable, and it's the hard ceiling on answer quality. NDCG when ordering quality specifically matters — comparing rerankers, or a search-results feature where the user sees the ranking. In RAG the top few chunks all enter the same prompt, so ordering matters less than in classical search.

**Q: How do you assign graded relevance labels?**
Define the scale explicitly — 3 for "contains the exact answer," 2 for "contains most of it," 1 for "related context that helps," 0 for "irrelevant or misleading" — and write examples for each level. Then measure inter-annotator agreement, because a graded scale has far more borderline cases than binary and low agreement means the scale is ambiguous rather than the system being bad.

**Q: What's DCG without the normalization?**
The raw discounted sum, which isn't comparable across queries because different queries have different numbers of relevant documents. It's useful within a single query when comparing two systems on that query, but averaging raw DCG across a query set is misleading. The normalization is what makes aggregation valid.

## 9. Common Mistakes

- Using NDCG as the default RAG metric when recall@k is cheaper and more actionable.
- Assigning graded labels without a written rubric and agreement check.
- Averaging raw DCG across queries instead of NDCG.
- Treating the log₂ discount as principled rather than conventional.
- Expecting NDCG to capture coverage — a query with no relevant documents needs separate handling.

## 10. What to Remember

- **Graded relevance + positional discount, normalized to [0,1].**
- **Normalization makes scores comparable across queries.**
- **Right for comparing rerankers** and search features where ordering is the product.
- **Expensive to label** and harder to interpret than recall@k.
- **For most RAG work, recall@k + groundedness is more actionable.**
