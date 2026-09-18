# Gradient Descent

> **Phase 02 · DEEP LEARNING · Topic 12**

## 1. Definition

The optimization algorithm that updates weights by stepping against the gradient of the loss. Backpropagation computes the direction; gradient descent decides how far to move.

## 2. Simple Explanation

The gradient points in the direction that increases the loss fastest. So step the other way.

How big a step is the learning rate — the single most important hyperparameter in training, and the one most likely to be the cause when training fails.

## 3. How It Works

```
w ← w − η · ∂L/∂w         η = learning rate
```

**The three variants:**

| Variant | Gradient from | Behaviour |
|---|---|---|
| **Batch** | The entire dataset | Stable, slow, memory-heavy |
| **Stochastic (SGD)** | One sample | Fast, very noisy |
| **Mini-batch** | 32–512 samples | The practical default |

**Mini-batch is what everyone actually means.** The noise from sampling is beneficial — it helps escape sharp minima and poor saddle points, so it isn't purely a compromise.

## 4. Practical Example

**The learning rate is the parameter that decides whether training works:**

```
Too high    →  loss oscillates or goes to NaN; weights diverge
Too low     →  training is glacial; may stall in a poor region
Just right  →  loss falls smoothly

If training is broken, check the learning rate FIRST. It's
more often the cause than architecture, data, or initialization.
```

**Modern optimizers are not plain gradient descent:**

```
SGD + MOMENTUM
  accumulates a velocity term — smooths the path, accelerates
  through consistent directions

ADAM  (the default for transformers)
  per-parameter adaptive learning rates from running estimates
  of the first and second moments of the gradient
  → parameters with small gradients get larger effective steps

ADAMW
  Adam with weight decay applied correctly, decoupled from
  the gradient update. The standard for LLM training.
```

**The memory consequence of Adam** is worth stating: it keeps two moment estimates per parameter, typically in FP32. For a 7B model that's about 56 GB of optimizer state on top of weights and gradients — roughly four times the weight memory. That's a direct reason parameter-efficient fine-tuning exists.

**Learning rate schedules:**

```
WARMUP     start small, ramp up over the first few thousand
           steps — large early updates on random weights
           destabilize training
DECAY      cosine or linear decay afterwards — large steps to
           get near a minimum, small steps to settle in it

Warmup + cosine decay is the standard recipe for transformers,
and warmup specifically is not optional at scale.
```

## 5. Why It Matters

- **The learning rate is the first thing to check** when training misbehaves.
- **AdamW is the standard for LLMs**, and its memory cost drives PEFT adoption.
- **Warmup is required at scale**, not a refinement.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Learning rate too high** | Divergence, NaN loss |
| **Learning rate too low** | Slow, may stall |
| **No warmup** | Early instability at large scale |
| **Adam memory** | ~4× weight memory in optimizer state |
| **Batch too large** | Less gradient noise; can generalize worse |
| **Local minima** | Less of a problem in high dimensions than assumed |

**On local minima:** the classic worry is overstated. In very high-dimensional spaces, most critical points are saddle points rather than local minima, and momentum-based optimizers pass through them. The practical difficulties are plateaus, poor conditioning, and learning-rate choice — not getting stuck in a bad minimum.

**On batch size:** larger batches give less noisy gradients and better hardware utilization, but the reduced noise can hurt generalization, and the effective learning rate usually needs scaling up with batch size. It isn't a free throughput win.

## 7. Interview Answer

> "Gradient descent updates weights by stepping against the gradient: w minus learning rate times the gradient. Backpropagation gives the direction; gradient descent decides how far to move.
>
> In practice everyone uses mini-batch — gradients from thirty-two to five hundred and twelve samples rather than the full dataset or a single sample. And the sampling noise is actually beneficial, not just a compromise: it helps escape sharp minima and saddle points.
>
> The learning rate is the single most important hyperparameter. Too high and the loss oscillates or goes to NaN; too low and training is glacial. If training is broken, I'd check the learning rate before architecture, data, or initialization — it's more often the cause than any of them.
>
> Modern training isn't plain gradient descent though. SGD with momentum accumulates a velocity term that smooths the path. Adam adds per-parameter adaptive learning rates from running estimates of the gradient's first and second moments, so parameters with small gradients get larger effective steps. AdamW — Adam with weight decay decoupled from the gradient update — is the standard for transformer and LLM training.
>
> One consequence worth stating: Adam keeps two moment estimates per parameter, usually in FP32. For a seven-billion-parameter model that's about fifty-six gigabytes of optimizer state, roughly four times the weight memory. That's a direct reason parameter-efficient fine-tuning like LoRA exists — it avoids optimizer state for the full model.
>
> On schedules, the standard recipe is warmup then cosine decay. Warmup starts the learning rate small and ramps it up over the first few thousand steps, because large updates on freshly random weights destabilize training. At scale that's not optional. Decay afterwards takes large steps to get near a minimum and small ones to settle into it.
>
> One myth I'd push back on: local minima aren't the main problem. In very high-dimensional spaces most critical points are saddle points, which momentum-based optimizers pass through. The real difficulties are plateaus, conditioning, and the learning rate."

## 8. Likely Follow-ups

**Q: What's the difference between batch, stochastic, and mini-batch?**
Batch computes the gradient over the whole dataset — stable but slow and memory-heavy. Stochastic uses one sample — fast but very noisy. Mini-batch uses thirty-two to five hundred and twelve, which is the practical default, and its noise genuinely helps escape saddle points rather than just being a compromise.

**Q: Why use Adam over plain SGD?**
Adam adapts the learning rate per parameter using running estimates of the gradient's first and second moments, so parameters with consistently small gradients still make progress. It converges faster with less tuning, which matters at transformer scale. AdamW, with decoupled weight decay, is the actual standard.

**Q: What does Adam cost?**
Two moment estimates per parameter, typically in FP32 — about four times the FP16 weight memory. For a seven-billion model that's roughly fifty-six gigabytes of optimizer state on top of weights and gradients, which is a large part of why parameter-efficient fine-tuning exists.

**Q: Why is warmup needed?**
Because at the start the weights are random and the gradient estimates are poor, so full-size updates destabilize training — especially at large scale with large batches. Ramping the learning rate up over the first few thousand steps avoids that, and it's effectively required rather than optional for transformers.

**Q: Are local minima a real problem?**
Less than the folklore suggests. In very high-dimensional spaces most critical points are saddle points rather than local minima, and momentum-based optimizers move through them. Plateaus, poor conditioning, and learning-rate choice are the practical difficulties.

## 9. Common Mistakes

- Blaming architecture when the learning rate is the problem.
- Describing training as plain SGD when AdamW is the standard.
- Not knowing Adam's memory cost.
- Omitting warmup at scale.
- Overstating local minima as the central optimization difficulty.

## 10. What to Remember

- **`w ← w − η·∂L/∂w`** — backprop gives direction, this gives step size.
- **Mini-batch is the default**, and its noise helps escape saddle points.
- **The learning rate is the first thing to check** when training fails.
- **AdamW is the standard**; its optimizer state is ~4× weight memory.
- **Warmup then cosine decay** — warmup is not optional at scale.
