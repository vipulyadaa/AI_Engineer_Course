# Top-K Retrieval

> **Phase 11 · RAG RETRIEVAL · Topic 01**

## 1. Definition

Returning the k highest-scoring chunks for a query. `k` controls the trade-off between recall (did we get the answer?) and precision plus cost (how much irrelevant text did we pay for?).

## 2. Simple Explanation

How many chunks do you hand the model?

Too few and the answer might be just outside the cut. Too many and you're paying for irrelevant text that also distracts the model. And `chunk_size × k` is your input token bill on every single query, forever.

## 3. How It Works

1. Score all eligible chunks against the query.
2. Sort descending.
3. Return the top k.

**Choosing k by measurement:**

```
Sweep k on an eval set, measuring recall@k and answer quality:

 k    recall@k   groundedness   context tokens   cost index
 1      0.52        0.61             600           1.0
 3      0.79        0.86           1,800           3.0
 5      0.88        0.91           3,000           5.0
10      0.94        0.90           6,000          10.0
20      0.96        0.86          12,000          20.0
```

**Two things to notice:**
- **Recall keeps climbing** but with sharply diminishing returns after k=10.
- **Groundedness peaks at k=5 and then falls.** More context made answers *worse*.

That second point is the important one and it surprises people.

## 4. Practical Example

**Why quality declines at high k:**

```
k=20 retrieved chunks for "what's the international wire fee?"

  ranks 1-4:   the fee schedule, correct and relevant
  ranks 5-12:  other fee types — domestic, ATM, overdraft
  ranks 13-20: general account terms, marginally related

The model now sees four correct chunks and sixteen distractors,
several of which contain DIFFERENT dollar amounts for DIFFERENT
fees. Confusion risk is real, and the correct answer is buried
in the middle of a long context where attention is weakest.
```

**The standard resolution — decouple retrieval k from context k:**

```
retrieve k=20    → high recall from casting wide
rerank           → cross-encoder scores all 20
keep top 4       → high precision in the prompt

Best of both: recall@20 = 0.96, and only 4 chunks in context.
```

That's why "retrieve wide, rerank narrow" is the production default — it breaks the coupling between k-for-recall and k-for-context.

## 5. Why It Matters

- **It's a permanent cost multiplier** — `chunk_size × k` on every query.
- **More context is not monotonically better**; quality peaks and declines.
- **The reranker decouples the trade-off**, which is the single most useful thing to know here.

## 6. Trade-offs / Failure Modes

| k too low | k too high |
|---|---|
| Answer just outside the cut | Irrelevant chunks distract the model |
| Incomplete answers on multi-part questions | High token cost on every query |
| No margin for ranking imperfection | Answer buried mid-context where attention is weakest |
| — | Conflicting information from unrelated chunks |

| Other issues | Detail |
|---|---|
| **Fixed k for all query types** | A simple lookup needs 3; a comparison needs 8 |
| **k chosen by intuition** | Usually too high, because "more context feels safer" |
| **Post-filtering reduces effective k** | You asked for 10, ACL filtering left 4, with no signal |
| **Near-duplicates consuming slots** | Overlapping chunks waste k on repeated content |

**Adaptive k** is worth knowing: use a similarity floor alongside k, so you return *at most* k chunks but drop any scoring below a threshold. A query with one clearly-relevant chunk returns one, rather than padding with three irrelevant ones.

## 7. Interview Answer

> "Top-k is how many chunks you return for a query, and it's a trade-off between recall, precision, and cost.
>
> The thing that surprises people is that quality doesn't increase monotonically with k. In a typical sweep, recall keeps climbing — at k equals twenty you might be at ninety-six percent — but groundedness peaks around k equals five and then *falls*. More context makes answers worse, because the model now sees the correct chunks alongside a dozen distractors, several of which contain different dollar amounts for different fees. And the correct chunk is buried mid-context where attention is weakest.
>
> So the resolution is to decouple retrieval k from context k. Retrieve twenty for high recall, rerank all twenty with a cross-encoder, and put the top four in the prompt. You get ninety-six percent recall and only four chunks of context. That's why 'retrieve wide, rerank narrow' is the production default — it breaks the coupling entirely.
>
> Two operational points. `chunk_size × k` is your input token bill on every query forever, so this is a permanent cost decision, not just a quality one. And I'd add a similarity floor alongside k, so a query with one clearly relevant chunk returns one rather than padding with three irrelevant ones.
>
> One thing to watch: if you post-filter for access control, your effective k silently drops. You asked for ten, six were filtered out, and the model got four with no signal that anything was missing."

## 8. Likely Follow-ups

**Q: What's a good default k?**
3–5 chunks in the prompt if there's no reranker, because quality degrades past that. With a reranker, retrieve 20–50 and keep 3–5. But I'd sweep it on an eval set rather than defaulting, measuring both recall and answer quality — the point where those diverge is the interesting one.

**Q: Why does quality decrease at high k?**
Two mechanisms. Irrelevant chunks are distractors — they can contain similar-looking information that's actually about something else, and the model may blend it in. And the "lost in the middle" effect means a long context has a region where attention is measurably weaker, so a correct chunk at rank 3 of 20 may be less used than it would be at rank 3 of 5.

**Q: Should k be the same for every query?**
No. A simple factual lookup needs fewer chunks than a comparison question. Adaptive k based on query type, or a similarity floor that drops low-scoring chunks regardless of k, both handle this. The floor is simpler and often sufficient — it naturally returns fewer chunks when only a few are relevant.

**Q: How does k interact with chunk size?**
Their product is what matters — it's the context budget. Small chunks need higher k to assemble a complete answer; large chunks need lower k to stay in budget. I'd tune them together rather than independently, and the common good configuration is smaller chunks with higher retrieval k plus a reranker to cut back down.

**Q: What's the risk of post-filtering on k?**
Your effective k silently drops. If you retrieve top-10 and then filter out six for access control, the model gets four chunks with no indication that anything was removed — so answers are incomplete for reasons nobody can see. Pre-filtering during the search avoids this entirely, and it's also the correct approach for security.

## 9. Common Mistakes

- Choosing k by intuition, usually too high.
- Assuming more context is always better.
- Coupling retrieval k to context k instead of using a reranker.
- Post-filtering after retrieval, silently reducing effective k.
- Not deduplicating near-duplicate chunks, which waste k slots.

## 10. What to Remember

- **`chunk_size × k` is your permanent per-query token cost.**
- **Quality peaks then declines** — more context makes answers worse past a point.
- **Decouple retrieval k from context k:** retrieve 20, rerank, keep 4.
- **Add a similarity floor** so low-relevance chunks don't pad the context.
- **Post-filtering silently reduces effective k.** Pre-filter instead.
