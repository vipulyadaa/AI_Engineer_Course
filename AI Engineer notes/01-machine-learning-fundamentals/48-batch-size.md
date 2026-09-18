# Batch Size

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 48**

## 1. Definition

The number of examples processed before each parameter update. It controls gradient noise, memory consumption, and hardware utilization — and in practice it's usually decided by what fits in GPU memory.

## 2. Simple Explanation

How many examples the model looks at before adjusting its weights.

Small batches mean noisy gradients and many updates. Large batches mean stable gradients and fewer updates. The honest answer to "how do you choose it" in most real projects is: the largest that fits in memory, then tune the learning rate to match.

## 3. How It Works

**What batch size controls:**

1. **Gradient noise** — falls as `1/√batch_size`. Going 1 → 256 cuts noise 16×; 256 → 1024 only cuts it another 2×.
2. **Memory** — activations scale linearly with batch size. This is usually the binding constraint.
3. **Hardware utilization** — GPUs process a batch in roughly the time of one example until saturation, so small batches waste the device.
4. **Updates per epoch** — `n / batch_size`. Larger batch means fewer updates.
5. **Regularization** — noise from small batches biases toward flatter minima, which often generalize slightly better.

| Batch size | Gradient | Memory | Updates/epoch | Generalization |
|---|---|---|---|---|
| 8–32 | Noisy | Low | Many | Often slightly better |
| 64–256 | Good | Moderate | Good | The usual sweet spot |
| 1024+ | Very stable | High | Few | Slightly worse without careful tuning |

## 4. Practical Example

**Batch size and learning rate must move together:**

```
batch 64,  lr 1e-3     baseline
batch 256, lr 1e-3     ← fewer updates, same step size: converges slower
batch 256, lr 4e-3     ← linear scaling: comparable convergence
batch 256, lr 2e-3     ← sqrt scaling: more conservative, often more stable

Large batches also need WARMUP, or early steps destabilize training.
```

**Gradient accumulation — the standard trick when memory limits you:**

```python
accum_steps = 8          # effective batch = 8 × 16 = 128
for i, batch in enumerate(loader):          # actual batch = 16
    loss = model(batch).loss / accum_steps  # scale so the average is right
    loss.backward()                         # accumulate gradients
    if (i + 1) % accum_steps == 0:
        optimizer.step()                    # update once per 8 batches
        optimizer.zero_grad()
```

You get the gradient quality of batch 128 with the memory of batch 16, at the cost of proportionally more wall-clock time. This is how most LLM fine-tuning runs on limited hardware.

## 5. Why It Matters

- **It's usually a memory decision, not a theoretical one** — and saying that plainly is more credible than reciting optimization theory.
- **The learning-rate coupling is a real tuning trap.** Changing batch size without adjusting the rate is a common mistake.
- **It interacts with BatchNorm**, which breaks down at small batch sizes.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Out of memory** | Reduce batch size, use gradient accumulation, or gradient checkpointing |
| **Changed batch, unchanged LR** | Fewer, less noisy updates without a bigger step: slower convergence |
| **Large-batch generalization gap** | Mitigated with LR scaling plus warmup |
| **BatchNorm below ~16** | Batch statistics become unreliable. Use LayerNorm or GroupNorm |
| **Uneven final batch** | Noisier gradient on the last batch; `drop_last=True` if it matters |
| **Inference batch ≠ training batch** | Fine for LayerNorm models; a problem if BatchNorm statistics are batch-dependent |

## 7. Interview Answer

> "Batch size is how many examples the model processes before each parameter update. It controls gradient noise, memory, and hardware utilization.
>
> The honest practical answer is that it's usually a memory decision. I'd use the largest batch that fits in GPU memory, because that maximizes hardware utilization, then tune the learning rate to match. Optimization theory gives a range, but memory gives the actual number.
>
> The reason the sweet spot is in the tens-to-hundreds rather than thousands is that gradient noise falls as one over the square root of batch size. Going from 1 to 256 cuts noise sixteen-fold; going from 256 to 1024 cuts it by only another factor of two, while memory cost grows linearly. Diminishing returns arrive quickly.
>
> The coupling with learning rate is the trap I'd flag. A larger batch means a less noisy gradient and fewer updates, so if you increase batch size without increasing the learning rate, convergence gets slower. The standard heuristics are linear or square-root scaling, plus warmup, because large-batch training is unstable in the early steps.
>
> When memory is the binding constraint, gradient accumulation is the answer — run several small batches, accumulate gradients without stepping, then update once. You get a large effective batch with a small memory footprint, which is how most LLM fine-tuning works on a single GPU.
>
> One gotcha worth knowing: BatchNorm degrades below about sixteen examples because the batch statistics become unreliable. That's part of why transformers use LayerNorm, which is batch-size independent."

## 8. Likely Follow-ups

**Q: How do you choose batch size?**
Largest that fits in memory, then tune the learning rate. If I have headroom, I'd check whether a smaller batch generalizes better on validation, since very large batches sometimes do slightly worse. Powers of two are conventional for memory alignment, though the practical effect on modern GPUs is small.

**Q: What happens if you double it?**
Gradient noise drops by √2 and you get half as many updates per epoch. Without a learning-rate change, convergence slows. With linear or square-root LR scaling plus warmup, you get roughly comparable convergence in fewer, larger steps — which is faster in wall-clock time if the hardware can absorb it.

**Q: What is gradient accumulation and when do you use it?**
Running N forward/backward passes, summing gradients, and stepping once. It gives the effective batch size of N×batch with the memory of one batch, trading wall-clock time for memory. I'd use it whenever the batch size I want doesn't fit — which is most LLM fine-tuning on a single GPU.

**Q: Why might very large batches generalize worse?**
The common explanation is that less gradient noise lets the optimizer settle into sharper minima, which generalize worse than the flatter ones noise helps find. It's largely mitigated by scaling the learning rate and using warmup — the large-batch training literature showed careful tuning closes most of the gap.

**Q: Does batch size matter at inference time?**
For throughput, yes — larger batches amortize overhead and use the GPU better, which is why serving systems batch requests. For correctness, it depends on the normalization: LayerNorm models are batch-size independent so results don't change, while a model with BatchNorm in training mode would behave differently. At inference BatchNorm uses running statistics, so `model.eval()` handles it.

## 9. Common Mistakes

- Changing batch size without adjusting the learning rate.
- Assuming larger is always better.
- Using BatchNorm with very small batches.
- Forgetting warmup with large batches.
- Not scaling the loss correctly when using gradient accumulation.

## 10. What to Remember

- **Examples per parameter update.** Usually decided by memory, not theory.
- **Noise falls as 1/√batch_size** — diminishing returns past a few hundred.
- **Scale the learning rate with it** (linear or √), and add warmup for large batches.
- **Gradient accumulation** = large effective batch on small memory.
- **BatchNorm breaks below ~16** — one reason transformers use LayerNorm.
