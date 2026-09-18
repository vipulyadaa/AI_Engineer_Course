# LSTMs

> **Phase 02 · DEEP LEARNING · Topic 19**

## 1. Definition

Long Short-Term Memory networks — RNNs with a separate cell state and three learned gates that control what to forget, what to add, and what to output. The gating lets gradients flow over long sequences without vanishing.

## 2. Simple Explanation

A plain RNN overwrites its memory every step, so old information degrades quickly.

An LSTM keeps a cell state that flows through mostly unchanged, and uses gates to decide what to remove and what to add. Because the default is "carry forward unchanged," information can survive many steps.

## 3. How It Works

```
Three gates, each a sigmoid producing values in (0, 1):

  FORGET  fₜ = σ(Wf·[hₜ₋₁, xₜ])    what to drop from cell state
  INPUT   iₜ = σ(Wi·[hₜ₋₁, xₜ])    what new info to add
  OUTPUT  oₜ = σ(Wo·[hₜ₋₁, xₜ])    what to expose as hₜ

Cell state update:
  Cₜ = fₜ ⊙ Cₜ₋₁  +  iₜ ⊙ tanh(Wc·[hₜ₋₁, xₜ])
       └ keep ┘      └────── add ──────┘

Hidden state:
  hₜ = oₜ ⊙ tanh(Cₜ)
```

**Why the gating fixes gradients:**

```
The cell state update is ADDITIVE, not multiplicative.

  Cₜ = fₜ ⊙ Cₜ₋₁ + (new)

If the forget gate stays near 1, the gradient passes through
nearly unchanged — no repeated multiplication by a weight
matrix.

That's the same structural idea as a residual connection:
an additive path that gradients can travel along.
```

## 4. Practical Example

**What LSTMs did and didn't solve:**

```
SOLVED
  · vanishing gradients over moderately long sequences
  · selective memory — the model learns what to retain
  → made sequence learning work for translation, speech,
    and time series through the 2010s

DID NOT SOLVE
  · sequential computation — still no training parallelism
  · very long dependencies — hundreds of steps still degrade
  · the fixed-size state bottleneck — still one vector

The first of those is why transformers replaced them. LSTMs
fixed the gradient problem, not the parallelism problem.
```

**GRU** is the simplified variant — two gates instead of three, merging cell and hidden state. Fewer parameters, comparable performance, often preferred when either would do.

**Where LSTMs remain reasonable:** small-scale time-series forecasting, streaming inference with tight memory constraints, and cases where a fixed-size state is genuinely an advantage — an LSTM's inference state is O(d) regardless of sequence length, while a transformer's KV cache grows with it.

**That last point is a real and current argument**, and it's what state-space models exploit.

## 5. Why It Matters

- **The gating mechanism is a clean example** of solving a gradient problem architecturally.
- **The additive cell state is the same idea as a residual connection**, which connects to transformers.
- **Constant-size inference state** is a genuine advantage that motivates current research.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Still sequential** | No training parallelism — the decisive limitation |
| **More parameters per step** | Four weight matrices instead of one |
| **Long dependencies still degrade** | Better than RNNs, not solved |
| **Fixed-size state** | The bottleneck remains |
| **Slower per step** | Gating adds computation |

**On why they're worth understanding anyway:** the gating idea recurs. Attention itself is a form of learned, content-based gating — deciding how much of each position to let through. And state-space models are explicitly a return to constant-size recurrent state with modern training methods. Framing LSTMs as a step in a continuing line rather than a dead end is more accurate.

## 7. Interview Answer

> "An LSTM is an RNN with a separate cell state and three gates — forget, input, and output — each a sigmoid producing values between zero and one. The forget gate decides what to drop from the cell state, the input gate what to add, and the output gate what to expose as the hidden state.
>
> The key mechanism is that the cell state update is additive: new cell state equals forget gate times old cell state plus input gate times the candidate. If the forget gate stays near one, the gradient passes through nearly unchanged, so there's no repeated multiplication by a weight matrix and gradients don't vanish over long sequences.
>
> That's structurally the same idea as a residual connection — an additive path gradients can travel along. Worth pointing out, because it's the same insight appearing in two places.
>
> What LSTMs solved was vanishing gradients over moderately long sequences and selective memory — the model learns what to retain. That made sequence learning work for translation, speech, and time series through the 2010s.
>
> What they didn't solve is sequential computation. Training still can't be parallelized across the sequence, and that's what transformers fixed — not the gradient problem, which LSTMs had already largely addressed. Very long dependencies still degrade, and the fixed-size state bottleneck remains.
>
> There is one place that fixed-size state is an advantage, and it's a current argument rather than a historical one: an LSTM's inference state is constant in sequence length, whereas a transformer's KV cache grows with it. For streaming inference under tight memory constraints that matters, and it's exactly what state-space models like Mamba exploit — constant-size recurrent state with a formulation that can be parallelized during training.
>
> So I'd frame LSTMs as a step in a continuing line rather than a dead end. The gating idea itself recurs — attention is a form of learned, content-based gating."

## 8. Likely Follow-ups

**Q: How do LSTMs solve vanishing gradients?**
Through an additive cell state update. New cell state is the forget gate times the old state plus the input gate times the candidate, so when the forget gate stays near one the gradient passes through nearly unchanged — no repeated multiplication by a weight matrix, which is what caused vanishing in a plain RNN.

**Q: What are the three gates?**
Forget, deciding what to drop from the cell state; input, deciding what new information to add; and output, deciding what part of the cell state to expose as the hidden state. Each is a sigmoid producing values between zero and one, which is exactly "how much to let through."

**Q: Why did transformers replace LSTMs?**
Parallelism, not gradients. LSTMs had largely solved the gradient problem, but they're still sequential, so training can't be parallelized across the sequence. Attention processes all positions at once and gives a one-hop path between any two, which also handles very long dependencies better.

**Q: LSTM or GRU?**
GRU when either would do — it merges the cell and hidden state and uses two gates instead of three, so fewer parameters and faster, with comparable performance on most tasks. LSTM if the task benefits from the extra capacity, which is worth testing rather than assuming.

**Q: Is the fixed-size state ever an advantage?**
Yes. An LSTM's inference state is constant in sequence length, while a transformer's KV cache grows with it. For streaming inference under memory constraints that's a real benefit, and it's precisely what state-space models like Mamba are built around.

## 9. Common Mistakes

- Saying transformers replaced LSTMs because of gradients rather than parallelism.
- Not being able to name what each gate does.
- Missing that the additive cell state is the same idea as a residual connection.
- Treating the fixed-size state as purely a limitation.
- Describing LSTMs as obsolete rather than superseded for a specific reason.

## 10. What to Remember

- **Cell state plus three gates:** forget, input, output.
- **The additive update is the fix** — like a residual connection, gradients pass through.
- **Solved gradients, not parallelism** — the latter is why transformers won.
- **GRU is the simpler two-gate variant** with comparable performance.
- **Constant-size inference state** is a genuine advantage, exploited by state-space models.
