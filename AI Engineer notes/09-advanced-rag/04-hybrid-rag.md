# Hybrid RAG

> **Phase 09 · ADVANCED RAG · Topic 04**

## 1. Definition

Combining dense (embedding) retrieval with sparse (keyword/BM25) retrieval and fusing the results. It's the production default for enterprise RAG, because the two methods fail on different queries and cover each other.

## 2. Simple Explanation

Dense retrieval understands meaning but not exact strings. Keyword retrieval matches exact strings but not meaning.

- Dense matches "how much does a transfer cost" to "wire fee: $45" — no shared words, same meaning.
- BM25 matches "AC-4471-B" to the chunk containing "AC-4471-B" — dense retrieval treats all policy numbers as roughly the same thing.

Enterprise queries contain both kinds. You need both retrievers.

## 3. How It Works

```
query ─┬─▶ dense retriever  (embed → ANN search) → top-20 ─┐
       └─▶ sparse retriever (BM25)                → top-20 ─┴─▶ fuse → rerank → top-k
```

**Fusion with Reciprocal Rank Fusion (RRF)** — the standard, because it needs no score calibration:

```python
def rrf(result_lists, k=60):
    scores = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

**Why RRF and not weighted score blending:** a cosine similarity of 0.82 and a BM25 score of 14.7 live on incomparable scales. Normalizing them requires calibration that breaks whenever the corpus, the embedding model, or the query distribution changes. RRF uses only ranks, so there's nothing to calibrate.

The `k=60` constant dampens the influence of top ranks slightly; it's the conventional value and rarely needs tuning.

## 4. Practical Example

**Where each method wins and loses:**

```
Query                               Dense   BM25   Hybrid
──────────────────────────────────────────────────────────
"cost of sending money abroad"       ✅      ❌      ✅
  (no shared words with "wire fee")

"policy AC-4471-B"                   ❌      ✅      ✅
  (embedding sees "an identifier")

"SWIFT code requirements"            ✅      ✅      ✅
  (both work)

"what if my transfer bounces"        ✅      ❌      ✅
  (colloquial phrasing)

"error code E-3021"                  ❌      ✅      ✅
```

**The enterprise pattern:** exact identifiers — account numbers, policy IDs, product codes, error codes, SKUs, regulation citations — are common in real queries and are precisely where dense retrieval is weakest. That's the main practical argument for hybrid, and it's a strong one in banking.

**BM25 in brief** (the sparse side): scores documents by term frequency, inverse document frequency, and length normalization. Rare terms in the query that appear often in a short document score highest. It's decades old, extremely fast, and still the strongest simple lexical baseline.

## 5. Why It Matters

- **It's the production default** for enterprise RAG, and saying "dense only" signals inexperience with real corpora.
- **The failure modes are complementary**, so hybrid is close to strictly better rather than a trade-off.
- **RRF is the right fusion method** and knowing *why* — no score calibration — is a differentiator.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Two indexes to maintain** | A keyword index (Elasticsearch, OpenSearch, or built-in) plus the vector index |
| **Ingestion writes to both** | Both must stay in sync; a partial failure means inconsistent retrieval |
| **Slightly higher query latency** | Two searches, though they run in parallel |
| **More tuning surface** | k per retriever, RRF constant, optional weighting |

| Failure | Detail |
|---|---|
| **Blending raw scores** | Fragile; requires constant recalibration |
| **Same k for both** | Sometimes one retriever should cast wider; worth measuring |
| **BM25 analysis mismatch** | Tokenization/stemming differences between index and query time |
| **Index drift** | Documents in the vector store but not the keyword index, or vice versa |

**When dense-only is acceptable:** corpora with no identifiers, codes, or rare proper nouns, and queries that are purely conceptual. That's rarer than people assume — check your actual query logs for identifier-shaped tokens before deciding.

## 7. Interview Answer

> "Hybrid RAG combines dense embedding retrieval with sparse keyword retrieval, usually BM25, and fuses the results. It's the production default for enterprise RAG because the two methods fail on different queries.
>
> Dense retrieval handles meaning — it matches 'cost of sending money abroad' to 'international wire fee: forty-five dollars' despite no shared vocabulary. But it's weak on exact strings, because a policy number like AC-4471-B embeds as 'an identifier of this shape,' so all policy numbers land near each other and the specific one isn't distinguished. BM25 is the exact opposite. In enterprise queries you get both kinds constantly — account numbers, error codes, product SKUs, regulation citations — so you need both retrievers.
>
> For fusion I'd use reciprocal rank fusion rather than blending scores. A cosine similarity of 0.82 and a BM25 score of 14.7 are on incomparable scales, and normalizing them requires calibration that breaks whenever the corpus or the embedding model changes. RRF uses only ranks, summing one over sixty-plus-rank across lists, so there's nothing to calibrate and it's robust.
>
> The costs are real but modest: two indexes to maintain and keep in sync, and a bit more query latency, though the two searches run in parallel. The main operational risk is index drift — documents present in one index and not the other — so I'd reconcile counts between them.
>
> Dense-only is defensible if your corpus genuinely has no identifiers and queries are purely conceptual, but I'd check the actual query logs for identifier-shaped tokens before assuming that."

## 8. Likely Follow-ups

**Q: Why RRF instead of weighted score fusion?**
Because dense and sparse scores live on incomparable scales, so blending them requires normalization that has to be recalibrated whenever the corpus, embedding model, or query mix changes. RRF only uses ranks, which are inherently comparable. It's also nearly parameter-free — the k constant of 60 is conventional and rarely needs tuning.

**Q: What is BM25 actually doing?**
Scoring by term frequency, inverse document frequency, and document length normalization. A query term that's rare across the corpus but frequent in a short document scores highly. It's a decades-old lexical ranking function and it remains the strongest simple keyword baseline — which is why it's still the sparse half of hybrid systems rather than something newer.

**Q: When would dense-only be enough?**
When the corpus has no identifiers, codes, or rare proper nouns, and the queries are purely conceptual — general knowledge content asked about in natural language. I'd verify by sampling production queries for identifier-shaped tokens. In banking, legal, or technical support, that condition essentially never holds.

**Q: Can you use different k for each retriever?**
Yes, and it's worth measuring. If your queries skew conceptual, a larger dense k and smaller BM25 k may be better, and vice versa. RRF handles asymmetric list lengths fine. I'd tune it against an eval set rather than defaulting to equal k, though equal k is a reasonable starting point.

**Q: What about sparse neural retrievers like SPLADE?**
They're a middle ground — learned sparse representations that expand query terms to related vocabulary while keeping the exact-match property and the efficiency of an inverted index. They can outperform BM25 on some benchmarks. The trade-off is a model dependency and more expensive indexing, so I'd treat BM25 plus dense as the default and evaluate SPLADE if the exact-match gap is still hurting after that.

## 9. Common Mistakes

- Using dense retrieval only, then being surprised that identifier queries fail.
- Blending raw cosine and BM25 scores instead of fusing ranks.
- Not reconciling the two indexes, so they drift out of sync.
- Mismatched tokenization between BM25 index time and query time.
- Assuming hybrid is a trade-off — it's close to strictly better, at a modest operational cost.

## 10. What to Remember

- **Dense + BM25, fused.** The production default for enterprise RAG.
- **They fail differently:** dense misses exact identifiers, BM25 misses paraphrase.
- **Fuse with RRF** — ranks only, so no score calibration to break.
- **Cost:** two indexes to maintain and keep in sync; parallel searches, modest latency.
- **Check your query logs for identifiers** before deciding dense-only is enough.
