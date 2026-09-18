# Context Engineering

> **Phase 05 · PROMPT ENGINEERING · Topic 20**

## 1. Definition

Designing everything that occupies the model's context window — retrieved chunks, conversation history, tool results, examples, and instructions — as a managed budget rather than an accumulation. It's the broader discipline that prompt engineering sits inside.

## 2. Simple Explanation

Prompt engineering asks "what should the instructions say?" Context engineering asks "what should be in the window at all, and in what order?"

In an agent or a multi-turn RAG system, the instructions are a small fraction of the context. The rest — retrieved documents, history, tool outputs — is where most of the quality and nearly all of the cost lives.

## 3. How It Works

**Everything competing for the window:**

```
system prompt         fixed, cacheable
few-shot examples     fixed or dynamically retrieved
conversation history  grows unboundedly
retrieved chunks      per request
tool results          grows within an agent loop
reserved for output   must be preserved
```

**The management decisions:**

| Decision | Principle |
|---|---|
| **What to include** | Relevance, not availability |
| **How much** | Quality peaks then declines — more is not better |
| **In what order** | Best content at the edges (lost-in-the-middle) |
| **What to drop first** | Past-turn retrieved context, then older history |
| **How to compress** | Summarize history; never truncate a chunk mid-content |
| **What to cache** | The fixed prefix — system prompt and stable examples |

## 4. Practical Example

**The budget, made explicit:**

```
system prompt          400   cacheable
history (summarized) 1,200
retrieved chunks     2,400   (4 × 600, reranked from 20)
question                50
reserved for output  1,000
                    ──────
                     5,050

Not "we have 128k, fill it." A deliberate allocation.
```

**The drop order when pressure arrives:**

```
1. Retrieved context from PAST turns   ← first; large and stale
2. Older conversation turns → summary  ← preserves the thread cheaply
3. Lowest-ranked current chunks        ← whole chunks, never partial
4. Few-shot examples                   ← if zero-shot is close
5. NEVER: the reserved output space
```

**In an agent loop, context grows with every step:**

```
step 1: thought + action + observation      +800 tokens
step 2: thought + action + observation      +900
step 3: thought + action + observation      +750
...

Unmanaged, a 5-step loop can add 4,000+ tokens of tool
output — much of it no longer relevant.

Management: summarize completed steps, keep only the
findings rather than the full observations, and drop
tool outputs that later steps superseded.
```

**Where context engineering differs from prompt engineering:**

```
PROMPT ENGINEERING     what the instructions say
CONTEXT ENGINEERING    what occupies the window, how much,
                       in what order, and what gets dropped

In a single-turn classification task they're nearly the same.
In a multi-turn agentic RAG system, prompt engineering is
maybe 10% of the context and context engineering is the
discipline that determines quality and cost.
```

## 5. Why It Matters

- **In agent and multi-turn systems, context management is most of the engineering** — instructions are a small fraction.
- **It's where cost concentrates** — retrieved chunks and accumulated history dominate token spend.
- **The "more context is worse past a point" finding** makes it an active management problem, not passive accumulation.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Filling the window because it's available** | Cost, latency, and quality all degrade |
| **Unbounded history growth** | Crowds out retrieval; cost rises per turn |
| **Carrying past-turn retrieved context** | Stale chunks conflict with current retrieval |
| **Unmanaged agent-loop accumulation** | Tool outputs pile up, much of it superseded |
| **Ranked ordering top-to-bottom** | Best chunk buried mid-context |
| **Truncating a chunk to fit** | Half a fact is worse than none |
| **No cacheable prefix** | Re-prefilling the system prompt every request |

**On cache-aware ordering:** prompt caching works on a stable *prefix*. Anything that changes per request must come after everything that doesn't — system prompt and fixed examples first, then per-request content. Putting a variable element early invalidates the cache for everything after it, which quietly costs both money and TTFT.

**On the discipline point:** context engineering is where cost optimization and quality optimization coincide. Fewer, better chunks reduces tokens *and* reduces distraction. That's unusual — most optimizations trade — and it's why retrieval precision is the highest-leverage thing to improve.

