# KV Cache

> **Phase 03 · TRANSFORMERS · Topic 23**

## 1. Definition

Storing the key and value tensors for already-processed tokens so each decode step doesn't recompute them. It's what makes autoregressive generation linear rather than quadratic — and its memory footprint is usually what limits serving throughput.

## 2. Simple Explanation

At each generation step, the new token attends to every previous token. Those previous tokens' keys and values don't change — they were computed from tokens that are already fixed.

So you cache them. Without caching, generating token 1,000 would recompute keys and values for all 999 previous tokens, at every layer, every step.

## 3. How It Works

```
Without cache, generating token t:
  recompute K,V for all t tokens → O(t) work per step
  over n tokens: O(n²) total

With cache:
  compute K,V for the NEW token only → O(1) per step
  append to cache
  over n tokens: O(n) total
```

**The size formula, which is the thing to know:**

```
KV cache bytes = 2 × layers × kv_heads × head_dim × seq_len × batch × bytes_per_element
                 ↑
                 K and V

7B model: 32 layers, 32 KV heads, head_dim 128, FP16 (2 bytes)

per token per sequence = 2 × 32 × 32 × 128 × 2 = 524,288 bytes ≈ 512 KB

at seq_len 4,000, batch 16:
   512 KB × 4,000 × 16 ≈ 32 GB

Model weights at FP16: ~14 GB

The cache is more than twice the model.
```

**That inversion is the central fact** — serving throughput is limited by how many sequences' caches fit in memory, not by compute.

## 4. Practical Example

**Why causal masking is what makes caching valid:**

```
Causal attention: position i attends only to positions ≤ i.
  → adding token t+1 does NOT change what position i attends to
  → position i's K and V are FIXED once computed
  → cacheable

Bidirectional attention: adding a token changes every position's
  representation.
  → nothing is cacheable

So the KV cache isn't a clever optimization bolted on — it's
a direct consequence of causal masking.
```

**The optimizations that target it:**

| Technique | Mechanism | Effect |
|---|---|---|
| **GQA / MQA** | Fewer KV heads shared across query heads | 4× to 32× smaller cache |
| **PagedAttention (vLLM)** | Non-contiguous cache pages, like virtual memory | Eliminates fragmentation waste |
| **Quantized cache** | Store K,V in INT8 or FP8 | ~2× smaller |
| **Sliding window** | Only keep the last w tokens' cache | Constant cache size |
| **Prefix caching** | Reuse the cache for a shared prompt prefix | Skips prefill for repeated system prompts |

**Prefix caching is directly relevant to RAG:**

```
Your system prompt is identical on every request — say 400 tokens.
Prefix caching computes its KV once and reuses it, so every
subsequent request skips prefilling those 400 tokens.

Saves both latency and cost, and it's essentially free to enable
where the provider supports it.
```

## 5. Why It Matters

- **It's what makes generation linear**, not an optional optimization.
- **Its size exceeding the model weights** is the fact that reframes serving economics.
- **GQA, PagedAttention, and quantized caches all exist because of it** — knowing the cause explains the whole optimization landscape.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Memory grows with seq_len × batch** | Usually the binding throughput constraint |
| **Fragmentation** | Pre-allocating max length per sequence wastes most of it |
| **Long generations** | Cache can exceed available memory mid-generation |
| **Quantized cache quality** | INT8 KV is usually fine; INT4 can degrade |
| **Sliding-window cache** | Constant size, but loses long-range attention |

**On fragmentation, which PagedAttention solved:** naive implementations allocate a contiguous buffer sized for the maximum possible sequence length per request. A request that generates 200 tokens in a slot sized for 4,000 wastes 95% of it. PagedAttention allocates in small fixed-size pages like virtual memory, so only what's used is held — which substantially increases achievable batch size in practice.

**On the trade-off GQA makes:** sharing KV heads across query heads costs a small amount of quality. In exchange, the cache shrinks several-fold, which allows a much larger batch, which raises throughput more than the quality loss costs. It's a clear net win at serving scale, which is why it's standard.

