# Learning Rate

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 43**

## 1. Definition

The step size `η` in the gradient descent update `θ ← θ - η·∇J(θ)`. It controls how far the parameters move per step, and it is the single most important hyperparameter in training.

## 2. Simple Explanation

How big a step you take downhill.

Too large and you overshoot the valley, bouncing across it or flying out entirely. Too small and you inch along, taking forever or stalling on a flat stretch. Most training failures are a learning-rate problem, and they're diagnosable from the loss curve alone.

## 3. How It Works

```
loss                                    loss
  │╲                                      │╲    ╱╲    ╱╲
  │ ╲___                                  │ ╲__╱  ╲__╱  ╲
  │     ╲______                           │
  │            ╲____                      │
  └──────────────────  steps              └──────────────── steps
    GOOD — smooth descent                  TOO HIGH — oscillating

loss                                    loss
  │─────────────────                      │       ╱
  │                                       │     ╱
  │                                       │   ╱  → NaN
  └──────────────────  steps              └────────────────
    TOO LOW — barely moving                WAY TOO HIGH — diverging
```

**The learning-rate range test** is the cheapest high-value thing you can run:
1. Start at a very small LR (1e-7).
2. Increase it exponentially over a few hundred steps.
3. Plot loss against log(LR).
4. Pick roughly an order of magnitude below where it starts diverging.

**Typical starting points:** 1e-3 for Adam on a fresh model; 1e-4 to 1e-5 for fine-tuning; 1e-5 to 1e-6 for LLM fine-tuning, because you want to adapt the representations rather than destroy them.

## 4. Practical Example

**Fine-tuning needs a much lower rate than training from scratch:**

```
Training from scratch:   1e-3    parameters are random; move them a lot
Fine-tuning a BERT:      2e-5    parameters are already good; nudge them
LLM LoRA fine-tune:      1e-4    adapter weights are fresh, base is frozen
```

Using 1e-3 to fine-tune a pretrained model typically destroys what it learned — this is catastrophic forgetting, and an inappropriate learning rate is the most common cause.

**Warmup exists for transformers specifically.** At step zero the Adam moment estimates are unreliable, so a full-size step can be wildly wrong and destabilize training. Warmup ramps the LR from near-zero over the first few hundred to few thousand steps, then decays it. Every transformer training recipe includes it, and knowing *why* — unreliable early moment estimates — is the differentiator.

## 5. Why It Matters

- **It's the first hyperparameter to tune**, and often the only one that matters much.
- **It's the primary diagnostic from a loss curve** — NaN, flat, and oscillating each point straight at it.
- **Fine-tuning requires a much lower rate** than training from scratch, and getting this wrong is a common expensive mistake.

## 6. Trade-offs / Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Loss → NaN | LR far too high | Drop by 10×; add gradient clipping |
| Loss oscillates without improving | LR too high for local curvature | Lower it, or add a decay schedule |
| Loss barely moves | LR too low | Raise by 10×; run a range test |
| Good then suddenly diverges | LR too high for a later, sharper region | Add a decay schedule |
| Fine-tuned model lost general ability | LR too high for fine-tuning | Drop to 1e-5 range; fewer epochs |
| Transformer unstable early | No warmup | Add linear warmup over the first few hundred steps |

**Adam doesn't remove the need to tune it.** Adam adapts the *relative* rate per parameter, but the global scale is still yours to set. "I'm using Adam so the learning rate doesn't matter" is a wrong and noticeable statement.

## 7. Interview Answer

> "The learning rate is the step size in the gradient update, and it's the single most important hyperparameter — most training failures are learning-rate problems.
>
> I can usually diagnose it from the loss curve alone. NaN or exploding loss means it's far too high. Loss oscillating without improving means it's too high for the local curvature. Loss barely moving means it's too low. Good progress then a sudden divergence usually means it needs a decay schedule, because a rate that worked early is too large for a sharper region later.
>
> The cheapest thing I'd run first is a learning-rate range test — increase it exponentially over a few hundred steps, plot loss against log learning rate, and pick about an order of magnitude below where it starts diverging. That takes minutes and saves hours.
>
> The context-dependence matters a lot. Training from scratch I'd start around 1e-3 with Adam. Fine-tuning a pretrained model I'd drop to 1e-5 or so, because the parameters are already good and I want to nudge them rather than overwrite them — using a from-scratch rate on a fine-tune is the most common cause of catastrophic forgetting.
>
> And for transformers, warmup isn't optional. At step zero Adam's moment estimates are based on almost no data and are unreliable, so a full-size step can be wildly wrong. Ramping up over the first few hundred steps and then decaying is in every transformer recipe for that reason."

## 8. Likely Follow-ups

**Q: How do you find a good learning rate?**
A range test — sweep it exponentially upward over a few hundred steps and plot loss against log LR. The usable region is where loss is dropping steeply; I'd pick roughly an order of magnitude below the point of divergence. Failing that, start from a known-good default for the architecture and adjust by factors of ten based on the loss curve.

**Q: Why does fine-tuning need a lower learning rate?**
Because the pretrained parameters already encode useful structure, and large steps overwrite it. You want to adapt the representations to your task, not restart the search. A from-scratch rate applied to a fine-tune destroys general capability — that's catastrophic forgetting, and an inappropriate learning rate is its most common cause.

**Q: What is warmup and why do transformers need it?**
A linear or cosine ramp from near-zero to the target rate over the first few hundred to few thousand steps. Transformers need it because Adam's first- and second-moment estimates are computed from very few gradients at the start and are unreliable, so a full-size step can be badly misdirected and destabilize training permanently. Warmup lets those estimates stabilize before taking real steps.

**Q: Does Adam eliminate the need to tune the learning rate?**
No. Adam adapts the *relative* step size per parameter based on gradient history, but the global scale is still a hyperparameter you set. Adam is more forgiving of a bad choice than plain SGD, which is why 1e-3 is a reasonable default, but I'd still tune it — and for fine-tuning, the right value is orders of magnitude away from the default.

**Q: Should the learning rate stay constant?**
Usually not. A rate that's good early is typically too large late, when you're near a minimum and need finer steps. Cosine decay and linear decay are the common schedules, generally with warmup at the start. That's [learning rate scheduling](49-learning-rate-scheduling.md), and it reliably improves final performance over a constant rate.

## 9. Common Mistakes

- Not running a range test before a long training run.
- Using a from-scratch learning rate for fine-tuning.
- Saying Adam makes the learning rate unimportant.
- Skipping warmup for transformer training.
- Searching the learning rate on a linear rather than log scale.

## 10. What to Remember

- **Step size `η`.** The most important hyperparameter, tune it first.
- **Diagnose from the loss curve:** NaN → too high. Flat → too low. Oscillating → too high for the curvature.
- **Range test is cheap and high-value** — sweep exponentially, pick an order of magnitude below divergence.
- **Fine-tuning needs ~10–100× lower** than training from scratch.
- **Warmup for transformers**, because early Adam moment estimates are unreliable.
