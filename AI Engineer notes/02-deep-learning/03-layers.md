# Layers

> **Phase 02 · DEEP LEARNING · Topic 03**

## 1. Definition

A group of neurons computed together as one matrix operation. Stacking layers, each transforming the previous layer's output, is what gives a network depth.

## 2. Simple Explanation

A layer takes a vector in and produces a vector out. What changes between layer types is *how* that transformation is structured.

A dense layer connects everything to everything. A convolutional layer applies the same small filter across positions. An attention layer lets positions look at each other. Same idea, different connectivity.

## 3. How It Works

```
input (768) ──▶ Dense(256) ──▶ Dense(64) ──▶ Dense(1) ──▶ output

Each dense layer:  H = f(X · W + b)

  X: (batch, in_features)
  W: (in_features, out_features)   ← the learned parameters
  b: (out_features,)
```

**Common layer types:**

| Layer | Connectivity | Used for |
|---|---|---|
| **Dense / Linear** | Every input to every output | General, and inside transformers |
| **Convolutional** | Local, shared weights | Images, local patterns |
| **Recurrent** | Sequential, state carried forward | Sequences (largely superseded) |
| **Attention** | All positions to all positions | Transformers |
| **Normalization** | Rescales activations | Training stability |
| **Dropout** | Randomly zeroes activations | Regularization, training only |

## 4. Practical Example

**Where the parameters actually are:**

```
Dense(768 → 256):  768 × 256 + 256  = 196,864 parameters
Dense(256 →  64):  256 ×  64 +  64  =  16,448
Dense( 64 →   1):   64 ×   1 +   1  =      65
                                     ─────────
                                       213,377

The parameter count of a dense layer is in_features ×
out_features — so the WIDE layers dominate, not the deep ones.

In a transformer, the feed-forward layers hold roughly two
thirds of the parameters for exactly this reason: they expand
to 4× the model dimension and back.
```

**Dropout and normalization behave differently in training vs inference:**

```
Dropout:     active in training, DISABLED at inference
BatchNorm:   uses batch statistics in training,
             running averages at inference

Forgetting to switch modes — model.eval() in PyTorch — gives
non-deterministic, degraded inference. It's one of the most
common practical bugs in deep learning code.
```

## 5. Why It Matters

- **Layer type is architecture** — the connectivity pattern is the design decision.
- **Parameter count is dominated by width**, which is where memory goes.
- **Training/inference mode differences** are a frequent real bug.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Too few layers** | Underfits; can't represent the function |
| **Too many layers** | Vanishing gradients without residuals |
| **Very wide layers** | Parameter count and memory explode |
| **Forgetting eval mode** | Dropout and BatchNorm misbehave at inference |
| **Mismatched shapes** | The most common implementation error |

**On depth needing residuals:** beyond a modest number of layers, gradients degrade as they propagate backwards and deep networks stop training. Residual connections — adding a layer's input to its output — give gradients a direct path and are what made very deep networks trainable. Every transformer uses them for this reason.

## 7. Interview Answer

> "A layer is a group of neurons computed as one matrix operation — a vector in, a vector out. What distinguishes layer types is the connectivity pattern. A dense layer connects every input to every output. A convolutional layer applies the same small filter across positions, which shares weights and captures local structure. Attention lets every position look at every other position. Same basic idea, different structure.
>
> Something worth knowing about where the parameters live: a dense layer's parameter count is in-features times out-features, so *width* dominates, not depth. That's why in a transformer the feed-forward layers hold roughly two thirds of the parameters — they expand to four times the model dimension and back. If you're reasoning about model memory, that's where to look first.
>
> On depth, the thing that made very deep networks possible was residual connections. Beyond a modest number of layers, gradients degrade as they propagate backwards and training stalls. Adding a layer's input to its output gives the gradient a direct path, which is why every transformer uses them.
>
> The practical bug I'd mention is training versus inference mode. Dropout is active during training and must be disabled at inference. Batch normalization uses batch statistics during training and running averages afterwards. Forgetting to switch — model.eval() in PyTorch — gives non-deterministic and degraded inference, and it's one of the most common real bugs in deep learning code because nothing errors, the outputs are just quietly worse."

## 8. Likely Follow-ups

**Q: What layer types are there?**
Dense connecting everything to everything, convolutional applying shared local filters, recurrent carrying state through a sequence, attention letting all positions interact, plus normalization and dropout layers that shape training rather than compute features. The connectivity pattern is what makes each suited to different data.

**Q: Where are most of the parameters?**
In the widest layers, since a dense layer has in-features times out-features weights. In transformers that means the feed-forward blocks, which expand to four times the model dimension and back and hold roughly two thirds of the parameters — attention holds less than people expect.

**Q: Why do deep networks need residual connections?**
Because gradients degrade as they propagate backwards through many layers, so beyond a modest depth training stalls. Adding a layer's input to its output gives gradients a direct path to earlier layers, which is what made very deep networks trainable and why transformers use them throughout.

**Q: What changes between training and inference?**
Dropout is active in training and disabled at inference; batch normalization uses batch statistics in training and running averages at inference. Forgetting to switch modes gives degraded, non-deterministic inference with no error raised, which makes it a commonly missed bug.

**Q: How do you choose the number of layers?**
Empirically, within the constraints of the architecture family. For a known problem type I'd start from a proven architecture rather than search from scratch — and in practice fine-tuning a pretrained model beats designing a depth, which is why layer-count decisions are rare in applied work now.

## 9. Common Mistakes

- Forgetting to switch to eval mode at inference.
- Assuming attention holds most of a transformer's parameters.
- Adding depth without residual connections.
- Treating parameter count as driven by depth rather than width.
- Not accounting for dropout being training-only when debugging outputs.

## 10. What to Remember

- **A layer is one matrix operation**; the connectivity pattern defines the type.
- **Width drives parameter count** — transformer FFNs hold ~2/3 of parameters.
- **Residual connections make depth trainable.**
- **Dropout and BatchNorm behave differently at inference** — switch modes.
- **Shape mismatches are the most common implementation error.**
