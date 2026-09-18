# Latency (Gemini)

> **Phase 19 · GOOGLE GEMINI · Topic 17**

## 1. Definition

The time from request to complete response, decomposed into time-to-first-token and generation throughput — both of which scale with input size, output length, and model tier.

## 2. Simple Explanation

Two numbers matter, and they behave differently.

Time to first token is dominated by processing the input. Total time is dominated by generating the output. Streaming turns the first into the number the user experiences, which is why it's the biggest lever available.

## 3. How It Works

```
TIME TO FIRST TOKEN (TTFT)
  driven by input size — the prefill pass over the prompt
  → a large retrieved context directly increases TTFT

GENERATION
  driven by output length and tier
  → roughly linear in tokens produced

TOTAL = TTFT + (output tokens × per-token time)
```

**Streaming doesn't reduce total time.** It changes what the user waits for: sub-second to first token plus reading time, instead of four seconds of silence.

## 4. Practical Example

**The levers, by impact:**

```
1. STREAM
   Largest perceived improvement, costs nothing. Should be
   the default for any chat interface.

2. SMALLER TIER
   Flash-class is several times faster than Pro-class. If
   the golden set shows no quality difference for the task,
   this is free latency.

3. SHORTER OUTPUT
   Total time is roughly linear in output tokens. Instructing
   concise answers, and capping max_output_tokens, directly
   reduces it — and a concise grounded answer is usually
   better anyway.

4. LESS INPUT
   Fewer, better-reranked chunks reduce TTFT. Eight good
   chunks beat twenty mediocre ones for quality AND latency.

5. PARALLEL WORK
   Retrieval and any independent lookups run concurrently,
   not sequentially.
```

**The budget framing:**

```
Target p95 = 3 seconds

  retrieval          200 ms
  reranking          300 ms
  TTFT               600 ms
  generation       1,900 ms
                   ────────
                    3,000 ms

That decomposition tells you where to spend effort. Shaving
50 ms off ANN search when generation is 1.9 seconds is
optimizing the wrong term.
```

**Measure percentiles:** a p50 of 1.2 seconds with a p99 of 9 seconds usually means a few requests with very large contexts or long outputs. Averages hide it, and the p99 is what generates complaints.

## 5. Why It Matters

- **Streaming is the largest perceived-latency win** and costs nothing.
- **The budget decomposition** shows where optimization effort actually belongs.
- **Output length is roughly linear** — the most controllable term.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not streaming** | Users experience the full generation time |
| **Large context** | Directly increases TTFT |
| **Unbounded output** | Total time scales with it |
| **Optimizing retrieval first** | Usually the smallest term |
| **Averages instead of p95/p99** | Hides the requests that generate complaints |
| **Sequential independent work** | Sum instead of max |

**On quality-latency trade-offs:** cutting retrieved context to reduce TTFT trades against recall, and cutting output length trades against completeness. Both are legitimate within a stated budget and neither should be done without one — optimizing latency with no target just degrades quality for an unspecified benefit.

**On tail latency:** the requests producing a bad p99 are usually identifiable — very long conversations, unusually large retrieved contexts, or complex questions producing long answers. Capping context size and output tokens bounds the tail directly, which is more effective than trying to make the average faster.

## 7. Interview Answer

> "Two numbers matter and they behave differently. Time to first token is driven by input size — the prefill pass over the prompt — so a large retrieved context directly increases it. Total time is driven by output length and model tier, roughly linear in tokens generated.
>
> The largest lever is streaming, and it costs nothing. It doesn't reduce total time; it changes what the user waits for — sub-second to first token plus reading time, instead of four seconds of silence. For any chat interface that should be the default before any other optimization.
>
> After that, in order: a smaller tier, if the golden set shows no quality difference for the task — Flash-class is several times faster than Pro-class, so that's free latency. Shorter output, since total time is roughly linear in output tokens, and a concise grounded answer is usually better anyway. Less input, via fewer better-reranked chunks — eight good chunks beat twenty mediocre ones for quality and latency together. And running independent work concurrently.
>
> The framing I'd use is a budget. If the p95 target is three seconds, that might decompose as two hundred milliseconds retrieval, three hundred reranking, six hundred to first token, and one point nine seconds generating. That decomposition tells you where effort belongs — shaving fifty milliseconds off ANN search when generation is one point nine seconds is optimizing the wrong term, and that's a very common mistake.
>
> I'd measure percentiles rather than averages. A p50 of 1.2 seconds with a p99 of nine usually means a few requests with very large contexts or long outputs, and the p99 is what generates complaints while the average looks fine.
>
> For the tail specifically, the offending requests are usually identifiable — long conversations, unusually large retrieved contexts, complex questions producing long answers. Capping context size and output tokens bounds the tail directly, which is more effective than trying to make the average faster.
>
> And I'd be explicit that these are trade-offs. Cutting context trades against recall; cutting output trades against completeness. Both are fine within a stated budget and neither should be done without one — optimizing latency with no target just degrades quality for a benefit nobody specified."

## 8. Likely Follow-ups

**Q: What's the biggest latency lever?**
Streaming. It doesn't reduce total generation time but it changes a four-second silence into a sub-second time-to-first-token plus reading time, which is what the user actually experiences. It costs nothing and should be the default before any other work.

**Q: What drives time to first token?**
Input size — the prefill pass over the prompt. So a large retrieved context directly increases TTFT, which is one reason fewer, better-reranked chunks help latency as well as quality. Total time is driven separately by output length and tier.

**Q: Where should optimization effort go?**
Wherever the budget decomposition says the time is. If generation is 1.9 seconds of a 3-second budget, shaving milliseconds off ANN search is the wrong target. Decomposing the budget first is what stops people optimizing the smallest term.

**Q: How do you handle tail latency?**
Identify what's producing it — usually long conversations, oversized contexts, or complex questions generating long answers — then cap context size and output tokens to bound it directly. That's more effective than trying to improve the average, which is already acceptable.

**Q: What are you trading away?**
Recall when you cut context, completeness when you cut output length. Both are legitimate within a stated latency budget. Without a target, optimizing latency just lowers quality in exchange for a benefit nobody asked for, which is why the budget has to come first.

## 9. Common Mistakes

- Not streaming.
- Optimizing retrieval before decomposing the budget.
- Leaving output length uncapped.
- Reporting average latency instead of p95 and p99.
- Cutting context or output without a stated latency target.

## 10. What to Remember

- **TTFT is driven by input; total time by output length and tier.**
- **Stream** — the biggest perceived win, for free.
- **Decompose the budget** before optimizing anything.
- **Output length is roughly linear** and the most controllable term.
- **Cap context and output** to bound the tail; measure p95 and p99.