## 7. Interview Answer

> "The KV cache stores keys and values for already-processed tokens so each decode step doesn't recompute them. Without it, generating token one thousand would recompute keys and values for all nine hundred and ninety-nine previous tokens at every layer, every step — making generation quadratic. With it, each step computes only the new token's K and V. So it's not an optimization bolted on, it's what makes generation linear.
>
> It's valid specifically because of causal masking. Position i attends only to earlier positions, so adding a new token doesn't change what position i attends to — its keys and values are fixed once computed. With bidirectional attention, adding a token would change every representation and nothing could be cached.
>
> The size is two times layers times KV heads times head dimension times sequence length times batch times bytes — the two is K and V. For a 7B model at four thousand tokens and batch sixteen in FP16, that's about thirty-two gigabytes against fourteen gigabytes of weights. The cache is more than twice the model.
>
> That inversion is the central fact of LLM serving: throughput is limited by how many sequences' caches fit in memory, not by compute. And it explains the whole optimization landscape. Grouped-query attention shrinks the cache by sharing KV heads — a small quality cost for a several-fold memory reduction, which buys a much larger batch. PagedAttention allocates the cache in small pages like virtual memory instead of pre-allocating max length per sequence, eliminating fragmentation waste. Quantized caches halve it again.
>
> One that's directly useful in RAG: prefix caching. Your system prompt is identical on every request, so computing its KV once and reusing it means every subsequent request skips prefilling those tokens — saving latency and cost, essentially for free where the provider supports it."

## 8. Likely Follow-ups

**Q: Why does the KV cache exist?**
Because each decode step's new token attends to all previous tokens, and recomputing their keys and values every step would make generation quadratic. Caching makes it linear. It's enabled by causal masking — earlier positions' K and V are fixed once computed, because adding a later token doesn't change what they attend to.

**Q: How big does it get?**
`2 × layers × kv_heads × head_dim × seq_len × batch × bytes`. For a 7B model at 4,000 tokens and batch 16 in FP16, roughly 32 GB — more than twice the 14 GB of weights. At moderate batch and sequence length the cache routinely exceeds the model.

**Q: What optimizations target it?**
Grouped-query and multi-query attention reduce KV head count, shrinking the cache 4× to 32×. PagedAttention eliminates fragmentation by allocating in small pages rather than pre-allocating max length. Quantized caches store K and V in INT8 or FP8. Sliding-window attention caps cache size at the window length.

**Q: What is PagedAttention solving?**
Fragmentation. Naive implementations allocate a contiguous buffer sized for the maximum possible sequence per request, so a request generating 200 tokens in a 4,000-token slot wastes most of it. PagedAttention allocates small fixed-size pages like virtual memory, holding only what's used — which substantially increases achievable batch size.

**Q: What is prefix caching and why does it matter for RAG?**
Computing the KV for a shared prompt prefix once and reusing it across requests. Since a RAG system's system prompt is identical on every request, prefix caching means every subsequent request skips prefilling those tokens — saving both TTFT and input cost. It's close to free where the provider supports it.

## 9. Common Mistakes

- Describing the KV cache as an optional optimization rather than what makes decode linear.
- Not connecting it to causal masking as the reason it's valid.
- Underestimating its size relative to model weights.
- Not knowing PagedAttention or why fragmentation matters.
- Overlooking prefix caching, which is nearly free and directly applicable to RAG.

## 10. What to Remember

- **Caches K and V for prior tokens** — makes decode linear instead of quadratic.
- **Valid because of causal masking** — earlier positions' K/V are fixed.
- **`2 × layers × kv_heads × head_dim × n × batch × bytes`** — often exceeds the model weights.
- **It's the throughput limit**, not compute. Hence GQA, PagedAttention, quantized caches.
- **Prefix caching is nearly free** and directly useful for a fixed RAG system prompt.
