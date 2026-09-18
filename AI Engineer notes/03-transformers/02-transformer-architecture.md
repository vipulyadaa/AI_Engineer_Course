# Transformer Architecture

> **Phase 03 · TRANSFORMERS · Topic 02**

## 1. Definition

The full stack: tokens → embeddings + positional encoding → N identical blocks (attention + feed-forward, each with residual and normalization) → output projection to vocabulary logits.

## 2. Simple Explanation

A transformer is one block repeated N times, with an input and output wrapper.

Understanding a single block means understanding the whole model — everything else is stacking, plus getting tokens in and logits out.

## 3. How It Works

```
token ids
   │
   ▼  token embedding lookup  (vocab_size × d)
   +  positional encoding
   │
   ▼
┌─────────────────────────────────┐
│ BLOCK × N                       │
│   x + Attention(LayerNorm(x))   │  ← pre-norm (modern standard)
│   x + FFN(LayerNorm(x))         │
└─────────────────────────────────┘
   │
   ▼  final LayerNorm
   ▼  output projection (d × vocab_size)   ← often tied to input embedding
   ▼
logits
```

**Where the parameters live, for a decoder-only model with hidden size `d`:**

| Component | Parameters per block | Share |
|---|---|---|
| Attention (Q, K, V, O projections) | 4d² | ~1/3 |
| Feed-forward (up + down, 4d wide) | 8d² | ~2/3 |
| LayerNorm | ~2d (negligible) | — |

**Most parameters are in the feed-forward layers, not attention.** That surprises people, and it's the reason FFN-focused optimizations (mixture-of-experts, for instance) target the bigger share.

## 4. Practical Example

**Sizing a model from its config:**

```
d = 4096, layers = 32, vocab = 128,000

Per block:   12 d²  = 12 × 16.8M   ≈ 201M
All blocks:  32 × 201M             ≈ 6.4B
Embeddings:  128,000 × 4096        ≈ 0.5B  (often tied with output)
                                    ───────
Total                              ≈ 7B parameters

Memory at FP16: 7B × 2 bytes ≈ 14 GB for weights alone.
```

**Pre-norm vs. post-norm — a detail that matters:**

```
Post-norm (original 2017 paper):
   x = LayerNorm(x + Attention(x))
   → needs careful warmup; unstable at depth

Pre-norm (every modern model):
   x = x + Attention(LayerNorm(x))
   → residual path stays clean, gradients flow better,
     trains stably at 100+ layers
```

**Modern deviations from the 2017 paper** worth knowing:

| Component | 2017 | Modern |
|---|---|---|
| Normalization | Post-norm LayerNorm | Pre-norm, often RMSNorm |
| Positional | Sinusoidal, added | RoPE, applied in attention |
| Activation | ReLU | SwiGLU / GeGLU |
| Attention | Multi-head | Grouped-query / multi-query (KV cache savings) |
| Bias terms | Present | Often removed |

## 5. Why It Matters

- **Parameter-count arithmetic is a common interview question**, and it's mechanical once you know where parameters live.
- **The FFN holding two-thirds of parameters** explains where knowledge is stored and where efficiency work targets.
- **Knowing the modern deviations** signals you've read past the original paper.

## 6. Trade-offs / Failure Modes

| Design choice | Trade-off |
|---|---|
| **Depth vs. width** | Deeper captures more compositional structure; wider parallelizes better |
| **Pre-norm vs. post-norm** | Pre-norm trains stably; post-norm can reach slightly better final quality with heavy tuning |
| **FFN expansion ratio (usually 4×)** | Larger = more capacity and more parameters |
| **Tied embeddings** | Saves `vocab × d` parameters; slight quality cost |
| **MHA vs. GQA/MQA** | Grouped-query shrinks the KV cache substantially with small quality loss |

**Grouped-query attention is worth knowing specifically** because it targets the inference bottleneck. The KV cache scales with the number of key-value heads, so sharing KV heads across query heads cuts cache memory several-fold — which directly increases how many requests you can batch.

## 7. Interview Answer

> "The architecture is: token IDs go through an embedding lookup, positional information is added, then N identical blocks, then a final normalization and a projection to vocabulary logits.
>
> Each block has two sublayers — multi-head self-attention and a feed-forward network — each wrapped in a residual connection with layer normalization. Attention mixes information across positions; the feed-forward transforms each position independently.
>
> The parameter distribution is worth knowing because it surprises people. With hidden size d, attention's four projections are 4d² and the feed-forward is 8d² at the standard 4× expansion — so roughly two-thirds of every block's parameters are in the feed-forward layers, not attention. That's where most learned knowledge lives, and it's why efficiency work like mixture-of-experts targets the FFN.
>
> That also makes parameter counting mechanical: twelve d-squared per block, times the number of layers, plus embeddings. For d equals 4096 and 32 layers that's about 6.4 billion, plus half a billion for embeddings — a 7B model, which is 14 gigabytes at FP16.
>
> Two things I'd note as deviations from the original paper. Every modern model uses pre-norm rather than post-norm — normalizing before the sublayer instead of after — because it keeps the residual path clean and trains stably at a hundred-plus layers. And most use grouped-query attention rather than full multi-head, which shares key-value heads across query heads. That shrinks the KV cache several-fold, which directly increases how many requests you can batch at inference."

## 8. Likely Follow-ups

**Q: How do you estimate a model's parameter count?**
Roughly 12d² per block for a standard decoder layer — 4d² for attention projections and 8d² for the 4×-expansion feed-forward — times the number of layers, plus vocabulary times d for embeddings. For d=4096 and 32 layers that's about 7B including embeddings.

**Q: Where are most of the parameters?**
The feed-forward layers, about two-thirds of each block. Attention gets roughly a third. This is counterintuitive because attention gets the conceptual attention, but the FFN is where most learned knowledge is stored — which is why it's the target for mixture-of-experts and other capacity-scaling approaches.

**Q: Pre-norm or post-norm?**
Pre-norm for anything modern. Normalizing before the sublayer keeps the residual path an uninterrupted identity mapping, so gradients flow cleanly and very deep models train stably without elaborate warmup schedules. Post-norm was the original design and can reach marginally better quality with careful tuning, but it's much harder to train deep.

**Q: What is grouped-query attention?**
Query heads are grouped so that several share one set of key and value heads, rather than each head having its own. The KV cache scales with the number of KV heads, so this cuts cache memory several-fold with minimal quality loss. It's an inference optimization that directly increases achievable batch size, which is why modern models adopt it.

**Q: Why tie input and output embeddings?**
Both are `vocab × d` matrices mapping between token space and hidden space, in opposite directions, so sharing them saves a large parameter count — for a 128k vocabulary and d=4096, half a billion parameters. There's a small quality cost, and it's a common choice in smaller models where that saving is proportionally larger.

## 9. Common Mistakes

- Assuming attention holds most of the parameters.
- Describing post-norm as the modern standard.
- Forgetting embeddings when estimating parameter count.
- Not knowing grouped-query attention, which is standard in current models.
- Reciting the 2017 architecture as if nothing has changed since.

## 10. What to Remember

- **Embeddings + positions → N blocks → norm → vocabulary projection.**
- **Per block: 4d² attention + 8d² FFN ≈ 12d².** FFN holds ~2/3 of parameters.
- **Pre-norm is the modern standard** — clean residual path, stable at depth.
- **Grouped-query attention** shrinks the KV cache and raises achievable batch size.
- **Parameter counting is mechanical:** 12d² × layers + vocab × d.
