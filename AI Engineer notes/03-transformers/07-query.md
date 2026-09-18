# Query (Q)

> **Phase 03 · TRANSFORMERS · Topic 07**

## 1. Definition

The projection of a token that represents **what it is looking for** in other tokens. `Q = X·W_Q`. Each query is matched against all keys to produce attention scores.

## 2. Simple Explanation

The query is a token's question.

When processing "charged," the query encodes something like *"I'm a verb — who is my subject and what is my object?"* That question is then compared against every other token's key to see which ones answer it.

## 3. How It Works

1. **Projection:** `Q = X·W_Q`, where `X` is the input representation and `W_Q` is a learned matrix of shape `d_model × d_k`.
2. **Matching:** `Q·Kᵀ` — every query dotted with every key, giving the score matrix.
3. **Per head:** each attention head has its own `W_Q`, so each head asks a different kind of question.

**Where queries come from, by attention type:**

| Attention | Q from | K, V from |
|---|---|---|
| Encoder self-attention | Encoder | Encoder |
| Decoder self-attention | Decoder | Decoder |
| **Cross-attention** | **Decoder** | **Encoder** |

That third row is the one worth memorizing — in cross-attention the decoder queries the encoder.

## 4. Practical Example

```
"the bank charged a fee"

Head 1 (syntactic) — query for "charged" encodes
  "find my subject"        → high score against "bank"

Head 2 (semantic) — query for "bank" encodes
  "find disambiguating context" → high score against "charged", "fee"

Same token, different heads, different questions.
That's what multi-head attention buys.
```

**Why Q and K must be different projections:**

```
If Q = K (same projection), then score(i,i) = |Kᵢ|² — a token's
score against itself is its squared magnitude, which is large.
Attention collapses toward each token attending to itself.

Separate W_Q and W_K let a token look for something it
doesn't itself contain.
```

## 5. Why It Matters

- **Q/K/V is the standard transformers deep-dive question**, and being able to say what each *means* rather than just its formula is the differentiator.
- **The cross-attention direction** (Q from decoder) is a common precision check.
- **In grouped-query attention, the query heads are what stay numerous** while KV heads are shared — knowing that connects to inference optimization.

## 6. Trade-offs / Failure Modes

| Point | Detail |
|---|---|
| **Q and K must be separate** | Sharing them collapses attention toward self-attention |
| **`d_k` sets the scaling** | Scores are divided by `√d_k`, not `√d_model` |
| **Per-head projections** | Each head's `W_Q` is `d_model × d_k`, typically `d_k = d_model / n_heads` |
| **GQA keeps query heads** | Grouped-query attention reduces KV heads, not query heads |

**Grouped-query attention is where this becomes practically relevant.** The KV cache scales with the number of *key/value* heads, so GQA keeps all the query heads — preserving the variety of questions — while sharing keys and values among groups. That's the design insight: queries are cheap at inference, KV is what costs memory.

## 7. Interview Answer

> "The query is the projection of a token representing what it's looking for in other tokens. `Q = X · W_Q`, and each query gets dotted with every key to produce attention scores.
>
> The intuition I'd give: when processing 'charged,' its query encodes something like 'I'm a verb, who's my subject?' That question is compared against every other token's key, and whichever keys answer it best get the highest attention weight.
>
> The reason Q and K are separate projections rather than one matters. If they were the same, a token's score against itself would be its own squared magnitude — large by construction — and attention would collapse toward each token attending mostly to itself. Separate projections let a token look for something it doesn't itself contain.
>
> Each attention head has its own `W_Q`, so each head asks a different kind of question. One head's query for a verb might seek its subject syntactically; another head's query for 'bank' might seek disambiguating context. That variety is what multi-head attention buys.
>
> The precision check I'd expect is cross-attention: queries come from the decoder, keys and values from the encoder. So the decoder is asking questions of the encoded input.
>
> And there's a practical connection to inference. In grouped-query attention, the query heads all stay — you keep the full variety of questions — while key and value heads are shared across groups. That's deliberate: the KV cache scales with KV head count, so queries are cheap at inference and KV is what costs memory."

## 8. Likely Follow-ups

**Q: Why are Q and K separate projections?**
Because a token's question and its offer are different things. If they shared a projection, each token's score against itself would be its squared magnitude — large by construction — and attention would collapse toward self-attention. Separate learned projections let a token seek something it doesn't contain.

**Q: In cross-attention, where do queries come from?**
The decoder. Keys and values come from the encoder output. So the decoder is querying the encoded input at each generation step. That direction is the common precision check, and getting it backwards is a noticeable error.

**Q: What's the dimension of Q?**
Per head, `d_k`, which is typically `d_model / n_heads`. The projection matrix `W_Q` is `d_model × d_k`. The scaling in the attention formula uses `√d_k`, the per-head dimension, not `√d_model`.

**Q: Do all heads produce the same query?**
No — each head has its own learned `W_Q`, so each produces a different query from the same token. That's the point of multi-head attention: the same token can simultaneously ask a syntactic question in one head and a semantic one in another.

**Q: How does grouped-query attention affect queries?**
It doesn't reduce them. GQA keeps all the query heads and shares key and value heads across groups. The KV cache scales with KV head count, so sharing those is what saves memory at inference, while preserving all the query heads preserves the variety of attention patterns.

## 9. Common Mistakes

- Reversing the cross-attention direction — queries come from the decoder.
- Not being able to explain *why* Q and K are separate projections.
- Using `√d_model` instead of `√d_k` in the scaling.
- Thinking grouped-query attention reduces query heads — it reduces KV heads.
- Describing Q/K/V only as formulas without saying what each represents.

## 10. What to Remember

- **Q = what this token is looking for.** `Q = X·W_Q`.
- **Separate from K deliberately** — shared projections collapse attention toward self.
- **Cross-attention: Q from decoder, K/V from encoder.**
- **Per head, dimension `d_k`** — and that's what the `√d_k` scaling uses.
- **GQA keeps all query heads** and shares KV heads, because KV is what costs cache memory.
