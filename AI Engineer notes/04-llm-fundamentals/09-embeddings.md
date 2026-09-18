# Embeddings (LLM View)

> **Phase 04 · LLM FUNDAMENTALS · Topic 09**

## 1. Definition

Two different things share this name, and conflating them is a common error:

1. **Token embeddings** — the lookup table inside an LLM mapping token IDs to vectors, the model's first layer.
2. **Text embeddings** — the output of a separate embedding model, one vector per text, used for retrieval.

## 2. Simple Explanation

A token embedding is a row in a table. Token 4471 maps to a specific 4096-dimensional vector, and that's the input to layer 1. It's **context-free** — the same token always starts as the same vector.

A text embedding is the *output* of a whole encoder model, representing an entire passage semantically. It's what goes in your vector store.

They're both "embeddings" and they do entirely different jobs.

## 3. How It Works

**Token embeddings, inside the LLM:**

```
token id 4471 → row 4471 of a (vocab × d_model) table → vector

That vector then passes through N transformer blocks, becoming
CONTEXTUAL at every layer:

  layer 0:  "bank" → the same vector every time (context-free)
  layer 12: "bank" in "river bank" ≠ "bank" in "bank account"
```

**Text embeddings, from an embedding model:**

```
"international wire fee" → encoder → pool → normalize
                        → one 768-dim vector for the whole text

Trained CONTRASTIVELY so that semantically related texts
land near each other. That's why cosine similarity is meaningful.
```

**The comparison:**

| | Token embedding | Text embedding |
|---|---|---|
| Granularity | One token | One passage |
| Where | Inside the LLM, layer 0 | A separate model's output |
| Context-aware | No (contextual after layers) | Yes |
| Trained by | Next-token prediction (jointly) | Contrastive learning |
| Used for | Model input | Retrieval, clustering, classification |

## 4. Practical Example

**The confusion that causes real mistakes:**

```
❌ "I'll use the LLM to embed my chunks."

Two different things this could mean:
  a) Use a dedicated embedding model — correct, and what
     you actually want.
  b) Extract hidden states from a generative LLM — possible,
     but the model wasn't trained for it. Last-token pooling
     from a decoder gives usable but generally weaker
     embeddings than a purpose-trained encoder.

The right tool is an embedding model (text-embedding-005,
all-MiniLM, E5), not the generative LLM.
```

**Why a purpose-trained embedding model is better:**

```
Generative LLM: trained to predict the next token.
  Its hidden states are optimized to support generation,
  not to place similar texts near each other.

Embedding model: trained contrastively on
  (query, relevant, irrelevant) triples.
  The geometry IS the objective.

That said, decoder-derived embedding models exist and perform
well — they're adapted with contrastive fine-tuning, not just
hidden states pulled out raw.
```

**In your RAG pipeline:**

```
Text embeddings (vector store)   ← an embedding model
Token embeddings (inside the LLM) ← invisible to you

You never touch token embeddings. All your embedding work
is text embeddings from a separate model.
```

## 5. Why It Matters

- **The two meanings genuinely confuse people**, and disambiguating cleanly is a signal.
- **It explains why you use a separate embedding model** rather than the LLM.
- **The context-free-then-contextual progression** is a clean way to describe what transformer layers do.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Using a generative LLM for embeddings** | Not what it was trained for; a purpose-trained encoder is better |
| **Confusing the two meanings** | Leads to muddled architecture discussions |
| **Assuming token embeddings are contextual** | They're context-free at layer 0 |
| **Mixing embedding models** | Vectors from different models aren't comparable |
| **Chunk exceeding the embedding model's limit** | Silent truncation |

**On decoder-derived embedding models:** several current embedding models are adapted from decoder architectures with contrastive fine-tuning and last-token or mean pooling. They perform well — so "decoders can't do embeddings" is too strong. The accurate statement is that raw hidden states from a generative model are weaker than a contrastively-trained embedding model, decoder-based or not.

**On why token embeddings matter to you indirectly:** they're a significant parameter cost (`vocab × d_model`), and they're why vocabulary size is an architectural trade-off. But you never manipulate them.

## 7. Interview Answer

> "Two different things share the name, and it's worth disambiguating.
>
> Token embeddings are the lookup table inside an LLM — the model's first layer, mapping token IDs to vectors. They're context-free: token 4471 maps to the same vector every time. What makes representations contextual is the transformer layers that follow. So 'bank' starts as one vector at layer zero and becomes different vectors for 'river bank' and 'bank account' by layer twelve.
>
> Text embeddings are the output of a separate encoder model — one vector for a whole passage, trained contrastively so semantically related texts land near each other. That's what goes in a vector store, and it's what all my embedding work involves.
>
> The confusion causes a real mistake: 'I'll use the LLM to embed my chunks.' A generative LLM was trained to predict the next token, so its hidden states are optimized to support generation, not to place similar texts near each other. A purpose-trained embedding model — text-embedding-005, E5, MiniLM — is trained contrastively where the geometry *is* the objective.
>
> I'd temper that slightly: several current embedding models are adapted from decoder architectures with contrastive fine-tuning and last-token pooling, and they work well. So 'decoders can't do embeddings' is too strong. The accurate statement is that raw hidden states from a generative model are weaker than a model that was contrastively trained for the purpose, whatever its base architecture.
>
> In practice I never touch token embeddings — they're internal to the model. All of my embedding work is text embeddings from a separate model, and the practical concerns there are matching the model on both sides, respecting its input limit, and handling query-document asymmetry."

## 8. Likely Follow-ups

**Q: What's the difference between token embeddings and text embeddings?**
Token embeddings are a lookup table inside the LLM mapping token IDs to vectors — context-free, the model's first layer. Text embeddings are the output of a separate encoder model, one vector per passage, contrastively trained for semantic similarity. Different granularity, different location, different training objective.

**Q: Can you use an LLM to generate embeddings?**
You can extract hidden states, but it wasn't trained for that — a generative model's representations are optimized to support next-token prediction, not to place similar texts nearby. A purpose-trained embedding model is better. That said, several good embedding models are decoder-based with contrastive fine-tuning, so the base architecture matters less than the training objective.

**Q: Are token embeddings contextual?**
Not at layer 0 — the same token always starts as the same vector. Representations become contextual through the transformer layers, where attention mixes information across positions. That progression from context-free to contextual is essentially what the layers do.

**Q: Why does an embedding model's training objective matter?**
Because it determines whether the geometry means anything. Contrastive training explicitly pulls related texts together and pushes unrelated ones apart, so cosine similarity corresponds to semantic relatedness by construction. Without that objective there's no reason for the vector space to have that property.

**Q: Which embedding concerns actually affect your work?**
Text embeddings only. Matching the model on both the document and query side, respecting the input token limit so chunks aren't silently truncated, handling query-document asymmetry where the model expects task types or prefixes, and versioning the index so a model change doesn't mix incomparable vectors.

## 9. Common Mistakes

- Conflating token embeddings with text embeddings.
- Using a generative LLM's hidden states for retrieval instead of an embedding model.
- Saying token embeddings are contextual — they're context-free at layer 0.
- Claiming decoder architectures can't produce good embeddings — with contrastive training they can.
- Mixing embeddings from different models in one index.

## 10. What to Remember

- **Two meanings:** token embeddings (inside the LLM, context-free, layer 0) and text embeddings (a separate model's output, for retrieval).
- **Layers make representations contextual** — "bank" differentiates by layer 12.
- **Use a purpose-trained embedding model**, not a generative LLM's hidden states.
- **Contrastive training is why cosine similarity means anything.**
- **All your embedding work is text embeddings.** Token embeddings are internal.
