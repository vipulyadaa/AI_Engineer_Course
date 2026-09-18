# Transformer Computational Complexity

> **Phase 03 · TRANSFORMERS · Topic 21**

## 1. Definition

Per layer, attention costs **O(n²·d)** and the feed-forward network costs **O(n·d²)**. Which dominates depends on whether sequence length or model dimension is larger — and that crossover point drives most serving decisions.

## 2. Simple Explanation

Two costs, scaling differently:

- **Attention** — every token attends to every token: quadratic in sequence length.
- **FFN** — each token transformed independently: linear in sequence length, quadratic in model dimension.

For short sequences the FFN dominates. For long ones attention takes over. Knowing where that crossover sits tells you which optimization matters.

## 3. How It Works

**Per layer, per sequence:**

```
Attention
  Q,K,V projections     3 · n · d²
  Q·Kᵀ                  n² · d
  weights · V           n² · d
  output projection     n · d²
                        ─────────────
                        4n·d² + 2n²·d

FFN (4× expansion)
  up + down             8n · d²

TOTAL ≈ 12n·d² + 2n²·d
```

**The crossover:**

```
attention term dominates when   2n²·d > 12n·d²
                          i.e.   n > 6d

d = 4096  →  crossover at n ≈ 24,000 tokens

Below that, the FFN dominates compute.
Above it, attention does.
```

**That's why most production workloads are FFN-dominated on compute** — typical contexts of 2k–8k tokens sit well below the crossover for a model with d=4096.

## 4. Practical Example

**But compute isn't the binding constraint at inference — memory is:**

```
PREFILL (process the prompt)
  Compute-bound. All n positions in parallel.
  Cost scales with prompt length → this is your TTFT.

DECODE (generate token by token)
  MEMORY-BANDWIDTH-bound, not compute-bound.
  Each token requires reading ALL model weights from memory
  to do relatively little arithmetic.

  → GPU utilization during decode is often very low
  → the fix is BATCHING: read weights once, serve many sequences
```

**The KV cache is usually what actually limits you:**

```
KV cache = 2 · layers · kv_heads · head_dim · n · batch · bytes

7B model, 32 layers, 32 KV heads, head_dim 128, FP16:
  per token per sequence ≈ 512 KB
  at n=4,000, batch=16      ≈ 32 GB
  model weights             ≈ 14 GB

Cache > weights. Throughput is limited by how many sequences'
caches fit in memory, not by FLOPs.
```

**Which is why grouped-query attention exists** — fewer KV heads, smaller cache, larger achievable batch, higher throughput.

## 5. Why It Matters

- **The n > 6d crossover** is a concrete, defensible answer to "what dominates?"
- **The compute/memory distinction** is what actually explains serving behavior.
- **KV cache size exceeding model weights** is the fact that reframes LLM serving economics.

## 6. Trade-offs / Failure Modes

| Constraint | Detail |
|---|---|
| **O(n²) attention** | Long context is expensive at prefill |
| **KV cache O(n · batch)** | Usually the binding memory constraint |
| **Decode is bandwidth-bound** | Low GPU utilization without batching |
| **Prefill vs. decode differ** | Different bottlenecks, different optimizations |
| **Quadratic memory for scores** | What FlashAttention addresses |

**The optimization map:**

| Target | Technique |
|---|---|
| Attention memory | FlashAttention (tiling, no n×n materialization) |
| Attention compute | Sliding window, sparse patterns → O(n·w) |
| KV cache size | GQA/MQA (fewer KV heads), quantized cache |
| KV cache management | PagedAttention / vLLM (no fragmentation) |
| Decode utilization | Continuous batching |
| Weight memory | Quantization (INT8/FP8/INT4) |

**A caveat on FlashAttention:** it doesn't change the asymptotic complexity. It changes memory *access* — computing attention in tiles that fit in on-chip SRAM so the n×n matrix is never written to slower HBM. Large practical speedup, identical math.

