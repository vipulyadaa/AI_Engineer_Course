# Embeddings (in RAG)

> **Phase 08 · RAG FUNDAMENTALS · Topic 13**

## 1. Definition

Dense vector representations of text, where semantic similarity corresponds to geometric closeness. In RAG they turn "find relevant documents" into "find nearby vectors," which is a problem computers solve fast.

## 2. Simple Explanation

An embedding model maps text to a point in high-dimensional space — typically 384 to 3072 dimensions — such that text with similar meaning lands nearby.

"How much does an international transfer cost?" and "International wire fee: $45" contain almost no shared words, but a good embedding model places them close together. That's the whole reason semantic search works where keyword search fails.

## 3. How It Works

1. **A transformer encodes the text**, producing a vector per token.
2. **Pooling** combines those into one vector — mean pooling or the `[CLS]` token.
3. **Normalization** to unit length, so cosine similarity reduces to a dot product.
4. **The same model must embed both documents and queries.** Vectors from different models are not comparable.
5. **Similarity = cosine**, which measures angle and ignores magnitude.

**The property that makes it work:** the model was trained *contrastively* — on triples of (query, relevant passage, irrelevant passage), pulling relevant pairs together and pushing irrelevant ones apart. The geometry is meaningful because it was explicitly optimized to be.

**Model selection criteria:**

| Criterion | Why it matters |
|---|---|
| **Dimensions** | Storage and search cost scale with it; 768 is a common sweet spot |
| **Max input length** | Must exceed your chunk size or chunks get silently truncated |
| **Domain fit** | A general model may not separate your jargon well |
| **Language support** | Monolingual models won't match across languages |
| **Asymmetric support** | Some models have separate query and document encodings |
| **Hosted vs. self-hosted** | Cost, latency, data residency |

## 4. Practical Example

**Asymmetric embedding — the detail people miss.** Queries and documents have different shapes: a query is short and interrogative, a document chunk is long and declarative. Several models expect a task prefix:

```python
# Vertex AI text-embedding-005
doc_vec   = embed(text, task_type="RETRIEVAL_DOCUMENT")
query_vec = embed(text, task_type="RETRIEVAL_QUERY")

# E5-family models use literal prefixes
doc_vec   = embed("passage: " + chunk_text)
query_vec = embed("query: "   + user_question)
```

**Getting this wrong costs real recall** and produces no error — retrieval just quietly performs worse. It's a common silent bug.

**The truncation trap:**

```
Embedding model max input: 512 tokens
Your chunk size:           800 tokens
→ The last 288 tokens are silently dropped from every long chunk.
  Content exists in the index but is unretrievable.
```

Always check that `chunk_size < model_max_input`.

## 5. Why It Matters

- **Embedding quality sets the ceiling on retrieval.** A reranker can reorder candidates but can't surface something retrieval never returned.
- **Changing the model invalidates the entire index** — vectors aren't comparable across models, so it's a full re-embed.
- **Dimensions drive cost** at scale — storage, memory, and search latency all scale with it.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Chunk exceeds model max input** | Silent truncation; content indexed but unretrievable |
| **Query/document asymmetry ignored** | Real recall loss, no error |
| **Different models for index and query** | Retrieval returns noise |
| **Poor domain fit** | Jargon, product codes, and acronyms don't separate well |
| **Exact terms missed** | Dense retrieval is bad at account numbers and IDs — this is why hybrid search exists |
| **Model version changed by the provider** | Silent quality shift. Pin versions |
| **High dimensions everywhere** | 3072-dim vectors cost 4× the storage of 768-dim for often marginal gain |

**The known weakness worth stating:** embeddings are poor at exact-match retrieval. A query for policy number `AC-4471-B` may not retrieve the chunk containing it, because the embedding captures "policy identifier" semantics rather than that specific string. That's the single strongest argument for [hybrid retrieval](../11-rag-retrieval/04-hybrid-retrieval.md).

## 7. Interview Answer

> "Embeddings map text to dense vectors where semantic similarity corresponds to geometric closeness. That's what lets retrieval match 'how much does an international transfer cost' to 'international wire fee: forty-five dollars' despite almost no shared vocabulary.
>
> The reason the geometry means anything is that these models are trained contrastively — on triples of query, relevant passage, and irrelevant passage, pulling relevant pairs together and pushing others apart. Cosine similarity is meaningful because the model was explicitly optimized to make it meaningful.
>
> Three things I'd get right in practice. First, check that chunk size is under the model's max input, or long chunks get silently truncated — the content is in the index and unretrievable, with no error. Second, respect query-document asymmetry: several models expect different task types or prefixes for queries versus passages, and ignoring that costs real recall silently. Third, pin the model version, because a provider updating it underneath you shifts quality with no code change.
>
> The limitation I'd raise unprompted is exact matching. A query for policy number AC-4471-B often won't retrieve the chunk containing it, because the embedding captures 'this is a policy identifier' rather than that specific string. That's the strongest argument for hybrid retrieval — BM25 catches the exact tokens dense search misses.
>
> And changing the embedding model means re-embedding the entire corpus, since vectors from different models aren't comparable. I'd version the index and cut over rather than migrating in place."

## 8. Likely Follow-ups

**Q: How do you choose an embedding model?**
Evaluate on your own data, not on a leaderboard. Build a small set of real questions with known correct chunks and measure recall@k for each candidate. Then weigh dimensions against storage and latency cost, check max input length against your chunk size, confirm language coverage, and consider whether hosted or self-hosted fits your data residency requirements. MTEB is a starting filter, not an answer — leaderboard performance often doesn't transfer to a specific domain.

**Q: What happens when you change the embedding model?**
The entire corpus must be re-embedded, because a query vector from the new model won't match document vectors from the old one — they're different spaces. I'd build the new index alongside the old, evaluate both on a golden set, then cut over. Doing it in place gives you a window where retrieval is silently broken.

**Q: Why does dimension count matter?**
Storage, memory, and search latency all scale with it. A 3072-dimension model costs four times the storage of a 768-dimension one, and ANN search gets slower. The quality gain is often marginal on domain-specific data. Matryoshka embeddings help here — they're trained so you can truncate to fewer dimensions with graceful degradation, letting you trade precisely.

**Q: Why are embeddings bad at exact matching?**
Because they encode meaning, not surface form. A policy number embeds as "this is an identifier of this general shape" rather than as that exact string, so two different policy numbers land close together. Keyword search does the opposite — it matches the exact token and ignores meaning. Hybrid retrieval combines them, which is why it's the production default.

**Q: What is query-document asymmetry?**
Queries and documents have structurally different forms — a short question versus a long declarative passage — and several embedding models are trained to encode them differently. Vertex AI uses task types like RETRIEVAL_QUERY and RETRIEVAL_DOCUMENT; E5 models use literal "query:" and "passage:" prefixes. Using the wrong one, or none, costs recall with no error message, which makes it a common silent bug.

## 9. Common Mistakes

- Chunk size exceeding the model's max input, causing silent truncation.
- Ignoring query-document asymmetry.
- Using different models for indexing and querying.
- Choosing a model from a leaderboard without evaluating on your own data.
- Expecting dense retrieval to handle exact identifiers.
- Not pinning the model version.

## 10. What to Remember

- **Text → vector, where similar meaning means nearby.** Trained contrastively, which is why cosine works.
- **Same model for documents and queries**, and respect task-type asymmetry.
- **Check chunk size < model max input** — truncation is silent.
- **Changing the model = full re-embed.** Version the index.
- **Dense retrieval is weak on exact identifiers** — that's what hybrid search is for.
