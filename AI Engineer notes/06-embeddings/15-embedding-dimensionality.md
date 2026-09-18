# Embedding Dimensionality

> **Phase 06 · EMBEDDINGS · Topic 15**

## 1. Definition

The number of dimensions in an embedding vector, and the trade-offs that follow from it — representational capacity against storage, memory, search latency, and the distance-concentration effects of high-dimensional space.

## 2. Simple Explanation

More dimensions gives the model more room to encode distinctions. But the cost is strictly linear and the quality gain is not — and at very high dimensions, distances between points start converging, which reduces discrimination rather than improving it.

So there's a genuine optimum rather than a "more is better" direction.

## 3. How It Works

**The linear cost:**

```
10M chunks:
  384 dims, FP32   →  15 GB   + graph overhead
  768              →  31 GB
 1536              →  61 GB
 3072              → 123 GB

Search latency scales too — every distance computation
touches every dimension.
```

**The curse of dimensionality:**

```
As dimensions increase, the ratio of the farthest distance
to the nearest distance approaches 1 for random points.

  2 dims:    ~10×      nearest neighbour is clearly nearer
 10 dims:    ~2.5×
100 dims:    ~1.3×
1000 dims:   ~1.05×    everything is roughly equidistant

Learned embeddings MITIGATE this by deliberately placing
semantically similar items close — the space isn't randomly
populated. But it's a real reason more dimensions aren't
monotonically better.
```

**Matryoshka representation learning** is the technique that changes the calculus: models trained so that prefixes of the vector are themselves useful representations, so truncation degrades gracefully instead of catastrophically.

## 4. Practical Example

**The two-stage pattern Matryoshka enables:**

```
Store full 3072-dim vectors.

Stage 1: search using the first 256 dimensions
         → 12× cheaper distance computations
         → retrieve 200 candidates
Stage 2: rescore those 200 with the full 3072 dimensions
         → full accuracy on a small set

Same retrieve-wide-rerank-narrow shape, applied to dimensions
instead of to models.
```

**Truncation only works on Matryoshka models:**

```
Ordinary embedding: information is distributed arbitrarily
across dimensions. Truncating discards whatever happened to
be in the dropped dimensions → sharp quality loss.

Matryoshka embedding: trained so that early dimensions carry
the most important information → graceful degradation.

Truncating a non-Matryoshka embedding is a real and
easily-made mistake.
```

**Dimensions vs. quantization:**

```
768 dims, FP32   →  3,072 bytes per vector
768 dims, INT8   →    768 bytes per vector   (4× reduction)
3072 dims, FP32  → 12,288 bytes per vector

A moderate dimension count at INT8 usually beats maximizing
dimensions at full precision — comparable or better quality
for a fraction of the memory.

So if memory is the constraint, quantize before you
reduce dimensions.
```

## 5. Why It Matters

- **The cost is linear and the quality gain isn't**, which makes the default of maximizing dimensions wrong.
- **Matryoshka converts a fixed decision into an adjustable one**, which is valuable given the switching cost.
- **Quantization usually beats dimension reduction** for the same memory saving.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Maximizing dimensions by default** | Linear cost, sublinear gain |
| **Forgetting index overhead** | HNSW graph adds substantially beyond raw vectors |
| **Truncating non-Matryoshka embeddings** | Sharp degradation |
| **Treating dimension count as a quality proxy** | Domain fit matters more |
| **Dimension locked at ingestion** | Changing it means re-embedding — unless Matryoshka |
| **Ignoring latency scaling** | Distance computation cost grows with dimensions |

**On the domain-fit point:** a 384-dimension model well matched to your domain routinely beats a 3072-dimension general model. Dimension count is a capacity ceiling, not a quality guarantee — what fills that capacity depends on training data and objective.

**On measuring the trade:** sweep dimensions on your eval set if you have a Matryoshka model — truncate to 256, 512, 768, full, and measure recall at each. That gives you the actual quality curve for your corpus rather than an assumption, and the knee is usually lower than expected.

