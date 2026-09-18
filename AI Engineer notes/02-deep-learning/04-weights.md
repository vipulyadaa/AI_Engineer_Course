# Weights

> **Phase 02 · DEEP LEARNING · Topic 04**

## 1. Definition

The learned parameters of a network — the multipliers applied to inputs at every connection. Training *is* the process of finding good values for them, and they are what a "model" actually consists of.

## 2. Simple Explanation

A weight says how much one input matters to one output. Large positive means strongly increases; near zero means ignore; negative means pushes the other way.

When someone says a model has 7 billion parameters, those are (mostly) weights. Downloading a model means downloading these numbers.

## 3. How It Works

```
INITIALIZE   small random values (scaled by layer size)
FORWARD      z = Σ wᵢxᵢ + b
BACKWARD     compute ∂loss/∂w for every weight
UPDATE       w ← w − learning_rate × ∂loss/∂w
REPEAT       millions of times
```

**Why random initialization:** if all weights in a layer start equal, every neuron computes the same thing and receives the same gradient, so they stay identical forever. Random values break that symmetry — the layer never learns anything otherwise.

**Why scaled:** initializing too large makes activations explode through the layers; too small and they vanish. Schemes like Xavier and He scale the initial variance by layer size to keep activations well-behaved at the start.

## 4. Practical Example

**Weights are the memory footprint, and the arithmetic matters:**

```
7B parameters, FP32 (4 bytes)   = 28 GB
7B parameters, FP16 (2 bytes)   = 14 GB   ← typical serving
7B parameters, INT8 (1 byte)    =  7 GB   ← quantized
7B parameters, INT4             =  3.5 GB

TRAINING needs far more than inference:
  weights           14 GB
  gradients         14 GB
  optimizer state   56 GB   (Adam keeps two moments in FP32)
                   ──────
                   ~84 GB for a 7B model

That ratio — roughly 6× inference memory — is why fine-tuning
needs so much more hardware than serving, and why LoRA, which
trains a small number of extra weights instead, exists.
```

**Rule of thumb for interviews:** FP16 bytes ≈ 2 × parameter count. A 70B model is ~140 GB and won't fit on a single 80 GB GPU — which is why it's served across multiple accelerators or quantized.

**What "fine-tuning" means concretely:** starting from trained weights and continuing gradient updates on new data, rather than starting from random values. The pretrained weights already encode general language structure; fine-tuning adjusts them toward a task.

## 5. Why It Matters

- **Weights are the model** — size, memory, and serving cost all follow from them.
- **The 2-bytes-per-parameter rule** answers most capacity questions immediately.
- **Training memory is ~6× inference memory**, which explains the LoRA motivation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Bad initialization** | Exploding or vanishing activations from the start |
| **Symmetric initialization** | Neurons stay identical; the layer never learns |
| **Too-large learning rate** | Weights diverge |
| **Weights growing unbounded** | Overfitting; countered by weight decay |
| **Quantization** | Smaller and faster, with some quality loss |

**On weight decay:** adding a penalty proportional to weight magnitude to the loss keeps weights small, which limits how sharply the model can fit the training data and improves generalization. It's the standard regularizer and it's essentially L2 regularization applied during training.

**On quantization:** reducing precision from FP16 to INT8 or INT4 shrinks the model proportionally with modest quality loss for most tasks. It's the single biggest lever on serving cost, and worth naming as such rather than treating as an advanced topic.

## 7. Interview Answer

> "Weights are the learned parameters — the multipliers applied at every connection. Training is the process of finding good values for them, and they're literally what a model consists of. When a model is described as seven billion parameters, those are mostly weights.
>
> Two initialization details that matter. They start random, because if all weights in a layer started equal, every neuron would compute the same thing and receive the same gradient, so they'd stay identical forever — random values break that symmetry. And they're scaled by layer size, because too large makes activations explode through the layers and too small makes them vanish. Xavier and He initialization exist to get that variance right.
>
> The practical thing I'd carry into any capacity discussion is that weights are the memory footprint. FP16 is two bytes per parameter, so a seven-billion model is fourteen gigabytes and a seventy-billion model is a hundred and forty — which won't fit on a single eighty-gigabyte GPU, so it's served across accelerators or quantized.
>
> Training is much heavier than inference. For a seven-billion model you need fourteen gigabytes of weights, another fourteen of gradients, and around fifty-six of optimizer state, because Adam keeps two moments in FP32. That's roughly eighty-four gigabytes — about six times inference memory. That ratio is exactly why LoRA exists: it freezes the base weights and trains a small number of extra ones, so you avoid the gradient and optimizer state for the full model.
>
> And quantization — dropping from FP16 to INT8 or INT4 — shrinks the model proportionally with modest quality loss on most tasks. It's the single biggest lever on serving cost, which I'd name plainly rather than treat as an advanced topic."

## 8. Likely Follow-ups

**Q: Why are weights initialized randomly?**
To break symmetry. If every weight in a layer started at the same value, all neurons would compute identical outputs and receive identical gradients, so they'd never differentiate and the layer would effectively be one neuron. Random initialization is what lets neurons learn different features.

**Q: How much memory does a model need?**
Roughly two bytes per parameter in FP16 — so seven billion parameters is about fourteen gigabytes, seventy billion about a hundred and forty. INT8 halves it again. That rule answers most capacity questions without any further calculation.

**Q: Why does training need so much more memory?**
You hold weights, gradients of the same size, and optimizer state — Adam keeps two moment estimates, typically in FP32. For a seven-billion model that's roughly eighty-four gigabytes against fourteen for inference, about six times more. That gap is the direct motivation for parameter-efficient methods like LoRA.

**Q: What is weight decay?**
A penalty proportional to weight magnitude added to the loss, which keeps weights small. Smaller weights mean the model can't fit the training data as sharply, which improves generalization. It's essentially L2 regularization applied during training and it's the standard regularizer for large models.

**Q: What does quantization do to weights?**
Stores them at lower precision — INT8 or INT4 instead of FP16 — shrinking the model proportionally and speeding up inference. Quality loss is modest for most tasks at INT8 and more noticeable at INT4. It's the largest single lever available on serving cost.

## 9. Common Mistakes

- Not knowing the two-bytes-per-parameter rule for FP16.
- Assuming training memory is similar to inference memory.
- Forgetting that identical initialization prevents learning entirely.
- Describing fine-tuning without saying it continues from trained weights.
- Treating quantization as exotic rather than the main cost lever.

## 10. What to Remember

- **Weights are the model** — and the memory footprint.
- **FP16 ≈ 2 bytes per parameter.** 7B → 14 GB, 70B → 140 GB.
- **Training is ~6× inference memory** — weights, gradients, optimizer state.
- **Random, scaled initialization** breaks symmetry and keeps activations sane.
- **Quantization is the biggest serving-cost lever.**
