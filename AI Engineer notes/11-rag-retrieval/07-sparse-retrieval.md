# Sparse Retrieval

> **Phase 11 · RAG RETRIEVAL · Topic 07**

## 1. Definition

Retrieval using high-dimensional vectors where most entries are zero — one dimension per vocabulary term, populated only for terms actually present. BM25 is the classic statistical form; SPLADE and similar models are the learned form.

## 2. Simple Explanation

A sparse vector is essentially "which words are in this document, and how important is each."

```
Vocabulary: 50,000 terms
Document vector: 50,000 dimensions, ~200 non-zero
                 → stored as {term_id: weight} pairs, not as an array
```

That sparsity is why it's fast: an inverted index maps each term to the documents containing it, so you only touch documents that share a term with the query.

## 3. How It Works

**Statistical sparse (BM25):**
- Weights come from term frequency and inverse document frequency.
- No model, no training.
- Matches only terms literally present.

**Learned sparse (SPLADE, uniCOIL):**
- A transformer predicts which vocabulary terms should be active for a text — including terms **not literally present**.
- A document about "overdraft" may activate "insufficient," "NSF," and "negative balance" too.
- Still produces a sparse vector, so it still uses an inverted index.

```
Document: "Premier accounts waive the overdraft fee."

BM25 activates:    premier, accounts, waive, overdraft, fee
SPLADE activates:  premier, accounts, waive, overdraft, fee,
                   + insufficient(0.4), NSF(0.3), charge(0.5),
                     exempt(0.3), banking(0.2)
                   ← term expansion learned by the model
```

**That's the key idea:** learned sparse retrieval gets some semantic bridging while keeping exact-match capability and inverted-index efficiency.

## 4. Practical Example

**The three-way comparison:**

```
Query: "what's the charge when my balance goes negative?"

BM25:     matches "balance", "negative", "charge"
          → finds the chunk if it uses those exact words.
          Misses a chunk saying "overdraft fee applies when funds
          are insufficient."

SPLADE:   the query expands to include "overdraft", "insufficient",
          "fee" → matches the chunk BM25 missed, while still
          matching exact terms.

Dense:    matches semantically, but would also rank a chunk about
          "negative interest rates" nearby — it has no exact-term anchor.
```

**Why sparse retrieval is fast:**

```
Inverted index:
  "overdraft" → [doc_12, doc_88, doc_401, ...]
  "premier"   → [doc_3, doc_12, doc_205, ...]

Query "premier overdraft" only touches the union of those two
posting lists — maybe a few thousand documents out of a million.

Dense ANN search has to navigate a graph over ALL vectors.
```

## 5. Why It Matters

- **It's the exact-match half of hybrid retrieval**, which is the production default.
- **Learned sparse is a genuine middle ground** worth knowing — semantic bridging with lexical precision.
- **The inverted index is why it scales** so cheaply compared to dense ANN search.

## 6. Trade-offs / Failure Modes

| | BM25 | Learned sparse (SPLADE) |
|---|---|---|
| **Training needed** | No | Yes — a model dependency |
| **Indexing cost** | Trivial | A model forward pass per document |
| **Semantic bridging** | None | Partial, via term expansion |
| **Exact matching** | Perfect | Preserved |
| **Index size** | Small | Larger — expansion means more non-zero terms |
| **Interpretability** | Full — you can see which terms matched | Good — expanded terms are inspectable |

| Failure | Detail |
|---|---|
| **Vocabulary mismatch (BM25)** | No synonym handling at all |
| **Analyzer mismatch** | Different tokenization at index vs. query → silent misses |
| **SPLADE index bloat** | Term expansion can multiply index size several-fold |
| **Language-specific morphology** | Stemming rules don't transfer across languages |
| **Over-expansion** | An aggressive learned model activates too many terms, hurting precision |

**The practical recommendation:** BM25 plus dense is the default because it's free, fast, and well understood. Evaluate SPLADE if the exact-match-plus-synonym gap is still hurting after hybrid — it's a real improvement in some domains but it adds a model dependency and index size.

## 7. Interview Answer

> "Sparse retrieval uses vectors with one dimension per vocabulary term, where most entries are zero. That sparsity is what makes it fast — an inverted index maps each term to the documents containing it, so a query only touches documents sharing a term with it, rather than navigating a graph over every vector the way dense ANN search does.
>
> There are two forms. Statistical sparse is BM25 — weights from term frequency and inverse document frequency, no model, no training, matching only terms literally present. Learned sparse, like SPLADE, uses a transformer to predict which vocabulary terms should be active, including terms *not* literally in the text. A document about overdrafts might also activate 'insufficient,' 'NSF,' and 'negative balance.'
>
> That's the interesting property: learned sparse gets some semantic bridging while keeping exact-match capability and inverted-index efficiency. It's a genuine middle ground between BM25 and dense retrieval, not just a variant.
>
> My default would still be BM25 plus dense, because it's free, fast, and well understood, and the two cover each other's failures. I'd evaluate SPLADE if the exact-match-plus-synonym gap is still hurting after hybrid — it's a real improvement in some domains, but it adds a model dependency at indexing time and the term expansion multiplies index size.
>
> The operational bug to watch for with any sparse method is analyzer mismatch — different tokenization or stemming at index versus query time. It produces silent misses: the document is indexed and the query can't find it, with no error."

## 8. Likely Follow-ups

**Q: What makes sparse retrieval fast?**
The inverted index. Each term maps to a posting list of documents containing it, so a query only examines the union of posting lists for its terms — often a few thousand documents out of millions. Dense ANN search has to traverse a graph built over every vector, which is more work even with good indexing.

**Q: What is SPLADE doing differently from BM25?**
It uses a transformer to predict term weights across the whole vocabulary, including terms not present in the text. So a document gains activations for related terms it never literally contains, which gives partial synonym handling. The output is still sparse, so it still uses an inverted index — you get some semantic bridging without giving up lexical precision or efficiency.

**Q: Why not just use dense retrieval?**
Because dense embeddings blur exact strings — identifiers, error codes, and rare proper nouns all collapse into "an identifier of this shape." Sparse retrieval matches the exact token. In enterprise corpora those queries are common, so dropping sparse retrieval loses a meaningful fraction of them. That's the whole argument for hybrid.

**Q: What's the cost of learned sparse?**
A model forward pass per document at indexing time, plus a larger index because term expansion means more non-zero entries per document — sometimes several times larger than BM25. And a model dependency to host, version, and monitor. Whether that's worth it depends on whether the synonym gap is actually hurting after you've already added dense retrieval.

**Q: How do you combine sparse and dense?**
Run both in parallel and fuse with reciprocal rank fusion, which uses only ranks and therefore needs no score calibration between the two incomparable scales. That's hybrid retrieval, and it's the production default. You could also use a learned sparse model *instead of* BM25 as the sparse half, keeping the same architecture.

## 9. Common Mistakes

- Different analysis chains at index and query time, causing silent misses.
- Assuming sparse means "old" and dense means "better" — they solve different problems.
- Adopting SPLADE before establishing that BM25 plus dense is insufficient.
- Ignoring SPLADE's index size growth from term expansion.
- Applying English stemming rules to other languages.

## 10. What to Remember

- **Mostly-zero vectors, one dimension per term.** Inverted index makes it fast.
- **BM25 is statistical; SPLADE is learned** and adds term expansion.
- **Learned sparse is a middle ground** — semantic bridging with exact-match precision.
- **BM25 + dense is the default.** Evaluate SPLADE only if the gap persists.
- **Analyzer must be identical at index and query time.**
