# Context Window

> **Phase 04 · LLM FUNDAMENTALS · Topic 10**

## 1. Definition

The maximum number of tokens a model can process in one request — system prompt, conversation history, retrieved context, question, and generated answer, all counted together.

## 2. Simple Explanation

Everything the model can see at once shares one budget, and the generated answer comes out of the same budget as the input.

Exceed it and something must be dropped. Approach it and cost rises linearly, latency rises, and quality often degrades before you hit the limit.

## 3. How It Works

**The budget:**

```
context_window ≥ system_prompt + history + retrieved + question + output

128,000-token window:
   system prompt         400
   conversation history 2,000
   retrieved chunks     3,200
   question                50
   reserved for answer  1,000
                        ──────
                        6,650 used — plenty of headroom

But headroom is not an invitation to fill it.
```

**Three costs of filling it:**

| Cost | Scaling |
|---|---|
| **Money** | Linear in input tokens, on every request |
| **Latency** | Prefill is compute-bound and scales with prompt length → TTFT |
| **Quality** | "Lost in the middle" — retrieval reliability dips mid-context |

**"Lost in the middle"** (Liu et al., TACL 2024): models retrieve information from the start and end of a long context more reliably than from the middle, producing a U-shaped accuracy curve by position.

## 4. Practical Example

**Managing the budget, in order of preference:**

```
1. Retrieve fewer, better chunks   (rerank; similarity floor)
2. Summarize older conversation turns
3. Drop WHOLE chunks — never truncate one mid-content
4. Order by relevance to the EDGES, not top-to-bottom
```

**The ordering trick, which is free:**

```python
def arrange(chunks_by_relevance):
    """Best chunks at the edges, weakest in the middle."""
    front, back = [], []
    for i, c in enumerate(chunks_by_relevance):
        (front if i % 2 == 0 else back).append(c)
    return front + list(reversed(back))
# rank 1 first, rank 2 last, rank 3 second, rank 4 second-to-last
```

**Advertised vs. effective context:**

```
A model may advertise 128k while retrieval reliability degrades
well before that — and the degradation pattern varies by model
and by where in the context the information sits.

"Needle in a haystack" evaluations test this. I'd run one on
my own data rather than trusting the spec-sheet number, because
"supports 128k" and "uses 128k well" are different claims.
```

## 5. Why It Matters

- **It's the hard constraint every RAG and agent system designs around.**
- **More context is not monotonically better** — quality peaks and declines.
- **The RAG-vs-long-context question comes up constantly** and the nuanced answer is the differentiator.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Filling the window because it's available** | Cost, latency, and quality all degrade |
| **No budget accounting** | Overflow truncates something, often silently |
| **Truncating mid-chunk** | Half a fact is worse than none |
| **Forgetting output in the budget** | Prompt + answer must both fit |
| **History crowding out retrieval** | Summarize old turns instead |
| **Key info mid-context** | Lower retrieval reliability |

**On RAG vs. long context:** long windows don't make retrieval obsolete. Enterprise corpora exceed any window; cost and latency scale with tokens; quality degrades on buried information; and you can't enforce access control by filling a window indiscriminately — retrieval is where entitlements are applied. What long context *does* change is that chunks can be larger, top-k can be higher, and imperfect retrieval is less costly. It makes RAG more forgiving, not unnecessary.

## 7. Interview Answer

> "The context window is the maximum tokens in one request — system prompt, history, retrieved context, question, and generated answer all sharing one budget.
>
> The point I'd make first is that a large window is not free capacity to fill. Cost scales linearly with input tokens on every request. Prefill is compute-bound and scales with prompt length, so a hundred-thousand-token prompt has materially worse time-to-first-token. And quality degrades — there's a documented 'lost in the middle' effect where models retrieve information from the start and end of a long context more reliably than from the middle.
>
> So my budget management, in order: retrieve fewer and better chunks via reranking and a similarity floor; summarize older conversation turns rather than dropping retrieval context; drop whole chunks rather than truncating one, because half a fee table is worse than none; and order the final context with the best chunks at the edges rather than top-to-bottom by rank. That last one is free and it measurably improves whether the model uses the best chunk.
>
> On the RAG-versus-long-context question: long windows don't make retrieval obsolete. Enterprise corpora exceed any window — twelve thousand documents doesn't fit regardless. Cost and latency scale with tokens, and retrieval is a relevance filter that keeps the prompt small. Quality degrades on buried information. And crucially you can't enforce access control by filling a window indiscriminately — retrieval is where entitlements are applied. What long context does change is that chunks can be larger and imperfect retrieval is less costly, so it makes RAG more forgiving rather than unnecessary.
>
> One caveat: advertised and effective context differ. A model may support 128k while retrieval reliability degrades well before that. I'd run a needle-in-a-haystack evaluation on my own data rather than trusting the spec sheet."

## 8. Likely Follow-ups

**Q: Does a long context window make RAG obsolete?**
No. Corpora exceed any window, cost and latency scale with tokens, quality degrades on information buried mid-context, and access control can't be enforced by filling a window indiscriminately. Long context makes RAG more forgiving — larger chunks, higher top-k, less penalty for imperfect retrieval — not unnecessary.

**Q: What is "lost in the middle"?**
A documented finding that models retrieve information from the beginning and end of a long context more reliably than from the middle, giving a U-shaped accuracy curve by position. The practical response is ordering the highest-relevance chunks at the edges and keeping contexts shorter so there's less middle.

**Q: How do you handle running out of context?**
Drop whole chunks rather than truncating one, since a half-truncated fact is worse than its absence. If conversation history is the pressure, summarize older turns instead of dropping retrieval context, because the retrieved facts are what make the answer correct. And account for the reserved output space up front.

**Q: What's the difference between advertised and effective context?**
Advertised is what the model accepts; effective is where it still retrieves reliably. A model supporting 128k may degrade well before that, and the pattern varies by model and by position. Needle-in-a-haystack evaluations test it, and I'd run one on my own data rather than trusting the number.

**Q: How do you budget the context?**
Account for system prompt, conversation history, retrieved context, question, and reserved output space, then fill the remainder with retrieval. Log actual token counts per request so you can see when you're approaching limits, and treat the output reservation as non-negotiable — running out mid-answer is a worse failure than retrieving one fewer chunk.

## 9. Common Mistakes

- Treating the window as free capacity to fill.
- Forgetting that the generated answer comes out of the same budget.
- Truncating a chunk to fit instead of dropping it.
- Ordering chunks strictly by rank, burying the best one mid-context.
- Claiming long context makes RAG obsolete.

## 10. What to Remember

- **One budget for prompt AND output.** Reserve space for the answer.
- **Not free capacity** — cost, latency, and quality all degrade as you fill it.
- **Lost in the middle:** order best chunks to the edges.
- **Drop whole chunks, never truncate one.**
- **Long context makes RAG more forgiving, not unnecessary** — corpus size, cost, and access control remain.
