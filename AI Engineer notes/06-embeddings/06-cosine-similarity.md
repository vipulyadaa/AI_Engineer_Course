# Cosine Similarity (Embeddings View)

> **Phase 06 · EMBEDDINGS · Topic 06**

## 1. Definition

The cosine of the angle between two vectors — `A·B / (|A||B|)`. It measures directional agreement while ignoring magnitude, which is why it's the standard metric for embeddings.

## 2. Simple Explanation

Two vectors pointing the same direction are similar, regardless of their length.

That matters because embedding magnitude often reflects things you don't care about — document length, term repetition — while direction reflects meaning. Cosine strips the magnitude and keeps the meaning.

## 3. How It Works

```
                A · B            Σ aᵢbᵢ
cos(A,B) = ─────────── = ────────────────────────
             |A| · |B|    √(Σaᵢ²) · √(Σbᵢ²)
```

**The practical fact:** most embedding models output **unit-normalized** vectors (`|A| = 1`). When that holds:

```
cos(A, B) = A · B          ← just a dot product

And cosine, dot product, and Euclidean distance all produce
IDENTICAL rankings.

So the metric choice is largely irrelevant — as long as
vectors are normalized. If they aren't, the three diverge
and the choice matters.
```

## 4. Practical Example

**Typical score bands — model-specific, but the shape holds:**

```
0.85 - 1.00   near-duplicate or direct paraphrase
0.70 - 0.85   strongly relevant
0.55 - 0.70   topically related
0.40 - 0.55   loosely related
< 0.40        probably unrelated
```

**And the reason those bands don't transfer:**

```
Not comparable across models  — different spaces
Not comparable across corpora — depends on space density
Not probabilities             — 0.8 ≠ 80% relevant
Compressed in practice        — real scores cluster in a narrow
                                band, not spread over [-1, 1]

A 0.55 that sounds "medium" may be near the floor for your
corpus. Any threshold must be calibrated on your own data.
```

**Efficient batch search:**

```python
# chunk_matrix rows are unit-normalized, so cosine = dot product
scores = chunk_matrix @ query_vec        # one matmul, (n,)
top = np.argpartition(-scores, k)[:k]
return top[np.argsort(-scores[top])]
```

**Matching the metric to the model:** most embedding models are trained with a cosine objective and output normalized vectors. Using dot product on *unnormalized* vectors favours longer documents, which is occasionally wanted and usually not.

## 5. Why It Matters

- **It's the metric underlying every vector search** you'll build.
- **The normalization point** explains why metric choice is usually not a consequential decision.
- **The non-calibration point** is what prevents bad threshold decisions.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Treating it as a probability** | It's a geometric quantity |
| **Copying thresholds across systems** | Not comparable across models or corpora |
| **Assuming the full [-1,1] range** | Real scores cluster narrowly |
| **Metric/model mismatch** | Dot product on unnormalized vectors favours long documents |
| **Curse of dimensionality** | At high dimensions, pairwise similarities converge |
| **Reading small gaps as insignificant** | In a compressed range, small gaps are meaningful |

**On the compressed range:** because corpus documents share vocabulary and structure, and because high dimensionality concentrates distances, real similarities occupy a narrow band. A gap from 0.55 to 0.70 can be far more meaningful than the raw difference suggests — which is another reason thresholds need empirical calibration rather than intuition.

**On thresholding fused hybrid results:** you can't apply one cosine threshold to a list fused from BM25 and dense retrieval, because the underlying scores are on incomparable scales. Threshold per retriever before fusion, or on the reranker score after.

## 7. Interview Answer

> "Cosine similarity is the cosine of the angle between two vectors — dot product over the product of magnitudes. It measures directional agreement while ignoring magnitude, which is why it's standard for embeddings: direction encodes meaning, while magnitude often encodes things you don't care about like document length or term repetition.
>
> The practical fact worth knowing is that most embedding models output unit-normalized vectors. When that's true, cosine reduces to a plain dot product — and cosine, dot product, and Euclidean distance all produce identical rankings. So the metric choice is largely inconsequential as long as vectors are normalized. If they aren't, the three diverge and dot product starts favouring longer documents.
>
> The thing I'd be careful about is interpretation. A cosine of 0.8 isn't eighty percent relevant — it's a geometric quantity with no probabilistic meaning. And the distribution isn't comparable across models or corpora, because each model defines its own space and the density depends on the corpus.
>
> In practice real similarities cluster in a narrow band, maybe 0.3 to 0.9, because corpus documents share vocabulary and structure and because high dimensionality concentrates distances. So a score of 0.55 that sounds 'medium' may actually be near the floor for that corpus, and a gap from 0.55 to 0.70 can be far more meaningful than the raw difference suggests. That's why any threshold has to be calibrated empirically on your own data rather than copied or chosen by intuition.
>
> One practical note: you can't apply a single cosine threshold to a fused hybrid result list, because BM25 and cosine scores are on incomparable scales. Threshold per retriever before fusion, or on the reranker score afterwards — which is better calibrated anyway, since the reranker was trained to output a relevance judgment rather than a geometric distance."

## 8. Likely Follow-ups

**Q: Cosine, dot product, or Euclidean?**
If vectors are unit-normalized — which most embedding models produce — all three rank identically, so pick whichever the database implements most efficiently, usually dot product. If they aren't normalized, cosine is typically right because it ignores magnitude; dot product would favour longer documents and L2 would be affected by magnitude differences unrelated to meaning.

**Q: Is a cosine score a probability?**
No — it's the cosine of an angle, a geometric quantity with no probabilistic interpretation. You can't say 0.8 means 80% confidence. That's precisely why similarity thresholds have to be tuned empirically rather than set to an intuitive-sounding value.

**Q: Why do real scores cluster in a narrow range?**
Because corpus documents share vocabulary, structure, and domain, so their embeddings aren't spread uniformly through the space — and high dimensionality concentrates distances further. The consequence is that small gaps carry more meaning than they appear to, and intuitions about what "0.5" means are usually wrong.

**Q: Can you threshold fused hybrid results?**
Not with a single cosine threshold, because BM25 and cosine scores live on incomparable scales. Threshold each retriever separately before fusion, or apply the threshold to the reranker score afterwards. The reranker score is better calibrated anyway, since the model was trained to output a relevance judgment rather than a geometric distance.

**Q: What if magnitude carries signal?**
It occasionally does — some models produce larger magnitudes for more content-rich embeddings. If you specifically want that, use dot product on unnormalized vectors. In practice most modern models normalize precisely because magnitude is more often noise than signal for retrieval.

## 9. Common Mistakes

- Treating cosine as a probability or confidence.
- Copying a threshold from another system or model.
- Using dot product on unnormalized vectors without intending the length bias.
- Applying one threshold to fused hybrid results.
- Assuming the full [-1, 1] range is used in practice.

## 10. What to Remember

- **Angle between vectors; magnitude ignored.** Direction encodes meaning.
- **With normalized vectors, cosine = dot product** and all three metrics rank identically.
- **Not a probability, not comparable across models or corpora.**
- **Real scores cluster narrowly** — small gaps are meaningful; calibrate on your data.
- **Don't threshold fused hybrid scores** — per retriever, or on the reranker score.
