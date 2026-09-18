# Dot Product

> **Phase 06 · EMBEDDINGS · Topic 08**

## 1. Definition

The sum of element-wise products: `A·B = Σ aᵢbᵢ`. On unit-normalized vectors it equals cosine similarity exactly; on unnormalized vectors it incorporates magnitude, which introduces a length bias.

## 2. Simple Explanation

The dot product is cosine's numerator. Cosine divides it by the magnitudes; dot product doesn't.

So if vectors are already unit length, the division is by 1 and the two are identical — which is why "inner product" is often the fastest option in a vector database. It's cosine without the redundant normalization step.

## 3. How It Works

```
A · B = Σ aᵢbᵢ

cos(A,B) = (A·B) / (|A|·|B|)

If |A| = |B| = 1:   cos(A,B) = A·B
```

**Why it's the fastest option:**

```
Dot product:  one multiply-accumulate per dimension
Cosine:       the same, plus two norm computations and a division

If vectors are pre-normalized at ingestion, the norms are 1
and the division is wasted work. Most vector databases expose
this as "inner product" or "dot" specifically so you can skip it.
```

**The magnitude bias on unnormalized vectors:**

```
A = [1, 0]     |A| = 1
B = [10, 0]    |B| = 10    ← same direction, ten times longer

cosine(A,B)     = 1.0      → identical in meaning
dot product(A,B) = 10      → B scores ten times higher

On unnormalized embeddings, dot product systematically
favours longer vectors — which for text usually correlates
with longer documents. That's a length bias, and it's
usually unwanted.
```

## 4. Practical Example

**The normalize-at-ingestion pattern:**

```python
import numpy as np

def normalize(v):
    return v / np.linalg.norm(v)

# At ingestion — do it ONCE
chunk_vectors = np.array([normalize(embed(c)) for c in chunks])

# At query time — dot product IS cosine now
query_vec = normalize(embed(question))
scores = chunk_vectors @ query_vec        # one matmul
```

**Why this is the right default:**

```
· cosine, dot product, and L2 all agree → metric choice
  becomes purely a performance question
· the fastest option (dot product) is now also correct
· the magnitude-bias bug class disappears
· threshold semantics are consistent

Most embedding APIs return normalized vectors already —
but verify rather than assume, because some don't.
```

**Where the magnitude bias is actually wanted:**

```
Some recommendation systems deliberately use unnormalized
dot product so that "popular" or "confident" items — which
have larger magnitudes by construction — rank higher.

That's a deliberate design choice, not an accident. For text
retrieval it almost never is.
```

## 5. Why It Matters

- **It's the fastest metric**, and on normalized vectors it's also exactly correct.
- **The magnitude bias** is the one real behavioral difference, and it's usually unwanted for text.
- **Normalizing at ingestion** resolves the entire metric question, which is the practical takeaway.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unnormalized vectors** | Systematic bias toward longer documents |
| **Assuming vectors are normalized** | Most APIs normalize; some don't — verify |
| **Unbounded range** | Unlike cosine's [-1,1], dot product has no fixed range, so thresholds are harder to reason about |
| **Mixing normalized and unnormalized** | In one index, scores become incomparable |
| **Metric/model mismatch** | Using dot product when the model wasn't trained for it |

**On the unbounded range:** cosine is always in [-1, 1], which makes thresholds interpretable across a corpus. Unnormalized dot product has no bound, so a threshold of "5.0" means nothing without knowing the magnitude distribution. That's another argument for normalizing — it restores the bounded, interpretable range.

**On verification:** don't assume an embedding API returns normalized vectors. Compute the norm of a sample; if it isn't 1.0, normalize explicitly. Getting this wrong means a length bias you didn't intend and won't notice, because it degrades ranking rather than breaking it.

## 7. Interview Answer

> "The dot product is the sum of element-wise products — it's cosine's numerator. Cosine divides it by the magnitudes; dot product doesn't.
>
> So on unit-normalized vectors they're identical, because the division is by one. That's why most vector databases expose 'inner product' as a metric: it's cosine without the redundant normalization step, so it's the fastest option and, on normalized vectors, also exactly correct.
>
> The one real behavioral difference is on unnormalized vectors, where dot product incorporates magnitude. Take [1,0] and [10,0] — same direction, one ten times longer. Cosine says they're identical in meaning; dot product scores the longer one ten times higher. For text embeddings, magnitude usually correlates with document length, so that's a length bias and it's almost always unwanted.
>
> My practical recommendation is to normalize at ingestion, once. Then cosine, dot product, and L2 all agree, the fastest metric is also the correct one, the magnitude-bias bug class disappears, and threshold semantics stay consistent. It resolves the entire metric question.
>
> One thing I'd verify rather than assume: most embedding APIs return normalized vectors, but not all do. I'd compute the norm on a sample — if it isn't one, normalize explicitly. Getting that wrong gives you a length bias you didn't intend and won't notice, because it degrades ranking rather than breaking it outright.
>
> There's also a range argument. Cosine is bounded in minus-one to one, which makes thresholds interpretable. Unnormalized dot product is unbounded, so a threshold of 5.0 means nothing without knowing the magnitude distribution of your corpus.
>
> The one place the magnitude bias is deliberately wanted is some recommendation systems, where popular or high-confidence items have larger magnitudes by construction and you *want* them ranked higher. For text retrieval it essentially never is."

## 8. Likely Follow-ups

**Q: When is dot product the same as cosine?**
When vectors are unit-normalized — cosine's denominator becomes 1, so the two are identical. Since most embedding models output normalized vectors, they usually coincide in practice, which is why "inner product" is offered as the fast equivalent.

**Q: Why is dot product faster?**
Because it's one multiply-accumulate per dimension with nothing else. Cosine adds two norm computations and a division. If vectors are pre-normalized, those norms are 1 and the extra work is wasted — so skipping it via inner product is free speed.

**Q: What's the problem with unnormalized vectors?**
Dot product incorporates magnitude, so longer vectors score higher regardless of direction. For text embeddings, magnitude usually correlates with document length, so you get a systematic bias toward longer documents. It degrades ranking rather than breaking it, which makes it hard to notice.

**Q: How do you avoid this?**
Normalize at ingestion, once. Then all three metrics agree, the fastest one is correct, and the bug class disappears. I'd also verify rather than assume the API normalizes — compute the norm on a sample and check it's 1.0, because some providers don't.

**Q: Is the magnitude bias ever useful?**
In some recommendation systems, deliberately. Items that are popular or that the model is confident about can have larger magnitudes by construction, and ranking those higher is the intent. That's a design choice rather than an accident. For text retrieval, where magnitude tracks document length, it essentially never is.

## 9. Common Mistakes

- Assuming an embedding API returns normalized vectors without checking.
- Using dot product on unnormalized vectors and inheriting a length bias.
- Setting a threshold on unbounded dot-product scores.
- Mixing normalized and unnormalized vectors in one index.
- Treating the metric choice as consequential when vectors are normalized.

## 10. What to Remember

- **`A·B = Σaᵢbᵢ`** — cosine's numerator, without the division.
- **On unit vectors, dot product IS cosine** — and it's the faster option.
- **On unnormalized vectors it favours longer documents** — a usually-unwanted length bias.
- **Normalize at ingestion** and the entire metric question becomes a performance detail.
- **Verify normalization** — most APIs do it, not all, and the failure is silent.
