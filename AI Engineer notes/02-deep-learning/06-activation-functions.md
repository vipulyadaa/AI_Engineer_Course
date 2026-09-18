# Activation Functions

> **Phase 02 · DEEP LEARNING · Topic 06**

## 1. Definition

The non-linear function applied to a neuron's weighted sum. It's what makes depth meaningful — without it, a stack of layers collapses algebraically into a single linear transformation.

## 2. Simple Explanation

After a neuron computes its weighted sum, the activation decides what to pass on: clip negatives to zero, squash into a range, or something in between.

That single non-linear step is the reason a hundred-layer network can represent things a one-layer network can't.

## 3. How It Works

```
Without activation:
  layer2(layer1(x)) = W₂(W₁x + b₁) + b₂
                    = (W₂W₁)x + (W₂b₁ + b₂)
                    = a SINGLE linear transform

Depth buys nothing. This is the whole argument.
```

| Function | Range | Use |
|---|---|---|
| **ReLU** `max(0, z)` | [0, ∞) | Hidden layers — the default |
| **GELU** | ≈[−0.17, ∞) | Transformers |
| **SwiGLU** | — | Modern LLM feed-forward blocks |
| **Sigmoid** `1/(1+e⁻ᶻ)` | (0, 1) | Binary output layer |
| **Softmax** | sums to 1 | Multi-class / token output |
| **Tanh** | (−1, 1) | Legacy; inside LSTM gates |

## 4. Practical Example

**Choosing one is mostly not a decision:**

```
Hidden layers          → ReLU (or GELU in transformers)
Binary classification  → sigmoid on the output
Multi-class output     → softmax
LLM next-token output  → softmax over the vocabulary

Sigmoid and tanh in HIDDEN layers is a historical mistake —
they saturate, gradients vanish, and deep networks stopped
training. ReLU's adoption is a large part of why deep learning
started working in the early 2010s.
```

**Why GELU rather than ReLU in transformers:**

```
ReLU:  hard cutoff at zero — everything negative becomes 0
GELU:  smooth, weights the input by how likely it is to be
       "kept" under a Gaussian — small negatives pass through
       slightly rather than being zeroed

The smoothness gives better gradients near zero, and it
measurably outperforms ReLU on transformer training. That's
an empirical result, not a theoretical one — which is worth
saying rather than inventing a principled justification.
```

**SwiGLU** in recent LLM feed-forward blocks is a gated variant that performs better still, again empirically.

## 5. Why It Matters

- **Non-linearity is what makes depth work** — the single most important point here.
- **ReLU's adoption unlocked deep networks** by fixing vanishing gradients in hidden layers.
- **Transformer-family choices (GELU, SwiGLU) are empirical**, and saying so is more honest than inventing theory.

## 6. Trade-offs / Failure Modes

| Function | Problem |
|---|---|
| **ReLU** | Dead neurons — negative for all inputs, gradient zero forever |
| **Sigmoid** | Saturates; gradients vanish; not zero-centred |
| **Tanh** | Saturates, though zero-centred |
| **Softmax** | Numerically unstable if implemented naively |
| **GELU / SwiGLU** | Slightly more expensive to compute |

**On softmax stability:** computing `exp(z)` directly overflows for large `z`. Every real implementation subtracts the maximum first — `exp(z − max(z))` — which is mathematically identical and numerically safe. It's a detail worth knowing because it's a classic implementation question.

**On dead ReLU:** leaky ReLU (`max(0.01z, z)`) exists specifically to prevent it by keeping a small gradient for negative inputs. In practice ReLU's dead-neuron problem is often managed by a sensible learning rate rather than by switching function.

## 7. Interview Answer

> "The activation is the non-linear function applied after a neuron's weighted sum, and the reason it exists is that without it, depth buys nothing. Two stacked linear layers compose algebraically into a single linear transform — W two times W one is just another matrix. So the non-linearity is what makes a deep network more than an expensive linear model. That's the core point.
>
> For hidden layers the default is ReLU, max of zero and z. Its adoption is a big part of why deep learning started working in the early 2010s — sigmoid and tanh saturate at their extremes, so gradients vanish and deep networks simply stopped training. ReLU has a constant gradient of one for positive inputs, which fixed that.
>
> In transformers the choice is GELU, and more recently SwiGLU in the feed-forward blocks. GELU is smooth rather than a hard cutoff — small negative values pass through slightly instead of being zeroed — which gives better gradients near zero. I'd be honest that this is an empirical result rather than a deep theoretical one; it measurably trains better, and inventing a principled justification would be overclaiming.
>
> On output layers there's no real choice: sigmoid for binary, softmax for multi-class, and softmax over the vocabulary for next-token prediction in an LLM.
>
> Two failure modes. Dead ReLU neurons — if a neuron's pre-activation is negative for every input it outputs zero, its gradient is zero, and it never recovers. Leaky ReLU exists to prevent that, though in practice a sensible learning rate usually handles it. And softmax numerical stability: computing exp of z directly overflows for large values, so every real implementation subtracts the maximum first, which is mathematically identical and numerically safe."

## 8. Likely Follow-ups

**Q: Why do you need a non-linear activation?**
Because stacked linear layers compose into a single linear transformation — the product of two weight matrices is just another matrix. Without a non-linearity, depth adds parameters but no representational power, so the network is an expensive linear model.

**Q: Which activation for hidden layers?**
ReLU as the general default, GELU in transformers. ReLU replaced sigmoid and tanh because those saturate and cause vanishing gradients in deep networks; its constant gradient for positive inputs is what made depth trainable.

**Q: Why GELU instead of ReLU in transformers?**
It's smooth rather than a hard cutoff, so small negative values pass through slightly instead of being zeroed, giving better gradients near zero. The justification is empirical — it trains measurably better — rather than a clean theoretical argument.

**Q: What's the dead ReLU problem?**
A neuron whose pre-activation is negative for every input outputs zero and has zero gradient, so it never updates again. High learning rates make it more likely. Leaky ReLU keeps a small gradient for negative inputs specifically to prevent it.

**Q: How is softmax implemented safely?**
By subtracting the maximum value before exponentiating — exp of z minus max z. That's mathematically identical since the constant cancels in the normalization, but it prevents the overflow that a naive exp would cause on large inputs.

## 9. Common Mistakes

- Not explaining that linear layers compose into one linear layer.
- Using sigmoid or tanh in hidden layers of a deep network.
- Inventing a theoretical justification for GELU rather than citing empirical results.
- Forgetting the max-subtraction trick in softmax.
- Assuming leaky ReLU is always needed to avoid dead neurons.

## 10. What to Remember

- **Without non-linearity, depth collapses to one linear layer.** That's the point.
- **ReLU for hidden layers, GELU/SwiGLU in transformers.**
- **Sigmoid and tanh saturate** — a historical cause of vanishing gradients.
- **Softmax for multi-class and next-token output**, with max subtraction for stability.
- **Dead ReLU neurons never recover** — leaky ReLU or a sane learning rate.
