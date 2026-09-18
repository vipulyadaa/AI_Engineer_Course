# What Is an Embedding?

> **Phase 06 · EMBEDDINGS · Topic 01**

## 1. Definition

A dense vector representation of text where semantic similarity corresponds to geometric closeness. Text that means similar things produces vectors that point in similar directions.

## 2. Simple Explanation

An embedding model maps text to a point in high-dimensional space — typically 384 to 3072 dimensions — such that related meanings land near each other.

"How much does an international transfer cost?" and "International wire fee: $45" share almost no words, but a good embedding model places them close together. That's what makes semantic search work where keyword search fails.

## 3. How It Works

1. **A transformer encodes the text**, producing one vector per token.
2. **Pooling** combines those into a single vector — mean pooling or a `[CLS]` token.
3. **Normalization** to unit length, so cosine similarity reduces to a dot product.
4. **Similarity = cosine**, measuring angle and ignoring magnitude.

**Why the geometry is meaningful — this is the key point:**

```
Embedding models are trained CONTRASTIVELY on triples:
  (query, relevant passage, irrelevant passage)

The objective pulls the query and relevant passage together
and pushes the irrelevant one apart.

So cosine similarity means something because the model was
explicitly optimized to make it mean something — not because
vectors naturally cluster by meaning.
```

## 4. Practical Example

**What embeddings capture that keywords don't:**

```
Query: "what if my transfer bounces"
Doc:   "if a wire transfer is rejected by the beneficiary bank,
        funds are returned within 5-7 business days"

Shared words: "transfer" only.
BM25: poor match.
Embedding: strong match — "bounces" and "rejected" are close
           in the learned space.
```

**And the structural weakness, which is equally important:**

```
Query: "policy AC-4471-B"

The embedding encodes "this is a policy identifier of roughly
this shape." AC-4471-B, AC-4472-C, and AC-9983-X all land in
nearly the same region.

The model was never trained to preserve exact character
sequences — it was trained to capture meaning, and the
"meaning" of an arbitrary identifier is just "identifier."

That's not a tuning problem. It's what the representation IS.
Hence hybrid retrieval.
```

## 5. Why It Matters

- **It's the foundation of semantic search** and the reason RAG works on natural-language questions.
- **The contrastive-training explanation** is why cosine similarity is meaningful, and it's the substantive answer.
- **The exact-match weakness is structural**, which is what motivates hybrid retrieval.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **Encodes meaning, not surface form** | Exact identifiers are missed — add BM25 |
| **Fixed input limit** | Chunks exceeding it are silently truncated |
| **Query/document asymmetry** | Several models expect task types or prefixes |
| **Model-specific space** | Vectors from different models aren't comparable |
| **Domain fit varies** | General models may not separate specialized jargon |
| **Dimensions cost** | Storage, memory, and search latency scale with them |

**The three silent bugs** worth checking before anything else: chunk size exceeding the model's max input, ignoring query-document asymmetry, and using different models for indexing and querying. None of them produce an error — they just quietly degrade recall.

## 7. Interview Answer

> "An embedding is a dense vector representation of text where semantic similarity corresponds to geometric closeness — text meaning similar things produces vectors pointing in similar directions.
>
> That's what lets retrieval match 'what if my transfer bounces' to 'if a wire transfer is rejected, funds are returned within five to seven business days.' The only shared word is 'transfer,' so keyword search fails, but the embedding places them close because 'bounces' and 'rejected' are near each other in the learned space.
>
> The reason the geometry means anything is contrastive training. Embedding models are trained on triples — query, relevant passage, irrelevant passage — with an objective that pulls relevant pairs together and pushes others apart. So cosine similarity is meaningful because the model was explicitly optimized to make it meaningful, not because vectors naturally cluster by meaning. That's the substantive answer rather than just describing what an embedding is.
>
> The structural weakness is exact matching. A query for policy AC-4471-B embeds as 'an identifier of roughly this shape,' so all policy numbers land in nearly the same region. The model was never trained to preserve exact character sequences — the 'meaning' of an arbitrary identifier is just 'identifier.' That's not fixable by tuning or by choosing a better model; it's what the representation is. Which is exactly why hybrid retrieval with BM25 is the production default.
>
> Three silent bugs I'd check before anything else: chunk size exceeding the model's max input, which silently truncates the tail from the vector; ignoring query-document asymmetry, where several models expect different task types or prefixes for queries versus passages; and using different models for indexing and querying, which makes vectors incomparable. None of them error — they just quietly cost recall."

## 8. Likely Follow-ups

**Q: Why does cosine similarity mean anything?**
Because embedding models are trained contrastively — on triples of query, relevant passage, and irrelevant passage, with an objective that pulls relevant pairs together and pushes others apart. The geometry corresponds to semantic relatedness because that correspondence was the training objective, not because it emerges naturally.

**Q: Why are embeddings bad at exact matching?**
Because they encode meaning, not surface form. An arbitrary identifier's "meaning" to the model is just "this is an identifier of this shape," so different identifiers land in nearly the same region. It's structural rather than a quality issue — no embedding model fixes it, which is why BM25 is the complementary half of hybrid retrieval.

**Q: What are the common silent failures?**
Chunk size exceeding the model's input limit, so the tail is dropped from the vector while the text is still stored and returned. Ignoring query-document asymmetry where the model expects task types or prefixes. And using different models for indexing and querying. All three degrade recall with no error message.

**Q: How many dimensions should an embedding have?**
It's a cost trade-off — storage, memory, and ANN search latency all scale with dimension, and a 3072-dimension model is four times the storage of a 768-dimension one for often marginal quality gain on domain data. Matryoshka embeddings help by allowing truncation with graceful degradation, so you can make the trade explicitly.

**Q: Can you compare vectors from different models?**
No — each model defines its own coordinate system, so a similarity between vectors from different models isn't a weaker signal, it's meaningless. That's why changing an embedding model requires re-embedding the entire corpus, and why storing the model version per chunk makes migration safe.

## 9. Common Mistakes

- Not knowing embedding models are contrastively trained.
- Expecting dense retrieval to handle exact identifiers.
- Chunk size exceeding the model's max input.
- Ignoring query-document asymmetry.
- Mixing vectors from different models in one index.

## 10. What to Remember

- **Text → dense vector; similar meaning → nearby vectors.**
- **Contrastive training is why cosine similarity means anything.**
- **Exact-identifier failure is structural** — that's what hybrid retrieval is for.
- **Three silent bugs:** input-limit truncation, ignored asymmetry, mismatched models.
- **Vectors from different models are incomparable** — a model change means a full re-embed.
