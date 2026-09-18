# Feed-Forward Network (FFN)

> **Phase 03 · TRANSFORMERS · Topic 14**

## 1. Definition

The per-position transformation in each transformer block: expand to a wider dimension, apply a non-linearity, project back. It holds roughly **two-thirds of the model's parameters** and is where most learned knowledge resides.

## 2. Simple Explanation

Attention moves information *between* positions. The FFN transforms each position *independently*.

After attention has gathered context, the FFN processes each token's enriched representation on its own — same weights applied to every position, no interaction between them.

## 3. How It Works

```
FFN(x) = W_down · activation(W_up · x)

W_up:    d_model → 4·d_model     (expand)
activation:  ReLU / GELU / SwiGLU
W_down:  4·d_model → d_model     (contract)
```

**Parameters, which is the number to know:**

```
W_up:   d × 4d = 4d²
W_down: 4d × d = 4d²
                ────
                8d²  per block

Attention is 4d² (Q, K, V, O projections).

So the FFN is TWICE attention — about two-thirds of every block.
```

**The expand-then-contract shape matters.** The wide intermediate layer gives the non-linearity room to work; without expansion, two linear layers with a non-linearity between them would have far less capacity for the same position-wise transformation.

**SwiGLU, the modern activation:**

```
Classic:  FFN(x) = W_down · GELU(W_up · x)
SwiGLU:   FFN(x) = W_down · (Swish(W_gate·x) ⊙ (W_up·x))
                                    ↑ a THIRD matrix

Three matrices instead of two, so the hidden dimension is
usually reduced to ~8/3·d to keep the parameter count comparable.
Empirically better quality at equal parameters.
```

## 4. Practical Example

**The interpretability finding worth knowing:**

```
Work on transformer interpretability (Geva et al. and others)
suggests FFN layers function like key-value memories:

  W_up rows   ← act like KEYS, detecting input patterns
  W_down cols ← act like VALUES, contributing information

So the FFN is where factual associations are stored.
That's consistent with model-editing research (ROME and similar)
that locates and modifies specific facts by targeting FFN weights.

It's also why the FFN holding two-thirds of parameters makes sense:
it's the model's knowledge store, while attention is the routing.
```

**Mixture-of-Experts — the obvious consequence:**

```
If the FFN is two-thirds of parameters and most learned knowledge,
scaling it is the highest-leverage move. But scaling it densely
scales compute too.

MoE: replace one FFN with N expert FFNs and a router that
activates only k of them (often k=2) per token.

  → Total parameters scale with N
  → Compute per token scales with k
  → Far more capacity at similar inference cost

The trade-off is memory (all experts must be loaded) and
routing complexity (load balancing across experts).
```

## 5. Why It Matters

- **"Where are the parameters?" is a common question**, and the answer being the FFN rather than attention surprises people.
- **It's where knowledge lives**, which connects to fine-tuning, model editing, and MoE.
- **MoE is the current frontier of scaling**, and it's an FFN modification.

## 6. Trade-offs / Failure Modes

| Point | Detail |
|---|---|
| **Two-thirds of parameters** | The dominant memory and compute cost per block |
| **Position-independent** | Identical weights at every position; no cross-token interaction |
| **Expansion ratio (usually 4×)** | Larger = more capacity and more parameters |
| **SwiGLU uses 3 matrices** | Hidden dim reduced to ~8/3·d to keep parameters comparable |
| **MoE needs all experts in memory** | Capacity gain without compute gain, but not without memory cost |
| **MoE load balancing** | Routers can collapse onto a few experts without an auxiliary loss |

**On the position-independence point:** the same FFN weights apply to every position, which is why it's sometimes called a "position-wise" feed-forward network. That's what makes it cheap to parallelize and why it contributes nothing to sequence-length complexity — all the O(n²) cost is in attention.

## 7. Interview Answer

> "The feed-forward network is the per-position transformation in each block: expand from d_model to four times that, apply a non-linearity, project back. Attention moves information between positions; the FFN transforms each position independently, with the same weights at every position.
>
> The number worth knowing is that it holds about two-thirds of the parameters. The two FFN matrices are 4d² each, so 8d² per block, versus 4d² for attention's four projections. That surprises people, because attention gets all the conceptual attention while the FFN is where most of the capacity actually sits.
>
> And there's interpretability work suggesting the FFN functions like a key-value memory — the up-projection rows detecting input patterns, the down-projection columns contributing information. That's consistent with model-editing research that locates and modifies specific facts by targeting FFN weights. So the division of labor is roughly: attention routes, the FFN stores.
>
> The modern activation is SwiGLU rather than ReLU or GELU. It uses a third gating matrix, so the hidden dimension is typically reduced to about eight-thirds of d_model to keep the parameter count comparable — and it's empirically better at equal parameters.
>
> The consequence worth drawing out is mixture-of-experts. If the FFN is two-thirds of parameters and most of the knowledge, scaling it is the highest-leverage move — but scaling densely scales compute too. MoE replaces one FFN with N experts and a router that activates only two per token, so total parameters scale with N while compute per token stays roughly constant. The costs are memory, since all experts have to be loaded, and load balancing, since routers can collapse onto a few experts without an auxiliary loss."

## 8. Likely Follow-ups

**Q: Where are most of a transformer's parameters?**
The feed-forward layers — about two-thirds of each block. Attention's four projections are 4d²; the FFN's two matrices at 4× expansion are 8d². It's counterintuitive because attention is the conceptually distinctive part, but the FFN holds the capacity.

**Q: Why expand to 4× before contracting?**
The wide intermediate layer gives the non-linearity room to operate. Without expansion, the FFN would be two narrow linear layers with an activation between them, which has far less representational capacity for a position-wise transformation. Four times is convention rather than derived, but it's been stable across architectures.

**Q: What does the FFN actually do?**
Interpretability work suggests it acts as a key-value memory — the up-projection detects input patterns and the down-projection contributes associated information. That's consistent with model-editing research that modifies specific facts by targeting FFN weights. The working division is that attention routes information and the FFN stores knowledge.

**Q: What is SwiGLU?**
A gated activation using a third matrix: the output is the element-wise product of a Swish-activated gate projection and a linear up projection, then projected down. Because it adds a matrix, the hidden dimension is usually reduced to about 8/3·d to keep parameters comparable. It performs better than GELU at equal parameter count, which is why modern models use it.

**Q: What is Mixture-of-Experts?**
Replacing the single FFN with N expert FFNs plus a router that activates only a few — often two — per token. Total parameters scale with N while compute per token stays roughly constant, so you get much more capacity at similar inference cost. The costs are memory, since all experts must be resident, and load balancing, since routers tend to collapse onto a few experts without an auxiliary balancing loss.

## 9. Common Mistakes

- Assuming attention holds most parameters.
- Not knowing the 4× expansion ratio or why it's there.
- Describing ReLU as the modern activation.
- Not connecting MoE to the FFN specifically.
- Forgetting that the FFN contributes nothing to sequence-length complexity.

## 10. What to Remember

- **Expand 4×, non-linearity, contract.** Per-position, same weights everywhere.
- **8d² per block vs. 4d² for attention** — the FFN is ~2/3 of parameters.
- **Attention routes; the FFN stores.** It behaves like a key-value memory.
- **SwiGLU is the modern activation** — three matrices, hidden dim reduced to ~8/3·d.
- **MoE scales the FFN** — parameters grow with expert count, compute with experts-per-token.
