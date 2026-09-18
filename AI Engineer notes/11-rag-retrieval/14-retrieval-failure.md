# Retrieval Failure

> **Phase 11 · RAG RETRIEVAL · Topic 14**

## 1. Definition

When retrieval doesn't surface the chunks needed to answer the question. It's the dominant cause of bad RAG answers, and it's unrecoverable downstream — no prompt engineering or better model fixes missing information.

## 2. Simple Explanation

If the right chunk isn't in the context, the answer cannot be correct.

That's why "was the right chunk retrieved?" is the first question to ask about any wrong RAG answer. It splits the problem cleanly: retrieval failure needs upstream fixes, generation failure needs prompt fixes, and they have nothing in common.

## 3. How It Works

**The diagnostic sequence — this is the whole topic:**

```
1. Does the correct chunk EXIST in the index?
   └─ No  → INGESTION failure: parsing dropped it, chunking split it,
            or the document was never loaded.
   └─ Yes → continue

2. Search directly for it. What rank does it get?
   └─ Not in top-100  → EMBEDDING/QUERY MISMATCH: wrong model,
                         asymmetry ignored, vocabulary gap, or
                         it's an exact-identifier query needing BM25.
   └─ Rank 40         → RANKING problem: reranking or hybrid may fix it.
   └─ Rank 6, k=5     → K TOO LOW: raise k, or rerank.

3. Was it filtered out?
   └─ Check ACL, date, and extracted filters.
      Over-filtering fails silently as "no information."
```

**Each branch has a different fix. Running this sequence takes minutes and saves days.**

## 4. Practical Example

**The five failure classes and their signatures:**

| Class | Signature | Fix |
|---|---|---|
| **Not in index** | Direct search finds nothing | Parsing/chunking/ingestion |
| **Wrong representation** | Rank > 100 despite being correct | Hybrid retrieval, embedding model, enrichment |
| **Ranking** | Rank 10–50 | Rerank, hybrid |
| **k too low** | Rank just outside k | Raise k, or rerank from a larger candidate set |
| **Over-filtered** | Empty or tiny result set | Soften extracted filters; check ACL and date |

**The silent ingestion failure is the one that hurts most:**

```
A scanned PDF produced zero chunks. No error anywhere.
Symptom: questions about that document never get good answers.

Looks like: a retrieval problem.
Actually is: an ingestion problem.

Prevention: assert on chunks-per-document, alert on drops,
and keep a golden set of questions whose correct chunks you
verify are present after every ingestion run.
```

**Instrumentation that makes this diagnosable:**

```python
log({
  "query": q,
  "rewritten_query": rq,
  "filters_applied": filters,
  "candidates_before_filter": n_before,
  "candidates_after_filter": n_after,     # ← catches over-filtering
  "top_scores": [r.score for r in results[:5]],
  "retrieved_chunk_ids": [r.id for r in results],
})
```

Without `candidates_after_filter`, over-filtering is invisible.

## 5. Why It Matters

- **It's the dominant cause of bad RAG answers**, and the most commonly misdiagnosed.
- **Retrieval recall is a hard ceiling** on end-to-end quality.
- **The diagnostic sequence is fast** and separates five failure classes with completely different fixes.

## 6. Trade-offs / Failure Modes

| Anti-pattern | Why it's wrong |
|---|---|
| **Tuning the prompt first** | The prompt can't invent information that isn't in the context |
| **Swapping the LLM** | Changes nothing if the fact was never retrieved |
| **Adding a reranker for a recall problem** | It only reorders what was retrieved |
| **Raising k indiscriminately** | Masks the problem, adds cost and distraction |
| **No per-stage instrumentation** | Every failure looks identical |
| **Not logging filter counts** | Over-filtering is invisible |

**The measurement that should exist before any of this:** `recall@k` on a held-out set of questions with known correct source chunks. Without it, you're debugging anecdotes.

## 7. Interview Answer

> "Retrieval failure is when the chunks needed to answer the question don't get surfaced. It's the dominant cause of bad RAG answers, and it's unrecoverable downstream — no prompt engineering or better model fixes information that isn't in the context.
>
> So the first question about any wrong answer is: was the right chunk retrieved? That splits the problem into two categories with nothing in common.
>
> My diagnostic sequence is three steps. First, does the correct chunk exist in the index at all? If not, that's an ingestion failure — parsing dropped it, chunking split it, or the document was never loaded. Second, if it exists, search for it directly and see what rank it gets. Not in the top hundred means a representation problem — wrong embedding model, ignored query-document asymmetry, or an exact-identifier query that needs BM25. Rank forty means a ranking problem, where reranking or hybrid helps. Rank six with k equals five means k is just too low. Third, check whether it was filtered out, because over-filtering fails silently as 'I don't have information about that.'
>
> Each branch has a completely different fix, and running the sequence takes minutes.
>
> The failure I'd guard against hardest is silent ingestion failure — a scanned PDF producing zero chunks with no error anywhere. It presents as a retrieval problem and isn't. I'd assert on chunks-per-document with alerting, and keep a golden set of questions whose correct chunks I verify are present after every ingestion run.
>
> And none of this works without per-stage instrumentation, including candidate counts before and after filtering — otherwise over-filtering is completely invisible."

## 8. Likely Follow-ups

**Q: How do you know it's a retrieval failure and not a generation failure?**
Look at the retrieved context. If the correct information is there and the answer is still wrong, it's generation. If it isn't there, it's retrieval. That single check separates the two, and it's why logging retrieved chunk IDs and text is essential — without it, you're guessing.

**Q: What's the first thing you'd check?**
Whether the correct chunk exists in the index at all. It's the cheapest check and it catches the worst class of failure — silent ingestion problems where a document produced no chunks. If it isn't there, everything downstream is irrelevant.

**Q: How do you measure retrieval quality systematically?**
`recall@k` on a held-out set of questions with known correct source chunks. Measure at several k values, because the gap between recall at high k and low k tells you whether the problem is ranking or retrieval. Slice by query type, since exact-identifier queries and conceptual queries fail differently and an aggregate number hides that.

**Q: What if the chunk is in the index but ranks very low?**
That's a representation problem. Check whether it's an exact-match query that needs BM25, whether query-document asymmetry is being handled, whether the chunk lacks the vocabulary connecting it to the question — which enrichment fixes — and whether the embedding model suits the domain. Reranking won't help if it's outside the candidate set.

**Q: What instrumentation do you need?**
Per request: the original and rewritten query, filters applied, candidate counts before and after filtering, top similarity scores, and retrieved chunk IDs. The before/after filter counts are the one people omit, and without them over-filtering is undiagnosable — you just see an unhelpful answer with no indication that six results were stripped.

## 9. Common Mistakes

- Debugging the prompt when the right chunk was never retrieved.
- Swapping the LLM to fix a retrieval problem.
- Adding a reranker when the issue is recall, not ranking.
- Not logging retrieved chunks, so you can't tell which failure class it is.
- Not logging filter counts, making over-filtering invisible.

## 10. What to Remember

- **If the chunk isn't in the context, nothing downstream fixes it.**
- **First question on any wrong answer:** was the right chunk retrieved?
- **Three-step diagnostic:** in the index? what rank? filtered out?
- **Five failure classes, five different fixes.** Don't apply a reranker to a recall problem.
- **Instrument per stage**, including candidate counts before and after filtering.
