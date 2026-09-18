# Cross-Encoder Reranking

> **Phase 09 · ADVANCED RAG · Topic 15**

## 1. Definition

Reranking with a transformer that takes the query and a candidate document as a **single concatenated input** and outputs a relevance score. The joint encoding lets attention operate across both, which is why it's substantially more accurate than comparing separate embeddings.

## 2. Simple Explanation

A bi-encoder is like two people separately describing a thing and then comparing their descriptions. A cross-encoder is one person looking at both at once.

The document was embedded at ingestion time — before your query existed. That embedding has to serve every possible query. A cross-encoder gets to look at *this* query and *this* document together, so it can notice that the specific term in the question appears in a specific clause of the document.

## 3. How It Works

```
Input:  [CLS] query tokens [SEP] document tokens [SEP]
                  │
                  ▼
        Transformer — self-attention runs ACROSS
        both segments, so query tokens attend to
        document tokens and vice versa
                  │
                  ▼
        [CLS] representation → classification head
                  │
                  ▼
           relevance score (0-1)
```

1. Concatenate query and document into one sequence.
2. One forward pass through the transformer.
3. The `[CLS]` output goes to a scoring head.
4. Repeat for every candidate — **N forward passes for N candidates**.
5. Sort by score, take the top few.

**Why it can't replace retrieval:** nothing is precomputable. The document representation depends on the query, so you'd need a forward pass per document in the corpus. At a million documents that's a million forward passes per query.

## 4. Practical Example

**A concrete score comparison showing what the cross-encoder catches:**

```
Query: "Is the Premier monthly fee waived at $10k balance?"

Candidate A: "Premier accounts: $12 monthly maintenance fee.
              Waived when average daily balance exceeds $10,000."
  bi-encoder cosine:  0.71     rank 3
  cross-encoder:      0.96     rank 1  ← correctly identified

Candidate B: "Premier account holders enjoy priority service,
              dedicated relationship management, and preferential
              rates on international transfers."
  bi-encoder cosine:  0.74     rank 1  ← topically similar, wrong
  cross-encoder:      0.11     rank 8

The bi-encoder ranked B higher because both are "about Premier
accounts." The cross-encoder saw that the QUESTION is about a fee
waiver threshold and B doesn't address it.
```

**Latency at realistic scale:**

```
Model: bge-reranker-base, 20 candidates, GPU
  batched into one forward pass    ≈ 40-80ms
  CPU, unbatched                   ≈ 600ms+  ← batch, and use a GPU
```

Batching all candidates into one forward pass is the difference between usable and not.

## 5. Why It Matters

- **It's the accuracy ceiling for ranking** in a standard RAG pipeline.
- **The bi-encoder/cross-encoder distinction is a common interview question**, and explaining *why* the trade-off exists is the differentiator.
- **It's what makes "retrieve wide, rerank narrow" work** — cheap recall, expensive precision, applied where each is affordable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Nothing precomputable** | Cost is linear in candidates, every query |
| **Sequence length limits** | Query + document must fit, typically 512 tokens. Long chunks get truncated |
| **Unbatched inference is slow** | Batch all candidates into one forward pass |
| **CPU inference is often too slow** | GPU or a hosted API for production latency |
| **Domain mismatch** | A general reranker may not understand specialized jargon; consider fine-tuning |
| **Can't improve recall** | Only reorders what was retrieved |

**The truncation issue is a real gotcha.** If your chunks are 800 tokens and the reranker's limit is 512, the tail of every chunk is invisible to it — including, potentially, the part that answers the question. Either keep chunks under the reranker's limit, or use a model with a longer window.

**Fine-tuning a reranker** is more tractable than fine-tuning an embedding model, because you need (query, relevant, irrelevant) triples rather than a full retraining corpus. If a general reranker underperforms on your domain, a few thousand labeled triples from production logs can help meaningfully.

## 7. Interview Answer

> "A cross-encoder reranker takes the query and a candidate document as a single concatenated input and runs one forward pass to produce a relevance score. The key property is that self-attention operates across both segments, so query tokens attend to document tokens directly.
>
> That's why it's more accurate than a bi-encoder. A bi-encoder embedded the document at ingestion, before the query existed, so that one vector has to serve every possible query. The cross-encoder gets to look at this specific pair together.
>
> The concrete difference shows up on topically-similar-but-wrong candidates. If I ask whether the Premier monthly fee is waived at a ten-thousand-dollar balance, a bi-encoder might rank a general Premier benefits page above the actual fee table, because both are 'about Premier accounts.' The cross-encoder sees that the question is about a waiver threshold and the benefits page doesn't address it.
>
> The cost is that nothing is precomputable — the document representation depends on the query, so it's a forward pass per candidate, every query. That's why it can't replace retrieval and has to run second over a small candidate set.
>
> Two implementation details that matter. Batch all candidates into one forward pass — unbatched CPU inference can be 600 milliseconds where batched GPU is 40 to 80. And watch the sequence length limit: if the reranker caps at 512 tokens and my chunks are 800, the tail of every chunk is invisible to it, possibly including the answer."

## 8. Likely Follow-ups

**Q: Why can't you use a cross-encoder for retrieval?**
Because it requires a forward pass per query-document pair and nothing can be precomputed. Over a million-document corpus that's a million forward passes per query, which is completely impractical. The bi-encoder's whole value is that document embeddings are computed once at ingestion and searched with an ANN index, making the query-time cost independent of corpus size.

**Q: How much accuracy does it actually buy?**
It depends entirely on how imprecise the first stage was. The measurable headroom is the gap between recall at your candidate count and recall at your final k — if recall@20 is 0.94 and recall@4 is 0.71, a good reranker recovers most of that 23 points. If the gap is small, so is the gain.

**Q: What about sequence length limits?**
Most cross-encoders cap around 512 tokens for the combined query and document. If chunks exceed that, the tail is truncated and invisible to the reranker — which can silently hide the answer. Options: keep chunks under the limit, use a long-context reranker, or rerank on a chunk summary while returning the full chunk.

**Q: Would you fine-tune a reranker?**
It's more tractable than fine-tuning an embedding model, because you need (query, positive, negative) triples rather than a large pretraining corpus. A few thousand triples harvested from production — queries with human-confirmed correct chunks as positives and highly-ranked-but-wrong chunks as hard negatives — can meaningfully improve domain performance. I'd try a general reranker first and fine-tune only if it underperforms.

**Q: What are the alternatives?**
ColBERT-style late interaction precomputes token-level document embeddings and does fine-grained matching at query time — more accurate than a bi-encoder, faster than a cross-encoder, but with a much larger index. An LLM reranker is more flexible and can follow ranking instructions, at 5–10× the latency. The cross-encoder is the default because it has the best accuracy-per-millisecond for standard relevance ranking.

## 9. Common Mistakes

- Running unbatched inference and getting unusable latency.
- Ignoring the sequence length limit, so long chunks are silently truncated.
- Expecting it to improve recall rather than precision.
- Reranking on CPU in a latency-sensitive path.
- Not measuring the recall gap before adding it.

## 10. What to Remember

- **Query and document concatenated into one input**; attention runs across both.
- **Nothing precomputable** → forward pass per candidate → must run second, over few candidates.
- **It catches topically-similar-but-wrong candidates** a bi-encoder ranks highly.
- **Batch candidates into one forward pass**, and use a GPU or hosted API.
- **Watch the 512-token limit** — long chunks get truncated silently.
