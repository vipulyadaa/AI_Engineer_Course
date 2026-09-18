# Input Tokens

> **Phase 25 · LLM COST OPTIMIZATION · Topic 01**

## 1. Definition

The tokens sent to the model — system instruction, conversation history, retrieved context, and the query. In a RAG system they dominate volume, and retrieved context is almost always the largest component.

## 2. Simple Explanation

You pay for everything you send, on every request. In RAG that means the retrieved chunks are the bill.

Twenty chunks at 800 tokens each is 16,000 tokens before the system prompt, the history, or the question — sent again on every single request.

## 3. How It Works

```
A TYPICAL RAG REQUEST

  system instruction        400
  conversation history      600
  retrieved context      16,000   ← 20 chunks × 800
  user query                 50
                         ──────
                         17,050 input tokens

Retrieved context is 94% of the input. Everything else is
rounding.
```

**That proportion is the point.** Optimizing the system prompt while sending twenty chunks is optimizing 2% of the input.

## 4. Practical Example

**The levers, by actual impact:**

```
1. FEWER CHUNKS
   20 → 8 after reranking = 60% off input tokens
   AND usually a better answer, because relevant chunks
   stop being diluted.

   The rare case where the cheaper option is also better.

2. SMALLER CHUNKS
   800 → 500 tokens, with reranking to compensate for
   the precision change. ~37% off, needs measuring.

3. CONTEXT CACHING
   The system instruction and any fixed examples are
   identical every request. Caching that prefix cuts its
   rate substantially.

4. HISTORY MANAGEMENT
   Summarize older turns; keep recent ones verbatim and the
   original question unchanged.

5. TIGHTER SYSTEM PROMPT
   400 → 250 tokens. Real but small — 1% of the request.
```

**Lever 1 is the one to lead with** because it's the only optimization that improves quality and cost simultaneously.

**Measuring where they actually go:**

```
Log input tokens broken down by component per request.

Most teams know their total token spend and not the split.
Without the breakdown you optimize the part you can see —
usually the prompt — rather than the part that costs money.
```

## 5. Why It Matters

- **Retrieved context is ~94% of input** in a RAG request.
- **Fewer, better-reranked chunks** cut cost and improve quality together.
- **The component breakdown** is what directs optimization correctly.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Optimizing the system prompt first** | ~2% of input |
| **Top-k set generously "to be safe"** | Dilutes relevance and costs money |
| **No context caching on the fixed prefix** | Re-paying for identical tokens |
| **Unbounded conversation history** | Grows every turn |
| **No per-component breakdown** | Optimizing what's visible, not what's expensive |
| **Cutting chunks without reranking** | Recall loss for the saving |

**On the reranking dependency:** cutting from twenty chunks to eight only works if a reranker is choosing the eight. Taking the top eight by embedding similarity alone loses recall, because the reranker is what makes the smaller set the *right* eight. Cutting chunks without reranking trades quality for cost, which is a different and worse deal.

**On multimodal input:** images and video consume far more tokens than text, so a document-heavy workload can have input costs several times what a text-only estimate suggests. A single scanned page is not comparable to a paragraph.

## 7. Interview Answer

> "In a RAG system input tokens dominate, and retrieved context is almost all of them. A typical request might be four hundred tokens of system instruction, six hundred of history, fifty for the query — and sixteen thousand of retrieved context if you're sending twenty chunks at eight hundred tokens each. That's ninety-four percent of the input, and everything else is rounding.
>
> Which means optimizing the system prompt while sending twenty chunks is optimizing two percent of the request. That's where teams usually start, because the prompt is the part they can see.
>
> The lever I'd lead with is fewer chunks. Going from twenty to eight after reranking is sixty percent off input tokens — and usually a better answer, because relevant chunks stop being diluted and the lost-in-the-middle effect shrinks. It's the rare case where the cheaper option is also the better one.
>
> But it depends on reranking. Cutting to eight by embedding similarity alone loses recall — the reranker is what makes the smaller set the *right* eight. Cutting chunks without reranking trades quality for cost, which is a different and much worse deal.
>
> After that: smaller chunks, which needs measuring because it changes precision. Context caching on the fixed prefix — the system instruction and any few-shot examples are identical every request, so caching that cuts its rate substantially. History management, summarizing older turns while keeping recent ones and the original question verbatim. And a tighter system prompt last, because it's real but it's one percent of the request.
>
> The thing I'd do before any of that is log input tokens broken down by component per request. Most teams know their total spend and not the split — and without the breakdown you optimize the part you can see rather than the part that costs money.
>
> One thing that catches people out: multimodal input. Images and video consume far more tokens than text, so a document-heavy workload can have input costs several times what a text-only estimate suggested. A single scanned page isn't comparable to a paragraph, and that surprises people building document assistants."

## 8. Likely Follow-ups

**Q: What dominates input tokens in RAG?**
Retrieved context — typically around ninety-four percent of the request. The system instruction, history, and query together are a few percent, which is why prompt optimization is usually the wrong place to start.

**Q: What's the best lever?**
Fewer chunks after reranking — twenty to eight is sixty percent off input and usually a better answer, since relevant chunks stop being diluted. It's the rare optimization that improves cost and quality simultaneously.

**Q: Why does reranking matter for this?**
Because cutting to eight by embedding similarity alone loses recall. The reranker is what makes the smaller set the right eight rather than just the first eight. Without it you're trading quality for cost rather than getting both.

**Q: What should you measure first?**
Input tokens broken down by component per request. Most teams know their total and not the split, so they optimize the visible part — the prompt — rather than the expensive part. The breakdown redirects the work immediately.

**Q: Any surprises?**
Multimodal input. Images and video consume far more tokens than text, so a document-heavy workload can cost several times what a text-only estimate suggested. A scanned page isn't comparable to a paragraph, which catches out teams building document assistants.

## 9. Common Mistakes

- Optimizing the system prompt before the retrieved context.
- Setting top-k generously without measuring the quality effect.
- Cutting chunk count without a reranker.
- No context caching on the fixed prefix.
- Estimating multimodal cost from text token rates.

## 10. What to Remember

- **Retrieved context is ~94% of input** — that's where the money is.
- **20 → 8 chunks is ~60% off**, and usually a better answer.
- **Reranking is what makes fewer chunks work.**
- **Cache the fixed prefix** — it's identical on every request.
- **Log the per-component breakdown** before optimizing anything.
