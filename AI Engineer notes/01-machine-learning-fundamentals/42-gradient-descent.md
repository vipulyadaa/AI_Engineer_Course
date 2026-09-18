# Gradient Descent

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 42**

## 1. Definition

The optimization algorithm behind essentially all modern ML. Compute the gradient of the loss with respect to the parameters, step in the opposite direction, repeat: `θ ← θ - η·∇J(θ)`.

## 2. Simple Explanation

You're on a hill in fog, trying to reach the bottom. You can't see the valley, but you can feel which way the ground slopes. So you take a step downhill, feel again, step again.

The gradient is the slope. The [learning rate](43-learning-rate.md) is your step size. That's the entire algorithm.

## 3. How It Works

1. **Forward pass** — compute predictions and the loss.
2. **Backward pass** — backpropagation computes `∂J/∂θ` for every parameter via the chain rule.
3. **Update** — `θ ← θ - η·∇J(θ)`. The minus sign is what makes it *descent*.
4. **Repeat** for many batches and epochs.

**The gradient points in the direction of steepest increase**, which is why you subtract it.

**The three variants** differ only in how much data each gradient is computed from:

| Variant | Data per step | Trade-off |
|---|---|---|
| [Batch GD](44-batch-gradient-descent.md) | All of it | Accurate gradient, very slow, one step per epoch |
| [SGD](45-stochastic-gradient-descent.md) | One example | Very noisy, fast steps, poor hardware utilization |
| [Mini-batch](46-mini-batch-gradient-descent.md) | 32–512 examples | **The practical default** — good gradient estimate, GPU-efficient |

**The optimizers you'd actually use:**

| Optimizer | Idea |
|---|---|
| **SGD + momentum** | Accumulate a velocity term to smooth oscillations and accelerate along consistent directions |
| **Adam** | Per-parameter adaptive learning rates from first and second gradient moments |
| **AdamW** | Adam with decoupled weight decay — **the standard for transformers** |

## 4. Practical Example

**One step, by hand** — logistic regression, four spam examples, feature = count of "free":

```
Data:  x = [0, 1, 3, 5],  y = [0, 0, 1, 1]
Start: w = 0, b = 0  →  every prediction σ(0) = 0.5

∂J/∂w = (1/4)·Σ(ŷᵢ - yᵢ)·xᵢ
      = (1/4)·[(0.5)(0) + (0.5)(1) + (-0.5)(3) + (-0.5)(5)]
      = (1/4)·(-3.5) = -0.875

w ← 0 - 1.0·(-0.875) = +0.875

The weight on "free" went positive after ONE step —
the model already learned the direction of the relationship.
Loss fell from 0.693 to 0.500.
```

Notice that one example got *worse* while the average improved. **Optimization improves the average, not every example** — which explains most "but it regressed on my favorite test case" conversations.

## 5. Why It Matters

- **It's how every neural network, every LLM, and every embedding model was trained.**
- **Understanding the update rule explains the hyperparameters** — learning rate, batch size, momentum, schedules all modify this one line.
- **The failure modes are diagnosable from it** — divergence, plateaus, and oscillation each have a distinct signature.

## 6. Trade-offs / Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| **Loss → NaN or explodes** | Learning rate too high; exploding gradients | Lower LR; gradient clipping |
| **Loss barely moves** | LR too low, or vanishing gradients | LR range test; better init; residual connections |
| **Loss oscillates** | LR too high for the local curvature | Lower LR; add momentum; use a schedule |
| **Stuck on a plateau** | Saddle point or flat region | Momentum; adaptive optimizer; LR restarts |
| **Different result each run** | Random init and shuffling | Fix seeds; run multiple seeds before claiming an improvement |

**On local minima:** they're much less of a problem in high dimensions than intuition suggests. In a space with millions of parameters, a point that's a minimum in *every* direction is vanishingly rare — saddle points, where the surface curves up in some directions and down in others, are the real obstacle, and momentum handles them well. Saying this correctly is a good signal.

## 7. Interview Answer

> "Gradient descent is the optimization algorithm behind essentially all modern ML. You compute the gradient of the loss with respect to the parameters, then step in the opposite direction — theta minus learning rate times the gradient. The gradient points toward steepest increase, so subtracting it goes downhill.
>
> The variants differ only in how much data each gradient uses. Full batch gives the most accurate gradient but one step per epoch, so it's impractically slow. Pure SGD uses one example, so steps are fast and very noisy. Mini-batch, typically 32 to 512 examples, is the practical default — the gradient estimate is good enough and it maps well onto GPU parallelism.
>
> In practice I'd use AdamW for transformers. Adam adapts the learning rate per parameter from the first and second moments of the gradient, and the W is decoupled weight decay, which matters because L2 in the loss and true weight decay aren't equivalent under adaptive optimizers.
>
> On failure modes: NaN or exploding loss means the learning rate is too high or gradients are exploding — lower it, add clipping. Loss not moving means the rate is too low or gradients are vanishing. Oscillation means too high for the local curvature, so momentum or a schedule helps.
>
> One correction I'd offer on local minima — in a million-dimensional space, a point that's a minimum in every direction is vanishingly rare. Saddle points are the real obstacle, and momentum is what gets you through them."

## 8. Likely Follow-ups

**Q: Why not use full-batch gradient descent?**
Because it computes one update per pass over the entire dataset, so with a million examples you'd get one step per epoch — convergence would take forever. It also requires holding the whole dataset in memory. Mini-batch gives a slightly noisier gradient but hundreds or thousands of updates per epoch, which is a far better trade, and the noise acts as a mild regularizer.

**Q: What does momentum do?**
It accumulates an exponentially weighted average of past gradients into a velocity term, then steps along that. Consistent directions accumulate and accelerate; oscillating directions cancel out. Practically it dampens zig-zagging in narrow ravines and carries the optimizer through saddle points and small local minima.

**Q: Adam vs. SGD?**
Adam adapts the learning rate per parameter, so it converges faster with less tuning and handles sparse gradients well — it's the default for transformers. SGD with momentum and a good schedule sometimes generalizes slightly better in vision, which is why it's still used in some image benchmarks. For anything LLM-related, AdamW is the standard.

**Q: What are vanishing and exploding gradients?**
In deep networks, backpropagation multiplies gradients through layers. If those factors are consistently below one, the gradient shrinks exponentially and early layers stop learning — vanishing. If consistently above one, it grows exponentially and training blows up — exploding. Mitigations: careful initialization, ReLU-family activations, residual connections, layer normalization, and gradient clipping for the exploding case.

**Q: Does gradient descent find the global minimum?**
Not guaranteed — the loss surface is non-convex for any neural network. But in practice it finds solutions that generalize well, and the reason is that in very high dimensions, most critical points are saddles rather than poor local minima, and the minima that do exist tend to have similar loss values. So the guarantee is missing and the empirical behavior is fine.

## 9. Common Mistakes

- Overstating local minima as the main obstacle — saddle points are.
- Not doing a learning-rate range test before a long training run.
- Using Adam with an L2 loss term instead of AdamW for transformers.
- Forgetting gradient clipping on models prone to instability.
- Claiming an improvement smaller than seed-to-seed variation.

## 10. What to Remember

- **`θ ← θ - η·∇J(θ)`.** That one line is the whole algorithm.
- **Mini-batch is the practical default;** AdamW is the transformer standard.
- **Diagnose from the loss curve:** NaN → LR too high. Flat → LR too low. Oscillating → too high for the curvature.
- **Saddle points, not local minima**, are the real obstacle in high dimensions.
- **Optimization improves the average, not every example.**
