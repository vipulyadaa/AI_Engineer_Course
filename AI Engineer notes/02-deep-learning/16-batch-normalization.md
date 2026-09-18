# Batch Normalization

> **Phase 02 · DEEP LEARNING · Topic 16**

## 1. Definition

Normalizing a layer's activations to zero mean and unit variance using statistics computed across the batch, then rescaling with two learned parameters. It stabilizes and accelerates training.

## 2. Simple Explanation

As training progresses, the distribution of activations reaching each layer keeps shifting, which makes every layer chase a moving target.

Batch norm fixes the scale: standardize the activations, then let the network learn its own preferred scale and shift through two parameters. The result is faster, more stable training and tolerance for higher learning rates.

## 3. How It Works

```
For each feature, across the batch:

  μ = mean(x)                  σ² = var(x)
  x̂ = (x − μ) / √(σ² + ε)      normalize
  y  = γ·x̂ + β                 learned scale and shift

γ and β are learned parameters, one pair per feature.
They let the network undo the normalization if that's better.
```

**Training vs inference differ, and this is the crux:**

```
TRAINING    use the current batch's mean and variance
INFERENCE   use RUNNING AVERAGES accumulated during training

Inference must be deterministic and independent of what else
is in the batch — you can't have a prediction depend on the
other requests batched with it.

Forgetting model.eval() means inference uses batch statistics,
so the SAME input gives DIFFERENT outputs depending on its
batch. With batch size 1, the statistics are meaningless and
output is garbage.
```

## 4. Practical Example

**BatchNorm vs LayerNorm — the distinction that matters for transformers:**

```
                 normalizes across          depends on batch?
BatchNorm        the BATCH, per feature     YES
LayerNorm        the FEATURES, per sample   NO

Transformers use LAYERNORM, and the reason is decisive:

  · sequence lengths vary, so batch statistics over padded
    positions are meaningless
  · batch size 1 is normal at inference
  · autoregressive generation is inherently sequential
  · LayerNorm is independent per sample, so none of this
    applies

BatchNorm dominates convolutional vision models. LayerNorm
dominates everything sequence-based. Knowing WHY is the
answer, not just which.
```

**RMSNorm** is the further simplification used in recent LLMs — it drops the mean-centering and normalizes only by root mean square, which is cheaper and works as well.

**Pre-norm vs post-norm:** transformers moved from normalizing after the residual block to normalizing before it. Pre-norm keeps the residual path clean, which makes deep transformers trainable without careful warmup tuning — a practical detail that explains a lot of architecture diagrams.

## 5. Why It Matters

- **It enables higher learning rates and faster convergence** — a large practical effect.
- **The BatchNorm/LayerNorm distinction** is a standard transformer question.
- **Train/inference statistics differ**, which is a real source of production bugs.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Batch-size dependence** | Unreliable with small batches; broken at size 1 |
| **Train/inference mismatch** | Running averages must be used at inference |
| **Poor fit for sequences** | Variable lengths and padding break batch statistics |
| **Interacts badly with dropout** | Variance shifts between training and inference |
| **Distributed training** | Statistics must be synced across devices, or be per-device |

**On why it works:** the original explanation — reducing "internal covariate shift" — has been substantially challenged. The better-supported account is that it smooths the loss landscape, making gradients more predictable and permitting larger learning rates. Saying "the original explanation is disputed; the smoothing account is better supported" is more accurate than reciting the 2015 framing.

**On distributed training:** with data parallelism, each device sees a different slice of the batch. Statistics computed per device differ from true batch statistics, which can change results. SyncBatchNorm exists to compute them across devices, at a communication cost.

## 7. Interview Answer

> "Batch normalization standardizes a layer's activations to zero mean and unit variance using statistics computed across the batch, then applies two learned parameters — a scale and a shift — so the network can recover a different distribution if that's better.
>
> The effect is faster, more stable training and tolerance for higher learning rates. On *why* it works, I'd be careful: the original explanation was reducing internal covariate shift, but that's been substantially challenged. The better-supported account is that it smooths the loss landscape, making gradients more predictable. I'd rather say that than recite the 2015 framing as settled.
>
> The crux is that training and inference behave differently. Training uses the current batch's statistics; inference uses running averages accumulated during training. That's necessary because a prediction can't depend on which other requests happened to be batched with it. Forgetting model.eval means inference uses batch statistics, so the same input gives different outputs depending on its batch — and at batch size one the statistics are meaningless and the output is garbage.
>
> The distinction that matters for transformers is BatchNorm versus LayerNorm. BatchNorm normalizes across the batch per feature; LayerNorm normalizes across features per sample, so it doesn't depend on the batch at all. Transformers use LayerNorm, and the reasons are decisive: sequence lengths vary so batch statistics over padded positions are meaningless, batch size one is normal at inference, and autoregressive generation is inherently sequential. None of that troubles LayerNorm. So BatchNorm dominates convolutional vision models and LayerNorm dominates everything sequence-based.
>
> Two further details. Recent LLMs use RMSNorm, which drops mean-centering and normalizes only by root mean square — cheaper and works as well. And transformers moved from post-norm to pre-norm, normalizing before the residual block rather than after, which keeps the residual path clean and makes deep transformers trainable without delicate warmup tuning.
>
> One operational gotcha: under data-parallel training each device sees a different batch slice, so per-device statistics differ from true batch statistics. SyncBatchNorm computes them across devices at a communication cost."

## 8. Likely Follow-ups

**Q: Why do transformers use LayerNorm instead of BatchNorm?**
Because LayerNorm normalizes across features within each sample, so it doesn't depend on the batch. Sequence lengths vary, batch statistics over padded positions are meaningless, and batch size one is normal at inference — all of which break BatchNorm and none of which affect LayerNorm.

**Q: What's different between training and inference?**
Training uses the current batch's mean and variance; inference uses running averages accumulated during training. That's essential because a prediction must not depend on the other samples in its batch. Forgetting to switch modes gives non-deterministic outputs, and at batch size one, garbage.

**Q: Why does batch normalization help?**
It allows higher learning rates and speeds convergence. The original internal-covariate-shift explanation has been substantially challenged; the better-supported account is that it smooths the loss landscape so gradients are more predictable. I'd present it that way rather than as settled.

**Q: What is RMSNorm?**
A simplification used in recent LLMs that normalizes by root mean square without subtracting the mean. It's cheaper to compute and performs comparably, which is why models like Llama adopted it over standard LayerNorm.

**Q: What's pre-norm versus post-norm?**
Whether normalization is applied before or after the residual block. Transformers moved to pre-norm because it keeps the residual path unnormalized and therefore clean, which makes very deep transformers trainable without carefully tuned warmup. It's why modern architecture diagrams show norm inside the block.

## 9. Common Mistakes

- Using BatchNorm in sequence models.
- Presenting internal covariate shift as the settled explanation.
- Forgetting `model.eval()` so inference uses batch statistics.
- Combining BatchNorm with dropout without understanding the interaction.
- Not knowing that transformers use pre-norm and often RMSNorm.

## 10. What to Remember

- **Normalize activations, then learned scale and shift.**
- **Training uses batch stats; inference uses running averages.**
- **Transformers use LayerNorm** — batch-independent, so variable lengths and batch size 1 are fine.
- **RMSNorm and pre-norm** are the modern LLM variants.
- **The covariate-shift explanation is disputed**; loss-landscape smoothing is better supported.
