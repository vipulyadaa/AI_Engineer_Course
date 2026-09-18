# Euclidean Distance (L2)

> **Phase 06 · EMBEDDINGS · Topic 07**

## 1. Definition

Straight-line distance between two points: `√Σ(aᵢ − bᵢ)²`. Unlike cosine, it accounts for magnitude — but on unit-normalized vectors it produces the same ranking as cosine.

## 2. Simple Explanation

Cosine asks "do these point the same way?" Euclidean asks "how far apart are these points?"

For unnormalized vectors those are different questions. For unit-normalized vectors — which most embedding models produce — they give the same ordering, which makes the choice mostly a matter of what the database implements efficiently.

## 3. How It Works

```
L2(A, B) = √Σ(aᵢ − bᵢ)²
```

**The relationship on unit vectors, which is the key fact:**

```
For |A| = |B| = 1:

  L2² = |A|² + |B|² − 2(A·B)
      = 1 + 1 − 2·cos(A,B)
      = 2 − 2·cos(A,B)

So L2 is a strictly DECREASING function of cosine.
Larger cosine ⟺ smaller L2 ⟺ same ranking.

Cosine ∈ [-1, 1]  ⟷  L2 ∈ [0, 2]
```

**Direction convention differs, which is a real source of bugs:**

| | Better means |
|---|---|
| Cosine similarity | **Higher** |
| Euclidean distance | **Lower** |

Sorting the wrong way returns the *least* similar results — and the symptom is retrieval that looks completely broken rather than subtly degraded, which at least makes it easy to spot.

## 4. Practical Example

**When the choice actually matters:**

```
UNNORMALIZED vectors:

  A = [3, 4]      |A| = 5
  B = [6, 8]      |B| = 10     ← same direction, twice as long

  cosine(A,B) = 1.0        → identical in meaning
  L2(A,B)     = 5.0        → "far apart"

If magnitude is noise — document length, term repetition —
cosine is correct and L2 is misleading.
If magnitude carries signal, L2 captures something cosine discards.

For text embeddings, magnitude is usually noise → cosine.
```

**What vector databases expose:**

```
Most support: cosine, dot product ("inner product"), L2.

If your vectors are normalized, pick whichever is fastest —
often inner product, since it skips the normalization division.

If they aren't normalized, normalize them at ingestion
and then the choice stops mattering. That's usually the
cleanest resolution.
```

**Where L2 genuinely appears:**

```
· Non-text embeddings where magnitude is meaningful
· Some ANN index implementations optimized for L2 internally
· Clustering algorithms (k-means minimizes squared L2)

For text retrieval with normalized embeddings, it's an
implementation detail rather than a modeling choice.
```

## 5. Why It Matters

- **The "same ranking on normalized vectors" fact** is the substantive answer, not a list of formulas.
- **The direction convention** is a real bug source worth flagging.
- **Normalizing at ingestion** makes the whole question disappear, which is the practical recommendation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Sorting direction** | L2 lower is better; cosine higher is better |
| **Unnormalized vectors** | Metrics diverge; L2 penalizes magnitude differences |
| **Metric/model mismatch** | Using L2 on a cosine-trained model without normalizing |
| **Threshold direction** | An L2 threshold is an upper bound, not a lower one |
| **Assuming equivalence without normalization** | They only coincide for unit vectors |

**On thresholding:** if you switch from cosine to L2, every threshold inverts — "keep results above 0.7 cosine" becomes "keep results below roughly 0.77 L2." Getting that backwards silently keeps the worst results instead of the best.

**On the practical recommendation:** normalize vectors at ingestion. Then cosine, dot product, and L2 all agree, the metric choice becomes a performance question, and the class of bugs around magnitude and direction disappears.

## 7. Interview Answer

> "Euclidean distance is straight-line distance between two points. Cosine asks whether vectors point the same way; Euclidean asks how far apart they are.
>
> The key fact is that on unit-normalized vectors they're equivalent for ranking. L2 squared equals two minus two times cosine, so L2 is a strictly decreasing function of cosine — larger cosine means smaller L2, and the ordering is identical. Since most embedding models output normalized vectors, the metric choice is usually a performance question rather than a modeling one.
>
> The convention difference is a real bug source though. Higher cosine is better; lower L2 is better. Sorting the wrong way returns the least similar results — and every threshold inverts too, so 'keep above 0.7 cosine' becomes 'keep below roughly 0.77 L2.' Getting that backwards silently keeps the worst results instead of the best.
>
> Where the choice genuinely matters is unnormalized vectors. Take vectors [3,4] and [6,8] — same direction, one twice as long. Cosine says they're identical in meaning; L2 says they're five units apart. For text embeddings, magnitude usually reflects things you don't care about like document length, so cosine is correct and L2 would be misleading.
>
> My practical recommendation is to normalize at ingestion. Then all three metrics agree, the choice becomes purely about which the database implements fastest — often inner product since it skips a division — and the whole class of magnitude and direction bugs disappears.
>
> L2 does genuinely appear in clustering, since k-means minimizes squared Euclidean distance, and in some ANN implementations that optimize for it internally. But for text retrieval with normalized embeddings, it's an implementation detail rather than a modeling decision."

## 8. Likely Follow-ups

**Q: Cosine or Euclidean for embeddings?**
On unit-normalized vectors they rank identically, so pick whichever the database implements most efficiently. If vectors aren't normalized, cosine is typically right for text because magnitude reflects length rather than meaning. The cleanest answer is to normalize at ingestion so the question stops mattering.

**Q: What's the mathematical relationship?**
For unit vectors, L2 squared equals 2 minus 2 times cosine. So L2 is a strictly decreasing function of cosine — they're monotonically related, which means identical rankings. Cosine ranges over [-1,1] while the corresponding L2 ranges over [0,2].

**Q: What's the common bug?**
Sorting direction. Higher cosine is better; lower L2 is better. Getting it backwards returns the least similar results, which at least fails loudly. The subtler version is thresholds — switching metrics inverts them, so a cosine lower-bound becomes an L2 upper-bound, and reversing that silently keeps the worst results.

**Q: When does magnitude carry signal?**
Rarely for text embeddings, where it typically reflects length or term repetition. It can matter for other embedding types — some non-text representations encode confidence or intensity in magnitude. For text retrieval, discarding magnitude via cosine is almost always what you want.

**Q: Where is L2 genuinely the right choice?**
Clustering, since k-means minimizes squared Euclidean distance by construction. Some ANN index implementations optimized for L2 internally. And any embedding space where magnitude is meaningful rather than incidental. For text retrieval with normalized vectors it's an implementation detail.

## 9. Common Mistakes

- Sorting L2 in the wrong direction.
- Not inverting thresholds when switching metrics.
- Using L2 on unnormalized vectors trained with a cosine objective.
- Assuming equivalence without checking that vectors are normalized.
- Treating the metric choice as a modeling decision when vectors are normalized.

## 10. What to Remember

- **On unit vectors, `L2² = 2 − 2·cos`** — strictly monotonic, so identical rankings.
- **Direction convention differs:** higher cosine is better, lower L2 is better.
- **Thresholds invert** when you switch metrics — a common silent bug.
- **Normalize at ingestion** and the whole question becomes a performance detail.
- **L2 is genuinely right for clustering** and for spaces where magnitude is meaningful.
