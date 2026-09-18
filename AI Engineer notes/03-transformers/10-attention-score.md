# Attention Score

> **Phase 03 · TRANSFORMERS · Topic 10**

## 1. Definition

The raw compatibility value between a query and a key — `qᵢ · kⱼ` — before scaling and softmax. After scaling and normalization it becomes an **attention weight**: how much position `j` contributes to position `i`'s output.

## 2. Simple Explanation

A score answers "how relevant is token j to token i?"

It's a dot product, so it's large when the query and key vectors point in similar directions. Every query against every key gives you an n×n grid of these, which then gets turned into weights.

## 3. How It Works

```
1. raw score      Sᵢⱼ = qᵢ · kⱼ                 (unbounded, any real number)
2. scale          Sᵢⱼ / √d_k                    (control the variance)
3. mask           + (-∞) where not allowed      (causal, padding)
4. normalize      softmax over j                 (row sums to 1)
                  ↓
   attention weight Aᵢⱼ ∈ [0,1]
```

**Score vs. weight — the distinction to be precise about:**

| | Range | Meaning |
|---|---|---|
| **Score** | Any real number | Raw dot-product compatibility |
| **Weight** | [0, 1], row sums to 1 | Normalized contribution |

**Masking works by setting scores to -∞ before softmax**, because `exp(-∞) = 0`. That's how causal masking and padding masking are implemented — not by zeroing weights afterwards, which would break the normalization.

## 4. Practical Example

**Worked, showing each step:**

```
d_k = 64, so √d_k = 8.
Query for "charged", keys for ["the", "bank", "charged", "a", "fee"]

raw scores:      [ 3.2,  28.4,  19.1,  2.8,  22.6 ]
scaled (/8):     [ 0.40,  3.55,  2.39, 0.35,  2.83 ]
causal mask:     [ 0.40,  3.55,  2.39,  -∞,   -∞  ]   ← positions after "charged"
softmax:         [ 0.03,  0.71,  0.26, 0.00, 0.00 ]

"charged" attends 71% to "bank", 26% to itself.
```

**Why masking must happen before softmax:**

```
❌ softmax first, then zero out:
     softmax([0.40, 3.55, 2.39, 0.35, 2.83])
       = [0.02, 0.45, 0.14, 0.02, 0.37]
     zero the last two → [0.02, 0.45, 0.14, 0, 0]
     Sum = 0.61, not 1. The weights no longer form a distribution,
     and the output is systematically scaled down.

✅ mask to -∞, then softmax:
     Sum = 1.0. Correct distribution over allowed positions.
```

**Why the scaling matters, numerically:**

```
Unscaled at d_k = 64: raw scores span roughly ±30.
  softmax([3.2, 28.4, 19.1]) ≈ [0.0000, 0.9999, 0.0001]
  → effectively argmax; gradient ≈ 0 everywhere; no learning.

Scaled: scores span roughly ±4. Softmax stays soft,
  gradients are informative.
```

## 5. Why It Matters

- **The score → weight pipeline is the mechanical core** of attention, and the masking-before-softmax detail is a common precision check.
- **It explains why scaling exists** in concrete numerical terms rather than as a formula to memorize.
- **The n×n score matrix is the O(n²) cost** — this is where the quadratic scaling physically lives.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Masking after softmax** | Breaks normalization; output systematically scaled down |
| **No scaling** | Softmax saturates; gradients vanish |
| **The n×n matrix is the memory cost** | FlashAttention avoids materializing it |
| **Scores aren't explanations** | High weight ≠ causal contribution |
| **Softmax forces a full distribution** | Attention must go somewhere, hence attention sinks |

**On FlashAttention:** the n×n score matrix is the memory bottleneck — for 8,000 tokens that's 64 million floats per head per layer. FlashAttention computes attention in tiles sized to fit in fast on-chip memory, never materializing the full matrix. The math is identical; the memory traffic is dramatically lower.

**On numerical stability:** softmax implementations subtract the row maximum before exponentiating, since `exp(28.4)` overflows in FP16. That's standard in every library but worth knowing if asked about stability.

## 7. Interview Answer

> "The attention score is the raw dot product between a query and a key — how compatible they are. After scaling by root-d_k, masking, and softmax, it becomes an attention weight: how much that position contributes to the output.
>
> The distinction matters. A score is any real number; a weight is in zero to one and each row sums to one.
>
> The detail I'd be precise about is that masking happens *before* softmax, by setting disallowed scores to negative infinity. That works because exp of negative infinity is zero. If you instead softmax first and zero the weights afterwards, the row no longer sums to one — so the output is systematically scaled down, which is a subtle and real bug.
>
> On the scaling: at d_k of 64, unscaled dot products span roughly plus or minus thirty. Softmax over that range is effectively an argmax — one weight near 1.0 and the rest near zero — and the gradient through a saturated softmax is approximately zero, so the model can't learn. Dividing by root-d_k compresses the range to roughly plus or minus four, where softmax stays soft and gradients are informative.
>
> The n-by-n score matrix is also where the quadratic cost physically lives. For eight thousand tokens that's sixty-four million floats per head per layer, and that memory is the bottleneck more than the compute. FlashAttention addresses exactly this — it computes attention in tiles that fit in fast on-chip memory, so the full matrix is never materialized. The math is identical; the memory traffic is far lower.
>
> One caution I'd add: attention weights are often shown as explanations of what the model looked at. Research has demonstrated they can be substantially altered without changing predictions, so they're a diagnostic, not a faithful attribution."

## 8. Likely Follow-ups

**Q: What's the difference between a score and a weight?**
The score is the raw dot product — unbounded, any real number. The weight is what you get after scaling, masking, and softmax — bounded in [0,1] with each row summing to one. The weight is what actually multiplies the value vectors.

**Q: Why mask before softmax rather than after?**
Because masking after softmax breaks normalization. If you zero out weights post-softmax, the remaining weights no longer sum to one, so the weighted sum of values is systematically scaled down. Setting scores to negative infinity before softmax gives exactly zero weight while keeping the remaining distribution correctly normalized.

**Q: What happens without the √d_k scaling?**
Dot-product variance grows with dimension, so scores spread widely — at d_k of 64 that's roughly plus or minus thirty. Softmax over that range is effectively a hard argmax with near-zero gradient everywhere, so the model can't learn. The scaling keeps the softmax in a regime where it produces useful gradients.

**Q: Where does the O(n²) cost actually live?**
In the score matrix — n×n entries, computed and held per head per layer. For long sequences that memory dominates. FlashAttention targets it by tiling the computation so the full matrix is never written to slower memory, which is a large practical win without changing the asymptotic complexity.

**Q: Do high attention weights mean the model relied on that token?**
Not reliably. Attention weights show which positions contributed to a weighted sum, but studies have shown the distribution can be substantially modified without changing model outputs — which means it isn't a faithful attribution. They're useful for debugging and intuition; presenting them as explanations overclaims.

## 9. Common Mistakes

- Masking after softmax instead of before.
- Not being able to explain the scaling numerically.
- Confusing scores with weights.
- Saying FlashAttention makes attention sub-quadratic.
- Presenting attention weights as faithful explanations.

## 10. What to Remember

- **Score = `qᵢ·kⱼ`, raw and unbounded. Weight = after `/√d_k`, mask, softmax.**
- **Mask to −∞ BEFORE softmax** — masking after breaks normalization.
- **Scaling prevents softmax saturation** — unscaled scores give near-zero gradients.
- **The n×n score matrix is where O(n²) lives**; FlashAttention avoids materializing it.
- **Weights are a diagnostic, not an explanation.**