## 7. Interview Answer

> "Per layer there are two costs. Attention is O(n² d) — every token attends to every token. The feed-forward network is O(n d²) — each token transformed independently, so linear in sequence length and quadratic in model dimension.
>
> Setting them equal, attention dominates when n exceeds roughly six times d. For a model with d equals 4096, that's about twenty-four thousand tokens. So for typical production contexts of two to eight thousand tokens, the FFN actually dominates compute — which surprises people who assume attention is always the bottleneck.
>
> But compute isn't the binding constraint at inference. Decode is memory-bandwidth-bound, not compute-bound: generating one token requires reading all the model weights from memory to do relatively little arithmetic, so GPU utilization is often very low. The fix is batching — read the weights once and serve many sequences with them.
>
> And the thing that actually limits throughput is usually the KV cache. For a 7B model at four thousand tokens and batch sixteen, that cache is around thirty-two gigabytes against fourteen gigabytes of weights. The cache exceeds the model. So throughput is limited by how many sequences' caches fit in memory, not by FLOPs.
>
> That reframes the optimization map. Grouped-query attention shrinks the cache by reducing KV heads. PagedAttention manages cache memory without fragmentation. Continuous batching keeps utilization up during decode. FlashAttention addresses the attention memory side by tiling so the n-by-n score matrix is never materialized — though I'd note it doesn't change the asymptotic complexity, only the memory access pattern. Sliding-window and sparse attention are what actually change the complexity."

## 8. Likely Follow-ups

**Q: Does attention or the FFN dominate?**
Depends on the ratio. Attention is O(n²d), the FFN is O(nd²), so attention dominates when n exceeds about 6d. At d=4096 that's around 24,000 tokens — so for typical 2k–8k contexts the FFN dominates compute, which is the opposite of what people usually assume.

**Q: What's the actual bottleneck at inference?**
Memory, not compute. Decode is memory-bandwidth-bound — each token requires reading all weights to do little arithmetic. And the KV cache usually exceeds the model weights at moderate batch and sequence length, so throughput is limited by how many sequences' caches fit in memory.

**Q: How big does the KV cache get?**
Roughly `2 × layers × kv_heads × head_dim × seq_len × batch × bytes`. For a 7B model at 4,000 tokens and batch 16 in FP16, about 32 GB against 14 GB of weights. That inversion — cache larger than the model — is the fact that most reframes serving economics.

**Q: What does FlashAttention actually do?**
Changes the memory access pattern, not the math. It computes attention in tiles sized for on-chip SRAM with an online softmax, so the n×n score matrix is never written to slower high-bandwidth memory. Identical output, far less memory traffic, substantially faster. It does not change the asymptotic complexity — sliding-window and sparse attention do.

**Q: Why is prefill compute-bound and decode bandwidth-bound?**
Prefill processes all prompt positions in parallel, so there's substantial arithmetic per byte of weights read — good arithmetic intensity, compute-bound. Decode processes one token, so you read every weight to do one token's worth of arithmetic — terrible arithmetic intensity, bandwidth-bound. Batching fixes decode by amortizing the weight read across many sequences.

## 9. Common Mistakes

- Assuming attention always dominates compute.
- Not distinguishing compute cost from memory cost at inference.
- Underestimating KV cache size relative to model weights.
- Claiming FlashAttention makes attention sub-quadratic.
- Treating prefill and decode as having the same bottleneck.

## 10. What to Remember

- **Attention O(n²d), FFN O(nd²).** Attention dominates when n > ~6d — around 24k tokens at d=4096.
- **Decode is bandwidth-bound, not compute-bound.** Batching is the fix.
- **KV cache often exceeds model weights** and is the real throughput limit.
- **FlashAttention changes memory access, not complexity.** Sliding window changes complexity.
- **Prefill and decode have different bottlenecks** and different optimizations.
