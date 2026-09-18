# Parameters

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 17**

## 1. Definition

The values a model **learns from data** during training — weights and biases. They're updated by the optimizer and they *are* the model: save the parameters and you've saved everything the model knows.

## 2. Simple Explanation

Parameters are the knobs the training process turns. You don't set them; gradient descent finds them.

The contrast that matters: **parameters are learned, [hyperparameters](18-hyperparameters.md) are chosen.** Learning rate is a hyperparameter — you pick it. The weights are parameters — the optimizer finds them. Mixing these up is a reliable way to look inexperienced.

## 3. How It Works

1. **Initialized** randomly, but carefully scaled (Xavier/He) so signals neither explode nor vanish through deep networks.
2. **Updated each step** by the optimizer: `θ ← θ - η·∇L`.
3. **Frozen at inference** — no updates happen when serving.
4. **Serialized as the model artifact** — a checkpoint file is essentially a dictionary of parameter tensors.

**Where the count comes from:**

```
Linear layer:  in_features × out_features  weights  +  out_features  biases
e.g. 768 → 3072:  768 × 3072 + 3072 = 2,362,368 parameters

A transformer block is dominated by:
  - attention projections (Q, K, V, O):  4 × d²
  - feed-forward (up and down):          8 × d²   ← usually ~2/3 of the block
```

**Parameter count ≈ memory.** At FP16, 1B parameters ≈ 2 GB just for weights. A 7B model needs ~14 GB before you account for the KV cache and activations — which is why "will it fit on this GPU" is a parameter-count question.

## 4. Practical Example

**Fine-tuning strategy is a decision about which parameters move:**

| Approach | Parameters updated | Trade-off |
|---|---|---|
| **Full fine-tuning** | All of them | Best adaptation; needs optimizer state for every parameter (~4× the weights in memory) |
| **LoRA** | Small low-rank adapter matrices, typically <1% | Near-full quality, dramatically less memory, swappable adapters per task |
| **Freeze + head** | Only a new final layer | Cheapest; limited adaptation |

**Why LoRA works:** the update needed to adapt a pretrained model is low-rank — you don't need to move every weight independently. So instead of learning a full `d × d` update, you learn two thin matrices `d × r` and `r × d` with `r` around 8–64. That's the practical default for adapting an open model, and knowing *why* it works separates you from someone who just knows the acronym.

## 5. Why It Matters

- **Parameter count drives memory, cost, and latency** — the three things that decide whether a model is deployable.
- **It's the training/inference distinction made concrete:** parameters change during training, freeze during inference.
- **It explains scaling behavior** — more parameters plus more data reliably improves capability, which is the observation that drove the last several years of LLM development.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **More parameters ≠ better** | Capacity without enough data overfits. Below the data threshold, a smaller model generalizes better |
| **Memory is more than weights** | Training needs weights + gradients + optimizer state (Adam keeps two extra tensors per parameter) ≈ 4× |
| **Poor initialization** | Signals vanish or explode through depth; training stalls at step zero |
| **Catastrophic forgetting** | Full fine-tuning on a narrow task degrades general ability | 
| **Checkpoint/code mismatch** | Parameters loaded into a different architecture fail silently or subtly | 

**Memory rule of thumb for training:** roughly 4× the weight size with Adam (weights + gradients + two optimizer moments), plus activations that scale with batch size and sequence length. This is why LoRA's memory saving is dramatic — it eliminates optimizer state for the frozen parameters.

## 7. Interview Answer

> "Parameters are the values learned from data during training — weights and biases. The optimizer finds them; I don't set them. That's the clean contrast with hyperparameters, which are the things I choose before training, like learning rate and batch size.
>
> Practically, parameter count is what determines whether a model is deployable. At FP16, a billion parameters is about two gigabytes of weights, so a 7B model needs roughly fourteen gigabytes before you account for the KV cache and activations. And training needs about four times the weight size, because Adam keeps gradients plus two moment tensors per parameter.
>
> That memory math is exactly why LoRA matters. Instead of updating every weight, you learn two thin low-rank matrices that get added to the frozen weights — typically under one percent of the parameters. It works because the update needed to adapt a pretrained model turns out to be low-rank; you don't need to move every weight independently. You get near-full-fine-tuning quality with dramatically less memory, and you can swap adapters per task.
>
> The other thing worth stating is that more parameters isn't automatically better. Capacity without enough data just overfits — below a certain data threshold a smaller model generalizes better."

## 8. Likely Follow-ups

**Q: Parameters vs. hyperparameters?**
Parameters are learned by the optimizer from data — weights and biases. Hyperparameters are set by me before training — learning rate, batch size, number of layers, regularization strength. The tell is: if gradient descent updates it, it's a parameter.

**Q: How much memory does a 7B model need?**
At FP16, roughly 14 GB for weights alone. For inference you add the KV cache, which grows with batch size and sequence length and often dominates at long context. For full fine-tuning, roughly 4× the weights with Adam, so around 56 GB before activations — which is why LoRA or quantized training is the practical route on a single GPU.

**Q: Why does LoRA work?**
Because the weight update needed to adapt a pretrained model is low-rank — the adaptation lives in a much smaller subspace than the full parameter space. So you learn two thin matrices whose product approximates the update, keeping the base weights frozen. Under 1% of parameters trained, near-full quality, and the base model is shared across adapters.

**Q: What is catastrophic forgetting?**
When fine-tuning on a narrow task degrades the model's general capabilities, because the parameters encoding those capabilities get overwritten. Mitigations: lower learning rates, fewer epochs, mixing general data into the fine-tuning set, and parameter-efficient methods like LoRA that leave the base weights untouched.

**Q: Do more parameters always mean better performance?**
No. Capacity only helps if you have the data and compute to use it — otherwise you overfit. The scaling-laws work showed that model size and training data need to grow together, and that many large models were undertrained for their size. In practice, for a deployable system I'd rather have a well-trained smaller model I can serve at low latency.

## 9. Common Mistakes

- Confusing parameters with hyperparameters.
- Estimating memory from weights alone and forgetting gradients, optimizer state, and the KV cache.
- Assuming bigger is always better.
- Saying "LoRA trains fewer parameters" without being able to explain *why* low-rank is sufficient.
- Forgetting that parameters are frozen at inference.

## 10. What to Remember

- **Learned by the optimizer, not chosen by you.** Hyperparameters are the opposite.
- **Parameter count → memory → deployability.** FP16: 1B params ≈ 2 GB.
- **Training memory ≈ 4× weights** with Adam, plus activations.
- **LoRA works because the adaptation update is low-rank** — under 1% of parameters, near-full quality.
- **More parameters ≠ better** without the data and compute to match.
