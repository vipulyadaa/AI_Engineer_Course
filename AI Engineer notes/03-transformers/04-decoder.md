# Decoder

> **Phase 03 · TRANSFORMERS · Topic 04**

## 1. Definition

The transformer half that generates text autoregressively, using **causal (masked) attention** so each position attends only to itself and earlier positions. Every modern LLM — Gemini, GPT, Claude, Llama — is decoder-only.

## 2. Simple Explanation

A decoder predicts the next token given everything before it, then appends it and repeats.

The essential constraint is that position `t` must not see position `t+1`. Otherwise training would be trivial — the model could just copy the answer — and it would learn nothing useful about prediction.

## 3. How It Works

```
Causal mask: position t attends to positions ≤ t

        the  bank  charged  a   fee
the      ✓    ✗      ✗      ✗    ✗
bank     ✓    ✓      ✗      ✗    ✗
charged  ✓    ✓      ✓      ✗    ✗
a        ✓    ✓      ✓      ✓    ✗
fee      ✓    ✓      ✓      ✓    ✓
              ↑ upper triangle masked to -∞ before softmax
```

**Training vs. inference — the asymmetry that matters:**

```
TRAINING   all positions computed in PARALLEL.
           The causal mask means each position predicts the next
           token using only prior context. One forward pass
           produces loss for every position at once.

INFERENCE  strictly SEQUENTIAL. Generate token t, append it,
           generate t+1. Can't parallelize — token t+1 depends
           on token t existing.
```

That asymmetry is why training scales beautifully on GPUs and generation doesn't — and it's the root of the [KV cache](23-kv-cache.md), which stops decode from recomputing the whole prefix per token.

## 4. Practical Example

**Why decoder-only won over encoder-decoder:**

```
Original 2017 transformer: encoder-decoder, built for translation.

Modern LLMs: decoder-only. Why?

· Simpler — one stack, not two plus cross-attention
· Scales better — fewer architectural decisions to get wrong
· In-context learning — a prompt IS the "encoder"; you condition
  on input by putting it in the context rather than through a
  separate encoder stack
· Any seq2seq task can be framed as continuation:
  "Translate to French: {text}\nFrench:"
```

**Prefill and decode — the two inference phases:**

```
PREFILL   process the whole prompt in parallel (causal mask still
          applies, but all positions computed at once)
          → compute-bound; cost scales with PROMPT length
          → this is your time-to-first-token

DECODE    one token at a time, each attending to all previous
          → memory-bandwidth-bound; cost scales with OUTPUT length
          → this is your inter-token latency
```

That split explains most LLM latency behavior — and why trimming retrieved context improves TTFT directly.

## 5. Why It Matters

- **Every LLM you use is decoder-only.** Knowing why is a standard interview question.
- **The prefill/decode split explains LLM serving economics** — latency, batching, and why KV caching exists.
- **Causal masking is what makes generation possible** and what makes the model unable to see ahead.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **Causal mask** | Can generate; weaker at understanding than a bidirectional encoder |
| **Sequential decode** | Can't parallelize generation; latency scales with output length |
| **KV cache memory** | Grows with sequence length × batch size — often the binding constraint |
| **Exposure bias** | Trained on ground-truth prefixes, generates from its own outputs |
| **Quadratic attention** | Long contexts are expensive at prefill |

**KV cache memory is usually what limits throughput**, not compute. Cache size scales with batch size, sequence length, layers, and KV heads — which is exactly why grouped-query attention exists, cutting the KV-head count several-fold.

**On using decoders as embedders:** recent embedding models are sometimes adapted decoders with last-token pooling or the causal mask removed. They can work well, but a bidirectional encoder still has an architectural advantage for pure understanding tasks.

## 7. Interview Answer

> "A decoder generates text autoregressively using causal masking, so each position attends only to itself and earlier positions. Every modern LLM is decoder-only.
>
> The causal mask is the essential constraint. Position t must not see position t+1, or training would be trivial — the model could copy the answer rather than learning to predict. Mechanically it's an upper-triangular mask set to negative infinity before the softmax.
>
> There's an asymmetry between training and inference that explains a lot. During training all positions are computed in parallel: one forward pass gives you a loss for every position, because the mask ensures each one only used prior context. During inference it's strictly sequential — generate a token, append it, generate the next. You can't parallelize that, because token t+1 depends on token t existing.
>
> That's why training scales beautifully on GPUs and generation doesn't, and it's the reason the KV cache exists — without it, each decode step would recompute the entire prefix.
>
> Inference splits into two phases with different characteristics. Prefill processes the whole prompt in parallel and is compute-bound, scaling with prompt length — that's time-to-first-token. Decode generates one token at a time and is memory-bandwidth-bound, scaling with output length. That split explains most LLM latency behavior, and it's why trimming retrieved context improves first-token latency directly.
>
> On why decoder-only beat encoder-decoder: it's simpler, one stack instead of two plus cross-attention, and in-context learning means the prompt serves the encoder's role. Any sequence-to-sequence task can be framed as continuation."

## 8. Likely Follow-ups

**Q: Why is causal masking necessary?**
Because without it the model could attend to the token it's supposed to predict, making training trivial and teaching it nothing. The mask enforces that each position predicts the next token using only prior context — which is also exactly the condition that holds at generation time, so training and inference match.

**Q: Why are modern LLMs decoder-only rather than encoder-decoder?**
Simplicity and scaling. One stack instead of two plus cross-attention means fewer architectural choices and a cleaner scaling story. And in-context learning makes the separate encoder unnecessary — you condition on input by putting it in the prompt. Any seq2seq task reframes as continuation: "Translate to French: {text}\nFrench:".

**Q: What are prefill and decode?**
Prefill processes the entire prompt in one parallel forward pass — compute-bound, scaling with prompt length, and it determines time-to-first-token. Decode generates one token at a time, each attending to all previous tokens — memory-bandwidth-bound, scaling with output length, determining inter-token latency. They have different bottlenecks and different optimizations.

**Q: Why does the KV cache exist?**
Because during decode each new token attends to all previous tokens. Without caching, every step would recompute keys and values for the entire prefix, making generation quadratic. The cache stores them so each step only computes the new token's — linear instead of quadratic, at the cost of memory that grows with sequence length and batch size.

**Q: What is exposure bias?**
The model trains on ground-truth prefixes but generates from its own outputs, so at inference it conditions on text it produced — which may contain errors that compound. It's a known train/inference mismatch in autoregressive models. In practice it's mitigated by scale and by alignment training rather than fully solved.

## 9. Common Mistakes

- Describing modern LLMs as encoder-decoder.
- Not knowing that training is parallel while inference is sequential.
- Treating LLM latency as one number instead of prefill plus decode.
- Thinking the KV cache is an optimization rather than what makes decode linear.
- Saying decoders "aren't trained for understanding" — the limitation is the causal mask.

## 10. What to Remember

- **Causal mask: position t sees only ≤ t.** That's what makes generation possible.
- **Training is parallel; inference is sequential.** The asymmetry drives everything.
- **Prefill (prompt, compute-bound, TTFT) + decode (output, bandwidth-bound).**
- **KV cache makes decode linear** — and its memory is usually the throughput limit.
- **All modern LLMs are decoder-only:** simpler, scales better, in-context learning replaces the encoder.
