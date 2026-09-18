# Cross-Encoders

> **Phase 11 · RAG RETRIEVAL · Topic 09**

## 1. Definition

A transformer that takes a query and a document as a **single concatenated input** and outputs a relevance score. Because self-attention runs across both, it models their interaction directly — which makes it much more accurate than comparing independently-computed embeddings.

## 2. Simple Explanation

A **bi-encoder** encodes the query and the document separately, then compares the two vectors. The document's vector was computed at ingestion and has to serve every possible query.

A **cross-encoder** reads both at once. It can notice that the specific term in the question appears in a specific clause of the document — something two independent summaries can never capture.

The price: nothing can be precomputed.

## 3. How It Works

```
Input:  [CLS] query tokens [SEP] document tokens [SEP]
              │
              ▼
   Transformer — self-attention runs ACROSS both segments;
   query tokens attend to document tokens and vice versa
              │
              ▼
   [CLS] representation → scoring head → relevance (0-1)
```

**The architectural comparison:**

| | Bi-encoder | Cross-encoder |
|---|---|---|
| Encoding | Separately | **Jointly** |
| Precomputable | Yes — index at ingestion | **No** |
| Query-time cost | 1 embed + ANN search | N forward passes |
| Scales to | Millions of docs | Tens of candidates |
| Accuracy | Good | Substantially better |
| Role | First-stage retrieval | Second-stage reranking |

**Why it can't do retrieval:** the document's representation depends on the query, so you'd need a forward pass per document in the corpus, per query. At a million documents that's a million forward passes for one search.

## 4. Practical Example

**The interaction a bi-encoder cannot capture:**

```
Query: "Is the Premier monthly fee waived at $10k balance?"

Doc A: "Premier accounts: $12 monthly maintenance fee. Waived when
        average daily balance exceeds $10,000."
Doc B: "Premier account holders enjoy priority service, dedicated
        relationship management, and preferential FX rates."

Bi-encoder:   A = 0.71,  B = 0.74   → B ranks first ❌
  Both documents are "about Premier accounts." The document
  embeddings were computed without knowing the question is
  specifically about a fee waiver threshold.

Cross-encoder: A = 0.96,  B = 0.11  → A ranks first ✅
  Attention connects "waived" and "$10k" in the query directly
  to "Waived when average daily balance exceeds $10,000" in A.
```

**Batching is the difference between usable and not:**

```python
# ❌ One forward pass per candidate, sequentially
for c in candidates:
    score = model.predict([(query, c.text)])      # ~600ms total on CPU

# ✅ All candidates in one batched forward pass
pairs  = [(query, c.text) for c in candidates]
scores = model.predict(pairs, batch_size=32)      # ~40-80ms on GPU
```

## 5. Why It Matters

- **The bi-encoder/cross-encoder distinction is a standard interview question**, and explaining *why* the trade-off exists is the differentiator.
- **It's the accuracy ceiling for ranking** in a normal RAG pipeline.
- **It's why the two-stage architecture exists** — cheap recall, expensive precision, each applied where affordable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Nothing precomputable** | Linear cost in candidates, every query |
| **Sequence length limit** | Typically 512 tokens combined; long chunks truncated silently |
| **Unbatched inference is slow** | 600ms+ on CPU vs. 40–80ms batched on GPU |
| **CPU often too slow for production** | GPU or a hosted API |
| **Domain mismatch** | General rerankers may not understand specialized jargon |
| **Cannot improve recall** | Only reorders what the first stage returned |

**Alternatives worth knowing:**

- **ColBERT / late interaction** — precomputes *token-level* document embeddings, then does fine-grained token-to-token matching at query time. More accurate than a bi-encoder, faster than a cross-encoder, but a much larger index since you store per-token vectors.
- **LLM as reranker** — most flexible, can follow ranking instructions, 5–10× slower.

## 7. Interview Answer

> "A cross-encoder takes the query and a document as a single concatenated input and runs one forward pass to produce a relevance score. Self-attention operates across both segments, so query tokens attend to document tokens directly.
>
> That's why it beats a bi-encoder. A bi-encoder embedded the document at ingestion, before the query existed, so that one vector has to serve every possible query — and then you're comparing two independently-computed summaries with cosine. The cross-encoder gets to look at this specific pair together.
>
> The concrete difference shows on topically-similar-but-wrong candidates. If I ask whether the Premier monthly fee is waived at ten thousand dollars, a bi-encoder might rank a Premier benefits page above the actual fee table, because both are 'about Premier accounts' and neither embedding knew the question was about a waiver threshold. The cross-encoder's attention connects 'waived' and '$10k' in the query directly to the matching clause.
>
> The cost is that nothing is precomputable — the document representation depends on the query, so it's a forward pass per candidate, every query. That's why it can't replace retrieval and has to run second over a small candidate set.
>
> Two implementation details. Batch all candidates into one forward pass — unbatched CPU inference can be six hundred milliseconds where batched GPU is forty to eighty. And watch the sequence length limit: most cross-encoders cap around 512 tokens for query plus document, so if my chunks are 800 tokens the tail is invisible to the reranker, possibly including the answer."

## 8. Likely Follow-ups

**Q: Why can't a cross-encoder do first-stage retrieval?**
Because it requires a forward pass per query-document pair with nothing precomputable. Over a million-document corpus that's a million forward passes per query, which is completely impractical. The bi-encoder's entire value is that document embeddings are computed once at ingestion and searched with an ANN index, so query-time cost is independent of corpus size.

**Q: How much more accurate is it?**
It depends on how imprecise the first stage was — the measurable headroom is the gap between recall at your candidate count and recall at your final k. A good reranker recovers most of that gap. If the gap is small, retrieval was already precise and the gain is small too.

**Q: What is ColBERT / late interaction?**
A middle ground. It precomputes token-level embeddings for documents rather than one vector per document, then at query time computes fine-grained token-to-token similarity. That captures more interaction than a bi-encoder while keeping most of the precomputation benefit. The cost is a much larger index, since you store a vector per token rather than per chunk.

**Q: How do you handle chunks longer than the reranker's limit?**
Options: keep chunks under the limit in the first place, use a reranker with a longer context window, or rerank on a truncated or summarized version while returning the full chunk. The important thing is to know the limit and check it against your chunk size — silent truncation here means the reranker is scoring only part of each candidate.

**Q: Can you fine-tune a cross-encoder?**
Yes, and it's more practical than fine-tuning an embedding model because you need (query, positive, negative) triples rather than a large pretraining corpus. Production logs supply these well — queries with confirmed correct chunks as positives, and highly-ranked-but-wrong chunks as hard negatives. A few thousand triples can meaningfully improve domain performance.

## 9. Common Mistakes

- Running unbatched inference and getting unusable latency.
- Ignoring the sequence length limit, silently truncating candidates.
- Expecting it to improve recall rather than precision.
- Running it on CPU in a latency-sensitive path.
- Not being able to explain *why* it can't replace first-stage retrieval.

## 10. What to Remember

- **Query and document concatenated into one input**; attention runs across both.
- **Nothing precomputable** → forward pass per candidate → second stage only.
- **It catches topically-similar-but-wrong candidates** that bi-encoders rank highly.
- **Batch candidates into one forward pass**, and use a GPU or hosted API.
- **512-token limit** is the common gotcha — check it against your chunk size.
