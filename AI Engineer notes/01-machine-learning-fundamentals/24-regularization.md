# Regularization

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 24**

## 1. Definition

Any technique that constrains a model to prevent it from fitting noise. It deliberately increases [bias](21-bias.md) to reduce [variance](22-variance.md), improving generalization at the cost of training fit.

## 2. Simple Explanation

Regularization is telling the model "don't get too clever."

Left alone, a flexible model will contort itself to pass through every training point — including the noisy ones. Regularization adds a cost for complexity, so the model only adopts complexity that genuinely reduces error. You're trading a worse fit on training data for a better fit on data you haven't seen.

## 3. How It Works

The core form adds a penalty term to the loss:

```
J(θ) = (1/n) Σ L(f(xᵢ), yᵢ)  +  λ · R(θ)
       └──── fit the data ────┘   └── stay simple ──┘

λ = 0      → no regularization, maximum variance
λ large    → weights pushed toward zero, maximum bias
λ optimal  → found on validation, never on test
```

**The main techniques:**

| Technique | Mechanism | Best for |
|---|---|---|
| **[L2](26-l2-regularization.md) / weight decay** | Penalize `Σθ²` — shrinks all weights | The default. Handles correlated features gracefully |
| **[L1](25-l1-regularization.md) / Lasso** | Penalize `Σ\|θ\|` — drives some weights to exactly 0 | Feature selection; sparse models |
| **Elastic Net** | Both combined | Correlated features *and* sparsity |
| **Dropout** | Randomly zero units during training | Neural networks |
| **[Early stopping](50-early-stopping.md)** | Stop at the validation minimum | Free; use always |
| **Data augmentation** | Synthetic input variation | Images, audio, text |
| **Batch normalization** | Normalizes activations; has a regularizing side-effect | Deep networks |
| **Ensembling** | Average independent models | Any high-variance learner |

## 4. Practical Example

**Tuning λ on validation:**

```
λ        train   val     read
0        0.99    0.68    no constraint — memorizing
0.001    0.96    0.79
0.01     0.93    0.87    ← best validation
0.1      0.88    0.85
1.0      0.71    0.70    over-regularized — now underfitting
```

Note both ends fail. Regularization isn't "more is safer" — too much produces underfitting, which is why λ is a hyperparameter to search rather than a constant to set.

**The most important practical detail:** scale your features before L1 or L2. The penalty is applied to raw coefficient magnitudes, so an unscaled feature measured in thousands gets a tiny coefficient and is effectively exempt from the penalty, while a feature in [0,1] gets penalized heavily. Unscaled regularization silently regularizes some features and not others.

**In RAG:** the analogous constraints are a top-k limit and a similarity floor. Retrieving 20 chunks instead of 5 is the equivalent of removing regularization — you capture more, and you also admit more noise that distracts the model.

## 5. Why It Matters

- **It's the primary defense against [overfitting](19-overfitting.md)** after getting more data.
- **λ is one of the highest-impact hyperparameters** after learning rate.
- **AdamW exists because of a regularization subtlety** — L2 in the loss and weight decay are *not* equivalent under adaptive optimizers, and decoupling them is why AdamW is the default for transformers.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Over-regularizing** | Model underfits; both train and val bad | Lower λ — check both metrics, not just the gap |
| **Not scaling before L1/L2** | Penalty applied unevenly across features | Standardize first, inside a Pipeline |
| **Regularizing the bias term** | Shifts the model's baseline unnecessarily | Most libraries exclude it — verify yours does |
| **Dropout at inference** | Dropout must be off when serving | `model.eval()` handles it; forgetting causes nondeterministic predictions |
| **L2 vs. weight decay confused under Adam** | They differ for adaptive optimizers | Use AdamW for decoupled weight decay |
| **Regularizing when the problem is bias** | Makes an underfit model worse | Diagnose first from train/validation |

## 7. Interview Answer

> "Regularization is any technique that constrains a model so it can't fit noise. Mechanically it adds a penalty on complexity to the loss, so the optimizer has to trade off fitting the data against keeping the model simple. It's deliberately increasing bias to reduce variance.
>
> The main forms are L2, which shrinks all weights and is my default; L1, which drives some weights to exactly zero so it doubles as feature selection; dropout for neural networks; and early stopping, which is essentially free and I'd always use.
>
> The strength λ is a hyperparameter I'd tune on validation, and I'd watch both ends — too much regularization produces underfitting, so it's not a case where more is safer.
>
> Two practical details I'd mention. Scale features before L1 or L2, because the penalty applies to raw coefficient magnitudes — an unscaled feature in the thousands gets a tiny coefficient and effectively escapes the penalty while a feature in zero-to-one gets hit hard. And for transformers, use AdamW rather than Adam with L2, because L2 in the loss and weight decay aren't equivalent under adaptive optimizers; decoupling them is the whole reason AdamW exists.
>
> The diagnostic point is that I'd only reach for regularization if the train/validation gap says variance. On an underfit model it makes things worse."

## 8. Likely Follow-ups

**Q: L1 vs. L2 — when do you use each?**
L2 shrinks all weights smoothly toward zero and handles correlated features gracefully by distributing weight among them. L1 drives some weights to exactly zero, giving a sparse model that doubles as feature selection — useful when you have many features and suspect most are irrelevant, or when you need an interpretable short list. Elastic Net combines both when you want sparsity *and* correlated features handled sensibly.

**Q: How does dropout regularize?**
During training it randomly zeroes a fraction of units each forward pass, so the network can't rely on any single path and has to learn redundant representations. It's often described as approximating an ensemble of subnetworks. At inference it's switched off and activations are scaled appropriately — forgetting to switch it off is a classic bug producing nondeterministic predictions.

**Q: Is early stopping regularization?**
Yes, implicitly. It limits how far the optimizer travels from its initialization, which constrains the effective function space in a way similar to an explicit penalty. It's the cheapest regularizer available since it requires no extra hyperparameter beyond patience, and it's why I'd try it before adding weight decay.

**Q: How do you choose λ?**
Search on a log scale across several orders of magnitude, scoring on validation, and pick the best. With small data I'd use cross-validation to reduce noise in the selection. I'd check both training and validation metrics across the sweep, because a λ that's too high shows up as both going bad — that's underfitting, not a better-regularized model.

**Q: Why AdamW instead of Adam with weight decay?**
Because adding L2 to the loss interacts with Adam's per-parameter adaptive scaling — the effective decay ends up different for each parameter depending on its gradient history, which isn't what you want. AdamW decouples weight decay from the gradient update and applies it directly to the weights. It's the standard for transformer training.

## 9. Common Mistakes

- Not scaling features before L1 or L2.
- Adding regularization to a model that's underfitting.
- Assuming more regularization is always safer.
- Leaving dropout active at inference.
- Using Adam with L2 for transformers instead of AdamW.
- Tuning λ on the test set.

## 10. What to Remember

- **Constrain complexity to reduce variance**, at the cost of some bias.
- **`J = loss + λ·R(θ)`.** λ is tuned on validation, on a log scale.
- **L2 shrinks; L1 zeroes** (and so selects features). Elastic Net does both.
- **Scale features first** or the penalty is applied unevenly.
- **Early stopping is free regularization** — use it before reaching for anything else.
