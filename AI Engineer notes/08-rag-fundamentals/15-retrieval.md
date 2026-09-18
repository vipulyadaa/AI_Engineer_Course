# Retrieval

> **Phase 08 · RAG FUNDAMENTALS · Topic 15**

## 1. Definition

Finding the chunks most likely to answer the user's question. It's the stage that determines RAG quality more than any other, because retrieval recall is a hard upper bound on what the generator can possibly produce.

## 2. Simple Explanation

If the right chunk isn't in what you retrieve, the answer cannot be correct. No prompt engineering, no better model, no reranker fixes it — the information simply isn't in the context.

That's why "was the right chunk retrieved?" is the first question to ask about any wrong RAG answer, and why retrieval gets the most engineering attention.

## 3. How It Works

1. **Transform the query** if useful — rewrite, expand, or generate a hypothetical answer.
2. **Apply filters** — access control, date range, document type. **Before** the search, not after.
3. **Search**, usually two ways in parallel:
   - **Dense** — embed the query, find nearest vectors. Catches paraphrase and meaning.
   - **Sparse (BM25)** — keyword match. Catches exact terms, IDs, product codes, rare words.
4. **Fuse** the two result lists, typically with Reciprocal Rank Fusion.
5. **Rerank** the fused candidates with a cross-encoder for precision.
6. **Return top-k** to context construction.

```
query → [filter by ACL] → ┬→ dense  top-20 ─┐
                          └→ BM25   top-20 ─┴→ RRF fuse → rerank → top-4
```

**The shape to remember: retrieve wide for recall, rerank narrow for precision.**

## 4. Practical Example

**Why hybrid beats either method alone:**

```
Query: "What's the fee on policy AC-4471-B?"

Dense only:   finds chunks about policy fees generally.
              Misses the specific policy — the embedding encodes
              "policy identifier", not that exact string.

BM25 only:    finds the chunk containing "AC-4471-B" exactly.
              Misses a chunk that says "this policy carries a
              $45 charge" without repeating the ID.

Hybrid:       both. RRF ranks the chunk that scores well on
              either signal.
```

**Reciprocal Rank Fusion**, which is the standard fuser because it needs no score calibration:

```python
def rrf(result_lists, k=60):
    scores = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

It uses only *ranks*, so you never have to normalize a cosine score against a BM25 score — which is the problem that makes naive score-blending fragile.

## 5. Why It Matters

- **Retrieval recall upper-bounds answer quality.** Everything downstream is capped by it.
- **It's where the most tuning leverage is** after chunking — hybrid, top-k, reranking, filters.
- **It's where access control is enforced.** Security lives in the filter, not in the prompt.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Right chunk not in top-k** | Unrecoverable downstream | Hybrid retrieval, higher k + rerank, better chunking |
| **Dense-only on identifiers** | Exact codes and numbers missed | Add BM25 |
| **top-k too low** | Answer just outside the cut | Raise k, rerank back down |
| **top-k too high** | Irrelevant context distracts the model; costs tokens | Rerank; use a similarity floor |
| **Post-filtering for ACL** | Leaks and silently under-retrieves | Pre-filter during search |
| **Near-duplicate results** | Top-k filled with the same fact repeated | Deduplicate; use MMR for diversity |
| **Multi-hop questions** | One retrieval pass can't chain facts | Multi-query or agentic retrieval |

**The most common production shape that fixes most of this:** hybrid retrieve top-20, rerank to top-4. It gets high recall from casting wide and high precision from the cross-encoder, at a cost of 100–300ms.

## 7. Interview Answer

> "Retrieval finds the chunks most likely to answer the question, and it determines RAG quality more than anything else — because retrieval recall is a hard upper bound. If the right chunk isn't in what I retrieve, the answer can't be correct, and no prompt engineering recovers it.
>
> The shape I'd build is: filter by the caller's permissions first, then retrieve wide with hybrid search, then rerank narrow. Concretely, BM25 top-twenty and dense top-twenty in parallel, fused with reciprocal rank fusion, then a cross-encoder reranks down to four.
>
> Hybrid matters because the two methods fail differently. Dense retrieval handles paraphrase — matching 'how much does a transfer cost' to 'wire fee: forty-five dollars' — but it's bad at exact identifiers, because a policy number embeds as 'this is an identifier' rather than as that specific string. BM25 is the opposite. Together they cover each other.
>
> I'd use reciprocal rank fusion rather than blending scores, because it only uses ranks. Trying to normalize a cosine score against a BM25 score is fragile and needs recalibration whenever anything changes.
>
> The security point I'd make explicitly is that the ACL filter goes before the search, as a constraint on the candidate set. Filtering afterwards means top-k was computed over documents the user can't see, so you silently get fewer results — and any leakage is a real incident."

## 8. Likely Follow-ups

**Q: How do you choose top-k?**
Measure recall@k on a held-out set across several values and find where the curve flattens. Then decide whether to retrieve at the high-recall k and rerank down, which is usually right. The constraint is context budget — `chunk_size × k` is what you pay per query — and the risk at high k is distraction, since irrelevant context measurably degrades answers.

**Q: Why not just use dense retrieval?**
Because it fails on exact matches. Account numbers, policy IDs, product codes, error codes, and rare proper nouns are common in enterprise queries and dense retrieval handles them poorly — the embedding captures the category, not the string. BM25 catches those precisely. Hybrid is the production default for that reason.

**Q: What is Reciprocal Rank Fusion and why use it?**
It combines ranked lists by summing `1/(k + rank)` across lists, with k typically 60. The advantage is that it uses only ranks, so you never have to make a cosine score comparable to a BM25 score — those live on different scales and blending them requires calibration that breaks whenever the corpus or model changes. RRF is parameter-light and robust.

**Q: When is reranking worth the latency?**
When recall at high k is much better than recall at low k — that gap is exactly what reranking can recover. If recall@20 is 0.94 and recall@4 is 0.71, a reranker has room to lift the right chunk into the top four. If they're close, retrieval is already precise and the reranker mostly buys latency. So I'd measure the gap first.

**Q: How do you debug a retrieval failure?**
First, check whether the correct chunk exists in the index at all — if parsing or chunking dropped it, that's the bug. Second, search for it directly and see what rank it gets; if it's rank 47, that's a ranking problem and reranking or hybrid may fix it. If it's absent entirely, that's an embedding or query-mismatch problem. This sequence separates ingestion bugs from retrieval bugs in a few minutes.

## 9. Common Mistakes

- Using dense retrieval alone and losing exact-identifier queries.
- Post-filtering for access control.
- Setting top-k by feel instead of measuring recall@k.
- Blending raw cosine and BM25 scores instead of fusing ranks.
- Debugging the prompt when the right chunk was never retrieved.

## 10. What to Remember

- **Retrieval recall upper-bounds everything.** Check it first on any failure.
- **Retrieve wide, rerank narrow** — hybrid top-20 → cross-encoder → top-4.
- **Hybrid because dense misses exact identifiers** and BM25 misses paraphrase.
- **Fuse with RRF** — ranks, not scores, so no calibration needed.
- **ACL filter before the search**, always.
