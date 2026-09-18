# Cosine Similarity

> **Phase 11 · RAG RETRIEVAL · Topic 03**

## 1. Definition

A similarity measure between two vectors based on the **angle** between them, ignoring their magnitudes. It's the standard metric for comparing embeddings because it measures directional agreement, which is what semantic similarity corresponds to.

## 2. Simple Explanation

Two vectors pointing the same direction are similar, regardless of how long they are.

That matters because embedding magnitude often reflects things you don't care about — document length, term repetition — while direction reflects meaning. Cosine strips out the magnitude and keeps the meaning.

```
cos(θ) =  1  → identical direction
cos(θ) =  0  → orthogonal, unrelated
cos(θ) = -1  → opposite direction
```

In practice, embedding similarities cluster in a narrow positive band — typically 0.3 to 0.9 — rather than spanning the full range.

## 3. How It Works

```
              A · B            Σ aᵢbᵢ
cos(A,B) = ─────────── = ──────────────────────
            |A| · |B|     √(Σaᵢ²) · √(Σbᵢ²)
```

**The key practical fact:** most embedding models output **unit-normalized** vectors (`|A| = 1`). When that's true:

```
cos(A,B) = A · B          ← cosine reduces to a plain dot product
```

And ranking by cosine, dot product, and Euclidean distance all produce **identical orderings**. That's why the choice of metric is often less consequential than it appears — as long as vectors are normalized.

If vectors are *not* normalized, the three diverge and the choice matters.

## 4. Practical Example

```python
import numpy as np

def cosine(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# If vectors are already unit-normalized (most embedding models):
def cosine_normalized(a, b):
    return np.dot(a, b)      # much faster, identical result

# Batch: score one query against all chunks
def search(query_vec, chunk_matrix, k=5):
    # chunk_matrix: (n_chunks, dim), rows unit-normalized
    scores = chunk_matrix @ query_vec        # one matmul
    top = np.argpartition(-scores, k)[:k]
    return top[np.argsort(-scores[top])]
```

**Typical score ranges, which is what people actually need to know:**

```
0.85 - 1.00   near-duplicate or direct paraphrase
0.70 - 0.85   strongly relevant
0.55 - 0.70   topically related
0.40 - 0.55   loosely related
< 0.40        probably unrelated

These bands are MODEL-SPECIFIC. Calibrate on your own data.
```

## 5. Why It Matters

- **It's the metric underlying every vector search** you'll build.
- **Understanding normalization** explains why metric choice is usually not a big decision.
- **Knowing scores aren't probabilities** is what prevents bad threshold decisions.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not a probability** | 0.8 doesn't mean "80% relevant." It's a geometric quantity |
| **Not comparable across models** | Different embedding spaces produce different distributions |
| **Compressed range in practice** | Real similarities cluster in a narrow band, not spread over [-1, 1] |
| **Ignores magnitude** | Usually desirable, occasionally loses signal about term intensity |
| **Curse of dimensionality** | At high dimensions all pairs converge toward similar scores |
| **Metric/model mismatch** | Using L2 on unnormalized vectors trained with cosine changes results |

**The dimensionality point matters for interpretation:** in 768 dimensions, random unrelated vectors score around 0 but real corpus chunks score higher than intuition suggests, because documents share vocabulary and structure. A 0.55 that sounds "medium" may actually be near the floor for your corpus.

**Match the metric to the model.** Most embedding models are trained with a cosine objective and output normalized vectors. If yours doesn't normalize, either normalize them yourself or use dot product deliberately — dot product on unnormalized vectors favours longer documents, which is sometimes wanted and usually not.

## 7. Interview Answer

> "Cosine similarity measures the angle between two vectors, ignoring their magnitudes. It's the standard metric for embeddings because direction encodes meaning while magnitude often encodes things you don't care about, like document length or term repetition.
>
> The practical fact worth knowing is that most embedding models output unit-normalized vectors. When that's true, cosine reduces to a plain dot product — and ranking by cosine, dot product, or Euclidean distance gives identical orderings. So the metric choice is usually much less consequential than it looks, as long as vectors are normalized. If they aren't, the three diverge and the choice genuinely matters.
>
> The thing I'd be careful about is interpretation. A cosine of 0.8 isn't 'eighty percent relevant' — it's a geometric quantity, not a probability. And the distribution isn't comparable across embedding models or corpora, so a threshold that works in one system is meaningless in another.
>
> In practice, real similarities cluster in a narrow band, typically 0.3 to 0.9 rather than spanning the full range, because corpus documents share vocabulary and structure. So a score of 0.55 that sounds 'medium' might actually be near the floor for your corpus. That's why any threshold has to be calibrated on your own data rather than copied.
>
> And I'd match the metric to how the model was trained. Dot product on unnormalized vectors favours longer documents, which is occasionally what you want and usually not."

## 8. Likely Follow-ups

**Q: Cosine vs. dot product vs. Euclidean — which should you use?**
If vectors are unit-normalized, all three rank identically, so pick whichever the vector database implements most efficiently — usually dot product, since it skips the normalization division. If vectors aren't normalized, cosine is typically right because it ignores magnitude; dot product would favour longer documents and L2 would be affected by magnitude differences unrelated to meaning.

**Q: Is a cosine score a probability?**
No. It's the cosine of the angle between two vectors — a geometric quantity with no probabilistic interpretation. You can't say 0.8 means 80% confidence. That's precisely why similarity thresholds have to be tuned empirically rather than set to an intuitive-sounding value.

**Q: Why do real similarity scores cluster in a narrow range?**
Because documents in a corpus share vocabulary, structure, and domain, so their embeddings aren't spread uniformly over the space. Combined with high dimensionality, where distances concentrate, you get a compressed distribution. The practical consequence is that the difference between 0.55 and 0.70 can be much more meaningful than the raw gap suggests.

**Q: Does cosine similarity handle the curse of dimensionality?**
Better than Euclidean distance, but not immune. At high dimensions all pairwise similarities converge toward a narrower band, which reduces discrimination. That's why embedding models are trained to place semantically similar items close — they learn a space where the metric is meaningful, which raw high-dimensional features wouldn't be.

**Q: What if magnitude does carry signal?**
It occasionally does — some models produce larger magnitudes for more confident or more content-rich embeddings. If you specifically want that, use dot product on unnormalized vectors. In practice, most modern embedding models normalize their output precisely because magnitude is more often noise than signal for retrieval.

## 9. Common Mistakes

- Treating a cosine score as a probability or confidence.
- Copying a threshold from another system or model.
- Using L2 or dot product on vectors trained with a cosine objective without normalizing.
- Assuming the full [-1, 1] range is used in practice.
- Interpreting a "medium" score without knowing the corpus distribution.

## 10. What to Remember

- **Angle between vectors; magnitude ignored.** Direction encodes meaning.
- **With normalized vectors, cosine = dot product**, and all three metrics rank identically.
- **It's not a probability** and it's not comparable across models or corpora.
- **Real scores cluster narrowly** — calibrate thresholds on your own data.
- **Match the metric to how the model was trained.**
