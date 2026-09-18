# Training

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 11**

## 1. Definition

The process of adjusting a model's **parameters** to minimize a loss function on labeled data. It's an optimization loop: predict, measure the error, compute gradients, update the weights, repeat.

## 2. Simple Explanation

Training is turning knobs until the output stops being wrong.

The model starts with random parameters and makes terrible predictions. The loss function scores how terrible. Gradients say which direction to turn each knob to make it less terrible. You take a small step and repeat — millions of times.

## 3. How It Works

1. **Initialize parameters** — random, but carefully scaled (Xavier/He initialization) so signals don't explode or vanish in deep networks.
2. **Forward pass** — feed a batch through the model to get predictions.
3. **Compute loss** — compare predictions to labels.
4. **Backward pass** — backpropagation computes `∂L/∂θ` for every parameter.
5. **Update** — the optimizer steps: `θ ← θ - η·∇L` (or Adam's adaptive version).
6. **Repeat** for many batches and many [epochs](47-epoch.md), checking validation loss periodically to know when to stop.

**What's being decided while you train:**

| Knob | Effect |
|---|---|
| [Learning rate](43-learning-rate.md) | Step size. The most important hyperparameter |
| [Batch size](48-batch-size.md) | Gradient noise vs. throughput |
| Optimizer | SGD, SGD+momentum, Adam/AdamW (the default for transformers) |
| Epochs | How many passes — usually decided by [early stopping](50-early-stopping.md) |
| Regularization | Weight decay, [dropout](../02-deep-learning/15-dropout.md) |

## 4. Practical Example

A healthy training run and a sick one:

```
        HEALTHY                          OVERFITTING
epoch   train    val                epoch   train    val
  1     0.693   0.688                 1     0.693   0.688
  5     0.412   0.431                 5     0.412   0.431
 10     0.288   0.310                10     0.288   0.310
 15     0.241   0.298                15     0.190   0.315  ← val turns up
 20     0.225   0.294                20     0.088   0.402  ← gap widening
        ↑ both falling, gap stable           ↑ memorizing. Stop at ~12.
```

**Reading the two curves together is the core diagnostic skill.** Both high and close → underfitting. Train low, val high and rising → overfitting. Train not falling at all → learning rate wrong, or a bug.

**Where you actually touch training:** fine-tuning an embedding model on domain pairs, or a LoRA adapter. Full pretraining is not something an AI Engineer typically does.

## 5. Why It Matters

- **It's where the cost lives** — GPU hours, data pipelines, experiment tracking.
- **The training/serving boundary is where bugs hide.** If the feature transform at training differs from the one at serving, your offline metrics are meaningless. This is the most common cause of "great offline, no lift online."
- **Reproducibility is an engineering requirement** — seed, data version, code version, and hyperparameters must all be recorded or you can't explain a regression.

## 6. Trade-offs / Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Loss doesn't decrease | LR too high (diverging) or too low (stuck); bug in the loss | LR range test; overfit a tiny batch first as a sanity check |
| Loss becomes NaN | Exploding gradients, `log(0)`, bad LR | Gradient clipping, epsilon in logs, lower LR |
| Train falls, val rises | Overfitting | Early stopping, regularization, more data |
| Both plateau high | Underfitting | Bigger model, better features, train longer |
| Results differ every run | Unseeded randomness | Fix seeds; accept some GPU nondeterminism |
| Great offline, flat online | Training/serving skew | Log served feature vectors and re-score offline |

**The best debugging trick:** before training on the full dataset, deliberately **overfit a batch of 10 examples**. If the model can't drive that loss to near zero, you have a bug — not a data problem.

## 7. Interview Answer

> "Training is the optimization loop that fits a model's parameters to data. Forward pass to get predictions, compute the loss, backpropagate to get gradients for every parameter, then the optimizer steps the weights downhill. Repeat over batches and epochs.
>
> What I actually watch is the two loss curves together. Both falling with a stable gap is healthy. Training falling while validation turns upward means it's started memorizing, and that's my cue to stop. Both plateaued high means underfitting — the model or features aren't capable enough. Training loss not moving at all usually means the learning rate is wrong or there's a bug.
>
> My first debugging move is always to overfit a tiny batch — ten examples. If the model can't drive that to near-zero loss, the problem is a bug, not the data, and that saves hours.
>
> The production concern I'd raise is training/serving skew. If the feature transformation in the training pipeline differs from the one in the serving path, the offline metrics don't describe the deployed system at all — and that's the most common explanation for a model that looks great offline and delivers nothing in an A/B test."

## 8. Likely Follow-ups

**Q: How do you know when to stop training?**
Early stopping on validation loss — track it each epoch, keep the best checkpoint, and stop when it hasn't improved for a set patience. The important detail is restoring the best weights rather than the last ones, since validation loss is noisy and the final epoch usually isn't the best.

**Q: Training loss is decreasing but validation loss is increasing. What do you do?**
That's overfitting. In order: stop at the epoch where validation bottomed, then add regularization — weight decay, dropout, or data augmentation. Then consider a smaller model or more data. I'd check for leakage too, because an unusually early and sharp divergence sometimes means a feature is giving away the answer on train but not generalizing.

**Q: What's the difference between training and fine-tuning?**
Training from scratch starts with random parameters and needs massive data. Fine-tuning starts from pretrained weights and adapts them with a small labeled set and a much lower learning rate — typically 10–100× lower, because you want to adapt the representations rather than destroy them. Parameter-efficient methods like LoRA update only a small adapter instead of all weights.

**Q: Why does batch size matter?**
It trades gradient noise against throughput. Small batches give noisy gradients that act as a mild regularizer and can help generalization, but they underuse the GPU. Large batches are efficient and stable but often generalize slightly worse and need a scaled-up learning rate. In practice it's usually set by what fits in GPU memory.

**Q: What makes training reproducible?**
Seeded randomness across all libraries, a pinned data version, pinned code and dependency versions, and recorded hyperparameters. Full bit-level determinism on GPU is often impractical because some kernels are nondeterministic, so the realistic goal is that a rerun lands within noise of the original — and that you can explain any difference.

## 9. Common Mistakes

- Not watching validation loss during training.
- Reporting the final epoch's metrics instead of the best checkpoint's.
- Tuning against the test set.
- Forgetting that preprocessing must be identical at training and serving time.
- Assuming a loss that isn't decreasing is a data problem, before sanity-checking with a tiny-batch overfit.
- Not recording the seed, data version, or hyperparameters.

## 10. What to Remember

- **Forward → loss → backward → update.** That's the entire loop.
- **Read train and validation curves together** — that diagnosis covers most training problems.
- **Overfit 10 examples first.** Can't? It's a bug, not the data.
- **Training/serving skew** is the top cause of "good offline, useless online."
- **Learning rate is the most important hyperparameter**; restore the best checkpoint, not the last.
