# "How Would You Reduce Latency?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 22**

## 1. Definition

A design question requiring a latency budget before any optimization. The strong answer measures first, names where the time actually goes, and distinguishes perceived from total latency.

*Deeper treatment in [24-llm-performance](../24-llm-performance/README.md).*

## 2. Simple Explanation

In a RAG system the LLM dominates — usually 80% or more of the total. Retrieval is tens of milliseconds; generation is seconds.

So optimizing retrieval is almost always optimizing the wrong thing, and the largest available win isn't making it faster at all — it's streaming, so the user stops waiting.

## 3. How It Works

```
A TYPICAL BUDGET (single-turn, ~2.5s)

  query embedding       40 ms
  vector search         30 ms
  document fetch        50 ms
  reranking            150 ms   (if present)
  ─────────────────────────────
  retrieval subtotal   270 ms   ← 11%

  LLM time-to-first-token  700 ms
  LLM generation         1500 ms
  ─────────────────────────────
  LLM subtotal          2200 ms ← 88%

Shaving retrieval to zero saves 11%. Streaming changes
perceived latency from 2.5s to 0.97s.
```

## 4. Practical Example

**The ordered lever list:**

```
1. STREAM
   Perceived latency becomes TTFT, not total. First token
   in under a second reads as responsive even when the
   full answer takes three. Largest single improvement,
   no quality cost.

   The constraint in banking: if an output-side check runs
   on the complete answer, you can't stream it raw.
   Options — stream with a post-hoc retraction, or stream
   only for low-risk question categories. That's a real
   design tension worth naming rather than skating past.

2. SEMANTIC CACHE
   A cache hit is ~50ms instead of 2500ms. For head-heavy
   FAQ traffic this is the second-largest lever.

3. SHORTEN THE OUTPUT
   Generation time is roughly linear in output tokens.
   An instruction to answer concisely cuts time directly,
   and for FAQ answers it usually improves them.

4. SMALLER MODEL FOR SIMPLE QUERIES
   Routing by complexity. Cheaper and faster together.

5. PARALLELIZE RETRIEVAL
   Dense and lexical search concurrently rather than
   sequentially; fetch documents in one batched call.
   Small absolute gain but essentially free.

6. REDUCE INPUT TOKENS
   TTFT scales with input length. Lower k, or reranking
   so fewer chunks carry more signal.
```

**The one that hides in plain sight:**

```
SEQUENTIAL LLM CALLS

query rewrite (600ms) → retrieve → generate (2200ms)
                                 → verify (900ms)

Three model calls, 3.7 seconds, and two of them are
invisible in the design diagram.

Fixes:
  · rewrite with a small fast model, or skip it on the
    first turn of a conversation where there's nothing
    to resolve
  · verify asynchronously — log the result rather than
    blocking the response, accepting that a bad answer
    is caught after delivery rather than before
  · verify only high-risk categories

The verification trade-off is a genuine safety-versus-
latency decision, and naming it as such is better than
pretending it's free.
```

**Measure before optimizing:** without per-stage traces the optimization is guesswork. The common surprise is that the slow part is a document-store fetch doing k sequential round-trips, or a cold-start on a scaled-to-zero service — neither of which is where anyone looks first.

## 5. Why It Matters

- **The LLM is ~85% of the time** — retrieval optimization is mostly wasted effort.
- **Streaming is the largest win** and costs no quality.
- **Extra LLM calls hide in the pipeline** — rewrite and verify are the usual culprits.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Optimizing retrieval first | Effort spent on 11% of the budget |
| Not streaming | The whole wait is perceived |
| Streaming past a required output check | A policy violation reaches the user |
| Optimizing average not p95 | Tail users have the bad experience |
| Sequential LLM calls unnoticed | Latency nobody can account for |

**On p95 versus average:** average latency hides the experience that generates complaints. A p95 far above the median usually points at a specific cause — cold starts, retries on a rate-limited API, or long-output queries — and each has a different fix. Optimizing the average can leave the tail untouched.

