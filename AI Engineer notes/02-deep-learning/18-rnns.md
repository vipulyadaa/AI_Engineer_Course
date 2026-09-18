# RNNs (Recurrent Neural Networks)

> **Phase 02 · DEEP LEARNING · Topic 18**

## 1. Definition

Networks that process sequences one element at a time, carrying a hidden state forward from step to step. That hidden state is the model's memory of everything seen so far.

## 2. Simple Explanation

At each step, an RNN takes the current input and the previous hidden state, and produces a new hidden state. The same weights are used at every step.

It's a loop over the sequence with memory. That design is intuitive, and it's also the source of both its problems.

## 3. How It Works

```
h₀ ──▶ h₁ ──▶ h₂ ──▶ h₃ ──▶ ...
       ▲      ▲      ▲
       x₁     x₂     x₃

hₜ = tanh(Wₕ·hₜ₋₁ + Wₓ·xₜ + b)

The SAME Wₕ and Wₓ at every step.
```

**The two consequences of this design:**

```
1. SEQUENTIAL — step t needs step t−1, so it cannot be
   parallelized across the sequence. Training is slow and
   scales poorly.

2. VANISHING GRADIENTS — backpropagation through time
   multiplies by Wₕ once per step. Over 100 steps that's
   Wₕ¹⁰⁰: gradients vanish or explode.

Both of these are why transformers replaced them.
```

## 4. Practical Example

**The comparison that matters:**

```
                        RNN              Transformer
Path between positions  O(n) steps       O(1) — one attention
                                         hop
Training parallelism    None across      Full — all positions
                        the sequence     at once
Long-range dependency   Degrades badly   Direct
Compute per layer       O(n · d²)        O(n² · d)
Inference memory        O(d) state       O(n · d) KV cache

RNNs are LINEAR in sequence length; transformers are
QUADRATIC. So RNNs are theoretically cheaper for very long
sequences — but they can't be parallelized during training,
which in practice matters far more.
```

**That trade is the real answer to "why did transformers win":** not that attention is cheaper, but that it's parallelizable. The quadratic cost was worth paying to use GPUs efficiently.

**Where recurrence is coming back:**

```
State-space models — Mamba, S4 — revisit the recurrent idea
with formulations that CAN be parallelized during training
while keeping linear inference cost.

Worth knowing as current context: the recurrent idea wasn't
wrong, the specific formulation was untrainable at scale.
```

**Where RNNs still appear:** small-scale time-series forecasting, low-resource edge deployments, and legacy systems. Not in new NLP work.

## 5. Why It Matters

- **It's the "why transformers" answer** — parallelism, not raw efficiency.
- **Backpropagation through time** explains vanishing gradients concretely.
- **State-space models make it current**, not purely historical.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No training parallelism** | The decisive limitation |
| **Vanishing gradients over time** | Long-range dependencies lost |
| **Exploding gradients** | Repeated multiplication by the same matrix |
| **Information bottleneck** | All history compressed into one fixed vector |
| **Recency bias** | Recent inputs dominate the hidden state |

**On the bottleneck:** an RNN must compress an entire sequence into one fixed-size hidden state. For a long document that's a severe constraint, and it's precisely what attention removes — attention lets the model look back at any position directly rather than relying on what survived compression.

**On what attention originally was:** attention was introduced *as an addition to* RNN encoder-decoders for translation, to fix this bottleneck. "Attention Is All You Need" removed the recurrence and kept only attention. Knowing that ordering makes the architecture's motivation clear.

## 7. Interview Answer

> "An RNN processes a sequence one element at a time, carrying a hidden state forward. At each step it combines the current input with the previous hidden state using the same weights, so the hidden state is its memory of everything seen so far.
>
> That design has two consequences, and both are why transformers replaced them. First, it's sequential — step t needs step t minus one, so it can't be parallelized across the sequence, which makes training slow and scale poorly. Second, backpropagation through time multiplies by the same recurrent weight matrix once per step, so over a hundred steps you get that matrix to the hundredth power and gradients vanish or explode.
>
> The comparison worth stating precisely: in an RNN the path between two positions is order n steps; with attention it's one hop. And on cost, RNNs are linear in sequence length while transformers are quadratic — so RNNs are theoretically cheaper for very long sequences. The reason transformers won isn't that attention is cheaper, it's that it's parallelizable. The quadratic cost was worth paying to use GPUs efficiently. I think that's the accurate version of the answer.
>
> There's also an information bottleneck: an RNN compresses the entire history into one fixed-size vector. That's exactly what attention removes — it lets the model look back at any position directly rather than relying on what survived compression. Worth knowing that attention was originally introduced as an addition to RNN encoder-decoders for translation, specifically to fix that bottleneck. 'Attention Is All You Need' then removed the recurrence and kept only the attention.
>
> And I'd note this isn't purely historical. State-space models like Mamba revisit the recurrent idea with formulations that can be parallelized during training while keeping linear inference cost. So the recurrent idea wasn't wrong — the specific formulation was untrainable at scale."

## 8. Likely Follow-ups

**Q: Why did transformers replace RNNs?**
Mainly parallelism. RNNs are sequential, so training can't be parallelized across the sequence, whereas attention processes all positions at once and uses GPUs efficiently. Attention also gives a one-hop path between any two positions rather than order-n steps, which fixes long-range dependencies.

**Q: Aren't RNNs cheaper for long sequences?**
In raw complexity, yes — linear in sequence length versus quadratic for attention. But that's outweighed by the inability to parallelize training, which matters far more at scale. The quadratic cost was worth paying for hardware efficiency, which is the honest version of the trade-off.

**Q: What causes vanishing gradients in RNNs?**
Backpropagation through time multiplies by the same recurrent weight matrix once per time step. Over a hundred steps that's the matrix raised to the hundredth power, so gradients either vanish or explode depending on its eigenvalues — and long-range dependencies are lost in either case.

**Q: What's the information bottleneck?**
An RNN compresses everything it has seen into a single fixed-size hidden state, so a long document has to fit through that vector. Attention removes it by letting the model look back at any position directly, which is exactly why attention was originally added to RNN encoder-decoders.

**Q: Are RNNs relevant now?**
Not for new NLP work, but the idea is returning. State-space models like Mamba and S4 use recurrent formulations that can be parallelized during training while keeping linear inference cost — so the recurrent idea wasn't wrong, the original formulation just wasn't trainable at scale.

## 9. Common Mistakes

- Saying transformers replaced RNNs because attention is cheaper — it isn't.
- Not mentioning parallelism as the decisive factor.
- Forgetting the fixed-size hidden state bottleneck.
- Not knowing attention predates the transformer as an RNN addition.
- Treating RNNs as purely historical when state-space models revive the idea.

## 10. What to Remember

- **Sequential processing with a carried hidden state**, same weights each step.
- **No training parallelism** — the decisive limitation.
- **Backprop through time** multiplies by the same matrix repeatedly → vanishing gradients.
- **A fixed-size hidden state is an information bottleneck** — what attention removes.
- **Transformers won on parallelism, not complexity** — they're quadratic, RNNs linear.
