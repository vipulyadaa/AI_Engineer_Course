# Caching (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 08**

## 1. Definition

Reusing previously computed work to reduce latency — response caching (removes the request entirely), context caching (skips re-prefilling), and embedding caching (removes a model call from the query path).

> The cost angle is in [25-llm-cost-optimization/05](../25-llm-cost-optimization/05-caching.md). This topic is the latency mechanism.

## 2. Simple Explanation

Three caches, three different latency effects.

A response cache removes everything — retrieval, prefill, generation. A context cache removes prefill for the cached portion. An embedding cache removes one model call from the front of the request.

## 3. How It Works

```
                      LATENCY REMOVED
RESPONSE CACHE        the entire request → near-zero
CONTEXT CACHE         prefill for the cached prefix → TTFT
QUERY EMBEDDING CACHE one model call → 20-50 ms

The magnitudes differ by orders of magnitude, and so do the
risks — the largest saving carries the largest correctness
risk.
```

**Context caching is the one discussed as a cost feature and underused as a latency one.** Not re-prefilling two thousand tokens of fixed prompt is real time removed from TTFT on every request.

## 4. Practical Example

**The query embedding cache, which is free latency:**

```
Every request embeds the query — a network round trip to a
model, typically 20-50 ms. That's comparable to the ANN
search itself.

For repeated questions, an exact-match cache on normalized
query text removes it entirely:
  · identical text → identical vector, so no correctness
    risk
  · no threshold to tune
  · keyed by embedding model version, so a model change
    invalidates it automatically

It's the safest cache in the system and it removes a stage
from the critical path. Routinely not implemented.
```

**Context caching's latency effect:**

```
A 2,000-token system prompt and few-shot block is prefilled
on every request. Cached, it isn't.

In an agent that's per STEP — an eight-step run prefills
the same prefix eight times without caching.

So the latency benefit compounds with step count, which
makes it much more valuable in agents than in single-call
RAG.
```

**Response caching, where the latency win is largest and the risk is too:**

```
A cache hit removes retrieval, reranking, prefill, and
generation — the whole request, from ~3 seconds to
milliseconds.

But: the key must include the authenticated user and
permission set, or it becomes a cross-customer disclosure
mechanism. And account-specific answers shouldn't be
cached at all.

So the largest latency saving is available only for
general policy questions — which in an FAQ workload is
still most of the traffic.
```

**Cache warming:** after a deploy, caches are empty and latency is worse for the first requests. Pre-warming the response and embedding caches with the most common queries before routing traffic removes a p99 spike that otherwise looks like a deploy regression.

## 5. Why It Matters

- **Three caches with latency effects differing by orders of magnitude.**
- **Query embedding caching is free latency** and routinely skipped.
- **Context caching compounds with agent step count** — most valuable there.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No query embedding cache** | A model call per repeated question |
| **Context caching unused** | Re-prefilling identical tokens every request |
| **Response cache without identity** | Cross-customer disclosure |
| **Cold caches after deploy** | A p99 spike that reads as a regression |
| **Stale cached answers** | Latency gained, correctness lost |
| **Cache lookup slower than the saving** | Net negative on a fast path |

**On lookup cost:** a semantic cache lookup is itself an embedding plus a vector search — so on a fast path it can cost a meaningful fraction of what it saves. An exact-match cache is a hash lookup and is unambiguously worth it; a semantic cache needs the hit rate to justify the lookup on every miss, which is worth measuring rather than assuming.

**On invalidation and latency:** a cached answer that's stale is fast and wrong, which is worse than slow and right. Tying invalidation to the source chunks that produced the answer keeps it correct — and that requires recording contributing chunks, which is the same record needed for audit.

## 7. Interview Answer

> "Three caches with three different latency effects, differing by orders of magnitude. A response cache removes the entire request — retrieval, reranking, prefill, generation — so roughly three seconds becomes milliseconds. A context cache removes prefill for the cached prefix, which is a direct TTFT reduction. A query embedding cache removes one model call, typically twenty to fifty milliseconds.
>
> The one I'd implement first for latency is the query embedding cache, because it's free. Every request embeds the query — a network round trip comparable in cost to the ANN search itself — and for repeated questions an exact-match cache on normalized query text removes it entirely. Identical text gives an identical vector, so there's no correctness risk, no threshold, and keying by embedding model version makes invalidation automatic. It's the safest cache in the system and it's routinely not implemented.
>
> Context caching is discussed as a cost feature and underused as a latency one. A two-thousand-token system prompt and few-shot block is prefilled on every request; cached, it isn't. And in an agent that's per step — an eight-step run prefills the same prefix eight times without caching. So the latency benefit compounds with step count, which makes it substantially more valuable in agents than in single-call RAG.
>
> Response caching has the largest latency win and the largest risk. The key must include the authenticated user and permission set, or it becomes a cross-customer disclosure mechanism — and account-specific answers shouldn't be cached at all. So the biggest saving is available only for general policy questions, though in an FAQ workload that's still most of the traffic.
>
> Two things I'd get right. Lookup cost: a semantic cache lookup is itself an embedding plus a vector search, so on a fast path it can cost a meaningful fraction of what it saves — and you pay it on every miss. An exact-match cache is a hash lookup and unambiguously worth it; a semantic one needs the hit rate to justify the lookup, which is worth measuring rather than assuming.
>
> And cache warming. After a deploy the caches are empty, so latency is worse for the first requests — pre-warming the response and embedding caches with the most common queries before routing traffic removes a p99 spike that otherwise looks like a deploy regression and gets investigated as one.
>
> One correctness point: a stale cached answer is fast and wrong, which is worse than slow and right. Tying invalidation to the source chunks that produced the answer is what keeps it correct, and that requires recording contributing chunks — which is the same record needed for audit anyway."

## 8. Likely Follow-ups

**Q: Which cache gives the biggest latency win?**
Response caching — it removes retrieval, reranking, prefill, and generation, so roughly three seconds becomes milliseconds. It also carries the biggest correctness risk, so it's limited to general policy questions with identity in the key.

**Q: What's the safest latency cache?**
Query embedding caching. Identical query text gives an identical vector, so there's no correctness risk and no threshold to tune. It removes a twenty-to-fifty-millisecond model call from the critical path, and it's routinely skipped.

**Q: Why does context caching matter more in agents?**
Because the prefix is prefilled on every step, not just every request. An eight-step agent prefills the same two thousand tokens eight times per run without caching, so the latency benefit compounds with step count.

**Q: When is a cache net negative?**
When the lookup costs a meaningful fraction of the saving and the hit rate is low. A semantic cache lookup is an embedding plus a vector search, paid on every miss — so it needs a measured hit rate to justify it, unlike an exact-match hash lookup.

**Q: What causes a post-deploy latency spike?**
Cold caches, along with cold index pages. Pre-warming the response and embedding caches with the most common queries before routing traffic removes it — otherwise it reads as a deploy regression and gets investigated as one.

## 9. Common Mistakes

- No query embedding cache on repetitive traffic.
- Treating context caching as purely a cost feature.
- Response cache keys without identity and permissions.
- Not warming caches before routing traffic after a deploy.
- Adding a semantic cache without measuring the hit rate against lookup cost.

## 10. What to Remember

- **Three caches, effects differing by orders of magnitude.**
- **Query embedding caching is free latency** — safest and usually missing.
- **Context caching compounds per agent step.**
- **Warm caches before routing traffic** after a deploy.
- **Fast and wrong is worse than slow and right** — tie invalidation to source chunks.
