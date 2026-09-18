# Mini-Batch Gradient Descent

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 46**

## 1. Definition

Gradient descent where each update uses a small subset of the data — typically 32 to 512 examples. It's the practical default for essentially all deep learning, sitting between full-batch and single-example SGD.

## 2. Simple Explanation

A compromise that happens to be better than either extreme.

[Full batch](44-batch-gradient-descent.md) gives a perfect gradient and one update per epoch — too slow. [SGD](45-stochastic-gradient-descent.md) gives a very noisy gradient and maximum updates, but processes one example at a time through hardware built for parallelism — wasteful.

Mini-batch gives a gradient estimate that's good enough, thousands of updates per epoch, and full GPU utilization. You get most of the benefits of both.

## 3. How It Works

```
for epoch in range(n_epochs):
    shuffle(data)
    for batch in chunks(data, batch_size=256):
        preds = model(batch.X)              # 256 examples, in parallel
        loss  = loss_fn(preds, batch.y)
        theta = theta - lr * gradient(loss) # one update per batch
```

**Why 32–512 and not 1 or n:**
1. **Gradient noise scales as 1/√batch_size** — going from 1 to 256 cuts noise by 16×; going from 256 to 1024 only cuts it by another 2×. Diminishing returns set in quickly.
2. **GPUs process a batch in roughly the time of a single example** up to the point of saturation, so small batches waste the hardware.
3. **Some noise is beneficial** — it escapes saddle points and acts as a mild regularizer.
4. **Memory** — activations scale with batch size, and this is usually the binding constraint.

## 4. Practical Example

**Batch size interacts with learning rate**, which is the practically important part:

```
Larger batch → less gradient noise → you can afford a larger learning rate

Common heuristics:
  Linear scaling:  double the batch size, double the learning rate
  Sqrt scaling:    double the batch size, multiply LR by √2

Both need warmup at large batch sizes, or early steps destabilize training.
```

**The observed trade-off:**

| Batch size | Gradient | Speed | Generalization |
|---|---|---|---|
| 32 | Noisy | Slower per epoch | Often slightly better |
| 256 | Good | Fast | Good — the usual sweet spot |
| 4096 | Very stable | Fastest per epoch | Often slightly worse without careful tuning |

**Gradient accumulation** is the practical trick when memory limits you: run several small batches, accumulate gradients without updating, then step once. You get the effective batch size of a large batch with the memory footprint of a small one — at the cost of proportionally more time. This is standard in LLM fine-tuning.

## 5. Why It Matters

- **It's what every framework actually does.** `batch_size` in PyTorch or Keras is this.
- **Batch size is often set by GPU memory**, not by optimization theory — worth saying plainly.
- **The batch-size/learning-rate interaction** is a real tuning consideration and a common follow-up question.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Out of memory** | Activations scale with batch size. Use gradient accumulation or gradient checkpointing |
| **Large batch, unchanged LR** | Fewer, less noisy updates without a larger step size means slower convergence |
| **Large batch generalization gap** | Very large batches can generalize slightly worse; mitigated with LR scaling plus warmup |
| **Last batch is smaller** | An uneven final batch gives a noisier gradient. `drop_last=True` if it matters |
| **BatchNorm with tiny batches** | Batch statistics become unreliable below ~16. Use GroupNorm or LayerNorm instead |

**That last one is a real gotcha.** BatchNorm computes normalization statistics across the batch, so at batch size 2 or 4 those estimates are noise. It's part of why transformers use LayerNorm — it normalizes across features per example and is batch-size independent.

## 7. Interview Answer

> "Mini-batch gradient descent computes each update from a subset of the data, typically 32 to 512 examples. It's the practical default for all deep learning, and it's a compromise that's genuinely better than either extreme.
>
> Full batch gives a perfect gradient but one update per epoch, which is far too slow. Pure SGD gives maximum updates but processes one example at a time through hardware designed for parallel batches. Mini-batch gets a gradient estimate that's good enough, thousands of updates per epoch, and full GPU utilization.
>
> The reason the sweet spot is in the tens-to-hundreds range is that gradient noise falls as one over the square root of batch size. Going from 1 to 256 cuts the noise by sixteen times; going from 256 to 1024 only cuts it by another factor of two. You hit diminishing returns quickly, and meanwhile memory cost grows linearly.
>
> The interaction I'd mention is with the learning rate. A larger batch means a less noisy gradient, so you can afford a larger step — the common heuristics are linear or square-root scaling. Large batches also need warmup, or the early steps destabilize things.
>
> In practice batch size is usually set by what fits in GPU memory rather than by optimization theory. When memory is the constraint, gradient accumulation is the standard trick — run several small batches, accumulate gradients without stepping, then update once. That's how most LLM fine-tuning works."

## 8. Likely Follow-ups

**Q: How do you choose the batch size?**
Usually the largest that fits in memory, since that maximizes hardware utilization, then tune the learning rate to match. If I have memory headroom I'd check whether a smaller batch generalizes better on my validation set, since very large batches sometimes do slightly worse. Powers of two are conventional for hardware alignment, though the effect is modest on modern GPUs.

**Q: What happens if you double the batch size?**
The gradient gets less noisy by a factor of √2, and you get half as many updates per epoch. Without changing anything else, convergence slows. The standard response is to scale the learning rate up — linear or square-root scaling — and add warmup, since large-batch training is unstable in the early steps.

**Q: What is gradient accumulation?**
Running several forward and backward passes, summing the gradients, and only stepping the optimizer after N of them. It gives you the effective batch size of N×batch_size with the memory footprint of one batch, at the cost of proportionally more wall-clock time. It's how you fine-tune large models on limited hardware, and it's standard in LLM training recipes.

**Q: Why do very large batches sometimes generalize worse?**
The leading explanation is that less gradient noise means the optimizer converges into sharper minima, which tend to generalize worse than the flatter ones noise helps you find. It's mitigated substantially by scaling the learning rate and using warmup — the large-batch training literature showed you can train with very large batches successfully if you tune carefully.

**Q: Does batch size affect BatchNorm?**
Significantly. BatchNorm computes mean and variance across the batch, so below roughly 16 examples those statistics become unreliable and training degrades. That's one reason transformers use LayerNorm, which normalizes across features within each example and is batch-size independent. GroupNorm is the other common alternative when small batches are unavoidable.

## 9. Common Mistakes

- Changing batch size without adjusting the learning rate.
- Assuming larger batch is always better.
- Using BatchNorm with very small batches.
- Forgetting warmup when training with large batches.
- Confusing "batch gradient descent" (full dataset) with "mini-batch" — `batch_size` in code means the latter.

## 10. What to Remember

- **32–512 examples per update.** The universal practical default.
- **Noise falls as 1/√batch_size** — diminishing returns past a few hundred.
- **Batch size is usually a memory decision**, not an optimization one.
- **Scale the learning rate with the batch size**, and add warmup for large batches.
- **Gradient accumulation** gives a large effective batch on small memory.
