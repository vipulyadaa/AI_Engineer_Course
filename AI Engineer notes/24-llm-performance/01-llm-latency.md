# LLM Latency

> **Phase 24 · LLM PERFORMANCE · Topic 01**

## 1. Definition

The time from request to complete response, decomposed into time-to-first-token and generation throughput — two components with different causes and different fixes.

## 2. Simple Explanation

Latency isn't one number. Time to first token depends on how much you sent; total time depends on how much was generated.

Conflating them means optimizing the wrong half, which is why "the system is slow" is rarely actionable on its own.

## 3. How It Works

```
TOTAL = TTFT + (output_tokens × per-token time)

TTFT           driven by input size — the prefill pass over
               the prompt
GENERATION     driven by output length and model tier,
               roughly linear in tokens

A RAG REQUEST
  retrieval          200 ms
  reranking          300 ms
  TTFT               600 ms   ← scales with context size
  generation       1,900 ms   ← scales with answer length
                  ────────
                   3,000 ms
```

**Generation dominates.** Optimizing retrieval when generation is 1.9 seconds of a 3-second budget is optimizing the wrong term — and that's where teams usually start.

## 4. Practical Example

**The budget decomposition, which directs the work:**

```
Measure each stage before optimizing anything.

Typical findings:
  · generation is 60-70% of the budget
  · reranking is the largest retrieval-side cost
  · ANN search is 5-30 ms — noise by comparison

Shaving 15 ms off ANN search while generation takes 1.9
seconds is a week of work for half a percent.
```

**Perceived versus actual latency:**

```
STREAMING changes what the user experiences without
reducing total time:

  without: 3 seconds of silence
  with:    600 ms to first token, then text appearing

That's a larger improvement in perceived speed than every
other optimization combined, and it costs nothing.

It should be the first thing done and it frequently isn't,
because it's a UI concern rather than a model one.
```

**Percentiles, not averages:**

```
p50   1.2 s   looks fine
p99   9.0 s   a meaningful fraction of users

A large p50-p99 gap usually means something structural:
  · cold index pages after a deploy
  · a slow shard in scatter-gather
  · unusually large retrieved contexts
  · provider latency variance

Averages hide all of it, and the p99 is what generates
complaints.
```

## 5. Why It Matters

- **TTFT and generation have different causes** — conflating them misdirects the work.
- **Streaming is the largest perceived improvement** and it's free.
- **The budget decomposition** is what stops people optimizing the smallest term.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Optimizing retrieval first** | Usually the smallest term |
| **Not streaming** | Users experience full generation time |
| **Averages instead of percentiles** | Structural problems hidden |
| **Unbounded output length** | Total time scales with it |
| **Large context** | Directly increases TTFT |
| **No latency budget** | Optimization with no target |

**On the budget framing:** every latency reduction trades against something — fewer chunks trades recall, shorter output trades completeness, a faster tier trades quality. Without a stated target, optimizing latency just degrades quality for an unspecified benefit. Setting the p95 target first is what makes the trade-offs decidable.

**On tail latency:** the requests producing a bad p99 are usually identifiable — long conversations, oversized contexts, complex questions generating long answers. Capping context and output size bounds the tail directly, which is more effective than trying to make the median faster.

## 7. Interview Answer

> "Latency isn't one number. Time to first token is driven by input size — the prefill pass over the prompt. Total time is driven by output length and model tier, roughly linear in tokens generated. Those have different causes and different fixes, so conflating them means optimizing the wrong half.
>
> In a typical RAG request the decomposition might be two hundred milliseconds of retrieval, three hundred of reranking, six hundred to first token, and one point nine seconds generating. So generation is sixty to seventy percent of the budget — and shaving fifteen milliseconds off ANN search is a week of work for half a percent. That's where teams usually start, because the index is the part that feels tunable.
>
> So I'd measure each stage before optimizing anything. The decomposition is what directs the work.
>
> The largest actual improvement is streaming, and it's free. It doesn't reduce total time, but it changes three seconds of silence into six hundred milliseconds to first token followed by text appearing. That's a bigger improvement in perceived speed than every other optimization combined, and it's frequently not done because it reads as a UI concern rather than a model one.
>
> I'd measure percentiles rather than averages. A p50 of 1.2 seconds with a p99 of nine usually means something structural — cold index pages after a deploy, a slow shard in scatter-gather, unusually large retrieved contexts, or provider variance. Averages hide all of that, and the p99 is what generates complaints.
>
> For the tail specifically, the offending requests are usually identifiable: long conversations, oversized contexts, complex questions producing long answers. Capping context and output size bounds the tail directly, which is more effective than trying to improve the median that's already acceptable.
>
> And I'd frame the whole thing as a budget. Every latency reduction trades against something — fewer chunks trades recall, shorter output trades completeness, a faster tier trades quality. Without a stated p95 target, optimizing latency just degrades quality for a benefit nobody specified. Setting the target first is what makes the trade-offs decidable rather than arbitrary."

## 8. Likely Follow-ups

**Q: What drives time to first token?**
Input size — the prefill pass over the prompt. So a large retrieved context directly increases TTFT, which is one reason fewer, better-reranked chunks help latency as well as quality. Total time is driven separately by output length.

**Q: Where does the time actually go?**
Generation, typically sixty to seventy percent of the budget. Retrieval is a couple of hundred milliseconds and ANN search is often single-digit to tens of milliseconds — noise by comparison. Measuring the decomposition first is what stops people optimizing the smallest term.

**Q: What's the biggest improvement?**
Streaming. It doesn't reduce total generation time but turns three seconds of silence into a sub-second first token plus reading time. That's a larger perceived improvement than everything else combined, and it's free — yet often skipped because it reads as a UI concern.

**Q: Why percentiles rather than averages?**
Because the interesting failures are in the tail. A p50 of 1.2 seconds with a p99 of nine points at cold index pages, a slow shard, or oversized contexts. The average reports a healthy number while a meaningful fraction of users wait nine seconds.

**Q: How do you decide what to trade?**
By setting the p95 target first. Every latency reduction trades against something — recall, completeness, or quality. Without a target, optimizing latency just degrades the system for an unspecified benefit, and the trade-offs become arbitrary preferences.

## 9. Common Mistakes

- Optimizing retrieval before decomposing the budget.
- Not streaming.
- Reporting average latency instead of p95 and p99.
- Leaving output length uncapped.
- Optimizing latency without a stated target.

## 10. What to Remember

- **TTFT is input-driven; generation is output-driven.** Different fixes.
- **Generation is 60–70% of the budget** — optimize there.
- **Stream first** — the biggest perceived improvement, for free.
- **Measure p95 and p99**; averages hide structural problems.
- **Set the target first**, or trade-offs have no basis.
