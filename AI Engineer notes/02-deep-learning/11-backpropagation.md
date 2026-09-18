# Backpropagation

> **Phase 02 · DEEP LEARNING · Topic 11**

## 1. Definition

The algorithm that computes the gradient of the loss with respect to every weight, by applying the chain rule backwards through the network. It's what makes training a deep network computationally feasible.

## 2. Simple Explanation

After a forward pass you know how wrong the output is. Backpropagation answers "how much did each weight contribute to that error?"

It works backwards from the loss, and at each layer it uses the chain rule to convert the gradient with respect to that layer's output into gradients for its weights and for the layer below.

## 3. How It Works

```
FORWARD:   x ──▶ layer1 ──▶ layer2 ──▶ ŷ ──▶ loss
BACKWARD:      ◀── ∂L/∂W₁ ◀── ∂L/∂W₂ ◀── ∂L/∂ŷ

At each layer, given ∂L/∂(output):
  1. ∂L/∂W  = ∂L/∂output × ∂output/∂W     ← the weight gradient
  2. ∂L/∂input = ∂L/∂output × ∂output/∂input
                                          ← pass to the layer below
```

**Why it's efficient — the point that's usually missed:**

```
NAIVE: perturb each weight, re-run the forward pass, see how
       the loss changes.
       7 billion parameters → 7 billion forward passes.
       Completely infeasible.

BACKPROP: one forward pass + one backward pass gives gradients
       for ALL parameters. The backward pass costs roughly
       2× the forward.

Backprop isn't a clever way to get gradients — it's the
ONLY reason training large models is possible at all.
```

## 4. Practical Example

**Where it goes wrong, and why:**

```
Gradients MULTIPLY as they travel backwards.

  Each layer contributes a factor. Across many layers:

  factors < 1  →  product → 0     VANISHING
  factors > 1  →  product → ∞     EXPLODING

Fixes:
  · ReLU            gradient 1 where active, so no shrinkage
  · Residual conns  a direct gradient path that skips layers
  · Normalization   keeps activations in a sane range
  · Gradient clip   caps the norm; stops explosion

Every one of these is in a transformer, and every one exists
because of this multiplication.
```

**What autograd actually does:**

```python
loss = criterion(model(x), y)
loss.backward()        # builds nothing new — traverses the
                       # graph recorded during the forward pass
optimizer.step()       # applies the gradients
optimizer.zero_grad()  # ← gradients ACCUMULATE; clear them
```

**Forgetting `zero_grad()` is the classic bug:** PyTorch accumulates gradients across backward calls by design (so you can split a large batch across several passes). Without clearing, each step uses the sum of all previous gradients, and training silently diverges.

## 5. Why It Matters

- **It's what makes training feasible** — one backward pass for all parameters.
- **The multiplication of gradients** explains vanishing, exploding, and every architectural fix for them.
- **Gradient accumulation semantics** cause a real and common bug.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Vanishing gradients** | Deep stacks; saturating activations |
| **Exploding gradients** | Large factors compounding; fix with clipping |
| **Memory for activations** | All must be retained until consumed |
| **Forgetting `zero_grad()`** | Gradients accumulate; training diverges |
| **Detached graph** | In-place ops or `.detach()` breaking the chain |

**On why residual connections work:** with `y = x + f(x)`, the gradient with respect to `x` is `1 + f'(x)`. That `1` is an unconditional path for the gradient to reach earlier layers regardless of what `f'` does. It's a one-line explanation of why very deep networks became trainable, and it's worth being able to state.

**On gradient accumulation as a feature:** the same behaviour that causes the `zero_grad()` bug is deliberately used to simulate a large batch on limited memory — run several forward/backward passes, then step once. Knowing it's intentional rather than a quirk is the difference between memorizing the fix and understanding it.

## 7. Interview Answer

> "Backpropagation computes the gradient of the loss with respect to every weight by applying the chain rule backwards through the network. Starting from the loss, at each layer it converts the gradient with respect to that layer's output into gradients for its weights and for the layer below, which it passes down.
>
> The point I'd make first is why it matters computationally. The naive alternative is perturbing each weight and re-running the forward pass to see how the loss changes — for seven billion parameters that's seven billion forward passes. Backprop gets gradients for all parameters from one forward and one backward pass, with the backward costing roughly twice the forward. It isn't a clever optimization; it's the only reason training large models is possible.
>
> The thing to understand about its behaviour is that gradients multiply as they travel backwards. Each layer contributes a factor, so across many layers factors below one drive the product to zero — vanishing — and factors above one drive it to infinity — exploding. Every architectural fix follows from that. ReLU has gradient exactly one where active, so no shrinkage. Residual connections give a direct path. Normalization keeps activations in range. Gradient clipping caps the norm. All four are in a transformer, all four for this reason.
>
> Residuals are worth stating precisely: with y equals x plus f of x, the gradient with respect to x is one plus f-prime of x. That one is an unconditional path for gradients to reach earlier layers regardless of what f-prime does, and it's the one-line explanation of why very deep networks became trainable.
>
> The practical bug is forgetting zero_grad. PyTorch accumulates gradients across backward calls by design, so without clearing them each step uses the sum of everything before and training silently diverges. Worth knowing that the accumulation is deliberate — it's how you simulate a large batch on limited memory by running several forward-backward passes and stepping once."

## 8. Likely Follow-ups

**Q: Why is backpropagation efficient?**
Because one forward and one backward pass produce gradients for every parameter at once, with the backward costing about twice the forward. The alternative — perturbing each weight and re-evaluating — would need one forward pass per parameter, which is completely infeasible at billions of parameters.

**Q: Why do gradients vanish or explode?**
Because they multiply as they propagate backwards, with each layer contributing a factor. Factors consistently below one drive the product toward zero across many layers; factors above one drive it toward infinity. Depth amplifies whatever bias the per-layer factors have.

**Q: How do residual connections help?**
With y equals x plus f of x, the gradient with respect to x is one plus f-prime of x. That constant one is a direct, unconditional path for the gradient to reach earlier layers no matter what the rest of the network does, which is why residuals made very deep networks trainable.

**Q: What's the zero_grad bug?**
PyTorch accumulates gradients across backward calls rather than replacing them. If you don't clear them, each optimizer step applies the sum of all previous gradients and training diverges. The accumulation is intentional — it's how you simulate large batches on limited memory.

**Q: What does backpropagation need from the forward pass?**
The intermediate activations, because the gradient with respect to a layer's weights depends on that layer's inputs. That's why training retains all activations while inference can free them, and it's the main driver of training memory alongside gradients and optimizer state.

## 9. Common Mistakes

- Not explaining why backprop is computationally necessary, only what it does.
- Forgetting `zero_grad()` and not knowing the accumulation is deliberate.
- Describing vanishing gradients without mentioning that gradients multiply.
- Not being able to state the residual-connection gradient argument.
- Breaking the graph with in-place operations or stray `.detach()` calls.

## 10. What to Remember

- **Chain rule backwards** — one forward + one backward gives all gradients.
- **Backward costs ~2× forward**; the naive alternative is infeasible.
- **Gradients multiply**, which is why vanishing and exploding happen.
- **Residuals give a gradient path of `1 + f'(x)`** — the reason depth works.
- **Gradients accumulate by design** — clear them, or use it deliberately.
