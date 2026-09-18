# Value (V)

> **Phase 03 · TRANSFORMERS · Topic 09**

## 1. Definition

The projection of a token representing **what it actually contributes** when attended to. `V = X·W_V`. The attention output is a weighted sum of values, with weights from the query-key scores.

## 2. Simple Explanation

Keys determine *who gets attended to*. Values determine *what gets passed along*.

The attention output for a position is literally a weighted average of value vectors — so the values are the information content, and the Q·K scores are just the mixing weights.

## 3. How It Works

```
scores  = softmax(Q·Kᵀ / √d_k)      ← n×n weights, rows sum to 1
output  = scores · V                 ← weighted sum of value vectors

For position i:
  output_i = Σⱼ scores[i,j] · Vⱼ
```

**The separation of roles, stated compactly:**

| | Role | Analogy |
|---|---|---|
| **Q** | What I'm looking for | The search query |
| **K** | What I'm findable by | The document's index entry |
| **V** | What I deliver | The document's content |

**Why V must be separate from K:** if they were the same, a token's contribution would be forced to equal its match criterion. Separating them lets a token be *found* by one property and *contribute* something else entirely.

## 4. Practical Example

**The retrieval analogy, which is genuinely illuminating and worth using:**

```
Attention is soft key-value retrieval:

  Vector DB:        query → match against keys → return values
  Attention:        Q     → match against K    → weighted sum of V

The difference: a database returns the top match discretely.
Attention returns a WEIGHTED BLEND of all values, with weights
from softmax. It's differentiable retrieval — which is exactly
why it can be trained end-to-end.
```

**The RoPE asymmetry as evidence the separation is real:**

```
Rotary positional embeddings are applied to Q and K, not V.

Why: position should affect WHO matches WHOM — so it goes into
the matching projections. It should NOT distort the content
being passed along — so V is left untouched.

If K and V were the same projection, you couldn't do this.
```

**Values in the KV cache:**

```
The cache stores both keys and values per token per layer,
because both are needed at every subsequent decode step:
  keys   → to compute scores against the new query
  values → to form the weighted sum

That's why it's a "KV" cache and why its size is
2 × layers × kv_heads × head_dim × seq_len × batch.
```

## 5. Why It Matters

- **The Q/K/V roles are the standard deep-dive**, and explaining V as "the payload" completes the picture.
- **The soft-retrieval framing** connects attention to something you work with daily and makes the mechanism intuitive.
- **Values are half the KV cache**, tying this directly to inference memory.

## 6. Trade-offs / Failure Modes

| Point | Detail |
|---|---|
| **V must be separate from K** | Otherwise contribution is forced to equal match criterion |
| **`d_v` can differ from `d_k`** | In principle; in practice usually equal |
| **Softmax forces a full distribution** | Every position contributes *something*, even when nothing is relevant |
| **Values are half the KV cache** | Memory cost scales identically to keys |
| **No positional rotation on V** | Deliberate — payload shouldn't be position-distorted |

**On the softmax constraint:** because attention weights sum to 1, a position must distribute its attention somewhere even if no other token is relevant. Models learn to handle this partly with "attention sinks" — often the first token — that absorb excess weight. It's a real quirk, and it's why some efficient-attention schemes explicitly preserve the first few tokens.

## 7. Interview Answer

> "The value is what a token actually contributes when it's attended to. `V = X · W_V`, and the attention output is literally a weighted sum of value vectors, with weights from the query-key scores.
>
> So the three roles split cleanly: the query is what I'm looking for, the key is what I'm findable by, and the value is what I deliver. Keys determine who gets attended to; values determine what gets passed along.
>
> The framing I find most useful is that attention is soft key-value retrieval. In a vector database, a query matches against keys and returns values — discretely, the top match. Attention does the same thing but returns a weighted blend of all values, with softmax weights. It's differentiable retrieval, which is exactly why it can be trained end to end.
>
> A nice piece of evidence that the K/V separation is real rather than arbitrary: rotary positional embeddings are applied to queries and keys but not values. Position should affect who matches whom, so it goes into the matching projections — but it shouldn't distort the content being passed along, so values are left untouched. You couldn't do that if K and V shared a projection.
>
> Practically, values are half the KV cache. Both keys and values are cached per token per layer, because at each decode step you need keys to compute scores against the new query and values to form the weighted sum. That's why cache size is two times layers times KV heads times head dimension times sequence length times batch — the factor of two is K and V.
>
> One quirk worth knowing: because softmax weights sum to one, a position has to attend somewhere even when nothing is relevant. Models learn to use 'attention sinks,' often the first token, to absorb that excess weight — which is why some efficient-attention schemes deliberately preserve the first few tokens."

## 8. Likely Follow-ups

**Q: Why is V separate from K?**
Because what a token is findable by and what it contributes are different. If they shared a projection, a token's contribution would be forced to equal its match criterion. Separation lets a token be indexed by one property and deliver different content — which is also what makes the RoPE-on-Q-and-K-only design possible.

**Q: How is attention like retrieval?**
Query matches against keys, returns values — the same shape as a vector database lookup. The difference is that attention returns a softmax-weighted blend of all values rather than the top discrete match. That makes it differentiable, which is what allows the whole thing to be trained end to end.

**Q: Why are values in the KV cache?**
Because every decode step needs them. Keys are needed to compute scores against the new token's query, and values are needed to form the weighted sum that produces the output. Both are fixed once computed, so both are cached — hence "KV cache," and hence the factor of two in its size formula.

**Q: Can `d_v` differ from `d_k`?**
In principle yes — nothing in the math requires them to match, since `d_k` only affects the score computation and `d_v` only the output dimension. In practice they're almost always equal, typically `d_model / n_heads`, which keeps the multi-head concatenation clean.

**Q: What's an attention sink?**
Because softmax weights sum to one, every position must distribute attention somewhere even with nothing relevant to attend to. Models learn to dump that excess onto specific tokens — often the very first one — which act as sinks. It matters practically because efficient-attention schemes that drop early tokens can break this, which is why several explicitly preserve the first few.

## 9. Common Mistakes

- Describing V without distinguishing it from K — "payload" vs. "index."
- Forgetting values are half the KV cache.
- Assuming RoPE applies to values.
- Missing the retrieval analogy, which is the clearest intuition available.
- Not knowing that softmax forces attention to distribute even when nothing is relevant.

## 10. What to Remember

- **V = what this token contributes.** Output is a weighted sum of values.
- **Q = seek, K = findable by, V = deliver.** Three distinct roles.
- **Attention is differentiable soft retrieval** — query, keys, weighted blend of values.
- **Values are half the KV cache**, hence the factor of 2 in its size.
- **RoPE on Q and K only** — position affects matching, not payload.
