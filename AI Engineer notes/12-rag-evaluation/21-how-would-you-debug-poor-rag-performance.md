# How Would You Debug Poor RAG Performance?

> **Phase 12 · RAG EVALUATION · Topic 21**

## 1. Definition

A systematic diagnostic that localizes the failure to a specific stage — ingestion, retrieval, context construction, or generation — before attempting any fix. The order matters because the stages have completely different remedies.

## 2. Simple Explanation

The instinct is to tune the prompt, because it's the easiest thing to change. That's almost always wrong.

Most RAG failures are upstream — the content wasn't indexed, or wasn't retrieved. Prompting can't add information that isn't in the context. So the first job is finding out *where* it broke.

## 3. How It Works

**The diagnostic, in order:**

```
1. LOOK AT THE RETRIEVED CONTEXT for the failing questions.
   Is the answer in there?
     ├─ NO  → retrieval or ingestion problem → step 2
     └─ YES → generation problem → step 5

2. Does the correct chunk EXIST in the index?
   Search directly for distinctive terms.
     ├─ NO  → INGESTION. Check the source system.
     │        Parse failure? Zero-chunk document? Unreconciled delete?
     └─ YES → step 3

3. What RANK does it get?
     ├─ Not in top-100 → REPRESENTATION. Exact-identifier query needing
     │                   BM25? Chunk missing connecting vocabulary?
     │                   Wrong embedding model? Truncation?
     ├─ Rank 20-100    → RANKING. Add hybrid or reranking.
     └─ Rank just > k  → K TOO LOW.

4. Was it FILTERED OUT?
   Check ACL, date, extracted filters. Log candidate counts
   before and after filtering.

5. GENERATION. Context has the answer, output is wrong.
   Check groundedness, answer relevance, temperature, prompt
   instructions, and whether the chunk landed mid-context.
```

## 4. Practical Example

**A realistic debugging session:**

```
Complaint: "the assistant gives wrong fee information"

Step 1 — pull 20 failing queries and their retrieved context.
  12 of 20: context contains the correct fee.       → generation
   8 of 20: context does NOT contain it.            → retrieval

Split the investigation.

RETRIEVAL BRANCH (8 cases):
  Step 2 — direct search for the fee table chunk.
    6 of 8: found, ranks 30-60.  → ranking problem
    2 of 8: not found at all.    → ingestion
  Step 2b — the 2 missing: the source PDFs are scans.
    Zero chunks produced. Silent. → OCR routing needed.
  Step 3 — the 6 ranked 30-60: all exact-product-name queries.
    → dense retrieval blurring product identifiers. Add BM25.

GENERATION BRANCH (12 cases):
  Groundedness on those 12: 0.58.
  Reading them: the model is blending two products' fees when
  both appear in context.
    → context contains multiple products' fee rows
    → add product metadata filtering; and instruct the prompt
      to state which product each figure applies to.

Three distinct fixes, none of which is "tune the prompt generally."
```

## 5. Why It Matters

- **It prevents the most common wasted week** — tuning prompts when the content was never retrieved.
- **Each failure class has a different fix**, so misdiagnosis means applying the wrong remedy.
- **Reading the retrieved context** is the single highest-value debugging action and it costs nothing.

## 6. Trade-offs / Failure Modes

| Anti-pattern | Why it's wrong |
|---|---|
| **Tuning the prompt first** | Can't add information that isn't in the context |
| **Swapping the LLM** | Changes nothing if retrieval failed |
| **Adding a reranker for a recall problem** | It only reorders what was retrieved |
| **Raising k indiscriminately** | Masks the problem, adds cost and distraction |
| **Debugging from aggregate metrics** | You need individual failing examples |
| **No per-stage logging** | Every failure looks identical |

**The instrumentation that makes debugging possible:**

```python
log({
  "query": ..., "rewritten_query": ...,
  "filters": ..., "candidates_before_filter": n1,
  "candidates_after_filter": n2,        # ← catches over-filtering
  "retrieved_chunk_ids": [...], "top_scores": [...],
  "context_tokens": ..., "answer": ..., "citations": [...],
  "abstained": ..., "config_version": ...,
})
```

Without `candidates_before/after_filter`, over-filtering is invisible. Without `config_version`, you can't attribute a regression to a change.

## 7. Interview Answer

> "The first thing I'd do is look at the retrieved context for the failing questions. That single step splits the problem in two: if the answer is in the context and the output is still wrong, it's generation. If it isn't there, it's retrieval or ingestion. Those have nothing in common, and the most common wasted week in RAG is tuning prompts when the content was never retrieved.
>
> If it's retrieval, I'd work down a three-step ladder. Does the correct chunk exist in the index at all — search directly for distinctive terms. If not, that's ingestion, and I'd check the source system; the classic case is scanned PDFs producing zero chunks silently. If it exists, what rank does it get — rank thirty to sixty is a ranking problem where hybrid or reranking helps, rank four hundred is a representation problem, and rank just outside k means k is too low. Then whether it was filtered out, which requires logging candidate counts before and after filtering or it's completely invisible.
>
> If it's generation, I'd check groundedness and answer relevance, then read the failures. In one case I'd expect to find the model blending two products' fees because both appeared in the context — which is a context construction problem, fixed by product filtering and a prompt instruction to attribute each figure, not by general prompt tuning.
>
> The thing I'd emphasize is that this is done on individual failing examples, not on aggregate metrics. Metrics tell me something is wrong; reading twenty failing queries and their retrieved context tells me what. And none of it works without per-stage logging — query, filters, candidate counts, retrieved chunk IDs, scores, and a config version for attribution."

## 8. Likely Follow-ups

**Q: What's the first thing you check?**
The retrieved context for failing questions. It costs nothing and it immediately separates retrieval failures from generation failures, which need completely different fixes. Everything else follows from that split.

**Q: What if the retrieved context looks fine but answers are wrong?**
Then it's generation. Check groundedness — if it's low, the model is going beyond the context, so I'd strengthen the grounding instruction, add per-claim citations, and check the temperature. If groundedness is high but answers are still wrong, check whether the correct chunk landed mid-context where attention is weakest, and whether irrelevant chunks are creating conflicts.

**Q: How do you find silent ingestion failures?**
Assert on chunks-per-document during ingestion and alert when it drops for a document type. For a specific failure, search the source system for the same terms — if the content is there and not in the index, it's an ingestion bug. Scanned PDFs producing zero chunks is the classic case, and nothing errors.

**Q: Why is tuning the prompt first wrong?**
Because a prompt cannot add information that isn't in the context. If retrieval failed, no instruction recovers it. It's the easiest thing to change, which is exactly why it's the default reflex — and it wastes time on the majority of failures, which are upstream.

**Q: What logging do you need?**
Query and rewritten query, filters applied, candidate counts before and after filtering, retrieved chunk IDs and scores, context token count, the answer, citations, whether it abstained, and a config version. The before/after filter counts are the field people omit, and without them over-filtering presents identically to a coverage gap.

## 9. Common Mistakes

- Tuning the prompt before checking what was retrieved.
- Swapping the LLM to fix a retrieval problem.
- Debugging from aggregate metrics instead of individual failures.
- Adding a reranker when the issue is recall.
- No logging of candidate counts before and after filtering.

## 10. What to Remember

- **Look at the retrieved context first.** It splits retrieval failures from generation failures instantly.
- **Retrieval ladder:** in the index? what rank? filtered out?
- **Silent ingestion failures look exactly like retrieval problems** — check the source system.
- **Debug individual failing examples**, not aggregate metrics.
- **Log candidate counts before and after filtering**, and a config version for attribution.
