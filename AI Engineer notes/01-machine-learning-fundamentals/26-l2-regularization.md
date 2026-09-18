# L2 Regularization (Ridge / Weight Decay)

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 26**

## 1. Definition

Regularization that penalizes the **sum of squared weights**: `λ · Σθⱼ²`. It shrinks all weights smoothly toward zero without eliminating any. This is the default regularizer in most models, including every transformer.

## 2. Simple Explanation

L2 tells the model to keep its weights small.

Large weights mean the model reacts sharply to small input changes — that's a model fitting noise. By penalizing squared magnitude, L2 favours smoother, gentler functions that are less likely to have contorted themselves around individual training points.

Unlike [L1](25-l1-regularization.md), nothing gets eliminated. Everything shrinks, and the weakest features end up with small but non-zero coefficients.

## 3. How It Works

```
J(θ) = Loss  +  λ · Σⱼ θⱼ²

Gradient:  ∂J/∂θ = ∂Loss/∂θ + 2λθ

Update:    θ ← θ - η(∂Loss/∂θ + 2λθ)
             = θ(1 - 2ηλ) - η·∂Loss/∂θ
                └────────┘
             every step multiplies θ by a factor slightly under 1
             — this is why it's called "weight decay"
```

1. **The penalty gradient is `2λθ`** — proportional to the weight.
2. **Large weights are pushed hard; small weights barely at all.**
3. **So weights approach zero asymptotically** and never quite arrive — no sparsity.
4. **Correlated features share the weight** rather than one being arbitrarily eliminated, because spreading weight across several features gives a lower squared sum than concentrating it in one.

That last point is the practical reason L2 is the safer default.

## 4. Practical Example

**Why L2 spreads weight across correlated features** — worth understanding, not just memorizing:

```
Two identical features, total effect needs to sum to 10.

Concentrated:  θ = (10, 0)   →  penalty = 100 + 0  = 100
Spread:        θ = (5, 5)    →  penalty =  25 + 25 =  50   ← lower

Squaring makes concentration expensive, so L2 prefers to distribute.
L1's penalty is |10|+|0| = 10 and |5|+|5| = 10 — identical, so L1
has no preference and picks arbitrarily.
```

**Weight decay in transformers:** every LLM you use was trained with it, typically at 0.01–0.1, using **AdamW** rather than Adam. That distinction matters — see follow-ups.

## 5. Why It Matters

- **It's the default regularizer** for linear models, neural networks, and transformers.
- **It handles correlated features gracefully**, which is most real tabular data.
- **It gives stable, reproducible coefficients** — unlike L1, whose feature selection can flip between samples.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No sparsity** | Every feature stays in the model. Use L1 or Elastic Net if you need a short list |
| **Requires feature scaling** | The penalty applies to raw coefficient magnitudes, so unscaled features are regularized unevenly |
| **Over-regularizing → underfitting** | λ too high suppresses genuine signal; check both train and validation metrics |
| **Adam + L2 ≠ AdamW** | Under adaptive optimizers, L2-in-the-loss and true weight decay diverge. Use AdamW for transformers |
| **Bias term** | The intercept shouldn't be penalized — most libraries exclude it, but verify |

**Typical λ values as a starting point:** ~0.0001–1.0 for linear models (tune on a log scale); 0.01–0.1 weight decay for transformers.

## 7. Interview Answer

> "L2 regularization penalizes the sum of squared weights, which shrinks all of them smoothly toward zero without eliminating any. It's the default regularizer in most models, including every transformer, where it's called weight decay.
>
> The mechanism is that the penalty gradient is proportional to the weight — two lambda theta. So large weights get pushed hard and small ones barely at all, which means weights approach zero asymptotically but never reach it. That's the structural difference from L1, whose constant gradient produces exact zeros.
>
> The property I find most useful in practice is how it handles correlated features. Because the penalty is squared, spreading weight across two correlated features costs less than concentrating it in one — twenty-five plus twenty-five beats one hundred. So L2 distributes weight sensibly, whereas L1 is indifferent between those and picks arbitrarily. That makes L2 both the safer default and the one with more stable, reproducible coefficients.
>
> Two practical notes. Standardize features first, or the penalty is applied unevenly based on units. And for transformers use AdamW rather than Adam with an L2 term — under adaptive optimizers those aren't equivalent, because the L2 gradient gets rescaled by Adam's per-parameter adaptation. Decoupling the decay is exactly why AdamW exists."

## 8. Likely Follow-ups

**Q: L2 vs. L1 — the core difference?**
The gradient. L2's is proportional to the weight, so the push weakens as the weight shrinks and it converges toward zero asymptotically — no sparsity. L1's is a constant, so weights are pushed to exactly zero and held there — sparsity and feature selection. Practically: L2 for stability and correlated features, L1 when you specifically want a short feature list.

**Q: Why is it called weight decay?**
Because you can rewrite the update as `θ ← θ(1 - 2ηλ) - η·∂Loss/∂θ`. Every step multiplies the weight by a factor slightly less than one before applying the data gradient — so absent any signal, weights decay exponentially toward zero. It's the same thing viewed from the update rule rather than the loss.

**Q: Adam vs. AdamW?**
Adding L2 to the loss means the penalty gradient flows through Adam's per-parameter adaptive scaling, so the effective decay differs per parameter depending on its gradient history — which isn't the intended behavior. AdamW decouples weight decay and applies it directly to the weights after the adaptive step. It's the standard for transformer training and the difference is not cosmetic.

**Q: Should you regularize the bias term?**
Generally no. The bias sets the model's baseline output and penalizing it shifts predictions for no good reason — it doesn't contribute to the model's sensitivity to inputs, which is what you're trying to constrain. Most libraries exclude it by default, but in a hand-rolled implementation it's worth checking.

**Q: How do you choose λ?**
Log-scale search on validation, across several orders of magnitude. With small data use cross-validation to reduce selection noise. Watch both training and validation metrics across the sweep — if both degrade at high λ, that's over-regularization producing underfitting, not a better-constrained model.

## 9. Common Mistakes

- Not standardizing features before applying the penalty.
- Expecting L2 to zero out features — it shrinks, it doesn't eliminate.
- Using Adam with an L2 loss term for transformers instead of AdamW.
- Regularizing the bias term.
- Setting λ as a constant instead of tuning it on validation.

## 10. What to Remember

- **Penalizes `Σθ²` → smooth shrinkage → no sparsity.** The default regularizer.
- **Gradient `2λθ` is proportional**, so the push weakens near zero — that's why no exact zeros.
- **Handles correlated features well** by spreading weight, since squaring makes concentration expensive.
- **"Weight decay" is the same thing** seen from the update rule: `θ ← θ(1-2ηλ) - η∇Loss`.
- **Use AdamW for transformers**, not Adam plus L2 — they're not equivalent.
