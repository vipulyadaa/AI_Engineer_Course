# Reranking

> **Phase 09 · ADVANCED RAG · Topic 14**

## 1. Definition

A second-stage model that rescores retrieved candidates by examining the query and each document *together*, then reorders them. It restores precision after a recall-oriented first-stage retrieval.

## 2. Simple Explanation

First-stage retrieval compares the query embedding to precomputed document embeddings. Those embeddings were made independently — the document was embedded before your query existed.

A reranker reads the query and the document at the same time, so it can judge relevance far more accurately. It's too slow to run over a whole corpus, but perfect over 20 candidates.

**This is why the standard architecture is: retrieve wide, rerank narrow.**

## 3. How It Works

```
query → first-stage retrieval (fast, approximate) → 20-50 candidates
                                                          │
                                                          ▼
                                            ┌──────────────────────────┐
                                            │ Cross-encoder scores     │
                                            │ (query, doc) pairs       │
                                            │ jointly — one forward    │
                                            │ pass per pair            │
                                            └────────────┬─────────────┘
                                                         ▼
                                              reorder → top 3-5 → prompt
```

**Bi-encoder vs. cross-encoder — the core distinction:**

| | Bi-encoder (retrieval) | Cross-encoder (reranking) |
|---|---|---|
| Encoding | Query and doc separately | Query and doc **together** |
| Precompute | Yes — docs embedded at ingestion | No — every pair at query time |
| Cost per query | One embedding + ANN search | N forward passes |
| Scalable to | Millions of docs | Tens of candidates |
| Accuracy | Good | Substantially better |

**Reranker options:**

| Type | Latency (20 docs) | Notes |
|---|---|---|
| Cross-encoder (bge-reranker, Cohere Rerank) | 50–200ms | The standard choice |
| LLM-as-reranker | 500ms–2s | Flexible, expensive; can follow instructions |
| ColBERT-style late interaction | ~20–50ms | Middle ground; token-level matching |

## 4. Practical Example

**Measure whether reranking will help before adding it:**

```
Eval set, 200 questions with known correct chunks:

  recall@20 = 0.94      ← the right chunk is usually retrieved
  recall@4  = 0.71      ← but often not in the top 4

  Gap = 0.23  → reranking has 23 points of headroom.  WORTH IT.

Different system:
  recall@20 = 0.78
  recall@4  = 0.74
  Gap = 0.04  → retrieval is already precise; the problem is
                upstream. A reranker buys latency, not quality.
```

**That diagnostic is the single most useful thing in this topic.** The gap between recall at high k and low k is exactly what reranking can recover, and nothing more.

**Cohere Rerank, as a concrete API shape:**

```python
results = cohere.rerank(
    query=question,
    documents=[c.text for c in candidates],   # 20-50 candidates
    top_n=4,
    model="rerank-english-v3.0",
)
reranked = [candidates[r.index] for r in results.results]
```

## 5. Why It Matters

- **It's usually the highest-value post-retrieval technique**, and cheap to add.
- **It decouples recall from precision** — you can retrieve generously without flooding the prompt.
- **The recall-gap diagnostic** tells you whether it will help before you build it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Latency** | 50–200ms for a cross-encoder over 20 docs; more for an LLM reranker |
| **Can't fix bad retrieval** | It only reorders what was retrieved. If the answer wasn't in the candidates, nothing happens |
| **Cost scales with candidate count** | Reranking 100 candidates costs 5× reranking 20 |
| **Model dependency** | Another model to host, version, and monitor |
| **Domain mismatch** | A general reranker may not understand domain jargon well |
| **Diminishing returns after good chunking** | Fix chunking first; the reranker may then have nothing to recover |

**The most important limitation, stated plainly:** a reranker cannot surface a document that retrieval never returned. If recall@50 is 0.60, your ceiling is 0.60 regardless of how good the reranker is. Reranking is a precision tool, not a recall tool.

