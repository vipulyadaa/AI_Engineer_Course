# ReLU

> **Phase 02 · DEEP LEARNING · Topic 07**

## 1. Definition

Rectified Linear Unit: `f(z) = max(0, z)`. Passes positive values through unchanged and clips negatives to zero. The default activation for hidden layers.

## 2. Simple Explanation

If the number is positive, keep it. If it's negative, make it zero.

That's the whole function. Its value is in what it *doesn't* do — it doesn't saturate, so gradients don't shrink as they pass backwards through many layers.

## 3. How It Works

```
        f(z) = max(0, z)

     f(z)
      │      ╱
      │    ╱
      │  ╱
   ───┼────────── z
      │

Gradient:  1  for z > 0
           0  for z < 0
           undefined at 0 (implementations use 0)
```

**Why the constant gradient matters:**

```
Backpropagation MULTIPLIES gradients through layers.

  sigmoid: max gradient 0.25
           0.25^10 ≈ 0.00000095   → gradient vanishes

  ReLU:    gradient 1 where active
           1^10 = 1               → gradient survives

That's the entire reason deep networks became trainable.
```

## 4. Practical Example

**The cost: dead neurons.**

```
If a neuron's pre-activation is negative for EVERY input:

  output   = 0
  gradient = 0
  update   = 0
  → permanently dead, forever

Causes:
  · learning rate too high — a large update pushes the
    weights somewhere they can't return from
  · large negative bias

At high learning rates, a substantial fraction of a layer can
die. The usual fix is lowering the learning rate, not changing
the activation.
```

**The variants, and when they're worth it:**

| Variant | Formula | Purpose |
|---|---|---|
| **Leaky ReLU** | `max(0.01z, z)` | Small gradient for negatives — no dead neurons |
| **PReLU** | `max(az, z)`, `a` learned | Learns the leak per channel |
| **ELU** | exponential below zero | Smooth, zero-centred outputs |
| **GELU** | smooth, probabilistic gating | Transformers |

**In practice ReLU remains the default for non-transformer work** because the variants add complexity for modest and inconsistent gains. GELU in transformers is the one substitution that's clearly standard.

**Sparsity as a side effect:** ReLU zeroes roughly half the activations at initialization, which makes representations sparse and computation slightly cheaper. It's sometimes cited as a benefit; it's better understood as a consequence than a design goal.

## 5. Why It Matters

- **It solved vanishing gradients in hidden layers**, which is what made deep networks trainable.
- **It's computationally trivial** — a comparison, not an exponential.
- **Dead neurons are its real cost**, and the fix is usually the learning rate.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Dead neurons** | Permanently zero output and gradient |
| **Not zero-centred** | All outputs ≥ 0, which can slow convergence |
| **Unbounded above** | Activations can grow large; normalization helps |
| **Non-differentiable at zero** | Harmless in practice; implementations pick 0 |

**On not being zero-centred:** because ReLU outputs are always non-negative, the gradients with respect to a layer's weights all share a sign within a step, which can make optimization zigzag. Batch or layer normalization largely neutralizes this, which is part of why normalization and ReLU are so often used together.

## 7. Interview Answer

> "ReLU is max of zero and z — positive values pass through unchanged, negatives become zero. It's the default activation for hidden layers.
>
> The reason it matters is the gradient. Backpropagation multiplies gradients as they pass backwards through layers. Sigmoid's gradient peaks at 0.25, so across ten layers you get 0.25 to the tenth, which is about one in a million — the gradient vanishes and early layers stop learning. ReLU's gradient is exactly one wherever the neuron is active, so one to the tenth is still one and the gradient survives arbitrary depth. That's the whole reason deep networks became trainable, and it's largely why deep learning started working in the early 2010s.
>
> It's also computationally trivial — a comparison rather than an exponential — which matters when you're doing it billions of times.
>
> The cost is dead neurons. If a neuron's pre-activation is negative for every input, it outputs zero, its gradient is zero, and it never updates again — permanently dead. The usual cause is a learning rate high enough that one large update pushes the weights somewhere they can't return from, and at high learning rates a substantial fraction of a layer can die. The fix is usually lowering the learning rate rather than switching activation.
>
> There are variants — leaky ReLU keeps a small gradient for negatives, PReLU learns the leak, ELU is smooth — but in practice plain ReLU remains the default for non-transformer work because the variants add complexity for modest and inconsistent gains. The one clearly standard substitution is GELU in transformers.
>
> One secondary issue: ReLU outputs are always non-negative, so it isn't zero-centred, which can make optimization zigzag. Batch or layer normalization largely neutralizes that, which is part of why normalization and ReLU are so commonly paired."

## 8. Likely Follow-ups

**Q: Why did ReLU replace sigmoid?**
Because sigmoid saturates — its gradient peaks at 0.25 and approaches zero at the extremes — so multiplying it through many layers makes gradients vanish and deep networks stop training. ReLU's gradient is exactly one where active, so it survives depth. It's also far cheaper to compute.

**Q: What's the dead ReLU problem?**
A neuron whose pre-activation is negative for all inputs outputs zero and has zero gradient, so it never updates again. It's permanent. High learning rates are the usual cause, since a single large update can push weights past recovery, and the standard fix is lowering the learning rate.

**Q: Should you use leaky ReLU instead?**
Usually not by default. It prevents dead neurons by keeping a small gradient for negative inputs, but the gains over plain ReLU are modest and inconsistent in practice. I'd reach for it if I saw evidence of widespread dead neurons rather than preemptively.

**Q: Is ReLU differentiable at zero?**
Strictly no, but it doesn't matter — implementations define the gradient at zero as zero and training is unaffected, since exact zero pre-activations are measure-zero in practice. It's a theoretical concern rather than a practical one.

**Q: Why is ReLU paired with normalization so often?**
Partly because ReLU isn't zero-centred — all its outputs are non-negative, so weight gradients share a sign within a step and optimization can zigzag. Normalization recentres activations and neutralizes that, alongside its other stability benefits.

## 9. Common Mistakes

- Not knowing why sigmoid's gradient causes vanishing.
- Claiming dead neurons recover — they don't.
- Recommending leaky ReLU by default without evidence of a problem.
- Overstating sparsity as a design goal rather than a side effect.
- Forgetting that transformers use GELU rather than ReLU.

## 10. What to Remember

- **`max(0, z)`** — gradient 1 where active, 0 where not.
- **Constant gradient is why deep networks train** — sigmoid's 0.25 vanishes.
- **Computationally trivial**: a comparison, not an exponential.
- **Dead neurons are permanent**; the usual cause is a high learning rate.
- **GELU replaces it in transformers**; other variants rarely justify themselves.
