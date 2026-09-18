# Causal Attention

> **Phase 03 · TRANSFORMERS · Topic 17**

## 1. Definition

Self-attention restricted so that each position can only attend to itself and earlier positions. It's what makes autoregressive generation possible and what defines a decoder.

## 2. Simple Explanation

Position 5 can see positions 1 through 5. It cannot see 6, 7, or 8.

Without that restriction, training next-token prediction would be trivial — the model could simply attend to the token it's supposed to predict. The mask is what forces it to actually learn prediction.

## 3. How It Works

```
Lower-triangular mask over the n×n score matrix:

        the  bank  charged  a   fee
the      ✓    ✗      ✗      ✗    ✗
bank     ✓    ✓      ✗      ✗    ✗
charged  ✓    ✓      ✓      ✗    ✗
a        ✓    ✓      ✓      ✓    ✗
fee      ✓    ✓      ✓      ✓    ✓

Implementation: set masked scores to -∞ BEFORE softmax,
because exp(-∞) = 0 and the remaining weights still sum to 1.
```

**The training/inference consistency argument, which is the real reason it works:**

```
TRAINING   all positions computed in parallel. Position i predicts
           token i+1 using only tokens ≤ i — because of the mask.
           One forward pass gives loss at every position.

INFERENCE  position i has only tokens ≤ i available, because
           later ones don't exist yet.

The mask makes the training condition IDENTICAL to the
inference condition. That's why the model transfers.
```

**Teacher forcing** is the corollary: during training the model conditions on the ground-truth prefix, not its own predictions. Efficient, and the source of exposure bias.

## 4. Practical Example

**Why masking before softmax is mandatory:**

```
❌ softmax then zero:
   softmax([0.4, 3.6, 2.4, 0.3, 2.8]) = [.02, .45, .14, .02, .37]
   zero the last two → [.02, .45, .14, 0, 0], sum = 0.61
   → not a distribution; the output is systematically scaled down

✅ mask to -∞ then softmax:
   softmax([0.4, 3.6, 2.4, -∞, -∞]) = [.03, .71, .26, 0, 0]
   → sum = 1.0, correct distribution over allowed positions
```

**Causal attention and the KV cache:**

```
Because position i's attention to positions ≤ i never changes
as later tokens are generated, their keys and values are FIXED
once computed.

That's precisely what makes caching valid. With bidirectional
attention, adding a token would change every position's
representation — nothing could be cached.

So causal masking is what enables the KV cache, which is what
makes generation linear rather than quadratic.
```

**Prefix LM — the hybrid worth knowing:**

```
Bidirectional attention over the PROMPT, causal over the GENERATION.

  prompt tokens   ↔ ↔ ↔   (see each other fully)
  generated tokens →  →    (causal)

Better prompt understanding while preserving generation.
Used in some models; not standard in the major LLMs.
```

## 5. Why It Matters

- **It's the defining property of a decoder** and the answer to "why can't an encoder generate?"
- **It's what makes the KV cache valid**, which is a connection people often miss.
- **The masking-before-softmax detail** is a common implementation precision check.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Masking after softmax** | Breaks normalization; output scaled down |
| **No bidirectional prompt context** | Prompt tokens can't see later prompt tokens either |
| **Exposure bias** | Trained on ground truth, generates from its own output |
| **Off-by-one in the mask** | Position i seeing i+1 leaks the answer; loss collapses suspiciously fast |
| **Padding and causal masks must combine** | Both are needed in batched training |

**The off-by-one is a real and instructive bug:** if the mask lets position i attend to i+1, training loss drops dramatically because the model can copy the answer. A suspiciously low loss early in training is a classic symptom of a mask bug, not of a model that learned fast.

**On prompt bidirectionality:** decoder-only models process the prompt causally too, so early prompt tokens can't see later ones. Prefix LM addresses this, and it's part of the argument that encoder-decoder still has advantages for tasks with a fixed, fully-available input.

## 7. Interview Answer

> "Causal attention restricts each position to attending only to itself and earlier positions. It's implemented as a lower-triangular mask that sets disallowed scores to negative infinity before the softmax.
>
> The reason it's necessary: without it, training next-token prediction would be trivial, because the model could attend directly to the token it's supposed to predict. The mask forces it to learn prediction rather than copying.
>
> The deeper argument is training-inference consistency. During training, all positions are computed in parallel, and the mask ensures position i predicts token i+1 using only tokens up to i. At inference, position i only has tokens up to i because later ones don't exist yet. So the mask makes the training condition identical to the inference condition — which is why what the model learns transfers.
>
> The implementation detail is that masking happens before softmax. Setting scores to negative infinity gives exactly zero weight while keeping the remaining distribution normalized. Zeroing weights after softmax breaks that — the row no longer sums to one, so the output is systematically scaled down. And an off-by-one where position i can see i+1 is a classic bug: training loss drops suspiciously fast because the model is copying the answer.
>
> The connection people often miss is that causal masking is what makes the KV cache valid. Because position i's attention to earlier positions never changes as later tokens are generated, their keys and values are fixed once computed — so they can be cached. With bidirectional attention, adding a token would change every position's representation, and nothing could be cached. Causal masking is what makes generation linear rather than quadratic."

## 8. Likely Follow-ups

**Q: Why is causal masking necessary?**
Without it the model could attend to the token it's predicting, making training trivial and teaching it nothing. It also makes the training condition match the inference condition — at generation time only prior tokens exist, so the mask ensures the model learned under the same constraint it will operate under.

**Q: How is it implemented?**
A lower-triangular mask applied to the score matrix, setting disallowed entries to negative infinity before the softmax. Since exp of negative infinity is zero, those positions get zero weight while the remaining weights still sum to one. Masking after softmax would break the normalization.

**Q: How does causal masking relate to the KV cache?**
It's what makes caching valid. Because each position only attends backward, adding a new token doesn't change any earlier position's keys or values — they're fixed once computed, so they can be cached and reused. With bidirectional attention, every new token would change every representation and nothing could be cached.

**Q: What's the downside?**
Prompt tokens are also processed causally, so early prompt tokens can't see later ones. That's weaker prompt understanding than a bidirectional encoder would give. Prefix LM addresses it by using bidirectional attention over the prompt and causal attention over the generation, though it isn't standard in the major LLMs.

**Q: What's a common bug here?**
An off-by-one in the mask that lets position i attend to i+1. The symptom is training loss dropping dramatically fast, because the model is copying the answer rather than predicting it. A suspiciously low early loss should prompt a mask check before celebrating.

## 9. Common Mistakes

- Applying the mask after softmax.
- Off-by-one letting position i see i+1.
- Not connecting causal masking to why the KV cache works.
- Forgetting that the prompt is also processed causally in decoder-only models.
- Not combining the causal mask with the padding mask in batched training.

## 10. What to Remember

- **Position i attends only to ≤ i.** Lower-triangular mask, −∞ before softmax.
- **It makes training match inference** — the same information constraint in both.
- **It's what makes the KV cache valid**, and therefore what makes decode linear.
- **Masking after softmax breaks normalization.**
- **An off-by-one shows up as suspiciously fast loss reduction.**
