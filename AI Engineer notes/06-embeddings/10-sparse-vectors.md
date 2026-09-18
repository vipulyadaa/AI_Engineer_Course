# Sparse Vectors

> **Phase 06 · EMBEDDINGS · Topic 10**

## 1. Definition

High-dimensional vectors where most entries are zero — one dimension per vocabulary term, populated only for terms present. BM25 is the classic statistical form; SPLADE is the learned form.

## 2. Simple Explanation

A sparse vector says which terms are in a document and how important each is. Dimension 4,471 *is* the word "overdraft."

That directness is both its strength and its limit: exact terms are matched precisely, and anything not literally present is invisible.

## 3. How It Works

```
Vocabulary: 50,000 terms
Document vector: 50,000 dimensions, ~200 non-zero

Stored as {term_id: weight} pairs, not as an array:
  {4471: 2.3, 8802: 1.1, 12043: 0.7, ...}
```

**Why sparsity makes it fast:**

```
Inverted index:
  "overdraft" → [doc_12, doc_88, doc_401, ...]
  "premier"   → [doc_3, doc_12, doc_205, ...]

A query touches only the union of its terms' posting lists —
maybe a few thousand documents out of millions.

Dense ANN search must traverse a graph built over ALL vectors.
```

**Two forms:**

| | Statistical (BM25) | Learned (SPLADE) |
|---|---|---|
| Weights from | TF-IDF statistics | A transformer |
| Training | None | Required |
| Term expansion | None | **Yes — activates related terms** |
| Indexing cost | Trivial | A model forward pass per document |
| Index size | Small | Larger (expansion adds non-zeros) |

**SPLADE's term expansion is the interesting property:** a document about "overdraft" also activates "insufficient," "NSF," and "negative balance" — giving partial synonym handling while keeping exact-match capability and inverted-index efficiency.

## 4. Practical Example

**The interpretability advantage, which is underrated:**

```
Why did this document match?

BM25:   "matched 'AC-4471-B' (IDF 14.2) and 'international'
         (IDF 3.1); the identifier contributed 82% of the score"
         → fully explainable to a stakeholder or an auditor

Dense:  cosine 0.84
        → no explanation available

For debugging, and for explaining a result in a regulated
context, that difference is real.
```

**Where sparse wins decisively:**

```
Query: "error code E-3021"

BM25:  E-3021 has very high IDF — it appears in exactly one
       document — so that document dominates. Rank 1.

Dense: the embedding encodes "an error code identifier."
       E-3021, E-3019, and E-4102 occupy nearly the same
       region. The right one might rank 15th.
```

**And where it fails:**

```
Query: "what if my transfer bounces"
Doc:   "if a wire transfer is rejected, funds are returned"

Shared terms: "transfer" only.
BM25 has no notion that "bounces" relates to "rejected."
Poor ranking despite being the correct answer.
```

**Storage comparison at scale:**

```
10M chunks:
  dense, 768 dims FP32   ≈ 30 GB + graph overhead
  sparse, ~200 terms/doc ≈ a few GB

That cost difference is part of why BM25 remains
attractive as the cheap half of hybrid retrieval.
```

## 5. Why It Matters

- **It's the exact-match half of hybrid retrieval**, which is the production default.
- **Interpretability** is a genuine operational advantage for debugging and regulated explanation.
- **Learned sparse (SPLADE)** is a real middle ground worth knowing exists.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No semantic understanding (BM25)** | Synonyms and paraphrase invisible |
| **Analyzer mismatch** | Different tokenization at index vs. query time → silent misses |
| **Vocabulary mismatch** | User says "overdraft," document says "insufficient funds" |
| **Language-specific morphology** | Stemming rules don't transfer across languages |
| **SPLADE index bloat** | Term expansion multiplies non-zero entries |
| **SPLADE model dependency** | Indexing requires a forward pass per document |

**On analyzer mismatch:** the most common sparse-retrieval bug. If stemming is on at index time and off at query time, "transfers" won't match the indexed "transfer" — the document is present and unfindable, with no error. I'd smoke-test after any configuration change by indexing a known document and querying for a term I know is in it.

