# Forward Propagation

> **Phase 02 · DEEP LEARNING · Topic 10**

## 1. Definition

Passing input through the network layer by layer to produce an output. It's what happens at inference, and the first half of every training step.

## 2. Simple Explanation

Data enters the first layer, gets transformed, and the result becomes the input to the next layer. Repeat until you reach the output.

There's nothing clever about it — it's a sequence of matrix multiplies and activation functions. Everything interesting in training happens on the way back.

## 3. How It Works

```
a⁰ = x                                  input
a¹ = f(W¹a⁰ + b¹)                       layer 1
a² = f(W²a¹ + b²)                       layer 2
...
ŷ  = output_activation(Wᴸaᴸ⁻¹ + bᴸ)     prediction

Then: loss = L(ŷ, y)
```

**During training, intermediate activations are kept.** Backpropagation needs them to compute gradients, so every `aⁱ` stays in memory until the backward pass consumes it. At inference they can be discarded immediately.

**That difference is the main reason training memory far exceeds inference memory**, alongside gradients and optimizer state.

## 4. Practical Example

**Activation memory is often the binding constraint in training:**

```
Transformer forward pass, per layer, per sequence:

  attention scores:  (seq_len × seq_len) per head
  activations:       (seq_len × d_model)

At seq_len = 8192, the attention score matrix alone is
8192 × 8192 = 67 million values PER HEAD PER LAYER.

Multiply by heads, layers, and batch size and activation
memory dwarfs the weights.

That's why:
  · gradient checkpointing exists — recompute activations in
    the backward pass instead of storing them, trading
    compute for memory
  · FlashAttention exists — never materialize the full
    attention matrix at all
```

**At inference, none of this applies** — activations are freed as you go, which is why serving a model needs far less memory than training it.

**A forward pass in code:**

```python
with torch.no_grad():          # ← don't build the autograd graph
    logits = model(input_ids)  # inference only
```

Forgetting `no_grad()` at inference builds the full autograd graph and stores activations, silently multiplying memory use. It's one of the most common practical mistakes.

## 5. Why It Matters

- **It's the entire inference path** — everything a deployed model does.
- **Storing activations for backprop** is what makes training memory-hungry.
- **`no_grad()` at inference** is a real, frequently-made mistake.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Forgetting `no_grad()`** | Builds the graph; memory balloons |
| **Forgetting `eval()` mode** | Dropout and BatchNorm behave wrongly |
| **Activation memory** | Often the real training constraint |
| **Numerical overflow in FP16** | Activations can exceed the range |
| **Shape mismatches** | The most common implementation error |

**On mixed precision:** FP16 forward passes are faster and use less memory, but the reduced range means large activations can overflow to infinity. Mixed-precision training keeps a master copy of weights in FP32 and scales the loss to keep gradients in range. It's standard practice, not an optimization to be discovered later.

## 7. Interview Answer

> "Forward propagation is passing input through the network layer by layer to produce an output — a sequence of matrix multiplies and activations. Each layer's output becomes the next layer's input. At inference that's the whole story; in training it's the first half of a step, followed by loss and backpropagation.
>
> The detail that matters is what happens to intermediate activations. During training they're all kept, because backpropagation needs them to compute gradients. At inference they can be discarded as you go. That difference — along with gradients and optimizer state — is why training memory far exceeds inference memory.
>
> For transformers, activation memory is often the binding constraint rather than the weights. At a sequence length of eight thousand, the attention score matrix alone is sixty-seven million values per head per layer, and once you multiply by heads, layers, and batch size it dwarfs the parameters. That's what motivates gradient checkpointing — recomputing activations during the backward pass instead of storing them, trading compute for memory — and FlashAttention, which never materializes the full attention matrix at all.
>
> The practical mistake I'd call out is forgetting torch.no_grad at inference. Without it, PyTorch builds the full autograd graph and retains activations, so memory use balloons for no reason. It's one of the most common real bugs, and it pairs with forgetting model.eval, which leaves dropout active and batch normalization using batch statistics.
>
> One more thing on precision: FP16 forward passes are faster and lighter, but the reduced range means large activations can overflow to infinity. Mixed-precision training keeps a master copy of weights in FP32 and scales the loss to keep gradients in range — that's standard practice rather than an optimization you'd add later."

## 8. Likely Follow-ups

**Q: What's stored during a forward pass?**
During training, every layer's activations, because backpropagation needs them to compute gradients with respect to the weights. At inference they're freed immediately after use, which is a large part of why serving needs so much less memory than training.

**Q: Why is activation memory a problem in transformers?**
Because the attention score matrix is sequence length squared per head per layer. At eight thousand tokens that's sixty-seven million values per head per layer, and multiplied across heads, layers, and batch size it exceeds the weight memory. It's usually what limits batch size and sequence length.

**Q: What is gradient checkpointing?**
Storing only a subset of activations during the forward pass and recomputing the rest during the backward pass. It trades extra compute — roughly one additional forward pass — for a large reduction in activation memory, which often lets you train longer sequences or bigger batches.

**Q: What's the most common inference bug here?**
Forgetting torch.no_grad, which builds the autograd graph and retains activations, inflating memory for no benefit. Close behind is forgetting model.eval, which leaves dropout active and batch normalization using batch statistics — both silently degrade output without raising an error.

**Q: Why use mixed precision?**
FP16 forward passes are faster and use less memory, but the reduced range risks activations overflowing. Mixed-precision training keeps a master FP32 copy of the weights and scales the loss so gradients stay in range — standard practice for large models rather than an advanced technique.

## 9. Common Mistakes

- Running inference without `no_grad()`.
- Forgetting `eval()` mode alongside it.
- Assuming weights dominate training memory when activations often do.
- Not knowing what gradient checkpointing trades.
- Using FP16 without loss scaling.

## 10. What to Remember

- **Layer by layer: matrix multiply, add bias, activate.**
- **Training stores activations for backprop**; inference frees them.
- **Activation memory often binds before weight memory** in transformers.
- **Gradient checkpointing trades compute for memory.**
- **Use `no_grad()` and `eval()` at inference** — the classic pair of bugs.
