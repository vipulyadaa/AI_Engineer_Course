# Masked Attention

> **Phase 03 · TRANSFORMERS · Topic 18**

## 1. Definition

Any restriction on which positions may attend to which, implemented by setting disallowed attention scores to −∞ before softmax. Causal masking is one kind; padding masks, sliding-window masks, and document-separator masks are others.

## 2. Simple Explanation

"Masked attention" is the general mechanism; causal attention is the specific case people usually mean.

But there are several masks in a real training pipeline, and they combine. Getting any of them wrong produces subtle bugs rather than errors.

## 3. How It Works

**The four masks you'll encounter:**

| Mask | Purpose | Where |
|---|---|---|
| **Causal** | Position i can't see > i | Decoder training and inference |
| **Padding** | Ignore padding tokens in a batch | Any batched processing |
| **Sliding window** | Attend only to the last w tokens | Efficient long-context models |
| **Document separator** | Don't attend across packed documents | Pretraining with sequence packing |

**They combine by logical AND:**

```python
allowed = causal_mask & padding_mask & window_mask
scores = scores.masked_fill(~allowed, float("-inf"))
weights = softmax(scores, dim=-1)
```

**Always −∞ before softmax**, never zeroing weights after — zeroing afterwards breaks normalization and systematically scales down the output.

## 4. Practical Example

**The padding mask, which is the one people forget:**

```
Batch of sequences padded to equal length:

  seq 1: [the, bank, charged, a, fee]          len 5
  seq 2: [what, is, the, fee, <pad>]           len 4
  seq 3: [fees?, <pad>, <pad>, <pad>, <pad>]   len 1

Without a padding mask, real tokens attend to <pad> positions.
Pad embeddings are arbitrary, so they inject noise — and it
varies with how much padding each sequence happens to have.

Symptom: short sequences in a batch perform worse than the
same sequences processed alone. Subtle and easy to miss.
```

**Document separator masking in pretraining:**

```
For efficiency, pretraining packs multiple documents into one
sequence to avoid wasting positions on padding:

  [doc A tokens][doc B tokens][doc C tokens]

Without a separator mask, doc B's tokens attend to doc A's —
learning spurious cross-document associations.

With it, attention is causal WITHIN each document and blocked
across boundaries.
```

**Sliding window, for long context:**

```
Position i attends to positions [i−w, i] only.

  Full causal:    O(n²)
  Sliding window: O(n·w)  — linear in n for fixed w

Trade-off: no direct long-range attention. Information propagates
across windows through depth — layer by layer — so the effective
receptive field is roughly w × n_layers.

Some models interleave: mostly sliding-window layers with a few
full-attention layers to preserve long-range capability.
```

## 5. Why It Matters

- **Padding masks are a common, silent source of quality loss** in batched training.
- **Document-separator masking** is a real pretraining detail that shows practical depth.
- **Sliding-window masking is how several long-context models work**, and understanding the depth trade-off is the substantive part.

## 6. Trade-offs / Failure Modes

| Failure | Symptom |
|---|---|
| **Missing padding mask** | Short sequences underperform relative to unbatched processing |
| **Mask applied after softmax** | Weights don't sum to 1; output systematically scaled down |
| **Causal off-by-one** | Training loss drops suspiciously fast (model copies the answer) |
| **No document-separator mask** | Model learns spurious cross-document associations |
| **Sliding window too small** | Insufficient effective receptive field even with depth |
| **Masks not combined** | One mask silently overrides another |

**On −∞ vs. a large negative number:** using `-1e9` instead of true `-inf` is common and usually fine, but in FP16 it can overflow. Most frameworks use the dtype's minimum value. It's a small detail that causes NaNs when done carelessly.

**On sliding-window depth propagation:** the reason sliding windows work at all is that information moves across window boundaries layer by layer. A token at position 0 can influence position 10,000 if there are enough layers with overlapping windows. That's why the effective receptive field is roughly window size times depth, and why very shallow sliding-window models don't work.

## 7. Interview Answer

> "Masked attention is the general mechanism of restricting which positions attend to which, by setting disallowed scores to negative infinity before the softmax. Causal masking is the specific case people usually mean, but there are several masks in a real pipeline and they combine.
>
> The one people forget is the padding mask. When you batch sequences of different lengths you pad them, and without a mask real tokens attend to padding positions whose embeddings are arbitrary. That injects noise, and the amount varies with how much padding each sequence happens to have. The symptom is subtle — short sequences in a batch perform worse than the same sequences processed alone — and it's easy to miss because nothing errors.
>
> A pretraining detail worth knowing is document-separator masking. For efficiency, pretraining packs multiple documents into one sequence rather than wasting positions on padding. Without a separator mask, tokens in the second document attend to the first, learning spurious cross-document associations.
>
> And sliding-window masking is how several long-context models work — each position attends only to the last w tokens, which makes attention linear in sequence length rather than quadratic. The trade-off is no direct long-range attention, but information propagates across window boundaries layer by layer, so the effective receptive field is roughly window size times depth. Some models interleave mostly-sliding-window layers with a few full-attention layers to preserve long-range capability.
>
> All of them combine by logical AND before the softmax. And one small implementation detail: using a large negative number instead of true negative infinity can overflow in FP16, so most frameworks use the dtype's minimum value."

## 8. Likely Follow-ups

**Q: What masks exist besides causal?**
Padding masks, so real tokens don't attend to padding in a batch. Document-separator masks, so packed documents in pretraining don't attend across boundaries. Sliding-window masks for efficient long-context attention. They combine by logical AND, and all are applied before the softmax.

**Q: What happens without a padding mask?**
Real tokens attend to padding positions whose embeddings are arbitrary, injecting noise proportional to how much padding a sequence has. The symptom is that short sequences underperform when batched with long ones, compared to processing them alone. It's silent and easy to miss.

**Q: What is sliding-window attention?**
Each position attends only to the last w tokens, making attention linear in sequence length instead of quadratic. It gives up direct long-range attention, but information propagates across windows layer by layer, so the effective receptive field is roughly window size times depth. Several long-context models use it, often interleaved with a few full-attention layers.

**Q: Why mask before softmax rather than zeroing weights after?**
Because zeroing after breaks normalization — the remaining weights no longer sum to one, so the weighted sum of values is systematically scaled down. Setting scores to negative infinity before softmax gives exactly zero weight while keeping the distribution over allowed positions correct.

**Q: What is document-separator masking?**
During pretraining, multiple documents are packed into one sequence for efficiency. Without a separator mask, tokens in one document attend to tokens in another and learn spurious associations between unrelated texts. The mask makes attention causal within each document and blocked across boundaries.

## 9. Common Mistakes

- Forgetting the padding mask in batched training.
- Applying masks after softmax.
- Not combining multiple masks, so one silently overrides another.
- Using a large negative constant that overflows in FP16.
- Not knowing about document-separator masking in packed pretraining.

## 10. What to Remember

- **General mechanism:** set disallowed scores to −∞ before softmax. Causal is one case.
- **Four masks:** causal, padding, sliding-window, document-separator. Combine by AND.
- **Missing padding masks are silent** — short sequences quietly underperform.
- **Sliding window makes attention linear**; effective receptive field ≈ window × depth.
- **Use the dtype minimum, not a large constant**, to avoid FP16 overflow.
