# Key (K)

> **Phase 03 · TRANSFORMERS · Topic 08**

## 1. Definition

The projection of a token representing **what it offers** to other tokens — the advertisement matched against incoming queries. `K = X·W_K`. Dot products of queries with keys produce the attention scores.

## 2. Simple Explanation

If the query is a token's question, the key is its answer-label.

Each token advertises "here's what I am and what I can provide." Queries from other tokens are compared against those advertisements, and the best matches get the most attention weight.

## 3. How It Works

1. **Projection:** `K = X·W_K`, shape `d_model × d_k` per head.
2. **Scoring:** `Q·Kᵀ` — every query dotted with every key.
3. **Scale and normalize:** `/√d_k`, then softmax per row.

**The key point about keys and values being different:**

```
K — the index. What this token matches ON.
V — the payload. What this token CONTRIBUTES when matched.

Separating them means a token can be findable by one property
while contributing different information.

A date token might have a key encoding "I am a temporal reference"
(so queries about time find it) and a value encoding the actual
date content (which is what gets passed along).
```

## 4. Practical Example

**Keys are the cached half of the KV cache, which is where this becomes practically important:**

```
During decode, each new token attends to ALL previous tokens.
Their keys and values don't change once computed.

So you cache them:
  KV cache size = 2 × n_layers × n_kv_heads × d_head
                  × seq_len × batch × bytes_per_element

For a 7B model, 32 layers, 32 KV heads, d_head 128, FP16:
  per token per sequence ≈ 2 × 32 × 32 × 128 × 2 bytes ≈ 512 KB

At 4,000 tokens × batch 16:  ~32 GB
  ← often MORE than the model weights (14 GB)
```

**That's why grouped-query attention exists:**

```
Multi-head (MHA):     32 query heads, 32 KV heads → full cache
Grouped-query (GQA):  32 query heads,  8 KV heads → 1/4 the cache
Multi-query (MQA):    32 query heads,  1 KV head  → 1/32 the cache

Fewer KV heads = smaller cache = larger achievable batch size
= higher throughput. Small quality cost.
```

## 5. Why It Matters

- **Keys and values are what the KV cache stores**, making this directly relevant to inference economics.
- **The K/V distinction — index versus payload — is a clean conceptual point** that shows understanding beyond the formula.
- **GQA and MQA are standard in modern models**, and they're specifically about reducing the KV head count.

## 6. Trade-offs / Failure Modes

| Point | Detail |
|---|---|
| **K and V must be separate** | Sharing them forces the match criterion to equal the payload |
| **KV cache scales with KV heads** | The target of GQA/MQA |
| **Cache grows with sequence length × batch** | Usually the binding constraint on throughput |
| **Keys are position-dependent with RoPE** | Rotary embeddings apply to Q and K, not V |

**The RoPE detail is worth knowing:** rotary positional embeddings are applied to queries and keys — because position matters for *matching* — but not to values, because the payload content shouldn't be rotated. That's a clean illustration of why K and V are separate.

**On cache memory as the real constraint:** at moderate batch sizes and long sequences, the KV cache exceeds the model weights. Serving throughput is usually limited by how many sequences' caches fit in memory, not by compute — which is why techniques like PagedAttention (vLLM) that manage cache memory efficiently matter as much as faster kernels.

## 7. Interview Answer

> "The key is the projection representing what a token offers — its advertisement, matched against incoming queries. `K = X · W_K`, and the dot product of queries with keys gives the attention scores.
>
> The distinction I'd emphasize is between keys and values. The key is the index — what this token matches *on*. The value is the payload — what it *contributes* when matched. Separating them means a token can be findable by one property while contributing different information. A date token might have a key encoding 'I'm a temporal reference,' so time-related queries find it, and a value carrying the actual date content that gets passed along.
>
> A clean illustration of why they're separate: rotary positional embeddings are applied to queries and keys but not to values. Position matters for matching, so it goes into K and Q. The payload content shouldn't be rotated, so V is left alone.
>
> Where keys matter practically is the KV cache. During decode, each new token attends to all previous tokens, and their keys and values don't change once computed — so you cache them. For a 7B model at four thousand tokens and batch sixteen, that cache can be around thirty gigabytes, which is more than the fourteen gigabytes of weights.
>
> That's why grouped-query attention exists. The cache scales with the number of key-value heads, so GQA shares KV heads across query-head groups — thirty-two query heads with eight KV heads is a quarter of the cache. Multi-query attention takes it to one KV head. Smaller cache means larger achievable batch size means higher throughput, at a small quality cost. In practice serving throughput is usually limited by how many sequences' caches fit in memory, not by compute."

## 8. Likely Follow-ups

**Q: Why are keys and values separate?**
Because what a token is findable by and what it contributes are different things. Sharing them would force the match criterion to equal the payload. Separating them lets a token be indexed by one property — "I'm a temporal reference" — while contributing different content when matched.

**Q: What does the KV cache store and why?**
The keys and values for every previously-processed token, at every layer. During decode each new token attends to all previous ones, and their K and V don't change once computed — so caching them turns generation from quadratic to linear. Without it, every decode step would recompute the entire prefix.

**Q: How big does the KV cache get?**
Roughly `2 × layers × kv_heads × head_dim × seq_len × batch × bytes`. For a 7B model at 4,000 tokens and batch 16 in FP16, that's around 30 GB — more than the 14 GB of weights. It's usually the binding constraint on serving throughput.

**Q: What is grouped-query attention doing?**
Sharing key and value heads across groups of query heads. All query heads are retained, so the variety of attention patterns is preserved, but the KV cache scales with KV head count — so going from 32 to 8 KV heads cuts the cache to a quarter. Multi-query attention is the extreme with one KV head.

**Q: Why is RoPE applied to Q and K but not V?**
Because position matters for *matching* — whether two tokens are near or far should affect their attention score — but shouldn't alter the content being passed along. Rotating the value would distort the payload. It's a neat demonstration of why the K/V separation is meaningful rather than arbitrary.

## 9. Common Mistakes

- Not distinguishing the key's role (index) from the value's (payload).
- Thinking the KV cache is a minor optimization rather than what makes decode linear.
- Underestimating cache size — it often exceeds the model weights.
- Saying GQA reduces query heads; it reduces KV heads.
- Assuming RoPE applies to values as well as queries and keys.

## 10. What to Remember

- **K = what this token offers.** The index; V is the payload.
- **`Q·Kᵀ` gives the scores**, scaled by `√d_k`.
- **Keys and values are what the KV cache stores** — and it often exceeds the weights in size.
- **GQA/MQA reduce KV heads** to shrink the cache and raise batch size.
- **RoPE applies to Q and K, not V** — position affects matching, not payload.
