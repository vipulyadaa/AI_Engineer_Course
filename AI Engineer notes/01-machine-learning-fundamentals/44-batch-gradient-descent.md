# Batch Gradient Descent

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 44**

## 1. Definition

Gradient descent where each update uses the gradient computed over the **entire training dataset**. One update per epoch. Also called full-batch or vanilla gradient descent.

## 2. Simple Explanation

Before taking a single step, you survey the whole terrain — every training example — to determine the exact best direction. Then you take one step. Then you survey everything again.

The direction is as accurate as possible. The problem is obvious: with a million examples you get one step per full pass over the data, so you'd need thousands of passes to converge. It's precise and impractically slow.

## 3. How It Works

```
for epoch in range(n_epochs):
    predictions = model(X_all)              # ALL n examples
    loss = loss_fn(predictions, y_all)
    gradient = compute_gradient(loss)       # averaged over all n
    theta = theta - lr * gradient           # ONE update per epoch
```

1. Forward pass over the full dataset.
2. Average the loss across all examples.
3. Compute one gradient.
4. Take one step.

**Properties:**
- **Deterministic** — same data, same starting point, same trajectory every time.
- **Smooth loss curve** — no batch-to-batch noise.
- **Guaranteed convergence to a local minimum** with a suitable learning rate (on a convex problem, the global minimum).
- **Requires the whole dataset in memory**, or a full pass per step.

## 4. Practical Example

**The convergence-per-time comparison is the point:**

```
1,000,000 training examples

Batch GD:       1 update per epoch
                100 epochs → 100 updates total
                Each update: 1,000,000 example computations

Mini-batch(256): 3,906 updates per epoch
                100 epochs → 390,600 updates
                Each update: 256 example computations

Same total computation. Mini-batch takes ~3,900× more steps.
It converges in a fraction of the wall-clock time.
```

**Where you'd genuinely use it:** small datasets (under a few thousand rows), convex problems like linear or logistic regression on modest data, or when you need exact reproducibility for a proof or a regulatory artifact. Classical solvers like `LogisticRegression`'s lbfgs are full-batch methods, so if you've used scikit-learn on a small dataset, you've used it.

## 5. Why It Matters

- **It's the reference definition.** SGD and mini-batch are both understood as approximations to it.
- **The comparison explains why mini-batch won** — it's a computation-efficiency argument, not an accuracy one.
- **Its noiselessness is a disadvantage**, not just a slowness problem — gradient noise helps escape saddle points and sharp minima.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **One update per epoch** | Impractically slow convergence on large data |
| **Memory** | Requires the full dataset or a full pass per step |
| **No gradient noise** | Noise helps escape saddle points and flat regions; full batch has none |
| **Can't do online learning** | You need the whole dataset up front |
| **Poor GPU utilization pattern** | The compute is fine, but you get one parameter update for all that work |

**The counterintuitive point:** full-batch gradient descent is *worse* at escaping saddle points than noisy mini-batch descent, despite computing a more accurate gradient. At a saddle point the true gradient is near zero, so full batch stalls — while mini-batch noise pushes it off. Accuracy of the gradient isn't the only thing that matters.

## 7. Interview Answer

> "Batch gradient descent computes the gradient over the entire training set for each update, so you get one parameter update per epoch. The gradient is as accurate as possible and the trajectory is completely deterministic.
>
> The problem is convergence speed. With a million examples and a hundred epochs, that's a hundred parameter updates total. Mini-batch with size 256 does about 3,900 updates per epoch — nearly 400,000 over the same hundred epochs, for the same total computation. It converges in a fraction of the wall-clock time, which is why mini-batch is the universal default.
>
> There's a less obvious disadvantage too: the lack of gradient noise. At a saddle point the true gradient is near zero, so full-batch descent stalls there. Mini-batch noise pushes it off. So a more accurate gradient isn't strictly better — the noise is doing useful work, and it also acts as a mild regularizer.
>
> Where I'd actually use it: small datasets, convex problems, or when I need exact reproducibility. Classical solvers like scikit-learn's lbfgs for logistic regression are full-batch methods, so it's not purely theoretical.
>
> Mainly though, it's the reference point — SGD and mini-batch are both understood as approximations to this, trading gradient accuracy for many more updates."

## 8. Likely Follow-ups

**Q: Why isn't batch gradient descent used for deep learning?**
Convergence speed. One update per epoch means thousands of epochs to converge, and each epoch requires a full pass over data that may not fit in memory. Mini-batch gets thousands of updates per epoch for the same computation. It's a pure efficiency argument — the full-batch gradient is more accurate, it's just not worth what it costs.

**Q: Is the full-batch gradient always better than a mini-batch one?**
It's a more accurate estimate of the true gradient, but that doesn't make it better for optimization. Mini-batch noise helps escape saddle points, where the true gradient is near zero and full batch would stall, and it acts as a mild regularizer that often improves generalization. More accurate isn't the same as more useful here.

**Q: Does it guarantee finding the global minimum?**
Only on a convex problem, where any local minimum is global. Neural network loss surfaces are non-convex, so batch gradient descent converges to *a* local minimum or a saddle point, with no global guarantee. It does give a deterministic trajectory, so the same initialization always produces the same result — which is a reproducibility property, not an optimality one.

**Q: When would you actually use it?**
Small datasets where a full pass is cheap. Convex problems like linear or logistic regression, where classical solvers like lbfgs are full-batch anyway. And situations requiring exact reproducibility — a regulatory artifact or a paper result where you need the trajectory to be deterministic.

**Q: How does it relate to SGD and mini-batch?**
They're the same algorithm with different batch sizes. Full batch uses n examples per gradient, SGD uses 1, mini-batch uses something in between, typically 32 to 512. Larger batches give lower-variance gradients and fewer updates; smaller batches give noisier gradients and more updates. Mini-batch sits at the practical optimum for both gradient quality and hardware utilization.

## 9. Common Mistakes

- Calling mini-batch gradient descent "batch gradient descent" — the terms are frequently confused, and `batch_size` in frameworks refers to the mini-batch.
- Claiming the more accurate gradient is strictly better.
- Saying it guarantees the global minimum without noting that requires convexity.
- Assuming it's purely theoretical — classical solvers use it.

## 10. What to Remember

- **Gradient over the entire dataset; one update per epoch.**
- **Deterministic and smooth**, but impractically slow at scale.
- **The real cost is updates per unit compute** — mini-batch gets thousands more for the same work.
- **No gradient noise is a disadvantage** — noise escapes saddle points and regularizes.
- **Still used** for small data, convex problems, and classical solvers like lbfgs.
