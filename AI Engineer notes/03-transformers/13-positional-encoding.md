# Positional Encoding

> **Phase 03 · TRANSFORMERS · Topic 13**

## 1. Definition

The mechanism that injects token order into a transformer. Attention is permutation-invariant — it computes relationships with no notion of position — so order must be added explicitly.

## 2. Simple Explanation

Self-attention treats a sequence as a **set**. Shuffle the tokens and the attention computation produces the same result, just reordered.

That means "the customer charged the bank" and "the bank charged the customer" would be identical without positional information. Position has to come from somewhere, and there are several designs for where.

## 3. How It Works

**Four approaches, in rough historical order:**

| Approach | Mechanism | Used by |
|---|---|---|
| **Sinusoidal** | Fixed sin/cos waves added to embeddings | Original 2017 paper |
| **Learned absolute** | A trainable embedding per position, added | BERT, GPT-2 |
| **RoPE** | Rotate Q and K by a position-dependent angle | **Llama, Gemini, most modern LLMs** |
| **ALiBi** | Add a distance-proportional penalty to attention scores | Some long-context models |

**RoPE is the one to understand**, since it's what modern models use:

```
Rotate each pair of dimensions in Q and K by an angle
proportional to the token's position.

Key property: the dot product of a rotated query and a rotated key
depends on their RELATIVE positions, not absolute ones.

  q_at_position_m · k_at_position_n  →  function of (m − n)

So the model learns relative distance naturally, and it's applied
inside attention rather than added to embeddings.
```

**Why RoPE applies to Q and K but not V:** position should affect *who matches whom*, not the content being passed along. Rotating values would distort the payload.

## 4. Practical Example

**Absolute vs. relative, and why it matters for long context:**

```
Learned absolute embeddings:
  A table of max_len × d. Trained positions 0-2047.
  Position 3000 has NO embedding — the model has never seen it.
  → hard context limit, no graceful extension.

RoPE:
  A rotation formula, not a table. Position 3000 is computable.
  → extrapolates somewhat beyond training length, and there are
    established techniques (position interpolation, NTK-aware
    scaling, YaRN) to extend it much further.

That's a large part of why long-context models use RoPE.
```

**Context extension in practice:**

```
Model trained at 4k context, want 32k:

Position interpolation — scale positions down so 32k maps into
  the trained 4k range. Cheap, needs a short fine-tune, works well.
NTK-aware / YaRN — adjust the rotation frequencies rather than
  uniformly compressing, preserving high-frequency detail better.

Both are RoPE-specific. You can't do this with a learned
position table.
```

**Sinusoidal, for completeness:**

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))

Different frequencies per dimension pair — low dimensions vary
fast (fine position), high dimensions vary slowly (coarse position).
Deterministic, so it extrapolates in principle, though in practice
models trained on it don't generalize well beyond training length.
```

## 5. Why It Matters

- **It's the answer to "why does a transformer need position at all?"** — permutation invariance is a clean, fundamental point.
- **RoPE is what modern models use**, and knowing it distinguishes current knowledge from the 2017 paper.
- **Context extension techniques are RoPE-specific**, which connects directly to long-context serving.

## 6. Trade-offs / Failure Modes

| Approach | Weakness |
|---|---|
| **Sinusoidal** | Poor extrapolation in practice despite being deterministic |
| **Learned absolute** | Hard limit at max trained position; no extension path |
| **RoPE** | Quality degrades on extreme extrapolation without adaptation |
| **ALiBi** | Strong long-context extrapolation, but the linear-decay bias is a strong prior |

**The failure mode when context is extended naively:** a model trained at 4k and run at 32k without adaptation produces degraded output — often repetitive or incoherent at long range — because the positional signal is outside anything it saw during training. Position interpolation or NTK-aware scaling plus a short fine-tune is what makes extension actually work.

**On relative vs. absolute:** relative position is generally the better inductive bias for language, because what matters is usually distance between tokens rather than absolute offset from the start. RoPE gives relative behavior while being computed from absolute positions, which is why it's elegant.

## 7. Interview Answer

> "Positional encoding injects token order into a transformer, and the reason it's necessary is that self-attention is permutation-invariant. It computes relationships between tokens with no notion of where they are, so 'the customer charged the bank' and 'the bank charged the customer' would produce identical representations. Position has to be added explicitly.
>
> The original paper used fixed sinusoidal encodings added to embeddings. BERT and GPT-2 used learned absolute position embeddings — a trainable vector per position. Modern models use RoPE, rotary position embedding.
>
> RoPE rotates each pair of dimensions in the query and key vectors by an angle proportional to position. The key property is that the dot product of a rotated query and rotated key depends on their *relative* positions, not absolute ones — so the model naturally learns distance rather than offset from the start, which is the better inductive bias for language. And it's applied inside attention rather than added to embeddings.
>
> It's applied to Q and K but not V, which is a nice illustration of why keys and values are separate: position should affect who matches whom, not the content being passed along.
>
> The practical reason RoPE dominates is context extension. Learned absolute embeddings are a lookup table — position three thousand has no embedding if you trained to two thousand, so there's a hard limit with no extension path. RoPE is a formula, so longer positions are computable, and there are established techniques — position interpolation, NTK-aware scaling, YaRN — to extend a model trained at four thousand tokens to thirty-two thousand with a short fine-tune. That's why long-context models use it.
>
> The caveat is that naive extrapolation without adaptation degrades badly — output becomes repetitive or incoherent at long range, because the positional signal is outside anything seen in training."

## 8. Likely Follow-ups

**Q: Why does a transformer need positional encoding at all?**
Because self-attention is permutation-invariant — it computes pairwise relationships with no positional term, so shuffling the input produces the same output reordered. Without explicit position, sentences with the same words in different orders would be indistinguishable.

**Q: What is RoPE and why is it preferred?**
Rotary position embedding rotates query and key vectors by a position-dependent angle, so their dot product depends on relative position. It gives relative-distance behavior, applies inside attention rather than to embeddings, and — critically — it's a formula rather than a lookup table, so positions beyond the training length are computable and extendable.

**Q: How do you extend a model's context length?**
With RoPE-specific techniques. Position interpolation scales positions down so the longer range maps into the trained range, then a short fine-tune. NTK-aware scaling and YaRN adjust rotation frequencies non-uniformly, preserving high-frequency detail better. Both require RoPE — you can't extend a learned position table.

**Q: Why is RoPE applied to Q and K but not V?**
Because position should affect which tokens match which, not the content being passed along. Rotating values would distort the payload. It's a clean demonstration that the key/value separation is meaningful — K is the match criterion, V is the content, and position belongs to matching.

**Q: Absolute or relative position — which is better for language?**
Relative, generally. What usually matters is the distance between tokens rather than their offset from the start of the document. RoPE's elegance is that it's computed from absolute positions but produces relative behavior in the attention score, so you get the better inductive bias without tracking pairwise distances explicitly.

## 9. Common Mistakes

- Not knowing *why* positional encoding is needed — permutation invariance.
- Describing sinusoidal encoding as current practice.
- Thinking RoPE is added to embeddings; it's applied to Q and K inside attention.
- Assuming a model can be run at longer context without adaptation.
- Not connecting RoPE to context-extension techniques.

## 10. What to Remember

- **Attention is permutation-invariant** — that's why position must be injected.
- **RoPE is the modern standard:** rotate Q and K by a position-dependent angle.
- **Its dot product depends on relative position**, which is the right bias for language.
- **Applied to Q and K, not V** — position affects matching, not payload.
- **RoPE enables context extension** (interpolation, NTK-aware, YaRN); learned tables don't.
