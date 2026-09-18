# Exploding Gradients

> **Phase 02 · DEEP LEARNING · Topic 14**

## 1. Definition

Gradients growing without bound as they propagate backwards, producing enormous weight updates that destroy the model. The mirror image of vanishing gradients — same multiplicative mechanism, opposite direction.

## 2. Simple Explanation

If the per-layer factors in the backward pass are consistently greater than one, the product grows instead of shrinking.

The weight update becomes huge, the weights jump somewhere nonsensical, and the loss becomes NaN. Unlike vanishing, this failure is loud — which makes it easier to diagnose.

## 3. How It Works

```
Factors of 1.5 per layer:

  10 layers:  1.5¹⁰ ≈ 58
  20 layers:  1.5²⁰ ≈ 3,325
  30 layers:  1.5³⁰ ≈ 192,000

The update overshoots massively. Weights land in a region
where activations overflow → inf → NaN → training is over.

Once weights are NaN, every subsequent computation is NaN.
It is not recoverable — you restart from a checkpoint.
```

**Symptoms, in order of appearance:** loss spikes → loss becomes `inf` → loss becomes `NaN` → all weights `NaN`.

## 4. Practical Example

**Gradient clipping is the standard fix, and it's nearly free:**

```python
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
```

```
It rescales the ENTIRE gradient vector if its norm exceeds
the threshold:

  if ||g|| > max_norm:
      g ← g × max_norm / ||g||

The DIRECTION is preserved; only the magnitude is capped.
That's why it's safe — it doesn't distort which way to move,
just how far.

Clip by NORM, not by value. Clipping each element
independently does change the direction.
```

**Every large-scale training run uses it.** Standard practice for transformers is `max_norm=1.0`, applied on every step.

**The other causes worth naming:**

```
· Learning rate too high — the most common cause overall
· Poor initialization with too-large variance
· RNNs over long sequences — the classic case, since the
  same weight matrix is applied repeatedly
· A bad batch — outliers or corrupt data producing an
  enormous loss
```

**That last one is often missed.** A single malformed record can produce a huge loss and a correspondingly huge gradient. If training explodes reproducibly at the same step, inspect the data at that step before touching hyperparameters.

## 5. Why It Matters

- **It's the loud failure**, so it's diagnosable — unlike vanishing.
- **Gradient clipping is a one-line, standard fix** used in every large training run.
- **A bad batch is a real cause**, and checking the data first can save days.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **NaN weights are unrecoverable** | Restart from a checkpoint |
| **Clipping by value** | Distorts the gradient direction |
| **Clipping masking a real problem** | Learning rate or data may still be wrong |
| **Threshold too low** | Slows learning by capping legitimate gradients |
| **FP16 overflow** | Narrower range makes explosion easier |

**On clipping masking problems:** clipping keeps training alive, but if it's engaging on most steps, something upstream is wrong — usually the learning rate. I'd monitor how often clipping triggers; occasional is healthy, constant is a symptom rather than a solution.

**On mixed precision:** FP16's narrower range makes overflow easier, which is why mixed-precision training uses loss scaling — multiply the loss by a large factor so gradients stay in representable range, then unscale before the update. Frameworks handle this automatically, but knowing *why* it exists is the difference between using it and understanding it.

## 7. Interview Answer

> "Exploding gradients is the mirror of vanishing — same multiplicative mechanism, opposite direction. If the per-layer factors in the backward pass are consistently above one, the product grows instead of shrinking. Factors of 1.5 across twenty layers is about three thousand, and the weight update overshoots so badly that weights land where activations overflow. Loss goes to infinity, then NaN, and once weights are NaN every subsequent computation is NaN — it's unrecoverable, you restart from a checkpoint.
>
> The advantage is that it's loud. Vanishing gradients quietly stall training; exploding produces an obvious NaN, so it's much easier to diagnose.
>
> The standard fix is gradient clipping, and it's one line. If the gradient norm exceeds a threshold, rescale the whole gradient vector down to that norm. The important detail is clipping by norm rather than by value — rescaling the vector preserves the direction and only caps the magnitude, so it doesn't distort which way to move. Clipping each element independently would change the direction. Max norm of one, applied every step, is standard for transformers, and effectively every large-scale training run uses it.
>
> On causes, the most common overall is simply a learning rate that's too high. Then poor initialization with too-large variance, and RNNs over long sequences, where the same weight matrix is applied repeatedly.
>
> The cause people miss is a bad batch. A single malformed record can produce an enormous loss and a correspondingly enormous gradient. If training explodes reproducibly at the same step, I'd inspect the data at that step before touching any hyperparameter — that's saved people days.
>
> One caveat: clipping keeps training alive but can mask the real problem. If it's engaging on most steps, something upstream is wrong. I'd monitor how often it triggers — occasional is healthy, constant is a symptom rather than a fix.
>
> And in mixed precision, FP16's narrower range makes overflow easier, which is why loss scaling exists — multiply the loss by a large factor so gradients stay representable, then unscale before the update."

## 8. Likely Follow-ups

**Q: How do you fix exploding gradients?**
Gradient clipping by norm — rescale the whole gradient vector if its norm exceeds a threshold, typically one. It's a single line before the optimizer step, preserves direction, and is standard practice in every large training run. Lowering the learning rate addresses the usual underlying cause.

**Q: Why clip by norm rather than by value?**
Because rescaling the entire vector preserves its direction and only caps magnitude, so the update still points where the gradient says. Clipping each element independently changes the relative sizes of components and therefore the direction, which distorts the optimization.

**Q: What causes it?**
Most often a learning rate that's too high. Also poor initialization with too-large variance, RNNs over long sequences where the same matrix is applied repeatedly, and — frequently overlooked — a single bad batch with corrupt data producing an enormous loss.

**Q: Is clipping always enough?**
It keeps training alive, but if it's engaging on most steps it's masking a real problem, usually the learning rate. I'd monitor how often clipping triggers: occasional is healthy, constant means something upstream needs fixing rather than suppressing.

**Q: Can you recover from NaN weights?**
No. Once weights are NaN, every subsequent computation produces NaN and there's nothing to recover. You restart from the last good checkpoint — which is the practical argument for checkpointing frequently during long training runs.

## 9. Common Mistakes

- Clipping by value instead of by norm.
- Treating clipping as a fix rather than a safeguard.
- Not checking the data when explosion is reproducible at a specific step.
- Assuming NaN weights can be recovered.
- Forgetting that FP16's narrower range makes overflow more likely.

## 10. What to Remember

- **Same multiplication as vanishing, factors above 1** — the product grows.
- **Loud failure:** loss spikes → inf → NaN → unrecoverable.
- **Clip by norm, max_norm=1.0** — preserves direction, caps magnitude.
- **Usual cause is the learning rate**; a bad batch is the missed one.
- **Constant clipping is a symptom**, not a solution.
