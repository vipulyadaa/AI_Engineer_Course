# Self-Attention

> **Phase 03 · TRANSFORMERS · Topic 06**

## 1. Definition

The mechanism where each position in a sequence computes a weighted sum of all positions, with weights derived from how relevant each position is to it. "Self" because the sequence attends to itself.

## 2. Simple Explanation

Every word asks every other word: *how relevant are you to me?* Then it builds its new representation as a weighted blend of the answers.

```
"the bank charged a fee"

When processing "bank":
  attend strongly to → "charged", "fee"   (financial context)
  attend weakly to   → "the", "a"

"bank" now means "financial institution" in this representation,
because that's what its neighbours told it.
```

## 3. How It Works

**Three projections of the same input:**

```
Q = X·W_Q    queries   — "what am I looking for?"
K = X·W_K    keys      — "what do I offer?"
V = X·W_V    values    — "what do I actually contribute?"
```

**Then:**

```
                  Q·Kᵀ
Attention = softmax( ──── ) · V
                     √d_k
```

1. **`Q·Kᵀ`** — dot product of every query with every key → an n×n score matrix.
2. **`/√d_k`** — scale down, or large dot products push softmax into saturation and gradients vanish.
3. **`softmax`** — normalize each row to weights summing to 1.
4. **`· V`** — weighted sum of values.

**The Q/K/V separation matters:** without it, a token's "what I'm looking for" and "what I offer" would be the same vector, and attention would collapse toward self-similarity. Separate projections let a token seek something different from what it advertises.

## 4. Practical Example

**Worked, with small numbers:**

```
3 tokens, d_k = 4.

Q·Kᵀ scores for token 2 against all tokens:
   [2.1, 5.8, 1.3]

Scale by √4 = 2:
   [1.05, 2.90, 0.65]

Softmax:
   [0.12, 0.76, 0.12]

Output for token 2 = 0.12·V₁ + 0.76·V₂ + 0.12·V₃
                     ↑ mostly itself, some context
```

**Why the √d_k scaling is not optional:**

```
Without scaling, at d_k = 128 the dot products have variance ∝ d_k,
so scores spread widely — say [12, 47, 8].

softmax([12, 47, 8]) ≈ [0.0000, 0.9999, 0.0000]

That's effectively a hard argmax. The gradient through softmax
is near zero everywhere, so the model can't learn.
Dividing by √d_k keeps scores in a range where softmax stays soft.
```

## 5. Why It Matters

- **It's the core operation of the entire architecture** — the thing "attention is all you need" refers to.
- **It's the most likely deep-dive question** in a transformers interview.
- **Its O(n²) cost is the origin** of context limits, long-context expense, and efficient-attention research.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **O(n²) compute and memory** | Doubling sequence length quadruples cost |
| **Permutation-invariant** | No order information — positional encoding is mandatory |
| **Attention maps ≠ explanations** | Suggestive, not faithful attributions |
| **Softmax forces a distribution** | Every position must attend somewhere, even with nothing relevant |
| **Single head is limited** | One attention pattern per layer — hence multi-head |

**On "attention as explanation":** attention weights are often presented as showing what the model "looked at." That's an overclaim — several papers have shown attention weights can be substantially altered without changing predictions. They're a useful diagnostic, not a faithful attribution.

**On efficient attention:** FlashAttention doesn't change the O(n²) math, it changes the memory access pattern — computing attention in tiles that fit in fast on-chip memory, avoiding materializing the full n×n matrix. Sparse and sliding-window attention *do* change the complexity by restricting which positions attend to which.

## 7. Interview Answer

> "Self-attention is where each position computes a weighted sum of all positions, with weights based on relevance. It's called self-attention because the sequence attends to itself.
>
> Mechanically: project the input three ways into queries, keys, and values. Queries are 'what am I looking for,' keys are 'what do I offer,' values are 'what do I contribute.' Take the dot product of every query with every key to get a score matrix, scale by the square root of the key dimension, softmax to get weights, and multiply by the values.
>
> The Q/K/V separation matters. Without it, what a token is looking for and what it advertises would be the same vector, and attention would collapse toward self-similarity. Separate projections let a token seek something different from what it offers.
>
> The square-root scaling isn't cosmetic. Dot-product variance grows with dimension, so at d_k of 128 unscaled scores might span 8 to 47 — and softmax of that is effectively a hard argmax with near-zero gradient everywhere. The model can't learn. Dividing by root-d_k keeps the softmax soft enough to produce useful gradients.
>
> The cost is quadratic in sequence length, because every position attends to every other — that n-by-n matrix is the origin of context-length limits and why long context is expensive. FlashAttention addresses the memory side by tiling the computation so the full matrix is never materialized, but it doesn't change the asymptotic cost; sparse and sliding-window patterns do.
>
> One thing I'd push back on: attention weights are often presented as explanations of what the model looked at. That's an overclaim — research has shown they can be substantially altered without changing predictions. They're a diagnostic, not a faithful attribution."

## 8. Likely Follow-ups

**Q: Why divide by √d_k?**
Because dot-product variance scales with dimension. At larger d_k, unscaled scores spread widely, and softmax over widely-spread values saturates into a near-one-hot distribution with vanishing gradients. Dividing by √d_k normalizes the variance so softmax stays in a regime where it produces useful gradients.

**Q: Why separate Q, K, and V rather than using the input directly?**
Because a token's "what I'm looking for" and "what I offer" are different things. With shared representations, attention scores would be dominated by self-similarity — each token attending mostly to itself. Separate learned projections let a token query for something it doesn't itself contain.

**Q: Why is attention O(n²)?**
Because the score matrix is every query against every key — n×n entries. That's both the compute for the matrix multiply and the memory to hold it. For 1,000 tokens that's a million scores; for 10,000, a hundred million. It's the fundamental scaling constraint on context length.

**Q: Do attention weights explain the model's reasoning?**
Not reliably. They show which positions contributed weight to a representation, but research has demonstrated that attention distributions can be substantially modified without changing model outputs, which means they're not a faithful attribution. They're useful for debugging and intuition, but presenting them as explanations is an overclaim.

**Q: What does FlashAttention change?**
The memory access pattern, not the math. It computes attention in tiles sized to fit in fast on-chip SRAM, so the full n×n matrix is never written to slower high-bandwidth memory. That's a large practical speedup and memory saving with identical results. Sparse and sliding-window attention are different — they change which positions attend to which, so they genuinely reduce complexity at some cost to modeling.

## 9. Common Mistakes

- Forgetting the √d_k scaling or not being able to explain why it's there.
- Not being able to say what Q, K, and V each represent.
- Presenting attention weights as faithful explanations.
- Saying FlashAttention makes attention sub-quadratic — it doesn't.
- Forgetting that attention is permutation-invariant without positional encoding.

## 10. What to Remember

- **`softmax(QKᵀ/√d_k)·V`** — memorize it and be able to explain each term.
- **Q = what I seek, K = what I offer, V = what I contribute.** Separate projections prevent self-similarity collapse.
- **√d_k scaling prevents softmax saturation** and vanishing gradients.
- **O(n²)** — the origin of context limits and long-context cost.
- **Attention weights are a diagnostic, not an explanation.**
