# Neurons

> **Phase 02 · DEEP LEARNING · Topic 02**

## 1. Definition

The basic unit of a neural network: it multiplies each input by a learned weight, sums the results, adds a bias, and applies an activation function.

## 2. Simple Explanation

A neuron is one number produced from many numbers.

It has an opinion about how much each input matters — those are its weights. It combines them, shifts the result by its bias, and squashes or clips the total through an activation. That single output becomes one input to the next layer.

## 3. How It Works

```
        x₁ ──w₁──┐
        x₂ ──w₂──┤
        x₃ ──w₃──┼──▶  z = Σ wᵢxᵢ + b  ──▶  a = f(z)  ──▶ output
                 │
                 b (bias)

z  pre-activation — a weighted sum
f  activation — the non-linearity
a  the neuron's output
```

**In practice you never compute one neuron at a time.** A whole layer is one matrix multiply: `Z = XW + b`, where each column of `W` is one neuron's weights. That's why GPUs matter — the operation is a matrix product, not a loop.

## 4. Practical Example

**What a single neuron can and can't do:**

```
One neuron = a linear decision boundary + a squashing function.

It can learn:   "is the sum of these features above a threshold"
It cannot learn: XOR — no single straight line separates it

Two layers of neurons CAN learn XOR, because the first layer
transforms the space into one where a line works.

That's the whole argument for hidden layers, in one example.
```

**The biological analogy is worth deflating:**

```
The name comes from a 1940s model of a biological neuron, but
the resemblance is loose and not load-bearing.

An artificial neuron is: a dot product, an addition, and a
function call.

Leaning on the brain analogy in an interview tends to signal
that you're reciting rather than understanding. The linear-
algebra description is both simpler and more accurate.
```

## 5. Why It Matters

- **It's the atom** — everything else is arrangements of this operation.
- **A layer is a matrix multiply**, which is why the hardware story is what it is.
- **One neuron is a linear boundary**; that limitation motivates hidden layers.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Single neuron is linear** | Can't separate non-linearly separable data |
| **Dead neurons (ReLU)** | Output stuck at zero, gradient zero, never recovers |
| **Saturated neurons (sigmoid)** | Gradient near zero at the extremes |
| **Unscaled inputs** | Dominant features swamp the weighted sum |

**On dead ReLU neurons:** if a neuron's weights move such that its pre-activation is negative for every input, ReLU outputs zero, the gradient through it is zero, and it never updates again. It's permanently dead. A large learning rate makes this more likely — which is a concrete reason learning-rate tuning matters, not just an abstraction.

## 7. Interview Answer

> "A neuron multiplies each input by a learned weight, sums them, adds a bias, and applies an activation function. That's it — a dot product, an addition, and a function call.
>
> In practice you never compute one at a time. A whole layer is a single matrix multiply, where each column of the weight matrix is one neuron's weights. That framing matters because it explains the hardware story: training is dominated by matrix products, which is exactly what GPUs and TPUs are built for.
>
> What one neuron can do is draw a linear decision boundary and squash the result. What it can't do is learn XOR, because no single straight line separates it. Two layers can, because the first layer transforms the space into one where a line works — and that single example is the entire argument for hidden layers.
>
> I'd also deflate the biological analogy. The name comes from a 1940s model of a biological neuron, but the resemblance is loose and doesn't do any work. Describing it as linear algebra is both simpler and more accurate than reaching for the brain comparison.
>
> The failure mode worth knowing is dead ReLU neurons. If a neuron's weights move so that its pre-activation is negative for every input, ReLU outputs zero, the gradient through it is zero, and it never updates again — it's permanently dead. A large learning rate makes that more likely, which is a concrete reason learning-rate tuning matters rather than an abstract one."

## 8. Likely Follow-ups

**Q: What does a single neuron compute?**
A weighted sum of its inputs plus a bias, passed through an activation function. Geometrically that's a linear decision boundary followed by a squashing or clipping operation — enough for linearly separable problems, not enough for anything else.

**Q: Why can't one neuron learn XOR?**
Because XOR isn't linearly separable — no single straight line puts the positive cases on one side. A hidden layer fixes it by transforming the inputs into a space where a line does work, which is the basic justification for depth.

**Q: How is a layer actually computed?**
As one matrix multiply: inputs times a weight matrix plus a bias vector, with each column of the matrix holding one neuron's weights. Nothing loops over individual neurons, and that's why GPU and TPU hardware — built for matrix products — dominates training.

**Q: What is a dead neuron?**
A ReLU neuron whose pre-activation is negative for every input. It outputs zero, the gradient through it is zero, so it never updates and stays dead permanently. Large learning rates increase the risk, and leaky ReLU exists partly to avoid it.

**Q: How close is this to a biological neuron?**
Loosely inspired and not much more. The artificial version is a dot product, an addition, and a function call. The analogy gave the name but doesn't explain anything about how the model works, so I'd describe it in linear-algebra terms instead.

## 9. Common Mistakes

- Leaning on the biological analogy instead of the mathematics.
- Describing a layer as a loop over neurons rather than a matrix multiply.
- Not knowing why a single neuron can't learn XOR.
- Forgetting the bias term when describing the computation.
- Unaware that ReLU neurons can die permanently.

## 10. What to Remember

- **Weighted sum + bias + activation.** A dot product and a function call.
- **A layer is one matrix multiply** — the reason GPUs matter.
- **One neuron draws a linear boundary**; XOR needs a hidden layer.
- **Dead ReLU neurons never recover**, and high learning rates cause them.
- **The biological analogy explains nothing** — use linear algebra.
