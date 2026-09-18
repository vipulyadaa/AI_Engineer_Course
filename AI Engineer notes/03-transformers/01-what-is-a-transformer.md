# What Is a Transformer?

> **Phase 03 · TRANSFORMERS · Topic 01**

## 1. Definition

A neural network architecture built on **self-attention**, which lets every position in a sequence directly attend to every other position. Introduced in "Attention Is All You Need" (Vaswani et al., 2017), it replaced recurrence and is the architecture behind every modern LLM.

## 2. Simple Explanation

Earlier sequence models read text one word at a time, carrying a running summary forward. Information from word 1 had to survive 500 sequential steps to influence word 500, and it usually didn't.

A transformer lets every word look directly at every other word in one operation. No distance penalty, and — crucially — all positions are processed **in parallel**, which is what made training at scale possible.

## 3. How It Works

**The core insight:** replace sequential processing with attention, where each token computes a weighted combination of all tokens based on relevance.

```
Input tokens → embeddings + positional encoding
                        │
        ┌───────────────▼────────────────┐
        │  N × Transformer Block          │
        │  ┌──────────────────────────┐   │
        │  │ Multi-head self-attention│   │  ← tokens exchange information
        │  │ + residual, layer norm   │   │
        │  ├──────────────────────────┤   │
        │  │ Feed-forward network     │   │  ← per-token transformation
        │  │ + residual, layer norm   │   │
        │  └──────────────────────────┘   │
        └───────────────┬────────────────┘
                        ▼
                  output logits
```

**The two operations in every block, and why both are needed:**

- **Attention** mixes information *across* positions — this is where context comes from.
- **Feed-forward** transforms each position *independently* — this is where most parameters and most learned knowledge live.

## 4. Practical Example

**Why attention solves what recurrence couldn't:**

```
"The account that the customer opened in 2019 after moving
 from the branch in Leeds was closed last week."

To resolve "was closed" → "the account", an RNN must carry that
information through ~15 sequential steps, competing with everything
else in a fixed-size hidden state.

Attention: "closed" directly attends to "account" in one step,
with a learned weight. Distance is irrelevant.
```

**The parallelism argument, which is the practical reason transformers won:**

```
RNN:         step t depends on step t-1 → sequential → can't parallelize
             training time scales with sequence length

Transformer: all positions computed simultaneously → one big matmul
             → GPUs are extremely good at this

That's what made training on trillions of tokens feasible.
Attention wasn't just better; it was trainable at scale.
```

## 5. Why It Matters

- **It's the architecture under everything you use** — Gemini, GPT, Claude, embedding models, rerankers.
- **The parallelism property explains why scale became possible**, which is the real historical answer to "why now."
- **Its cost structure — quadratic in sequence length — explains context-window limits**, KV caching, and much of LLM serving economics.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **O(n²) attention** | Compute and memory scale quadratically with sequence length — the context-length constraint |
| **No inherent order** | Attention is permutation-invariant; [positional encoding](13-positional-encoding.md) must add order |
| **Data-hungry** | Fewer inductive biases than CNNs/RNNs; needs scale to learn |
| **Memory at inference** | The [KV cache](23-kv-cache.md) grows with sequence length and often binds before compute does |
| **Fixed context window** | A hard limit, unlike an RNN's theoretically unbounded state |

**The quadratic cost is the defining practical constraint.** Doubling context quadruples attention compute, which is why long-context models are expensive and why efficient-attention variants (FlashAttention, sliding-window, sparse patterns) exist.

## 7. Interview Answer

> "A transformer is a neural architecture built on self-attention, where every position in a sequence can directly attend to every other position. It came from the 2017 'Attention Is All You Need' paper and it's the architecture behind every modern LLM.
>
> The problem it solved: earlier sequence models processed text one step at a time, carrying a running summary. Information from word one had to survive hundreds of sequential steps to influence word five hundred, and it degraded along the way. Attention removes the distance penalty — any two tokens interact directly in one operation with a learned weight.
>
> But the reason transformers actually won isn't just quality, it's parallelism. An RNN's step t depends on step t-1, so training is inherently sequential. A transformer computes all positions simultaneously as one large matrix multiplication, which is exactly what GPUs are built for. That's what made training on trillions of tokens feasible. Attention wasn't just better — it was trainable at scale.
>
> Structurally, each block has two operations. Attention mixes information across positions, which is where context comes from. The feed-forward network transforms each position independently, and that's where most of the parameters and most of the learned knowledge sit — roughly two-thirds of a block's parameters.
>
> The defining cost is that attention is quadratic in sequence length. Doubling the context quadruples attention compute, which is why context windows have limits, why long context is expensive, and why efficient-attention variants exist. At inference the binding constraint is often the KV cache rather than compute, since it grows with sequence length and batch size."

## 8. Likely Follow-ups

**Q: What problem did transformers solve?**
Two. Long-range dependencies — RNNs degraded information over distance, while attention connects any two positions in one step. And trainability at scale — RNNs are inherently sequential so training can't be parallelized across positions, while transformers compute all positions simultaneously. The second is what actually unlocked large models.

**Q: Why is attention quadratic?**
Because every position attends to every other position, producing an n×n attention matrix. For 1,000 tokens that's a million scores; for 10,000 tokens, a hundred million. Both compute and the memory for that matrix scale as n², which is the fundamental constraint on context length.

**Q: What's in a transformer block?**
Multi-head self-attention followed by a feed-forward network, each wrapped with a residual connection and layer normalization. Attention moves information between positions; the feed-forward layer transforms each position independently and holds most of the parameters. Stack N of those blocks and that's the model.

**Q: Encoder, decoder, or both?**
Depends on the task. Encoder-only (BERT-style) sees the whole sequence bidirectionally and is good for understanding tasks and embeddings. Decoder-only (GPT-style) uses causal masking so each position only sees earlier ones, which is what generation requires — and it's what every modern LLM uses. Encoder-decoder suits sequence-to-sequence tasks like translation.

**Q: Why do transformers need positional encoding?**
Because attention is permutation-invariant — it computes relationships between tokens with no notion of their order. Without positional information, "the bank charged the customer" and "the customer charged the bank" would produce identical representations. Position has to be injected explicitly, either added to embeddings or built into the attention computation as with RoPE.

## 9. Common Mistakes

- Saying transformers won purely on quality rather than on parallelizable training.
- Forgetting that attention is permutation-invariant and needs positional encoding.
- Thinking attention holds most of the parameters — the feed-forward layers do.
- Not connecting the quadratic cost to context-window limits and serving economics.
- Describing modern LLMs as encoder-decoder; they're decoder-only.

## 10. What to Remember

- **Self-attention: every position attends to every other, in one step.** No distance penalty.
- **Parallelism is why it won** — GPUs train all positions simultaneously.
- **Each block:** attention (mixes across positions) + feed-forward (transforms each position, holds most parameters).
- **O(n²) in sequence length** — the root of context limits and long-context cost.
- **Permutation-invariant**, so positional encoding is mandatory.