**On the floor:** with streaming and caching in place, the remaining latency is mostly the model's TTFT, which is not yours to optimize beyond shortening the input. Recognizing where the floor is prevents effort going into fractions of a percent.

## 7. Interview Answer

> "First I'd get per-stage timings, because in a RAG system the distribution is lopsided and optimizing without it usually means optimizing the wrong stage.
>
> The typical shape: query embedding around forty milliseconds, vector search thirty, document fetch fifty, reranking maybe a hundred and fifty. So retrieval is roughly a quarter of a second. Then the LLM — time to first token around seven hundred milliseconds and generation another second and a half. The model is close to ninety percent of the total.
>
> Which means eliminating retrieval entirely saves about ten percent, and that's where most people start.
>
> The largest actual win is streaming, and it doesn't make anything faster — it changes what the user waits for. Perceived latency becomes time to first token rather than total time, so two and a half seconds becomes under one. No quality cost.
>
> There's a real constraint on that in banking though. If there's an output-side check on the complete answer — a policy classifier, a financial-advice filter — you can't stream the raw output, because you'd be showing text before it's been checked. The options are streaming with a post-hoc retraction, which is a poor experience, or streaming only for low-risk question categories and buffering the rest. That's a genuine safety-versus-latency tension and I'd rather name it than pretend streaming is free.
>
> Second lever is a semantic cache. A hit is fifty milliseconds instead of two and a half seconds, and FAQ traffic is head-heavy enough that hit rates are good.
>
> Third, shorten the output. Generation time is roughly linear in output tokens, so an instruction to answer concisely cuts time directly — and for FAQ answers it usually improves them.
>
> Then routing simple queries to a smaller model, parallelizing the dense and lexical searches rather than running them in sequence, and batching the document fetch into one call instead of k round-trips.
>
> The thing I'd look for specifically is extra LLM calls hiding in the pipeline. A query rewrite before retrieval and a verification pass after are each a full model call — that's three sequential calls and nearly four seconds, and two of them don't appear in the architecture diagram. The rewrite can use a small fast model or be skipped on the first turn where there's nothing to resolve. Verification can run asynchronously, logging rather than blocking — accepting that a bad answer gets caught after delivery instead of before, which is again a real trade-off rather than a free optimization.
>
> And I'd optimize p95, not average. The average hides the experience that generates complaints, and a tail far above the median usually has a specific cause — cold starts, retries against a rate-limited API, or long-output queries — each with a different fix."

## 8. Likely Follow-ups

**Q: What's the single biggest improvement?**
Streaming. It doesn't reduce total time, it changes what the user waits for — perceived latency becomes TTFT. Nothing else gives that much improvement at zero quality cost.

**Q: Why can't you always stream?**
If an output-side policy check runs on the complete answer, streaming shows text before it's checked. The choices are post-hoc retraction, or streaming only low-risk question categories — a genuine safety-versus-latency trade-off.

**Q: Why not optimize retrieval?**
It's around 10% of the budget. Reducing it to zero is a barely perceptible improvement, and the effort is better spent on streaming, caching, and output length.

**Q: Where does hidden latency come from?**
Sequential LLM calls that don't appear in the design — a query rewrite before retrieval and a verification pass after. Three model calls in sequence is nearly four seconds, and two of them are invisible on the diagram.

**Q: Average or p95?**
p95. The average hides the users who complain, and a tail far above the median points at a specific cause — cold starts, rate-limit retries, long outputs — that optimizing the average won't touch.

## 9. Common Mistakes

- Starting with retrieval optimization.
- Not streaming, or streaming without considering the output check.
- Ignoring query rewrite and verification calls in the budget.
- Optimizing the average.
- Optimizing without per-stage traces.

## 10. What to Remember

- **The LLM is ~85–90%** of the latency budget.
- **Streaming is the biggest win** — and conflicts with output-side checks.
- **Shorter outputs are directly faster** and usually better for FAQ.
- **Hidden LLM calls** — rewrite and verify — are the usual surprise.
- **Optimize p95**, and measure before optimizing anything.
