# Stochastic Gradient Descent (SGD)

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 45**

## 1. Definition

Gradient descent that updates parameters using the gradient from a **single randomly chosen example** at a time. Strictly, "SGD" means batch size 1 — though in practice the term is used loosely for mini-batch as well.

## 2. Simple Explanation

Instead of surveying the whole terrain before stepping, you glance at one spot and step immediately.

Each step is based on very little information, so the direction is noisy — you zig-zag. But you take enormously more steps in the same time, and the zig-zagging averages out. You reach the bottom faster despite the wandering.

## 3. How It Works

```
for epoch in range(n_epochs):
    shuffle(data)                        # shuffling matters — see below
    for x_i, y_i in data:
        pred = model(x_i)                # ONE example
        loss = loss_fn(pred, y_i)
        theta = theta - lr * gradient(loss)   # update immediately
```

1. Shuffle each epoch, so the model doesn't learn the data order.
2. For each example: predict, compute loss, update immediately.
3. n updates per epoch instead of one.

**The noise is a feature, not just a cost:**
- It helps escape **saddle points**, where the true gradient is near zero and full-batch descent would stall.
- It acts as a **mild regularizer**, discouraging convergence into sharp minima that generalize poorly.
- It enables **online learning** — you can update from a stream without ever holding the full dataset.

## 4. Practical Example

**The trade-off in one picture:**

```
Full batch: smooth, direct, few steps      SGD: noisy, wandering, many steps

    ╲                                          ╲ ╱╲
     ╲___                                       ╳  ╲╱╲
         ╲___                                  ╱ ╲  ╱ ╲_
             ╲__ ●                              ╲_╱     ╲● 
  100 updates total                         1,000,000 updates
```

**Why pure SGD isn't used in practice:** batch size 1 means one example at a time through a GPU designed to process hundreds in parallel. You get the most updates but abysmal hardware utilization, so wall-clock time is worse than mini-batch despite more steps. [Mini-batch](46-mini-batch-gradient-descent.md) at 32–512 captures the noise benefits while using the hardware properly.

**Terminology note worth knowing:** `torch.optim.SGD` and `SGDClassifier` don't enforce batch size 1 — they implement the update rule, and the batch size comes from your data loader. So "SGD" in code almost always means mini-batch. Being precise about this in an interview is a small credibility signal.

## 5. Why It Matters

- **It's the conceptual foundation** for every optimizer actually used — Adam and AdamW are SGD with adaptive per-parameter scaling.
- **The noise-as-regularizer insight** explains why the "worse" gradient often generalizes better.
- **It enables online and streaming learning**, which batch methods can't do.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Very noisy convergence** | Loss curve is jagged; needs smoothing to read. Use a learning-rate schedule to settle |
| **Poor hardware utilization** | Batch size 1 wastes GPU parallelism entirely |
| **Sensitive to learning rate** | Noisy gradients plus a large step size diverge readily |
| **Won't settle at a minimum** | Constant noise means it oscillates around the optimum; decaying the LR fixes this |
| **Order matters if not shuffled** | Without per-epoch shuffling the model can learn the data ordering |

**Momentum is the standard companion.** It accumulates a velocity from past gradients, so consistent directions accelerate and the noise largely cancels — SGD with momentum is a genuinely competitive optimizer, and still preferred over Adam in some vision benchmarks.

## 7. Interview Answer

> "Stochastic gradient descent updates the parameters from a single randomly chosen example at a time, rather than the full dataset. Each step is noisy because it's based on one example, but you take vastly more steps — n updates per epoch instead of one — and the noise averages out.
>
> The key insight is that the noise isn't just a cost you tolerate. It helps escape saddle points, where the true gradient is near zero and full-batch descent would stall. It acts as a mild regularizer, discouraging convergence into sharp minima that generalize badly. And it enables online learning from a stream without holding the whole dataset.
>
> Pure SGD isn't what anyone actually runs, though. Batch size one means feeding one example at a time through a GPU built to process hundreds in parallel — you get the most updates and terrible hardware utilization. Mini-batch at 32 to 512 keeps the noise benefits and uses the hardware properly, which is why it's the universal default.
>
> A terminology point: `torch.optim.SGD` doesn't enforce batch size one — it implements the update rule and the batch size comes from the data loader. So 'SGD' in code almost always means mini-batch.
>
> In practice I'd pair it with momentum, which accumulates velocity so consistent directions accelerate and the noise mostly cancels. SGD with momentum and a good schedule is still competitive with Adam, particularly in vision."

## 8. Likely Follow-ups

**Q: Why is the noise beneficial?**
Three reasons. At a saddle point the true gradient is near zero so full-batch descent stalls, while noise pushes SGD off it. The noise acts as a mild regularizer, biasing toward flatter minima that tend to generalize better than sharp ones. And it lets the optimizer escape poor local minima it would otherwise settle into.

**Q: SGD vs. mini-batch — what's the practical difference?**
Batch size. SGD is technically 1; mini-batch is 32 to 512. Mini-batch gets a lower-variance gradient estimate and, crucially, uses GPU parallelism properly — a batch of 256 costs barely more wall-clock time than a batch of 1 on modern hardware. So mini-batch wins on both gradient quality and speed, which is why pure SGD is essentially never used.

**Q: Why does shuffling matter?**
Because without it the model sees examples in a fixed order every epoch and can learn patterns from that ordering. If the data is sorted by class, it sees all of class A then all of class B, and the gradients pull consistently in one direction and then another. Shuffling each epoch keeps the sequence of gradient estimates unbiased.

**Q: How does momentum help SGD specifically?**
It accumulates an exponentially weighted average of past gradients. Since the noise in individual gradients is largely independent, it cancels in the average, while the consistent signal component accumulates. So you get most of the noise benefits for escaping bad regions with much smoother effective movement toward the minimum.

**Q: Is SGD still used given Adam exists?**
Yes. SGD with momentum and a well-tuned schedule still matches or beats Adam on some vision benchmarks, and there's a body of work suggesting it finds flatter minima that generalize better. Adam converges faster with less tuning, which is why it's the default for transformers and for most practical work. The choice is mostly about tuning budget and domain convention.

## 9. Common Mistakes

- Saying "SGD" when you mean mini-batch without noting the distinction.
- Describing the noise as purely a downside.
- Forgetting to shuffle between epochs.
- Using a constant learning rate and wondering why it never settles at the minimum.
- Claiming Adam has universally replaced SGD.

## 10. What to Remember

- **One example per update.** Noisy gradient, many more steps.
- **The noise is useful** — escapes saddle points, regularizes, enables online learning.
- **Pure SGD wastes GPU parallelism**, which is why mini-batch is the default.
- **`torch.optim.SGD` is really mini-batch** — batch size comes from the loader.
- **Pair with momentum** to cancel noise while keeping its benefits.
