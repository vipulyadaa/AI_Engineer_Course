# Vector Dimensions

> **Phase 06 · EMBEDDINGS · Topic 05**

## 1. Definition

The length of an embedding vector — typically 384 to 3072. It determines storage, memory, and search cost directly, and quality only loosely.

## 2. Simple Explanation

More dimensions means more capacity to represent distinctions — up to a point. Past that, you're paying linearly in storage and search cost for diminishing quality gain.

The practical framing: dimensions are a cost decision that has some quality implications, not a quality decision with some cost implications.

## 3. How It Works

**The cost is linear and unavoidable:**

```
10M chunks, FP32 (4 bytes per dimension):

  384 dims  →  10M × 384 × 4   =  15.4 GB
  768 dims  →  10M × 768 × 4   =  30.7 GB
 1536 dims  →  10M × 1536 × 4  =  61.4 GB
 3072 dims  →  10M × 3072 × 4  = 122.9 GB

Plus HNSW graph overhead, typically adding substantially
on top of the raw vectors.

Search latency also scales with dimension — every distance
computation touches every dimension.
```

**Typical models:**

| Dimensions | Examples |
|---|---|
| 384 | all-MiniLM-L6-v2 — small, fast |
| 768 | the common sweet spot; many BERT-derived models |
| 1024–1536 | larger hosted models |
| 3072 | largest tier |

**Matryoshka embeddings** are the technique worth knowing: trained so that truncating to fewer dimensions degrades gracefully. A 3072-dim vector can be truncated to 768 and remain useful, which lets you choose the trade at query time rather than at model-selection time.

## 4. Practical Example

**Matryoshka enables a genuinely useful two-stage pattern:**

```
Store full 3072-dim vectors.

Stage 1: search using the first 256 dimensions
         → 12× cheaper distance computations
         → retrieve 200 candidates
Stage 2: rerank those 200 using full 3072 dimensions
         → full accuracy on a small set

Fast coarse search, accurate fine ranking — the same
retrieve-wide-rerank-narrow shape, applied to dimensions.
```

**The quality-versus-dimension reality:**

```
Doubling dimensions rarely doubles quality. The gain is
typically small on domain-specific data, while cost is
strictly linear.

And a smaller model that's a good DOMAIN fit routinely
beats a larger general model with more dimensions. Domain
fit matters more than dimension count.

So: evaluate candidates on YOUR eval set. Leaderboard
position and dimension count are both weak predictors.
```

**Quantization compounds with dimension choice:**

```
768 dims, FP32:  3,072 bytes per vector
768 dims, INT8:    768 bytes per vector   → 4× reduction

Combining a moderate dimension count with quantization
usually beats maximizing dimensions and storing at full
precision — same or better quality, far less memory.
```

## 5. Why It Matters

- **It's a linear cost multiplier** on storage, memory, and search latency at corpus scale.
- **Matryoshka embeddings** make the trade adjustable rather than fixed at model selection.
- **Domain fit beats dimension count**, which is the judgment that avoids overpaying.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Maximizing dimensions by default** | Linear cost for marginal quality gain |
| **Ignoring HNSW graph overhead** | Index memory exceeds raw vector storage |
| **Comparing dimension counts across models** | Not a quality proxy |
| **Truncating non-Matryoshka embeddings** | Degrades badly; only Matryoshka models support it |
| **Dimension choice locked at ingestion** | Changing it means re-embedding the corpus |
| **Curse of dimensionality** | At very high dimensions, distances converge |

**On the curse of dimensionality:** at very high dimensions, distances between random points concentrate, reducing discrimination. Learned embeddings mitigate this by placing semantically similar items close deliberately, but it's a real reason more dimensions aren't monotonically better.

**On truncation:** you can only truncate embeddings from a Matryoshka-trained model. Truncating an ordinary embedding discards dimensions that carried arbitrary parts of the representation and degrades quality sharply.

## 7. Interview Answer

> "Vector dimensions determine storage, memory, and search cost directly, and quality only loosely. I'd frame it as a cost decision with some quality implications rather than the reverse.
>
> The cost is strictly linear. Ten million chunks at 768 dimensions in FP32 is about thirty gigabytes; at 3072 it's a hundred and twenty-three — plus HNSW graph overhead on top, which people forget. And search latency scales too, since every distance computation touches every dimension.
>
> Meanwhile doubling dimensions rarely doubles quality. The gain is typically small on domain-specific data, and a smaller model that's a good domain fit routinely beats a larger general model with more dimensions. So domain fit matters more than dimension count, and I'd evaluate candidates on my own eval set rather than reading dimension count or leaderboard position as a quality proxy.
>
> The technique worth knowing is Matryoshka embeddings — trained so that truncating to fewer dimensions degrades gracefully. That converts the trade from fixed at model selection to adjustable at query time. It enables a nice two-stage pattern: store full 3072-dimension vectors, search using the first 256 for a twelve-fold cheaper coarse pass, retrieve two hundred candidates, then rerank those using the full vector. Fast coarse search, accurate fine ranking — the same retrieve-wide-rerank-narrow shape applied to dimensions.
>
> Important caveat: that only works with Matryoshka-trained models. Truncating an ordinary embedding discards dimensions carrying arbitrary parts of the representation and degrades quality sharply.
>
> And quantization compounds with this. A moderate dimension count stored at INT8 usually beats maximizing dimensions at full precision — same or better quality, a fraction of the memory. 768 dimensions in INT8 is 768 bytes per vector versus 3,072 at FP32."

## 8. Likely Follow-ups

**Q: How do you choose a dimension count?**
By evaluating candidate models on your own eval set and weighing the measured quality difference against the linear storage and latency cost at your corpus size. Dimension count isn't a quality proxy — a smaller model with good domain fit often beats a larger general one.

**Q: What are Matryoshka embeddings?**
Embeddings trained so that prefixes of the vector are themselves useful representations — truncating from 3072 to 768 or 256 degrades gracefully rather than catastrophically. It makes the dimension trade adjustable at query time, and enables coarse-search-then-fine-rerank using different truncations of the same stored vector.

**Q: Can you truncate any embedding?**
No — only Matryoshka-trained ones. An ordinary embedding distributes information arbitrarily across dimensions, so truncating discards parts of the representation unpredictably and quality drops sharply. Attempting it on a standard model is a real and easily-made mistake.

**Q: What's the memory impact at scale?**
Linear in dimensions. Ten million chunks at 768 dimensions in FP32 is about 30 GB of raw vectors; at 3072 it's 123 GB — plus HNSW graph overhead, which adds substantially and is commonly forgotten in capacity planning. Search latency scales too.

**Q: Dimensions or quantization for reducing cost?**
Quantization usually gives more per unit of quality loss. A 768-dimension vector at INT8 is 768 bytes versus 3,072 at FP32 — a four-fold reduction for typically small quality cost. Combining a moderate dimension count with quantization generally beats maximizing dimensions at full precision.

## 9. Common Mistakes

- Treating dimension count as a quality proxy.
- Forgetting HNSW graph overhead in capacity planning.
- Truncating embeddings from a non-Matryoshka model.
- Maximizing dimensions before trying quantization.
- Not realizing dimension choice requires re-embedding to change.

## 10. What to Remember

- **Linear cost in storage, memory, and search latency.** Quality gain is sublinear.
- **Domain fit beats dimension count** — evaluate on your own data.
- **Matryoshka embeddings truncate gracefully** and enable coarse-then-fine search.
- **Ordinary embeddings cannot be truncated** without sharp degradation.
- **Quantization often beats more dimensions** — 768 at INT8 over 3072 at FP32.