## 7. Interview Answer

> "Dimensionality is the number of values in an embedding vector, and the trade is that cost is strictly linear while quality gain is not.
>
> At ten million chunks, 768 dimensions in FP32 is about thirty-one gigabytes of raw vectors; 3072 is a hundred and twenty-three — plus HNSW graph overhead on top, which people forget in capacity planning. Search latency scales too, since every distance computation touches every dimension.
>
> There's also a real effect from the curse of dimensionality: as dimensions increase, distances between random points converge, so the ratio of farthest to nearest approaches one. Learned embeddings mitigate that by deliberately placing similar items close — the space isn't randomly populated — but it's a genuine reason more dimensions aren't monotonically better.
>
> The technique that changes the calculus is Matryoshka representation learning: models trained so that prefixes of the vector are themselves useful, meaning truncation degrades gracefully. That converts dimensionality from a decision fixed at model selection into one adjustable later, which matters given that changing models normally means re-embedding everything.
>
> It also enables a nice two-stage pattern — store full 3072-dimension vectors, search using the first 256 for a twelve-fold cheaper coarse pass over the whole corpus, retrieve two hundred candidates, then rescore those with the full vector. Same retrieve-wide-rerank-narrow shape applied to dimensions.
>
> Important caveat: that only works with Matryoshka-trained models. Truncating an ordinary embedding discards dimensions carrying arbitrary parts of the representation and degrades sharply.
>
> And if memory is the constraint, I'd quantize before reducing dimensions. 768 dimensions at INT8 is 768 bytes per vector versus 12,288 for 3072 at FP32 — usually comparable or better quality for a fraction of the memory. Quantization is the more efficient lever."

## 8. Likely Follow-ups

**Q: Do more dimensions mean better quality?**
Not proportionally. Cost is strictly linear while quality gain is sublinear, and at very high dimensions distance concentration reduces discrimination. Domain fit matters more — a 384-dimension model matched to your domain routinely beats a 3072-dimension general one. Dimension count is a capacity ceiling, not a quality guarantee.

**Q: What is the curse of dimensionality here?**
As dimensions increase, distances between random points converge toward each other, so "nearest neighbour" carries less information. Learned embeddings mitigate it by placing similar items close deliberately rather than randomly, but it's a real reason the quality-versus-dimension curve flattens and can turn.

**Q: What are Matryoshka embeddings?**
Models trained so that prefixes of the vector are themselves useful representations — the first 256 dimensions carry the most important information, so truncating from 3072 to 256 degrades gracefully. It makes dimensionality adjustable after ingestion rather than fixed, and enables coarse-then-fine search over one stored vector.

**Q: Can you truncate any embedding?**
No — only Matryoshka-trained ones. An ordinary embedding distributes information arbitrarily across dimensions, so truncating discards parts of the representation unpredictably and quality drops sharply. Attempting it on a standard model is a real and common mistake.

**Q: Dimensions or quantization to reduce memory?**
Quantization, usually. 768 dimensions at INT8 is 768 bytes per vector versus 12,288 for 3072 at FP32 — comparable or better quality for a fraction of the memory. I'd quantize first and only reduce dimensions if that's still insufficient, since it's the more efficient lever per unit of quality loss.

## 9. Common Mistakes

- Maximizing dimensions by default.
- Forgetting ANN index overhead in capacity planning.
- Truncating embeddings from a non-Matryoshka model.
- Treating dimension count as a quality proxy over domain fit.
- Reducing dimensions before trying quantization.

## 10. What to Remember

- **Linear cost, sublinear quality gain.** There's a genuine optimum, not a direction.
- **Distance concentration at high dimensions** reduces discrimination — mitigated by learned spaces, not eliminated.
- **Matryoshka makes dimensionality adjustable** and enables coarse-then-fine search.
- **Non-Matryoshka embeddings can't be truncated** without sharp loss.
- **Quantize before reducing dimensions** — it's the more efficient memory lever.