## 7. Interview Answer

> "Context engineering is designing everything that occupies the model's context window — retrieved chunks, conversation history, tool results, examples, instructions — as a managed budget rather than an accumulation. Prompt engineering sits inside it.
>
> The distinction matters by system type. In a single-turn classification task they're nearly the same thing. In a multi-turn agentic RAG system, the instructions are maybe ten percent of the context — the rest is retrieved documents, accumulated history, and tool outputs, and that's where most of the quality and nearly all of the cost lives.
>
> So I'd treat it as an explicit allocation: four hundred tokens of system prompt, twelve hundred of summarized history, twenty-four hundred of retrieved chunks reranked down from twenty candidates, and a thousand reserved for output. Not 'we have a hundred and twenty-eight thousand, fill it.'
>
> And I'd have an explicit drop order for when pressure arrives: retrieved context from past turns first, because it's large and stale relative to the current question and can actively conflict with current retrieval. Then summarize older conversation turns. Then drop lowest-ranked current chunks — whole chunks, never truncating one, because half a fee table is worse than omitting it. And never the reserved output space.
>
> In an agent loop this becomes acute, because context grows with every step. A five-step loop can add four thousand tokens of tool output, much of it superseded by later steps. So I'd summarize completed steps and keep the findings rather than the full observations.
>
> Two operational details. Cache-aware ordering: prompt caching works on a stable prefix, so anything per-request must come after everything fixed — putting a variable element early invalidates the cache for everything after it, which quietly costs money and TTFT. And ordering by relevance to the edges rather than top-to-bottom, because of the lost-in-the-middle effect.
>
> The thing I find notable is that this is where cost and quality optimization coincide. Fewer, better chunks reduces tokens *and* reduces distraction. Most optimizations trade; this one doesn't."

## 8. Likely Follow-ups

**Q: How is it different from prompt engineering?**
Prompt engineering is what the instructions say; context engineering is what occupies the window at all, how much, in what order, and what gets dropped under pressure. In a single-turn task they overlap heavily. In a multi-turn agentic system the instructions are a small fraction of the context and context management is the larger discipline.

**Q: What's your drop order under context pressure?**
Retrieved context from past turns first — large, stale, and prone to conflicting with current retrieval. Then summarize older conversation turns to preserve the thread cheaply. Then lowest-ranked current chunks, dropping whole chunks rather than truncating. Never the reserved output space.

**Q: How do you manage context in an agent loop?**
Summarize completed steps, keeping the findings rather than full observations, and drop tool outputs that later steps superseded. Unmanaged, a five-step loop adds thousands of tokens of accumulated output, much of it no longer relevant — and it compounds cost on every subsequent step since it's all re-sent.

**Q: What is cache-aware ordering?**
Prompt caching works on a stable prefix, so everything fixed — system prompt, stable examples — must come before anything that varies per request. Putting a variable element early invalidates the cache for everything after it. It's easy to break accidentally and the cost shows up as unexplained TTFT and spend.

**Q: Where does cost and quality optimization coincide?**
Retrieval precision. Fewer, better chunks reduces input tokens and reduces distraction — so cost goes down and quality goes up. Most optimizations trade one against the other, so this is unusual, and it's why improving reranking is usually the highest-leverage change available in a RAG system.

## 9. Common Mistakes

- Treating the window as capacity to fill rather than a budget to allocate.
- Letting conversation history and tool outputs grow unbounded.
- Carrying retrieved context from past turns.
- Placing variable content before the cacheable prefix.
- Truncating chunks to fit instead of dropping them.

## 10. What to Remember

- **What occupies the window, how much, in what order, what gets dropped.**
- **In agentic multi-turn systems it's most of the engineering** — instructions are a small fraction.
- **Explicit drop order:** past-turn retrieval → summarize history → lowest-ranked chunks. Never the output reservation.
- **Cache-aware ordering** — fixed prefix first, or you invalidate the cache.
- **Retrieval precision improves cost AND quality** — the rare non-trade.
