# Dropout

> **Phase 02 · DEEP LEARNING · Topic 15**

## 1. Definition

A regularization technique that randomly zeroes a fraction of activations during training. It prevents the network from relying too heavily on any individual unit, which reduces overfitting.

## 2. Simple Explanation

On each training step, randomly switch off some neurons. The network can't depend on any particular one being there, so it has to spread the representation across many units.

At inference, nothing is dropped — the full network is used.

## 3. How It Works

```
TRAINING (p = 0.5)
  a = [0.8, 0.3, 0.9, 0.2, 0.7]
  mask = [1, 0, 1, 1, 0]
  a = [0.8, 0, 0.9, 0.2, 0] / (1 − 0.5)      ← inverted dropout
    = [1.6, 0, 1.8, 0.4, 0]

INFERENCE
  a = [0.8, 0.3, 0.9, 0.2, 0.7]              ← unchanged
```

**Inverted dropout** scales up the surviving activations during training by `1/(1−p)`, so the expected magnitude matches inference. That's why inference needs no adjustment at all — the correction already happened. This is what every framework implements.

## 4. Practical Example

**Where dropout is used, and where it isn't:**

```
Typical rates:
  Dense hidden layers       0.2 - 0.5
  Transformers              0.0 - 0.1     ← notably low
  Convolutional layers      rare (BatchNorm regularizes)
  Output layer              never

Modern LLMs often use dropout = 0. At that scale the model
sees each training example roughly once, so there's little
opportunity to memorize — the data itself regularizes.

Dropout matters most where data is LIMITED relative to
model capacity, which is exactly the fine-tuning situation
rather than the pretraining one.
```

**The bug this causes constantly:**

```python
model.eval()                 # ← disables dropout & uses
with torch.no_grad():        #   BatchNorm running stats
    out = model(x)
```

Forgetting `model.eval()` leaves dropout active at inference. The symptom is that the same input gives different outputs each call, and quality is worse than expected. No error is raised, which is why it survives to production.

**What it actually does, conceptually:** training with dropout is loosely like training an ensemble of many sub-networks that share weights, and inference approximates averaging them. That framing is a useful intuition for why it reduces overfitting.

## 5. Why It Matters

- **It's the classic regularizer** and still the default for dense layers with limited data.
- **The train/inference mode difference** is one of the most common real bugs.
- **Modern LLM practice uses little or none**, and knowing why shows current understanding.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Active at inference** | Non-deterministic, degraded output |
| **Rate too high** | Underfits; the network can't learn |
| **Used with BatchNorm** | The interaction is known to be problematic |
| **Applied to the output layer** | Corrupts predictions directly |
| **Slows convergence** | More epochs needed to reach the same loss |

**On dropout with batch normalization:** they interact badly. Dropout changes the variance of activations between training and inference, while BatchNorm's running statistics are estimated under the training-time distribution — so the statistics don't match what inference sees. Most modern architectures use one or the other; convolutional networks generally rely on BatchNorm alone.

**On alternatives:** for a given problem, more data, data augmentation, early stopping, and weight decay are all worth considering before or alongside dropout. It's one tool among several, not the default answer to overfitting.

## 7. Interview Answer

> "Dropout randomly zeroes a fraction of activations during training, so the network can't rely on any individual unit and has to spread its representation across many. At inference nothing is dropped and the full network is used.
>
> The implementation detail worth knowing is inverted dropout. During training, surviving activations are scaled up by one over one minus p, so their expected magnitude matches what inference will see. That's why no adjustment is needed at inference — the correction already happened during training. Every framework does it this way.
>
> Conceptually it's loosely like training an ensemble of many sub-networks that share weights, with inference approximating the average. That's a useful intuition for why it reduces overfitting.
>
> On rates: dense hidden layers use 0.2 to 0.5, transformers use zero to 0.1, and it's never applied to the output layer. Modern LLMs often use zero dropout entirely, and the reason is interesting — at that scale the model sees each training example roughly once, so there's little opportunity to memorize and the data itself regularizes. Dropout matters most where data is limited relative to capacity, which is the fine-tuning situation rather than the pretraining one.
>
> The bug I'd flag is forgetting model.eval at inference, which leaves dropout active. The symptom is the same input giving different outputs on each call, with quality worse than expected. Nothing errors, which is exactly why it reaches production.
>
> One interaction to avoid: dropout with batch normalization. Dropout changes the variance of activations between training and inference, while BatchNorm's running statistics were estimated under the training distribution — so they don't match what inference sees. Most modern architectures use one or the other, and convolutional networks generally rely on BatchNorm alone.
>
> And I'd treat it as one tool among several. More data, augmentation, early stopping, and weight decay are all worth considering for overfitting rather than reaching for dropout by default."

## 8. Likely Follow-ups

**Q: Is dropout used at inference?**
No — the full network is used. Inverted dropout scales the surviving activations up during training by one over one minus p, so expected magnitudes already match, and inference needs no adjustment. Leaving it active at inference gives non-deterministic, degraded outputs.

**Q: Why do modern LLMs use little or no dropout?**
Because at that scale the model sees each training example roughly once, so there's very little opportunity to memorize — the sheer volume of data regularizes. Dropout helps most where data is limited relative to model capacity, which describes fine-tuning rather than pretraining.

**Q: What's inverted dropout?**
Scaling surviving activations by one over one minus p during training, so their expected value matches the undropped network. The alternative would be scaling down at inference; doing it during training instead keeps inference completely unchanged, which is simpler and is what every framework implements.

**Q: Why not combine dropout with batch normalization?**
They interact badly. Dropout changes activation variance between training and inference, while BatchNorm's running statistics are estimated under the training distribution — so at inference the statistics don't match the actual distribution. Most architectures pick one, and convolutional networks generally use BatchNorm alone.

**Q: What else would you use against overfitting?**
More data first, then augmentation, early stopping, and weight decay. For pretrained models, fine-tuning fewer parameters or for fewer steps also helps. Dropout is one tool among several rather than the automatic answer.

## 9. Common Mistakes

- Forgetting `model.eval()` and leaving dropout active at inference.
- Applying dropout to the output layer.
- Combining it with batch normalization without understanding the interaction.
- Assuming high dropout rates are appropriate for transformers.
- Treating dropout as the default fix for overfitting.

## 10. What to Remember

- **Randomly zero activations in training; full network at inference.**
- **Inverted dropout scales during training**, so inference needs no change.
- **0.2–0.5 for dense layers; 0–0.1 for transformers; never on the output.**
- **`model.eval()` at inference** — the classic missed step.
- **Modern LLMs use little or none** because data volume regularizes instead.
