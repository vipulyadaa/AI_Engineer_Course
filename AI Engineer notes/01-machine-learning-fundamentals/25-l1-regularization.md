# L1 Regularization (Lasso)

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 25**

## 1. Definition

Regularization that penalizes the **sum of absolute weight values**: `λ · Σ|θⱼ|`. Its distinctive property is that it drives some weights to *exactly* zero, producing a sparse model that performs feature selection automatically.

## 2. Simple Explanation

L1 forces the model to choose. Rather than shrinking every weight a little, it eliminates the ones that don't earn their place — their coefficients become exactly zero and those features drop out of the model entirely.

That's the practical value: you get a shorter, more interpretable model, and a ranked answer to "which features actually matter?"

## 3. How It Works

```
J(θ) = Loss  +  λ · Σⱼ |θⱼ|
```

1. **The gradient of |θ| is constant** (±λ) regardless of how small θ is.
2. So a weight gets pushed toward zero by the **same amount** every step, no matter how close it already is.
3. Once it reaches zero, the penalty holds it there unless the data gradient is strong enough to overcome the constant push.
4. **Result: exact zeros.** Weak features are eliminated, not just shrunk.

**Contrast with L2:** the gradient of `θ²` is `2θ`, which shrinks proportionally — so as θ gets small the push gets weak, and it approaches zero asymptotically without arriving. That single difference is the whole distinction.

```
        L1 constraint (diamond)         L2 constraint (circle)
             ◆                                 ●
        Corners lie ON the axes.         Smooth — the optimum
        The optimum often lands          rarely lands exactly
        on a corner → weight = 0.        on an axis.
```

## 4. Practical Example

**Feature selection on a loan model with 200 candidate features:**

```
λ         non-zero features    val AUC
0.0001         198              0.842
0.001          134              0.845
0.01            38              0.851   ← best
0.05            12              0.834
0.1              4              0.791

At λ = 0.01: 38 features carry the signal. The other 162 are noise
or redundant. That's a model a compliance reviewer can actually read.
```

**Scaling is mandatory.** The penalty applies to raw coefficient magnitudes, so a feature measured in the thousands naturally gets a tiny coefficient and escapes the penalty, while a feature in [0,1] gets a large coefficient and is penalized hard. Without standardizing, L1 selects features based on their units rather than their usefulness.

## 5. Why It Matters

- **It's regularization and feature selection in one step**, rather than two.
- **Sparse models are cheaper and more auditable** — 38 features instead of 200 means less to compute, less to monitor, less to explain.
- **It gives you an evidence-based feature shortlist** for building a simpler production model.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Arbitrary choice among correlated features** | With two nearly identical features, L1 keeps one and zeroes the other, and which one is somewhat arbitrary. Rerun on a different sample and it may switch |
| **Unstable selection** | Related to the above — the selected feature set can vary across samples, which undermines "these are the important features" claims |
| **Not differentiable at zero** | Needs subgradient methods or coordinate descent; slower than L2's closed-form solutions |
| **Can underperform L2 predictively** | If all features carry a little signal, zeroing some loses information |
| **Requires scaling** | Otherwise the penalty is applied unevenly across features |

**When correlated features are a problem, use Elastic Net** — it combines L1 and L2 so correlated features are kept or dropped together rather than arbitrarily split.

## 7. Interview Answer

> "L1 regularization penalizes the sum of absolute weight values, and its distinguishing property is that it drives some weights to exactly zero rather than just shrinking them. So it performs feature selection as a side effect of regularizing.
>
> The mechanism is in the gradient. The derivative of the absolute value is a constant, so a weight gets pushed toward zero by the same amount every step regardless of how small it already is — and once it hits zero the penalty holds it there. L2's gradient is proportional to the weight, so the push weakens as the weight shrinks and it approaches zero without arriving. That one difference explains everything about how they behave.
>
> I'd use L1 when I have many features and suspect most are irrelevant, or when I need an interpretable short list — for a compliance review, going from two hundred features to thirty-eight matters a lot.
>
> Two caveats. With correlated features, L1 arbitrarily picks one and zeroes the other, and the choice can flip on a different sample — so I'd be careful claiming the selected set is *the* important features. Elastic Net handles that by combining both penalties. And I'd always standardize first, because the penalty applies to raw coefficient magnitudes, so without scaling L1 selects based on units rather than usefulness."

## 8. Likely Follow-ups

**Q: Why does L1 produce exact zeros but L2 doesn't?**
The gradient. For L1, `d|θ|/dθ` is a constant ±λ, so the push toward zero doesn't diminish as the weight shrinks — it reaches zero and stays. For L2, `dθ²/dθ = 2θ`, so the push is proportional to the weight and weakens as it approaches zero, converging asymptotically without ever arriving. Geometrically it's the diamond-versus-circle constraint region: the diamond's corners lie on the axes.

**Q: When would you prefer L2?**
When features are correlated, since L2 distributes weight among them instead of arbitrarily picking one. When all features carry some signal and zeroing any loses information. And when you want stable, reproducible coefficients — L2's are much less sensitive to the sample. L2 is the sensible default; L1 is for when you specifically want sparsity.

**Q: What's Elastic Net?**
A combination: `λ₁Σ|θ| + λ₂Σθ²`. You get L1's sparsity with L2's graceful handling of correlated features — correlated features tend to be kept or dropped as a group rather than split arbitrarily. It's the right choice when you want feature selection but your features are correlated, which is most real tabular data.

**Q: Can you use L1 with neural networks?**
You can, but it's uncommon. Dropout, weight decay (L2), and early stopping are the standard regularizers for deep networks. L1's main appeal is feature selection, which matters less when the network is learning its own representations rather than consuming a fixed feature set. It does appear in structured-pruning work where sparsity is the explicit goal.

**Q: How do you use L1 for feature selection specifically?**
Fit with a range of λ values, track which coefficients stay non-zero as λ increases, and use the features surviving at a reasonable λ as your shortlist. Then refit an unregularized or L2 model on just those features. I'd check stability by repeating across bootstrap samples — features selected consistently are trustworthy, ones that appear and disappear are not.

## 9. Common Mistakes

- Not standardizing features before applying the penalty.
- Claiming the selected features are definitively "the important ones" when correlated features make selection unstable.
- Using L1 by default when L2 is the better general-purpose choice.
- Forgetting that λ must be tuned on validation.
- Expecting exactly zero coefficients from L2.

## 10. What to Remember

- **Penalizes `Σ|θ|` → exact zeros → automatic feature selection.**
- **The mechanism is the constant gradient** — the push toward zero doesn't weaken.
- **Use it for:** sparsity, interpretability, many-irrelevant-features situations.
- **Weakness:** arbitrary and unstable choice among correlated features. Elastic Net fixes this.
- **Always standardize first** or the penalty tracks units, not usefulness.
