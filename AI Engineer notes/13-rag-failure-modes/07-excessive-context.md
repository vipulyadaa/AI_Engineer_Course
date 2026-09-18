# Failure Mode: Excessive Context

> **Phase 13 · RAG FAILURE MODES · Topic 07**

## 1. Definition

Filling the prompt with more retrieved content than the question needs. It costs tokens on every request, buries the relevant chunk in a low-attention region, and introduces conflicting facts the model may blend.

## 2. Simple Explanation

The instinct is that a bigger context window is free capacity to use. It isn't.

Past a point, adding chunks makes answers *worse* — not just more expensive. That's the counterintuitive result, and it's why "just retrieve more" is the wrong response to a quality problem.

## 3. How It Works

**Three mechanisms, all real:**

1. **Conflict** — irrelevant chunks contain plausible facts about *different* things. Four dollar amounts for four products look like contradictory evidence.
2. **Lost in the middle** — models use information at the start and end of a long context more reliably than the middle. More chunks means more middle.
3. **Cost** — `chunk_size × k` input tokens on every request, permanently.

**The measurable divergence:**

```
 k    recall@k   groundedness   context tokens   cost index
 5      0.88        0.91            3,000          1.0
10      0.94        0.90            6,000          2.0
20      0.96        0.86           12,000          4.0
40      0.97        0.79           24,000          8.0

Recall keeps rising. Quality peaks and falls. Cost scales linearly.
```

## 4. Practical Example

**Where it comes from:**

| Source | Detail |
|---|---|
| **k too high** | "More context is safer" |
| **Chunks too large** | Each chunk is mostly filler around the relevant part |
| **Parent-child without limits** | Four 2,000-token parents is 8,000 tokens |
| **No deduplication** | Overlapping chunks send the same passage three times |
| **Long conversation history** | Accumulated turns crowding out retrieval context |
| **Filling the window because it's there** | 128k available doesn't mean 128k should be used |

**The fixes:**

```
1. Rerank and truncate    — retrieve 20, keep 4
2. Similarity floor       — drop chunks below a relevance threshold
3. Deduplicate            — overlapping chunks collapse to one
4. Order for position     — best chunks at the start and end
5. Compress (extractive)  — strip irrelevant sentences
6. Summarize old history  — don't let conversation crowd out retrieval
```

**Ordering is free and measurably helps:**

```python
def arrange(chunks_by_relevance):
    """Best chunks at the edges, weakest in the middle."""
    front, back = [], []
    for i, c in enumerate(chunks_by_relevance):
        (front if i % 2 == 0 else back).append(c)
    return front + list(reversed(back))
# rank 1 first, rank 2 last, rank 3 second, rank 4 second-to-last
```

## 5. Why It Matters

- **It's the failure that results from responding to a quality problem by retrieving more.**
- **It's a permanent, scaling cost** rather than a one-time issue.
- **Long context windows make it easier to cause**, not less relevant.

## 6. Trade-offs / Failure Modes

| Anti-pattern | Why it fails |
|---|---|
| **"Use the whole window"** | More context is not free capacity |
| **Raising k to fix a ranking problem** | Buries the answer among distractors |
| **Parent-child with no parent size bound** | A "section" can be 20,000 tokens |
| **No deduplication** | Overlapping chunks waste slots on repetition |
| **Truncating mid-chunk to fit budget** | Half a fact is worse than none |
| **Letting history crowd out retrieval** | Summarize old turns instead |

**On long-context models:** they change the constraint but not the mechanism. Retrieval precision still matters, models still attend worse to the middle of a very long context, and cost still scales with tokens. Long context makes excessive context *cheaper to cause*, which is why the discipline matters more, not less.

**On budget overflow:** drop whole chunks, never truncate one. Half a fee table or a sentence ending mid-figure is actively harmful.

## 7. Interview Answer

> "Excessive context is filling the prompt with more retrieved content than the question needs. The counterintuitive part is that past a point it makes answers *worse*, not just more expensive.
>
> Three mechanisms. Conflict — irrelevant chunks contain plausible facts about different things, so four dollar amounts for four products look like contradictory evidence. Lost in the middle — models use information at the start and end of a long context more reliably, so more chunks means more low-attention middle. And cost, which is chunk size times k on every request, permanently.
>
> The measurement shows the divergence clearly: recall keeps climbing as k rises while groundedness peaks around five and then falls. Most teams only measure recall, so they never see it.
>
> Where it comes from is usually responding to a quality problem by retrieving more. If the correct chunk is at rank forty, raising k to fifty does put it in context — buried among forty-nine distractors. The right fix is reranking from a larger candidate set, which gets the recall without the context cost.
>
> The fixes I'd apply: rerank and truncate, add a similarity floor so narrow queries return fewer chunks, deduplicate overlapping chunks, and order the final set with the best chunks at the start and end rather than in ranked order. That last one is free and it measurably improves whether the model uses the best chunk.
>
> On long-context models — they change the constraint, not the mechanism. Retrieval precision still matters and attention still degrades in the middle. Long context makes excessive context cheaper to cause, which means the discipline matters more, not less."

## 8. Likely Follow-ups

**Q: Doesn't a bigger context window solve this?**
No. It raises the ceiling on how much you *can* include, but the mechanisms remain: irrelevant chunks still conflict, attention is still weaker in the middle of a long context, and cost still scales with tokens. A larger window makes it easier to cause this failure, not less likely.

**Q: How do you decide how much context to include?**
Sweep k on an eval set measuring both recall and groundedness, and take the point where quality peaks rather than where recall peaks. Then add a similarity floor so the actual count varies by query. Four to eight well-chosen chunks typically beats thirty marginal ones.

**Q: What's the lost-in-the-middle effect?**
A documented finding that models retrieve information from the beginning and end of a long context more reliably than from the middle, giving a U-shaped accuracy curve by position. The practical response is ordering by relevance to the edges — rank 1 first, rank 2 last, rank 3 second — rather than in straight ranked order.

**Q: What do you do when the budget overflows?**
Drop whole chunks, never truncate one. Half a fee table or a sentence ending mid-figure is worse than not including it. If conversation history is the pressure, summarize older turns rather than dropping retrieval context, since the retrieved facts are what makes the answer correct.

**Q: How does deduplication help?**
Overlapping chunks from the same section send the same passage multiple times, consuming slots that could hold distinct information and potentially biasing the model toward the repeated claim. Deduplicating by document and character span before building the prompt recovers those slots at no cost.

## 9. Common Mistakes

- Raising k to fix a ranking problem.
- Treating the context window as free capacity to fill.
- No deduplication, so overlapping chunks waste slots.
- Ordering chunks in straight ranked order, burying the best one mid-context.
- Truncating a chunk to fit the budget instead of dropping it.

## 10. What to Remember

- **More context makes answers worse past a point** — not just more expensive.
- **Three mechanisms:** conflict, lost-in-the-middle, and permanent token cost.
- **It's usually caused by responding to a quality problem with "retrieve more."**
- **Rerank and truncate, add a similarity floor, deduplicate, order to the edges.**
- **Long context makes this easier to cause**, so the discipline matters more.
