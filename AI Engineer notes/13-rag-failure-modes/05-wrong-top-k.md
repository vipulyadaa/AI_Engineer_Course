# Failure Mode: Wrong Top-K

> **Phase 13 · RAG FAILURE MODES · Topic 05**

## 1. Definition

A retrieval count that's too low to include the answer, or too high so irrelevant chunks distract the model and inflate cost. Both directions degrade quality, and the second is the more common and less obvious.

## 2. Simple Explanation

Too few chunks and the answer is just outside the cut. Too many and the model is reading four correct chunks alongside sixteen distractors.

The counterintuitive part is that **more context makes answers worse past a point**. Recall keeps improving while answer quality declines — and most teams only measure the first.

## 3. How It Works

**The divergence that defines this failure:**

```
 k    recall@k   groundedness   context tokens
 3      0.79        0.86            1,800
 5      0.88        0.91            3,000   ← quality peak
10      0.94        0.90            6,000
20      0.96        0.86           12,000   ← recall UP, quality DOWN
```

**Why quality falls:**

1. **Distraction** — irrelevant chunks contain plausible-looking facts about different things.
2. **Conflict** — four dollar amounts for four different products look like contradictory evidence.
3. **Lost in the middle** — the correct chunk gets pushed into the low-attention region of a long context.
4. **Cost** — `chunk_size × k` input tokens on every request, forever.

**The fix that breaks the trade-off:**

```
retrieve k=20  → recall 0.96, precision 0.14
rerank         → cross-encoder scores all 20
keep top 4     → recall ~0.94, precision ~0.60

Decouples retrieval-k from context-k entirely.
```

## 4. Practical Example

**The conflict mechanism, concretely:**

```
Q: "What's the international wire fee for Premier?"

k=5 retrieved:
  [1] "Premier international transfers: $25."        ← correct
  [2] "Premier domestic wires: $0."
  [3] "Business Flex international transfers: $35."
  [4] "Retail international transfers: $45."
  [5] "Premier minimum balance: $10,000."

Four dollar amounts, all real, three of them also labeled
"international transfer fee" for different products.

With k=1 and correct retrieval, there is nothing to get wrong.
```

**Adaptive k — the practical improvement over a fixed number:**

```python
results = search(query, k=20)
reranked = rerank(query, results)

# Keep at most 5, and only those above a tuned relevance floor
final = [r for r in reranked[:5] if r.score >= THRESHOLD]

# A narrowly-matched query returns 1 chunk, not 5 padded with noise.
# A broad query returns 5.
```

## 5. Why It Matters

- **It disproves the "more context is free" intuition**, which is widespread and costly.
- **It's a permanent cost multiplier** — `chunk_size × k` on every query.
- **Reranking is the specific fix** that lets you have high recall and small context together.

## 6. Trade-offs / Failure Modes

| k too low | k too high |
|---|---|
| Answer just outside the cut | Distraction and conflict |
| Incomplete answers on multi-part questions | High token cost on every query |
| No margin for ranking imperfection | Answer buried mid-context |

| Related failures | Detail |
|---|---|
| **Fixed k for all query types** | A lookup needs 3; a comparison needs 8 |
| **No similarity floor** | Narrow queries get padded with noise |
| **Post-filtering reduces effective k** | Asked for 10, ACL left 4, no signal |
| **Near-duplicates consuming slots** | Overlapping chunks waste k on repetition |

**The post-filtering interaction is easy to miss.** If you retrieve top-10 and then strip six for access control, the model gets four chunks with no indication anything was removed. Pre-filtering during the search avoids it and is also the correct security posture.

## 7. Interview Answer

> "Wrong top-k is a retrieval count that's too low to include the answer, or too high so irrelevant chunks distract the model. Both degrade quality, and the second is more common because 'more context feels safer.'
>
> The measurement that makes it concrete: sweep k and you typically see recall keep climbing while groundedness peaks around five and then falls. Recall up, quality down. Most teams only measure recall, so they never see the divergence.
>
> The mechanism is conflict more than pure noise. If someone asks the Premier international wire fee and I return five chunks containing four different dollar amounts — three of which are also labeled international transfer fees, for different products — the model has to correctly select from five plausible candidates. With one correct chunk, there's nothing to get wrong.
>
> There's also a positional effect: irrelevant chunks push the correct one deeper into the context, where models attend less reliably. So you lose twice.
>
> The fix is decoupling retrieval-k from context-k. Retrieve twenty for recall of 0.96, rerank all twenty, put the top four in the prompt. You keep almost all the recall with a quarter of the context. That's why 'retrieve wide, rerank narrow' is the production default.
>
> I'd also add a similarity floor rather than using a fixed k, so a narrowly-matched query returns one chunk instead of being padded to five with noise.
>
> And one thing that's easy to miss: if you post-filter for access control, your effective k silently drops. You asked for ten, six were stripped, the model got four with no signal. Pre-filtering avoids that and is the correct security posture anyway."

## 8. Likely Follow-ups

**Q: What's a good k?**
3–5 in the prompt without a reranker, because quality degrades past that. With a reranker, retrieve 20–50 and keep 3–5. But I'd sweep it on an eval set measuring both recall and groundedness, because the point where those diverge is what you actually need to know.

**Q: Why does quality decline at high k?**
Distraction and conflict — irrelevant chunks contain plausible-looking facts about different things, and the model blends them. Plus the lost-in-the-middle effect, where a long context has a low-attention region, so the correct chunk at rank 3 of 20 is used less reliably than at rank 3 of 5.

**Q: Should k vary by query?**
Yes. A simple lookup needs fewer chunks than a comparison. A similarity floor handles this naturally without needing query classification — return at most k, but drop anything below a relevance threshold, so narrow queries return fewer chunks rather than being padded.

**Q: How does k interact with chunk size?**
Their product is the context budget and the per-query cost. Small chunks need higher k to assemble complete answers; large chunks need lower k to stay in budget. I'd tune them together, and the common good configuration is smaller chunks with higher retrieval k plus a reranker cutting back down.

**Q: What's the cost implication?**
`chunk_size × k` is your input token count on every query, permanently. Going from k=5 to k=20 with 600-token chunks takes context from 3,000 to 12,000 tokens per request. At high volume that's a significant recurring line item for content that measurably makes answers worse.

## 9. Common Mistakes

- Choosing k by intuition, usually too high.
- Measuring recall without measuring answer quality at each k.
- Coupling retrieval-k to context-k instead of using a reranker.
- No similarity floor, so narrow queries get padded with noise.
- Post-filtering, silently reducing effective k.

## 10. What to Remember

- **Both directions hurt** — too low misses, too high distracts.
- **Recall and quality diverge as k rises.** Measure both.
- **Conflict is the mechanism** — similar facts about different things.
- **Retrieve wide, rerank narrow** decouples the trade-off.
- **Add a similarity floor**; and pre-filter, because post-filtering silently cuts effective k.