**On candidate count:** more candidates means better recall going in but more reranking cost and latency. 20–50 is the usual range. Measure where recall@k flattens and rerank from there.

## 7. Interview Answer

> "Reranking is a second-stage model that rescores retrieved candidates by looking at the query and each document together, then reorders them.
>
> The reason it's more accurate than first-stage retrieval is structural. A bi-encoder embeds the document at ingestion, before your query exists, so the two representations are computed independently and compared by cosine. A cross-encoder processes the query and document jointly in one forward pass, so it can model the interaction between them. That's far more accurate — and far too slow to run over a corpus, which is why it goes second over a small candidate set.
>
> The diagnostic I'd run before adding one: compare recall at high k to recall at low k. If recall@20 is 0.94 and recall@4 is 0.71, there's twenty-three points of headroom and reranking will recover most of it. If they're 0.78 and 0.74, retrieval is already precise and the problem is upstream — a reranker there buys latency, not quality.
>
> The limitation I'd state plainly is that a reranker can't surface what retrieval never returned. If recall@50 is 0.60, that's the ceiling no matter how good the reranker is. It's a precision tool, not a recall tool — so if recall is the problem, I'd fix chunking, add hybrid retrieval, or change the embedding model instead.
>
> Cost is 50 to 200 milliseconds for a cross-encoder over twenty candidates, which is usually acceptable. An LLM reranker is more flexible and can follow instructions like 'prefer recent documents,' but at 500 milliseconds to two seconds it's often not worth it."

## 8. Likely Follow-ups

**Q: Bi-encoder vs. cross-encoder?**
A bi-encoder encodes query and document separately, so document embeddings can be precomputed and searched with ANN — that's what makes retrieval over millions of documents possible. A cross-encoder encodes them together in one pass, capturing interaction, which is much more accurate but requires a forward pass per pair at query time. The two-stage architecture uses each where it's suited.

**Q: When is reranking not worth it?**
When recall@k at your final k is already close to recall at a much higher k — there's nothing to recover. Also when latency budget is tight and the gain is small. And when the underlying problem is recall rather than ranking, in which case the effort belongs in chunking, hybrid retrieval, or the embedding model.

**Q: How many candidates should you rerank?**
20–50 typically. Enough that recall going in is high, few enough that latency and cost stay reasonable. I'd find where the recall@k curve flattens and use that as the candidate count, then rerank down to 3–5 for the prompt.

**Q: Would you use an LLM as a reranker?**
Sometimes. It's more flexible — it can follow instructions like "prefer the most recent version" or "prioritize regulatory documents" that a trained cross-encoder can't. But it's 5–10× slower and far more expensive. I'd use a cross-encoder as the default and reserve LLM reranking for cases where the ranking criteria are genuinely complex or change dynamically.

**Q: What is ColBERT / late interaction?**
A middle ground. It precomputes token-level embeddings for documents rather than a single vector, then at query time computes fine-grained token-to-token similarity. That captures more interaction than a bi-encoder while keeping most of the precomputation advantage. The cost is a much larger index, since you store per-token vectors rather than one per chunk.

## 9. Common Mistakes

- Adding a reranker without measuring the recall gap it could recover.
- Expecting it to fix a recall problem — it only reorders what was retrieved.
- Reranking too few candidates, so the ceiling is low.
- Reranking too many, paying latency for marginal recall.
- Using an LLM reranker by default when a cross-encoder is 10× faster.

## 10. What to Remember

- **Cross-encoder scores (query, doc) jointly** — much more accurate, much slower.
- **Retrieve wide, rerank narrow.** 20–50 candidates → top 3–5.
- **Diagnostic: recall@high-k minus recall@low-k** is exactly the headroom available.
- **It's a precision tool, not a recall tool.** It can't surface what wasn't retrieved.
- **Fix chunking first** — the reranker may have nothing left to recover.
