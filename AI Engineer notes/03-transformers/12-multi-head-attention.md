# Multi-Head Attention

> **Phase 03 · TRANSFORMERS · Topic 12**

## 1. Definition

Running several attention operations in parallel with separate learned projections, then concatenating their outputs and projecting back. Each "head" learns a different kind of relationship.

## 2. Simple Explanation

One attention operation produces one weighted average — a single view of which tokens relate to which.

But tokens relate in several ways at once: syntactically (subject-verb), semantically (disambiguation), positionally (adjacency), referentially (pronoun-antecedent). Multiple heads let the model capture several of these simultaneously rather than blending them into one muddied pattern.

## 3. How It Works

```
d_model = 512, n_heads = 8  →  d_k = d_v = 512/8 = 64

For each head h:
   Qₕ = X·W_Qₕ   Kₕ = X·W_Kₕ   Vₕ = X·W_Vₕ      (each d_model × 64)
   headₕ = softmax(Qₕ·Kₕᵀ / √64) · Vₕ            (n × 64)

Concat(head₁ ... head₈)                            (n × 512)
        · W_O                                      (512 × 512)
   → output                                        (n × 512)
```

**The parameter count is the same as single-head attention at full width:**

```
8 heads × 64 dims = 512 = d_model

So 4 projection matrices of d_model × d_model → 4d².
Multi-head is free in parameters — you're splitting the same
capacity across heads rather than adding capacity.
```

**That's the key insight:** multi-head doesn't cost more parameters. It reorganizes the same budget into multiple lower-dimensional attention patterns instead of one high-dimensional one, and that reorganization is empirically better.

## 4. Practical Example

**What different heads learn (from interpretability work on BERT and GPT):**

```
Head patterns commonly observed:
  · attend to the previous token        (positional)
  · attend to the next token
  · verb → its subject                  (syntactic)
  · pronoun → its antecedent            (coreference)
  · attend to the first token           (attention sink — absorbs
                                         excess softmax mass)
  · broad, diffuse attention            (some heads do little)

Not every head is meaningful. Studies have shown a substantial
fraction of heads can be pruned with limited quality loss —
worth knowing as a caveat to over-interpreting head roles.
```

**The output projection `W_O` is not optional:**

```
Concatenating head outputs gives you 8 independent 64-dim views
sitting side by side in a 512-dim vector. Nothing has mixed them.

W_O learns how to combine information across heads. Without it,
downstream layers would see eight disconnected subspaces.
```

**Grouped-query attention, the modern variant:**

```
MHA  32 query heads, 32 KV heads   → full KV cache
GQA  32 query heads,  8 KV heads   → 1/4 the cache
MQA  32 query heads,  1 KV head    → 1/32 the cache

Query heads stay numerous (variety of patterns preserved);
KV heads are shared (cache memory reduced).
```

## 5. Why It Matters

- **"Why multiple heads?" is a standard question**, and the parameter-neutrality point is the insight that distinguishes a good answer.
- **Grouped-query attention is standard in modern models** and is directly about the head structure.
- **Head interpretability is a useful example** of both what we know and the limits of attention-as-explanation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Too many heads** | Each head's `d_k` shrinks; below ~32 dims per head, representational capacity suffers |
| **Too few heads** | Fewer relationship types captured simultaneously |
| **Many heads are redundant** | Studies show a substantial fraction can be pruned |
| **`W_O` is required** | Without it, head outputs are never mixed |
| **KV cache scales with KV heads** | The motivation for GQA/MQA |
| **Head roles are not clean** | Over-interpreting individual heads is an overclaim |

**On head count:** the usual configuration keeps `d_k` around 64–128. Going to 64 heads at `d_model` 512 would give 8 dimensions per head, which is too small to represent useful relationships. The constraint is per-head dimension, not head count directly.

## 7. Interview Answer

> "Multi-head attention runs several attention operations in parallel with separate learned projections, then concatenates the outputs and projects them back through a matrix `W_O`.
>
> The motivation is that tokens relate in several ways at once — syntactically, semantically, positionally, referentially. One attention operation produces one weighted average, so it would have to blend all those relationship types into a single muddied pattern. Separate heads capture them simultaneously.
>
> The insight I'd emphasize is that it's parameter-neutral. With d_model of 512 and eight heads, each head works in 64 dimensions, and eight times sixty-four is 512 — so the four projection matrices are still d_model by d_model. You're not adding capacity, you're reorganizing the same budget into multiple lower-dimensional attention patterns instead of one high-dimensional one. And empirically that reorganization is better.
>
> The output projection matters and is easy to overlook. Concatenating head outputs gives you eight independent subspaces sitting side by side with nothing mixing them. `W_O` learns how to combine across heads — without it, downstream layers see disconnected views.
>
> Interpretability work has found recognizable head roles — previous-token heads, verb-to-subject heads, coreference heads, and attention-sink heads that absorb excess softmax mass. But a caveat worth giving: studies have also shown a substantial fraction of heads can be pruned with limited quality loss, so not every head is doing something meaningful, and over-interpreting individual head roles is an overclaim.
>
> The modern variant is grouped-query attention: keep all the query heads so you preserve the variety of patterns, but share key-value heads across groups. The KV cache scales with KV head count, so thirty-two query heads with eight KV heads quarters the cache — which directly raises achievable batch size at inference."

## 8. Likely Follow-ups

**Q: Why not just one big attention head?**
Because one head produces one weighted average — one view of token relationships. Tokens relate syntactically, semantically, and positionally simultaneously, and a single head would have to blend those into one pattern. Multiple heads capture them in parallel at no extra parameter cost, since the same total dimension is split across heads.

**Q: Does multi-head attention cost more parameters?**
No — that's the key point. With `n_heads × d_k = d_model`, the projection matrices are still `d_model × d_model`, so the parameter count is identical to single-head attention at full width. You're partitioning capacity rather than adding it.

**Q: What does `W_O` do?**
Mixes information across heads. Concatenated head outputs are independent subspaces sitting side by side with no interaction. `W_O` is a learned projection that combines them into a single representation. Without it, the concatenation would just hand downstream layers eight disconnected views.

**Q: How many heads should you use?**
Enough that per-head dimension stays reasonable — typically 64 to 128. The real constraint is `d_k`, not head count: 64 heads at d_model 512 gives 8 dimensions per head, too small to represent useful relationships. So head count follows from d_model and a target per-head dimension.

**Q: What is grouped-query attention?**
Query heads stay numerous while key and value heads are shared across groups. The KV cache scales with KV head count, so 32 query heads with 8 KV heads quarters the cache with minimal quality loss. Multi-query attention is the extreme with one KV head. It's an inference optimization that directly increases achievable batch size.

## 9. Common Mistakes

- Thinking multi-head attention adds parameters.
- Forgetting `W_O` or not knowing what it does.
- Over-interpreting individual head roles as clean and meaningful.
- Saying GQA reduces query heads — it reduces KV heads.
- Choosing head count without regard to the resulting per-head dimension.

## 10. What to Remember

- **Several attention operations in parallel, concatenated, then projected by `W_O`.**
- **Parameter-neutral** — `n_heads × d_k = d_model`, so it partitions capacity rather than adding it.
- **`W_O` mixes across heads** and isn't optional.
- **Many heads are prunable** — don't over-interpret individual head roles.
- **GQA keeps query heads, shares KV heads** to shrink the cache.