**On the practical recommendation:** BM25 plus dense is the default, because BM25 is free, fast, well understood, and interpretable. Evaluate SPLADE if the exact-match-plus-synonym gap is still hurting after hybrid — it's a real improvement in some domains, at the cost of a model dependency and index size.

## 7. Interview Answer

> "Sparse vectors have one dimension per vocabulary term, mostly zero, populated only for terms present. Dimension 4,471 *is* the word 'overdraft' — that directness is both the strength and the limit.
>
> The sparsity is what makes it fast. An inverted index maps each term to the documents containing it, so a query only touches the union of its terms' posting lists — maybe a few thousand documents out of millions. Dense ANN search has to traverse a graph built over every vector, which is more work even with good indexing.
>
> Where it wins decisively is exact identifiers. A query for error code E-3021 — that token has very high IDF because it appears in exactly one document, so that document dominates the ranking. Dense retrieval encodes it as 'an error code identifier,' which puts E-3021, E-3019, and E-4102 in nearly the same region, so the right one might rank fifteenth.
>
> Where it fails is paraphrase. 'What if my transfer bounces' against a document saying 'if a transfer is rejected, funds are returned' — the only shared term is 'transfer,' and BM25 has no idea 'bounces' relates to 'rejected.' That's exactly the gap dense retrieval fills, which is why hybrid is the default.
>
> The advantage I'd flag as underrated is interpretability. With BM25 I can say 'this matched because AC-4471-B has an IDF of 14.2 and contributed eighty-two percent of the score.' With dense retrieval I get a cosine of 0.84 and no explanation. For debugging, and for explaining a retrieval result to an auditor in a regulated context, that difference is real.
>
> There's also a learned form — SPLADE — where a transformer predicts term weights including terms not literally present, so a document about overdrafts also activates 'insufficient' and 'NSF.' That's partial synonym handling while keeping exact-match precision and inverted-index efficiency. I'd treat BM25 plus dense as the default and evaluate SPLADE only if the gap persists, since it adds a model dependency and multiplies index size.
>
> The bug I'd watch for is analyzer mismatch — different tokenization or stemming at index versus query time produces silent misses where the document is indexed and unfindable."

## 8. Likely Follow-ups

**Q: Why is sparse retrieval fast?**
The inverted index. Each term maps to a posting list of documents containing it, so a query examines only the union of its terms' lists — a few thousand documents out of millions. Dense ANN search traverses a graph over every vector, which is fundamentally more work.

**Q: What does SPLADE add over BM25?**
Learned term weights including terms not literally present — a document about overdrafts also activates "insufficient" and "NSF." That gives partial synonym handling while preserving exact-match capability and inverted-index efficiency. The cost is a model forward pass per document at indexing and a larger index from expansion.

**Q: What's the interpretability advantage?**
You can see exactly which terms matched and how much each contributed. That's genuinely useful for debugging a retrieval failure and for explaining a result in a regulated context — dense retrieval gives you a similarity number with no explanation, which is a real operational cost people underweight.

**Q: What's the most common sparse-retrieval bug?**
Analyzer mismatch — different tokenization, stemming, or stopword handling at index time versus query time. It produces silent misses: the document is indexed and the query can't find it, with no error anywhere. I'd smoke-test after any configuration change by querying for a term I know is in an indexed document.

**Q: Why not use dense retrieval alone?**
Because it structurally fails on exact identifiers — account numbers, error codes, regulation citations, product SKUs — which are common in enterprise queries. Those are exactly what sparse retrieval handles precisely. It's not that one is better; they fail on disjoint query types, which is the whole argument for hybrid.

## 9. Common Mistakes

- Mismatched analysis between index time and query time.
- Expecting BM25 to handle synonyms or paraphrase.
- Treating sparse as outdated rather than complementary.
- Adopting SPLADE before establishing BM25 plus dense is insufficient.
- Overlooking interpretability as a real operational advantage.

## 10. What to Remember

- **One dimension per term, mostly zero.** The inverted index makes it fast.
- **Wins on exact identifiers** via high IDF; **fails on paraphrase** entirely.
- **Interpretable** — you can see which terms matched and by how much.
- **SPLADE adds learned term expansion** while keeping exact match and index efficiency.
- **Analyzer must match at index and query time**, or matches fail silently.
