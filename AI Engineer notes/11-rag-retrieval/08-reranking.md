# Reranking (Retrieval View)

> **Phase 11 · RAG RETRIEVAL · Topic 08**

## 1. Definition

A second-stage model that rescores first-stage retrieval candidates by examining query and document jointly, then reorders them. It converts a recall-oriented retrieval into a precision-oriented final set.

## 2. Simple Explanation

First-stage retrieval compares your query embedding to document embeddings computed at ingestion — before your query existed. That's fast enough to search millions of documents, and approximate.

A reranker reads the query and each candidate together, which is far more accurate and far too slow for a whole corpus. So you run it second, over 20–50 candidates.

**Retrieve wide, rerank narrow.**

## 3. How It Works

```
query → hybrid retrieval → 20-50 candidates
                                 ↓
                    cross-encoder scores each
                    (query, doc) pair jointly
                                 ↓
                         reorder → top 3-5 → prompt
```

**The decision to make before adding one — measure the headroom:**

```
recall@20 = 0.94      ← the right chunk is usually retrieved
recall@4  = 0.71      ← but often not in the final set
gap = 0.23            → reranking has 23 points to recover.  WORTH IT.

recall@20 = 0.78
recall@4  = 0.74
gap = 0.04            → retrieval is already precise; the problem
                        is upstream. Reranking buys latency only.
```

That gap is exactly what reranking can recover, and nothing more.

## 4. Practical Example

**What reranking actually catches:**

```
Query: "Is the Premier monthly fee waived at $10k balance?"

Bi-encoder (first stage) ranking:
  1. "Premier account holders enjoy priority service, dedicated
      relationship management, and preferential rates..."
      → 0.74. Topically similar: both about Premier accounts.
  3. "Premier accounts: $12 monthly maintenance fee. Waived when
      average daily balance exceeds $10,000."
      → 0.71. The actual answer, ranked third.

Cross-encoder rerank:
  1. the fee/waiver chunk          → 0.96
  8. the benefits chunk            → 0.11

The cross-encoder saw that the QUESTION is about a waiver
threshold, and that the benefits page doesn't address it.
The bi-encoder could only see "both are about Premier accounts."
```

**Options and costs:**

| Reranker | Latency (20 docs) | Notes |
|---|---|---|
| Cross-encoder (bge-reranker, Cohere Rerank) | 50–200ms | The standard choice |
| ColBERT / late interaction | 20–50ms | Bigger index, token-level matching |
| LLM reranker | 500ms–2s | Can follow ranking instructions; expensive |

## 5. Why It Matters

- **It's usually the highest-value post-retrieval addition**, and quick to implement.
- **It decouples retrieval k from context k**, so you can retrieve generously without flooding the prompt.
- **The recall-gap diagnostic** tells you whether it will help before you build it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Cannot improve recall** | It only reorders what was retrieved. If recall@50 is 0.60, that's your ceiling |
| **Latency** | 50–200ms for a cross-encoder; more for an LLM reranker |
| **Cost scales with candidates** | Reranking 100 costs 5× reranking 20 |
| **Sequence length limit** | Typically 512 tokens for query + document; longer chunks get truncated |
| **Model dependency** | Another model to host, version, and monitor |
| **Domain mismatch** | A general reranker may not handle specialized jargon well |

**The limitation to state plainly:** a reranker is a precision tool, not a recall tool. If the right chunk was never in the candidate set, reranking never sees it. When recall is the problem, the fix is upstream — chunking, hybrid retrieval, or the embedding model.

**Fine-tuning a reranker** is more tractable than fine-tuning an embedding model, since you need (query, positive, negative) triples rather than a pretraining corpus. A few thousand triples from production logs — queries with human-confirmed correct chunks as positives, highly-ranked-but-wrong chunks as hard negatives — can meaningfully improve domain performance.

## 7. Interview Answer

> "Reranking is a second-stage model that rescores retrieval candidates by looking at the query and each document together, then reorders them.
>
> It's more accurate than first-stage retrieval for a structural reason. The bi-encoder embedded the document at ingestion, before my query existed, so that one vector has to serve every possible query, and the comparison is just cosine between two independently-computed representations. A cross-encoder processes the pair jointly, so attention runs across both and it can model the interaction.
>
> Concretely, it catches topically-similar-but-wrong candidates. If I ask whether the Premier monthly fee is waived at a ten-thousand-dollar balance, a bi-encoder might rank a general Premier benefits page first because both are 'about Premier accounts.' The cross-encoder sees the question is about a waiver threshold and the benefits page doesn't address it.
>
> Before adding one, I'd measure the headroom: compare recall at my candidate count to recall at my final k. If recall@20 is 0.94 and recall@4 is 0.71, there's twenty-three points to recover and it's clearly worth it. If they're 0.78 and 0.74, retrieval is already precise and a reranker buys latency, not quality.
>
> The limitation I'd state plainly is that it can't improve recall — it only reorders what was retrieved. If recall@50 is 0.60, that's the ceiling regardless of reranker quality. So when recall is the problem, the fix is upstream in chunking, hybrid retrieval, or the embedding model."

## 8. Likely Follow-ups

**Q: When is reranking not worth it?**
When recall at your final k is already close to recall at a much higher k — there's no headroom. Also when the latency budget is tight and the gain is small. And when the actual problem is recall rather than ranking, where the effort belongs in chunking or adding BM25 instead.

**Q: How many candidates should you rerank?**
20–50 typically. Enough that recall going in is high, few enough that latency stays reasonable — cost is linear in candidates. I'd find where the recall@k curve flattens and use that as the candidate count, then rerank down to 3–5 for the prompt.

**Q: Would you use an LLM as the reranker?**
Usually not as the default. It's more flexible — it can follow instructions like "prefer the most recent version" or "prioritize regulatory sources" that a trained cross-encoder can't — but it's 5–10× slower and much more expensive. I'd use a cross-encoder by default and reserve LLM reranking for cases where ranking criteria are complex or change dynamically.

**Q: What's the sequence length problem?**
Most cross-encoders cap around 512 tokens for the combined query and document. If chunks are 800 tokens, the tail of every chunk is invisible to the reranker — potentially including the part that answers the question. Either keep chunks under the limit, use a long-context reranker, or rerank on a summary while returning the full chunk.

**Q: Can you fine-tune a reranker?**
Yes, and it's more tractable than fine-tuning an embedding model because you need (query, positive, negative) triples rather than a large pretraining corpus. Production logs are a good source — queries with human-confirmed correct chunks as positives, and chunks that ranked highly but were wrong as hard negatives. A few thousand triples can meaningfully improve domain performance.

## 9. Common Mistakes

- Adding a reranker without measuring the recall gap it could recover.
- Expecting it to fix a recall problem.
- Ignoring the 512-token limit, so long chunks are silently truncated.
- Reranking too few candidates, capping the achievable ceiling.
- Defaulting to an LLM reranker when a cross-encoder is far faster.

## 10. What to Remember

- **Cross-encoder scores (query, doc) jointly** — much more accurate, too slow for a corpus.
- **Retrieve wide, rerank narrow.** 20–50 candidates → top 3–5.
- **Diagnostic: recall@high-k minus recall@low-k** is exactly the available headroom.
- **Precision tool, not a recall tool.** It can't surface what wasn't retrieved.
- **Watch the 512-token limit** and batch candidates into one forward pass.
