# Transformers (Overview)

> **Phase 02 · DEEP LEARNING · Topic 21**

## 1. Definition

An architecture built on self-attention rather than recurrence. Every position attends to every other position directly, which removes the sequential bottleneck and makes training fully parallel across the sequence.

> Covered in depth in [03-transformers](../03-transformers/). This topic is the deep-learning-fundamentals view: what changed and why it mattered.

## 2. Simple Explanation

An RNN reads a sentence word by word, carrying memory forward. A transformer looks at all words at once and lets each decide which others are relevant to it.

Removing the sequential dependency is what allowed training on far more data with far more compute — which is what produced modern LLMs.

## 3. How It Works

```
tokens ─▶ embeddings + positional info
            │
            ▼
        ┌────────────────────────┐
        │  Multi-head attention  │  ← positions exchange info
        │  + residual + norm     │
        │  Feed-forward network  │  ← per-position processing
        │  + residual + norm     │
        └────────────────────────┘  × N layers
            │
            ▼
        output (e.g. softmax over vocabulary)
```

**Attention:** `softmax(QKᵀ / √d_k) · V` — each position forms a query, compares it against every key, and takes a weighted sum of the values.

**Because attention is order-agnostic**, positional information must be added explicitly — otherwise "the bank pays the customer" and "the customer pays the bank" would be identical to the model.

## 4. Practical Example

**What actually changed, stated precisely:**

```
                    RNN/LSTM          Transformer
Training parallel   No                Yes            ← the key change
Path between any    O(n) steps        O(1)
two positions
Compute per layer   O(n·d²)           O(n²·d)
Long dependencies   Degrade           Direct

Transformers are MORE expensive asymptotically — quadratic
rather than linear in sequence length.

They won because parallelism lets you use GPUs efficiently,
which lets you train on vastly more data. The quadratic cost
was worth paying for that.
```

**This is the point to get right.** "Attention is more efficient" is wrong; "attention is parallelizable, which is worth more than its asymptotic cost" is right.

**Three lessons from earlier topics that all appear here:**

```
· RESIDUAL CONNECTIONS   from the vanishing-gradient problem
· NORMALIZATION          LayerNorm, because BatchNorm can't
                         handle variable-length sequences
· NON-SATURATING ACTS    GELU in the feed-forward blocks

A transformer is the accumulated fixes for everything that
made deep networks hard to train, applied to an attention-
based architecture.
```

**Where the parameters live:** the feed-forward blocks hold roughly two thirds of them, because they expand to 4× the model dimension and back. Attention holds less than most people assume.

## 5. Why It Matters

- **It's the architecture behind everything** you'll work with — Gemini, embeddings, rerankers.
- **The parallelism argument** is the correct answer to "why transformers won."
- **It composes every earlier fix** — residuals, normalization, non-saturating activations.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **O(n²) attention** | Cost grows quadratically with context length |
| **KV cache grows with length** | Inference memory scales with the sequence |
| **Needs a lot of data** | Fewer inductive biases than a CNN or RNN |
| **Position must be injected** | Attention alone is order-agnostic |
| **Expensive to train** | The reason almost everyone fine-tunes instead |

**On the quadratic cost:** this is why long-context models are hard and why FlashAttention, sliding-window attention, and related techniques exist. For a RAG system it's also the practical argument for retrieving fewer, better chunks rather than stuffing a large context — cost and latency both grow faster than linearly.

**On data requirements:** transformers have fewer built-in assumptions than CNNs or RNNs, so they learn structure from data rather than assuming it. That's why they need more data, and why in practice almost nobody trains one from scratch — you fine-tune or prompt a pretrained model.

## 7. Interview Answer

> "A transformer replaces recurrence with self-attention. Every position attends to every other position directly, so there's no sequential dependency and training is fully parallel across the sequence. Structurally it's multi-head attention for exchanging information between positions, a feed-forward network for per-position processing, with residual connections and normalization around each, stacked N times.
>
> The thing I'd be precise about is why it won. Transformers are *more* expensive asymptotically — quadratic in sequence length where an RNN is linear. So 'attention is more efficient' is wrong. What attention gives you is parallelism, which lets you use GPUs efficiently, which lets you train on vastly more data. The quadratic cost was worth paying for that, and it's what produced modern LLMs.
>
> The secondary win is the path length. In an RNN, relating two distant positions takes order-n steps with information degrading along the way; with attention it's one hop. That's what fixed long-range dependencies.
>
> Something I find clarifying is that a transformer composes every earlier fix from deep learning. Residual connections, which came from the vanishing gradient problem. LayerNorm rather than BatchNorm, because variable-length sequences and batch-size-one inference break batch statistics. Non-saturating activations — GELU in the feed-forward blocks. It's the accumulated solutions to everything that made deep networks hard to train, applied to an attention-based architecture.
>
> Two practical details. Attention is order-agnostic, so positional information has to be injected explicitly — otherwise 'the bank pays the customer' and 'the customer pays the bank' would be identical to the model. And the parameters mostly live in the feed-forward blocks, roughly two thirds, because they expand to four times the model dimension and back. Attention holds less than people assume.
>
> The cost I'd carry into system design: quadratic attention means context length is expensive in both compute and KV cache memory. For a RAG system that's the concrete argument for retrieving fewer, better chunks rather than stuffing a large context."

## 8. Likely Follow-ups

**Q: Why did transformers replace RNNs?**
Parallelism. RNNs are sequential so training can't be parallelized across the sequence; attention processes all positions at once and uses GPUs efficiently, enabling training on far more data. It also gives a one-hop path between any two positions, which fixes long-range dependencies.

**Q: Are transformers more efficient than RNNs?**
No — they're quadratic in sequence length where RNNs are linear, so asymptotically they're worse. They won despite that because parallelizable training is worth more in practice than a better asymptotic bound you can't exploit on parallel hardware.

**Q: Why do transformers need positional encoding?**
Because attention is order-agnostic — it computes a weighted sum over positions with no inherent notion of sequence. Without position injected explicitly, a sentence and its reordering would produce identical representations, which is obviously wrong for language.

**Q: Where are a transformer's parameters?**
Mostly in the feed-forward blocks — roughly two thirds — because they expand to four times the model dimension and project back. Attention projections hold less than people expect, which matters when reasoning about memory and about what quantization or pruning targets.

**Q: What's the practical cost of quadratic attention?**
Context length is expensive in compute and in KV cache memory, which grows with sequence length at inference. For a RAG system that's the argument for retrieving fewer, better chunks and reranking rather than stuffing a large context — cost and latency both grow faster than linearly in what you send.

## 9. Common Mistakes

- Claiming attention is more efficient than recurrence — it isn't.
- Omitting parallelism as the decisive advantage.
- Forgetting that positional information must be added explicitly.
- Assuming attention holds most of the parameters.
- Not connecting residuals, LayerNorm, and GELU back to earlier problems.

## 10. What to Remember

- **Self-attention replaces recurrence** — every position attends to every other directly.
- **Parallelism is why it won**, not asymptotic efficiency — attention is quadratic.
- **One-hop path between positions** fixes long-range dependencies.
- **It composes every earlier fix:** residuals, LayerNorm, GELU.
- **Feed-forward blocks hold ~2/3 of parameters**; position must be injected.
