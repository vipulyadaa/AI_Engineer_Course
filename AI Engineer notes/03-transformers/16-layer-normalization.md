# Layer Normalization

> **Phase 03 · TRANSFORMERS · Topic 16**

## 1. Definition

Normalizing activations across the **feature dimension** for each token independently — subtract the mean, divide by the standard deviation, then apply learned scale and shift. It stabilizes training by keeping activation distributions consistent across layers.

## 2. Simple Explanation

As signals pass through many layers, their scale drifts — growing or shrinking unpredictably. That destabilizes training.

LayerNorm rescales each token's activation vector to zero mean and unit variance, so every layer receives inputs in a predictable range regardless of what happened upstream.

## 3. How It Works

```
For each token's activation vector x (length d):

  μ = mean(x)                    across the d features
  σ = std(x)                     across the d features

  LN(x) = γ · (x − μ)/(σ + ε) + β
          ↑                      ↑
       learned scale        learned shift  (both length d)
```

**LayerNorm vs. BatchNorm — the distinction that matters:**

| | Normalizes across | Batch-size dependent? | Suits |
|---|---|---|---|
| **BatchNorm** | The batch, per feature | **Yes** — breaks below ~16 | CNNs, fixed-size inputs |
| **LayerNorm** | Features, per token | **No** | Transformers, variable-length sequences |

**Why transformers use LayerNorm:** sequences have variable length and inference often runs at batch size 1. BatchNorm's statistics would be unreliable or undefined. LayerNorm computes everything within a single token's vector, so it's independent of batch size and sequence length.

**RMSNorm, the modern simplification:**

```
LayerNorm:  γ · (x − μ)/σ + β        mean-center, scale, shift
RMSNorm:    γ · x / RMS(x)           scale only

RMS(x) = √(mean(x²))

Drops the mean subtraction and the shift. Empirically the
re-centering contributes little, and removing it is faster.
Used in Llama, Gemini, and most current models.
```

## 4. Practical Example

**Placement is the thing that matters most:**

```
Post-norm (2017 original):
   x = LayerNorm(x + Sublayer(x))
   → normalization sits ON the residual path
   → unstable past ~20 layers; needs careful warmup

Pre-norm (every modern model):
   x = x + Sublayer(LayerNorm(x))
   → residual path is a clean identity
   → trains stably at 100+ layers
```

**Where norms appear in a modern block:**

```
x = x + Attention(RMSNorm(x))
x = x + FFN(RMSNorm(x))
...
final_norm = RMSNorm(x)          ← one more before the output projection
```

So a 32-layer model has 64 norms in the blocks plus one final — 65 total.

**A subtlety worth knowing:** LayerNorm's learned `γ` and `β` mean it isn't purely normalizing — the model can learn to re-scale and re-shift however it wants. The normalization constrains the *distribution shape*, not the final values.

## 5. Why It Matters

- **The LayerNorm-vs-BatchNorm answer** is a standard question and the batch-size reasoning is the substantive part.
- **Pre-norm vs. post-norm placement** is the practically consequential detail.
- **RMSNorm is what current models use**, so naming it signals current knowledge.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Post-norm at depth** | Unstable; the reason pre-norm replaced it |
| **BatchNorm in a transformer** | Would break at small batch and variable length |
| **Norm in FP16** | Variance computation can overflow; usually computed in FP32 |
| **ε placement** | Inside vs. outside the square root differs slightly between implementations |
| **Learned γ, β** | The model can undo normalization if that's useful — it isn't a hard constraint |

**On numerical precision:** normalization statistics are typically computed in FP32 even in a mixed-precision model, because squaring activations in FP16 can overflow. It's a small implementation detail that causes real training instability when missed.

**On why RMSNorm works:** the finding is that re-centering — subtracting the mean — contributes little to the stabilization benefit, while re-scaling does most of the work. Dropping the mean and the shift parameter is cheaper and performs equivalently, which is why it's become standard.

## 7. Interview Answer

> "Layer normalization normalizes activations across the feature dimension for each token independently — subtract the mean, divide by the standard deviation, then apply a learned scale and shift. It keeps activation distributions consistent across layers, which stabilizes training.
>
> The contrast with BatchNorm is the substantive part. BatchNorm normalizes across the batch for each feature, so its statistics depend on batch size — below about sixteen examples they become unreliable, and at batch size one they're undefined. Transformers have variable-length sequences and often run inference at batch size one, so BatchNorm is unusable. LayerNorm computes everything within a single token's vector, so it's independent of both batch size and sequence length.
>
> The detail that matters most practically is placement. The original paper used post-norm — normalize after the residual addition — which puts LayerNorm on the residual path so gradients pass through a normalization at every layer. That's unstable past roughly twenty layers. Every modern model uses pre-norm, normalizing the input to the sublayer and adding the raw output, which keeps the residual path a clean identity and trains stably at a hundred-plus layers.
>
> And current models use RMSNorm rather than LayerNorm — scale by the root-mean-square without subtracting the mean and without the shift parameter. The finding is that re-centering contributes little while re-scaling does most of the stabilization work, so dropping it is cheaper and performs equivalently.
>
> One implementation detail worth knowing: normalization statistics are usually computed in FP32 even in mixed-precision training, because squaring activations in FP16 can overflow. It's small, and missing it causes real instability."

## 8. Likely Follow-ups

**Q: Why LayerNorm rather than BatchNorm in transformers?**
Because BatchNorm's statistics depend on the batch — unreliable below about sixteen examples and undefined at batch size one — and transformers have variable-length sequences and often serve at batch size one. LayerNorm normalizes within a single token's feature vector, so it's independent of batch size and sequence length.

**Q: Pre-norm or post-norm?**
Pre-norm for anything modern. Post-norm puts normalization on the residual path, so gradients traverse a normalization at every layer, which becomes unstable past roughly twenty layers and needs careful warmup. Pre-norm keeps the residual path a clean identity and trains stably at much greater depth.

**Q: What is RMSNorm?**
A simplification that scales by root-mean-square without subtracting the mean and without the learned shift. The empirical finding is that re-centering contributes little to the stabilization benefit while re-scaling does most of it, so removing the mean is cheaper and performs the same. It's what Llama, Gemini, and most current models use.

**Q: What do γ and β do?**
They're learned per-feature scale and shift applied after normalization, so the model can re-scale and re-shift the normalized values however is useful — including partially undoing the normalization. So LayerNorm constrains the distribution shape rather than pinning the final values. RMSNorm keeps γ and drops β.

**Q: How many normalization layers are in a transformer?**
Two per block — before attention and before the FFN in pre-norm — plus one final norm before the output projection. So a 32-layer model has 65. That's worth knowing because it's a common off-by-one in implementations that forget the final norm.

## 9. Common Mistakes

- Saying BatchNorm would work in a transformer.
- Describing post-norm as current practice.
- Not knowing RMSNorm, which is what modern models use.
- Forgetting the final norm before the output projection.
- Computing normalization statistics in FP16.

## 10. What to Remember

- **Normalize across features, per token.** Independent of batch size and sequence length.
- **BatchNorm can't work here** — variable lengths and batch-size-1 inference.
- **Pre-norm is modern:** `x + Sublayer(Norm(x))`, clean residual path, stable at depth.
- **RMSNorm is current practice** — scale only, no mean subtraction or shift.
- **Compute statistics in FP32** even under mixed precision.
