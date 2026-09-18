# Time to First Token

> **Phase 24 · LLM PERFORMANCE · Topic 02**

## 1. Definition

The delay between sending a request and receiving the first generated token. It's dominated by the prefill pass over the input, and with streaming enabled it becomes the latency the user actually experiences.

## 2. Simple Explanation

Before generating anything, the model has to process everything you sent. That processing is the prefill, and TTFT is how long it takes.

With streaming, TTFT is the wait. Everything after it arrives as readable text, so reducing TTFT improves the experience more than reducing total time does.

## 3. How It Works

```
PREFILL          process all input tokens in parallel →
                 build the KV cache
                 → cost scales with input length
DECODE           generate tokens one at a time, each
                 attending to the cache
                 → cost scales with output length

TTFT ≈ prefill time + queueing + network

So TTFT is essentially a function of how much you sent.
```

**Prefill is parallel, decode is sequential.** That asymmetry is why input size affects TTFT sub-linearly in practice while output length affects total time linearly.

## 4. Practical Example

**What actually reduces TTFT:**

```
1. LESS INPUT
   20 chunks → 8 reranked chunks is ~60% less to prefill.
   The largest lever, and it improves quality too.

2. CONTEXT CACHING
   A cached prefix doesn't need re-prefilling. For a large
   fixed system prompt or few-shot block, that's a direct
   TTFT reduction as well as a cost one.

3. SMALLER MODEL TIER
   Flash-class prefills faster than Pro-class.

4. REGIONAL ENDPOINT
   Network round trip matters when TTFT is 600 ms — a
   cross-region call can add 100+ ms.

5. WARM INDEX / WARM PATH
   Cold starts after deploy inflate TTFT for the first
   requests.
```

**Context caching is underused for latency**, because it's discussed as a cost feature. Not re-prefilling a cached prefix reduces TTFT directly.

**The retrieval stages are in front of TTFT:**

```
User-perceived wait = retrieval + reranking + TTFT

  retrieval    200 ms
  reranking    300 ms   ← often the largest pre-TTFT cost
  TTFT         600 ms
              ────────
              1,100 ms before any text appears

So reranking fewer candidates helps the perceived wait even
though it isn't TTFT itself. The user doesn't distinguish.
```

**That framing matters** — optimizing TTFT in isolation while reranking fifty candidates misses where the wait actually is.

**Cold starts:** memory-mapped indexes fault pages in on first access, so the first requests after a deploy can be an order of magnitude slower. Warming with representative queries before routing traffic removes a p99 spike that otherwise looks inexplicable.

## 5. Why It Matters

- **With streaming, TTFT is the wait** the user experiences.
- **Context caching reduces TTFT**, not just cost — an underused framing.
- **Retrieval and reranking sit in front of TTFT** and count as the same wait.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Large retrieved context** | Directly inflates prefill |
| **No context caching** | Re-prefilling identical tokens |
| **Reranking many candidates** | Adds to the pre-TTFT wait |
| **Cross-region endpoint** | Network latency on every request |
| **Cold index after deploy** | First requests an order of magnitude slower |
| **TTFT optimized in isolation** | Ignores the retrieval stages in front of it |

**On the trade with recall:** cutting context to reduce TTFT trades against recall unless a reranker is selecting the smaller set. With reranking, it's a pure win — fewer, better chunks improve TTFT, cost, and usually answer quality together. Without it, you're buying latency with accuracy.

**On measuring it separately:** TTFT and total time should be tracked as distinct metrics. A change that reduces total time by generating shorter answers doesn't improve TTFT at all, and a change that reduces TTFT by sending less context doesn't reduce generation time. Reporting one number conflates two independent levers.

## 7. Interview Answer

> "Time to first token is the delay before the model produces anything, and it's dominated by the prefill pass over the input — so it's essentially a function of how much you sent. With streaming enabled, TTFT is the latency the user actually experiences, because everything after it arrives as readable text.
>
> The mechanism worth knowing is that prefill is parallel and decode is sequential. Prefill processes all input tokens at once building the KV cache; decode generates one token at a time. That asymmetry is why input size affects TTFT sub-linearly while output length affects total time linearly.
>
> What reduces TTFT: less input, primarily. Twenty chunks down to eight reranked is about sixty percent less to prefill, and it improves quality too. Then context caching — a cached prefix doesn't need re-prefilling, which is a direct TTFT reduction. That's underused for latency because it's discussed as a cost feature, but not re-prefilling two thousand tokens of fixed prompt is real time saved.
>
> After that, a smaller model tier prefills faster, a regional endpoint avoids a hundred-plus milliseconds of cross-region network, and warming the index before routing traffic avoids cold-start spikes.
>
> The framing I'd emphasize is that retrieval and reranking sit in front of TTFT and the user doesn't distinguish. Two hundred milliseconds of retrieval plus three hundred of reranking plus six hundred of TTFT is eleven hundred milliseconds before any text appears. So reranking fewer candidates helps the perceived wait even though it isn't TTFT itself — and optimizing TTFT in isolation while reranking fifty candidates misses where the wait actually is.
>
> On the trade-off: cutting context to reduce TTFT trades against recall unless a reranker is choosing the smaller set. With reranking it's a pure win — better TTFT, lower cost, and usually better answers. Without it you're buying latency with accuracy, which is a different and worse deal.
>
> And I'd track TTFT and total time as separate metrics. A change that shortens answers reduces total time without touching TTFT; a change that sends less context reduces TTFT without touching generation. Reporting one number conflates two independent levers and makes it impossible to tell which change did what."

## 8. Likely Follow-ups

**Q: What determines TTFT?**
The prefill pass over the input, so essentially how much you sent. Prefill processes all input tokens in parallel building the KV cache, which is why input size affects TTFT sub-linearly while output length affects total time linearly through sequential decoding.

**Q: What reduces it most?**
Less input — fewer, better-reranked chunks. Then context caching, since a cached prefix doesn't need re-prefilling, which is a latency benefit usually discussed only as a cost one. Then a faster tier, a regional endpoint, and warming the index.

**Q: Does retrieval count as TTFT?**
Technically no, but the user doesn't distinguish. Retrieval plus reranking plus TTFT is the wait before any text appears, so reranking fifty candidates adds to the perceived delay even though it's not TTFT — which is why optimizing TTFT in isolation misses the real wait.

**Q: What's the trade-off in cutting context?**
Recall, unless a reranker chooses the smaller set. With reranking it's a pure win across TTFT, cost, and answer quality. Without it you're buying latency with accuracy, which is a different and considerably worse deal.

**Q: Should TTFT and total time be one metric?**
No — they're independent levers. Shorter answers reduce total time without touching TTFT; less context reduces TTFT without touching generation. One combined number makes it impossible to attribute an improvement to the change that caused it.

## 9. Common Mistakes

- Optimizing TTFT while reranking fifty candidates.
- Not using context caching for its latency benefit.
- Cutting context without a reranker.
- Cross-region endpoints on latency-sensitive paths.
- Reporting TTFT and total time as a single metric.

## 10. What to Remember

- **TTFT is a function of input size** — prefill dominates it.
- **With streaming, TTFT is the wait** users experience.
- **Context caching reduces TTFT**, not just cost.
- **Retrieval and reranking count as the same wait** to the user.
- **Track TTFT and total time separately** — independent levers.
