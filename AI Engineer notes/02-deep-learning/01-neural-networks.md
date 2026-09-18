# Neural Networks

> **Phase 02 · DEEP LEARNING · Topic 01**

## 1. Definition

A model made of layers of simple units, each computing a weighted sum followed by a non-linear function. Stacking layers lets it learn functions that no single linear model could represent.

## 2. Simple Explanation

Each unit takes numbers in, multiplies them by weights it has learned, adds them up, and passes the result through a non-linear function.

One layer of that is a linear model with a twist. Many layers stacked, each feeding the next, can approximate essentially any function — which is why the same basic structure handles images, audio, and language.

## 3. How It Works

```
input ──▶ [ layer 1 ] ──▶ [ layer 2 ] ──▶ ... ──▶ output

Each layer:   h = activation(W · x + b)

W  weights — learned
b  bias    — learned
activation — the non-linearity (ReLU, etc.)
```

**Training loop:**

```
1. Forward pass  — compute the prediction
2. Loss          — how wrong it is
3. Backward pass — gradient of the loss w.r.t. every weight
4. Update        — nudge weights against the gradient
5. Repeat over many batches
```

**The non-linearity is essential.** Without it, stacking layers collapses to a single linear transform — depth would buy nothing.

## 4. Practical Example

**Where neural networks sit relative to the modern stack:**

```
A transformer IS a neural network. Its layers are attention
plus feed-forward blocks instead of plain dense layers, but
the training loop is identical:

  forward → loss → backprop → gradient update

An embedding model is a neural network whose output vector
is the thing you keep.

So this isn't legacy background — it's the machinery
underneath Gemini, embeddings, and everything else.
```

**A minimal version:**

```python
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(768, 256), nn.ReLU(),
    nn.Linear(256, 64),  nn.ReLU(),
    nn.Linear(64, 1),
)
```

**Why deep rather than wide:** a wide shallow network can in principle approximate any function, but deep networks learn *hierarchical* features — early layers capture simple patterns, later layers combine them. That composition is what makes depth efficient in practice, not just possible in theory.

## 5. Why It Matters

- **It's the substrate of every model you'll work with**, transformers included.
- **The non-linearity is what makes depth meaningful** — a common gap in explanations.
- **Depth buys hierarchical features**, which is why it beats width empirically.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Needs a lot of data** | Millions of parameters overfit small datasets |
| **Compute-hungry** | Training is expensive; inference can be too |
| **Not interpretable** | Hard to explain an individual prediction |
| **Sensitive to initialization and scale** | Poor setup prevents convergence |
| **Overfitting** | Memorizes training data without regularization |

**On interpretability:** in a banking context this is a real constraint, not a footnote. For credit or fraud decisions, a regulator may require an explanation. That's often why a gradient-boosted tree model is preferred for tabular decisions even when a network scores marginally better — the explanation requirement is part of the specification.

## 7. Interview Answer

> "A neural network is layers of simple units, each computing a weighted sum of its inputs plus a bias, passed through a non-linear activation. Training is a loop: forward pass to get a prediction, compute the loss, backpropagate to get the gradient of the loss with respect to every weight, and nudge the weights against the gradient.
>
> The non-linearity is the essential part. Without it, stacking layers collapses algebraically to a single linear transform, so depth would buy nothing at all. That's what makes it more than stacked linear regression.
>
> And depth specifically buys hierarchical features — early layers learn simple patterns, later layers compose them. A wide shallow network can approximate any function in theory, but deep networks do it far more efficiently in practice, which is why the field went deep rather than wide.
>
> I'd emphasize that this isn't background material. A transformer is a neural network — its layers are attention and feed-forward blocks rather than plain dense layers, but the training loop is identical. An embedding model is a neural network where the output vector is the thing you keep. So this is the machinery underneath Gemini and everything else in the stack.
>
> The trade-offs that matter practically are data hunger, compute cost, and interpretability. In banking that last one is a genuine constraint rather than a footnote — for credit or fraud decisions a regulator may require an explanation per decision, and that's often why gradient-boosted trees are preferred for tabular problems even when a network scores marginally better. The explanation requirement is part of the specification, not a nice-to-have."

## 8. Likely Follow-ups

**Q: Why do you need activation functions?**
Because without them, stacking layers collapses to a single linear transformation — the composition of linear functions is linear. The non-linearity is what lets depth represent functions a single layer can't, so it's the thing that makes a deep network more than an expensive linear model.

**Q: Why deep rather than wide?**
Depth gives hierarchical feature learning — early layers capture simple patterns and later layers compose them. A wide shallow network can approximate any function in principle, but deep networks reach the same accuracy with far fewer parameters, which is why depth won empirically.

**Q: How does a network learn?**
Forward pass to produce a prediction, a loss measuring the error, backpropagation to compute the gradient of that loss with respect to every weight, and a gradient-descent step updating the weights. Repeated over many batches, that gradually reduces the loss.

**Q: Is a transformer a neural network?**
Yes. Its layers are attention and feed-forward blocks rather than plain dense layers, but the structure and training loop are the same — forward, loss, backprop, update. The innovations are in the layer design, not in a different learning mechanism.

**Q: When would you not use one?**
For tabular problems with modest data, where gradient-boosted trees usually match or beat a network with less tuning. And wherever per-decision explanations are required — in credit or fraud decisioning, that regulatory requirement often decides the model choice regardless of accuracy.

## 9. Common Mistakes

- Not explaining why the non-linearity matters.
- Describing a transformer as something other than a neural network.
- Claiming networks are always better than trees on tabular data.
- Ignoring the interpretability constraint in regulated domains.
- Confusing depth with capacity — they're related but not the same.

## 10. What to Remember

- **Layers of weighted sums plus a non-linearity**, trained by backpropagation.
- **The non-linearity is what makes depth meaningful.**
- **Depth gives hierarchical features** — more efficient than width.
- **Transformers and embedding models are neural networks**, same training loop.
- **Interpretability is a real constraint** in regulated decisions.
