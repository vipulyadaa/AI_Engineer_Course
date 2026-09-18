# Hybrid Retrieval

> **Phase 11 · RAG RETRIEVAL · Topic 04**

## 1. Definition

Running dense (embedding) and sparse (BM25 keyword) retrieval in parallel and fusing the ranked results. It's the production default for enterprise RAG because the two methods fail on complementary query types.

## 2. Simple Explanation

Dense retrieval understands meaning but not exact strings. Sparse retrieval matches exact strings but not meaning.

Enterprise queries contain both kinds constantly — "how much to send money abroad" needs semantic matching; "policy AC-4471-B" needs exact matching. Running only one loses half your queries.

## 3. How It Works

```
query ─┬─▶ dense:  embed → ANN search → top-20 ─┐
       └─▶ sparse: BM25 → top-20               ─┴─▶ RRF → rerank → top-4
```

**Reciprocal Rank Fusion:**

```python
def rrf(result_lists, k=60):
    scores = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

**Why RRF rather than weighted score blending:** a cosine of 0.82 and a BM25 score of 14.7 live on incomparable scales. Normalizing them requires calibration that breaks whenever the corpus, the embedding model, or the query mix changes. RRF uses only ranks — nothing to calibrate, nothing to re-tune.

## 4. Practical Example

**The complementary failure modes:**

```
Query                                 Dense  BM25  Hybrid
"cost of sending money abroad"          ✅     ❌     ✅
"policy AC-4471-B"                      ❌     ✅     ✅
"error code E-3021"                     ❌     ✅     ✅
"what if my transfer bounces"           ✅     ❌     ✅
"SWIFT code requirements"               ✅     ✅     ✅
"Regulation (EU) 2015/847"              ❌     ✅     ✅
```

**Why dense fails on identifiers:** the embedding encodes "this is a policy identifier of roughly this shape." All policy numbers land near each other, so the specific one isn't distinguished. BM25 matches the exact token.

**Why sparse fails on paraphrase:** BM25 has no notion that "bounces" relates to "rejected" or "returned." No shared token, no match.

**The RRF property worth understanding:**

```
Document X:  dense rank 3, BM25 rank 8
  RRF = 1/(60+3) + 1/(60+8) = 0.0159 + 0.0147 = 0.0306

Document Y:  dense rank 1, BM25 absent
  RRF = 1/(60+1) = 0.0164

X ranks above Y — appearing reasonably high in BOTH lists beats
topping one and missing the other. That consensus signal is
usually the right behavior.
```

## 5. Why It Matters

- **Saying "dense only" signals inexperience** with real enterprise corpora, where identifiers are everywhere.
- **The failure modes are complementary**, so hybrid is close to strictly better rather than a trade-off.
- **RRF's rank-based fusion** is a specific, defensible technical choice.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Two indexes** | A keyword index alongside the vector index |
| **Ingestion writes both** | They must stay in sync; partial failure means inconsistent retrieval |
| **Slightly higher latency** | Two searches, though they run in parallel |
| **More tuning surface** | k per retriever, RRF constant, optional weighting |

| Failure | Detail |
|---|---|
| **Blending raw scores** | Fragile, needs constant recalibration |
| **Index drift** | Documents in one index and not the other |
| **BM25 analysis mismatch** | Different tokenization or stemming at index vs. query time |
| **Applying a threshold to fused results** | Scores from different scales aren't thresholdable together |

**On weighting:** you *can* weight the two retrievers in RRF, and it's occasionally worth it — a corpus of dense technical identifiers might weight BM25 higher. But I'd measure before adding the parameter, since equal weighting is a strong default.

## 7. Interview Answer

> "Hybrid retrieval runs dense embedding search and sparse BM25 keyword search in parallel and fuses the results. It's the production default for enterprise RAG because the two methods fail on complementary queries.
>
> Dense handles meaning — it matches 'cost of sending money abroad' to 'international wire fee: forty-five dollars' with no shared vocabulary. But it's weak on exact strings: a policy number like AC-4471-B embeds as 'an identifier of roughly this shape,' so all policy numbers land near each other and the specific one isn't distinguished. BM25 is the exact opposite — it matches the token precisely but has no idea that 'bounces' relates to 'rejected.'
>
> In enterprise queries you get both kinds constantly. Account numbers, error codes, regulation citations, product SKUs. So running only dense loses a large fraction of real queries.
>
> For fusion I'd use reciprocal rank fusion rather than blending scores, because a cosine of 0.82 and a BM25 score of 14.7 are on incomparable scales — normalizing them requires calibration that breaks whenever the corpus or model changes. RRF uses only ranks, so there's nothing to calibrate. It also has a nice property: a document ranking reasonably in both lists beats one that tops a single list and is absent from the other, which is usually the right consensus signal.
>
> The operational cost is two indexes to keep in sync. I'd reconcile document counts between them, because drift is silent — a document present in one and missing from the other just quietly retrieves worse."

## 8. Likely Follow-ups

**Q: Why RRF instead of weighted score fusion?**
Because dense and sparse scores are on incomparable scales, so blending requires normalization that has to be recalibrated whenever the corpus, embedding model, or query distribution changes. RRF uses only ranks, which are inherently comparable. It's also nearly parameter-free — the k constant of 60 is conventional and rarely needs tuning.

**Q: What does the k=60 constant do in RRF?**
It dampens the influence of top ranks. With a small k, rank 1 dominates heavily; with a large k, the curve flattens and lower ranks contribute more. 60 is the value from the original paper and it works well in practice. I wouldn't tune it before tuning more impactful things like retriever k or reranking.

**Q: When is dense-only acceptable?**
When the corpus has no identifiers, codes, or rare proper nouns and queries are purely conceptual. I'd verify by sampling production query logs for identifier-shaped tokens rather than assuming. In banking, legal, or technical support that condition essentially never holds.

**Q: Can you use different k for each retriever?**
Yes, and RRF handles asymmetric list lengths fine. If your queries skew conceptual, a larger dense k might help; if they skew lexical, a larger BM25 k. I'd tune against an eval set, though equal k is a reasonable starting default.

**Q: What about learned sparse retrievers like SPLADE?**
They're a middle ground — learned sparse representations that expand query terms to related vocabulary while keeping exact-match capability and inverted-index efficiency. They can beat BM25 on benchmarks. The cost is a model dependency and more expensive indexing, so I'd treat BM25 plus dense as the default and evaluate SPLADE if the exact-match gap persists.

## 9. Common Mistakes

- Using dense retrieval alone in an enterprise corpus.
- Blending raw cosine and BM25 scores instead of fusing ranks.
- Not reconciling the two indexes, letting them drift.
- Applying a similarity threshold to fused results with mixed score scales.
- Mismatched tokenization between BM25 index time and query time.

## 10. What to Remember

- **Dense + BM25 in parallel, fused.** The production default.
- **Complementary failures:** dense misses exact identifiers, BM25 misses paraphrase.
- **Fuse with RRF** — ranks only, so no score calibration to break.
- **Consensus across both lists beats topping one** — usually the right signal.
- **Reconcile the two indexes.** Drift is silent.
