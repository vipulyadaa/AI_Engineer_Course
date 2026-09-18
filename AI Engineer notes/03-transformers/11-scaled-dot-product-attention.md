# Scaled Dot-Product Attention

> **Phase 03 · TRANSFORMERS · Topic 11**

## 1. Definition

The specific attention formulation used in transformers:

```
Attention(Q, K, V) = softmax( Q·Kᵀ / √d_k ) · V
```

"Dot-product" because compatibility is measured by dot product; "scaled" because of the `√d_k` division.

## 2. Simple Explanation

It's the complete attention operation in one line, and every term earns its place.

The dot product measures compatibility. The division keeps softmax from saturating. The softmax turns scores into a distribution. The multiplication by V produces the weighted blend.

## 3. How It Works

```
Q: (n × d_k)    K: (n × d_k)    V: (n × d_v)

Q·Kᵀ           → (n × n)     every query against every key
/ √d_k         → (n × n)     variance control
+ mask         → (n × n)     -∞ where disallowed
softmax(dim=-1)→ (n × n)     each row sums to 1
· V            → (n × d_v)   weighted sum of values
```

**Why dot product rather than the alternative:**

```
Additive attention (Bahdanau, 2014):
  score = vᵀ · tanh(W_q·q + W_k·k)
  → a small neural network per pair. Expressive, slow.

Dot-product attention:
  score = q · k
  → one matrix multiply for ALL pairs.

The 2017 paper notes both perform similarly, but dot-product is
"much faster and more space-efficient in practice, since it can
be implemented using highly optimized matrix multiplication code."

That's the whole argument: same quality, vastly better hardware fit.
```

## 4. Practical Example

**A complete implementation:**

```python
import torch, math

def scaled_dot_product_attention(Q, K, V, mask=None):
    # Q,K: (..., n, d_k)   V: (..., n, d_v)
    d_k = Q.size(-1)

    scores = Q @ K.transpose(-2, -1) / math.sqrt(d_k)   # (..., n, n)

    if mask is not None:
        scores = scores.masked_fill(mask == 0, float("-inf"))

    weights = torch.softmax(scores, dim=-1)             # rows sum to 1
    return weights @ V, weights
```

**The causal mask:**

```python
n = seq_len
causal = torch.tril(torch.ones(n, n))    # lower triangular
# row i has 1s in columns 0..i, 0s after → position i can't see the future
```

**Numerical stability, which library implementations handle:**

```
softmax subtracts the row max before exponentiating:
  softmax(x) = exp(x - max(x)) / Σ exp(x - max(x))

Without it, exp(28.4) overflows in FP16. Mathematically identical,
numerically essential.
```

## 5. Why It Matters

- **It's the one formula to know cold** for a transformers interview.
- **The dot-product-vs-additive argument** is a clean example of hardware shaping architecture.
- **Every term is defensible**, which makes it a good vehicle for showing depth.

## 6. Trade-offs / Failure Modes

| Component | If you get it wrong |
|---|---|
| **Missing `/√d_k`** | Softmax saturates; gradients vanish; training fails |
| **Mask applied after softmax** | Normalization broken; output scaled down |
| **Softmax on the wrong dimension** | Must be over keys (last dim), not queries |
| **No max subtraction** | Overflow in FP16 |
| **Materializing the n×n matrix** | Memory bottleneck at long sequence lengths |

**On the softmax dimension:** it must normalize over the key axis, so each *query's* weights sum to one. Softmaxing over the query axis instead is a real bug that produces plausible-looking but wrong behavior — worth knowing because it's easy to get backwards when implementing from scratch.

**On FlashAttention:** it computes this exact function without ever materializing the n×n matrix, by tiling the computation to fit in on-chip SRAM and using an online softmax that updates running maxima and sums. Identical output, much lower memory traffic, substantially faster in practice.

## 7. Interview Answer

> "Scaled dot-product attention is `softmax(Q·Kᵀ / √d_k) · V`, and every term earns its place.
>
> `Q·Kᵀ` gives an n-by-n matrix of compatibility scores — every query against every key. Dividing by root-d_k controls the variance, because dot-product variance grows with dimension and unscaled scores saturate the softmax into a near-argmax with vanishing gradients. The softmax normalizes each row into a distribution over keys. And multiplying by V produces the weighted blend of value vectors.
>
> Two implementation details that are easy to get wrong. The mask has to be applied before softmax, by setting disallowed scores to negative infinity — masking after softmax breaks the normalization so the output is systematically scaled down. And the softmax has to be over the key axis, so each query's weights sum to one; softmaxing over the query axis is a real bug that produces plausible but wrong behavior.
>
> On why dot product rather than additive attention: the original Bahdanau formulation used a small neural network per pair, which is more expressive. The 2017 paper found both perform similarly but dot-product is much faster because it's a single matrix multiply for all pairs, implementable with highly optimized GEMM kernels. That's a clean case of hardware shaping architecture — same quality, vastly better fit for GPUs.
>
> And FlashAttention computes this exact function without materializing the n-by-n matrix, by tiling into on-chip SRAM with an online softmax that maintains running maxima and sums. Identical output, far less memory traffic."

## 8. Likely Follow-ups

**Q: Why dot-product rather than additive attention?**
Additive attention uses a small network per query-key pair, which is more expressive. The 2017 paper found comparable quality but noted dot-product is far faster and more memory-efficient because it's one matrix multiply for all pairs, using highly optimized GEMM routines. Hardware fit decided it.

**Q: What breaks without the scaling?**
Dot-product variance scales with dimension, so at realistic d_k unscaled scores span a wide range and softmax saturates into a near-one-hot distribution. The gradient through a saturated softmax is approximately zero, so learning stalls. The division keeps scores in a range where softmax remains differentiable in a useful way.

**Q: Which dimension does the softmax operate over?**
The key dimension — the last axis — so each query's attention weights sum to one across all keys. Applying it over the query axis instead is a real implementation bug that produces output that looks reasonable and is wrong.

**Q: How do you implement causal masking?**
Build a lower-triangular matrix of ones, and use it to set disallowed positions to negative infinity in the score matrix before softmax. Row i then has valid scores in columns 0 through i and negative infinity after, so position i can't attend to future positions.

**Q: What does FlashAttention change about this formula?**
Nothing mathematically — it computes the identical function. It changes how: tiling the computation so blocks fit in fast on-chip SRAM, and using an online softmax that maintains running maxima and normalizers so the full n×n matrix is never written to slower memory. The result is the same, the memory traffic is far lower, and it's substantially faster.

## 9. Common Mistakes

- Omitting the `/√d_k` or not being able to justify it numerically.
- Applying the mask after softmax.
- Softmaxing over the wrong dimension.
- Forgetting the max-subtraction for numerical stability.
- Claiming FlashAttention changes the asymptotic complexity.

## 10. What to Remember

- **`softmax(Q·Kᵀ / √d_k) · V`** — know it cold, and be able to defend every term.
- **Mask to −∞ before softmax**, never after.
- **Softmax over the key axis** — each query's weights sum to 1.
- **Dot-product beat additive on hardware fit**, not on quality.
- **FlashAttention computes it identically** without materializing the n×n matrix.
