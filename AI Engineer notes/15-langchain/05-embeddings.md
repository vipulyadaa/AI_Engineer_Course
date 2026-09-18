# Embeddings (in LangChain)

> **Phase 15 · LANGCHAIN · Topic 05**

## 1. Definition

LangChain's uniform interface over embedding providers — `embed_documents()` for a batch and `embed_query()` for a single query — so the same code works across Vertex AI, OpenAI, and local models.

> Embeddings conceptually are covered in [06-embeddings](../06-embeddings/). This is the LangChain interface and its pitfalls.

## 2. Simple Explanation

Two methods: one for documents, one for queries. Everything else — batching, retries, rate limits — the adapter handles.

The two methods exist because many models embed queries and documents differently, and using the wrong one costs recall silently.

## 3. How It Works

```python
from langchain_google_vertexai import VertexAIEmbeddings

emb = VertexAIEmbeddings(model_name="text-embedding-005")

doc_vecs = emb.embed_documents([c.page_content for c in chunks])
q_vec    = emb.embed_query("international transfer fee")
```

**`embed_documents` vs `embed_query` is not just batching.** For asymmetric models, the adapter sets different task types — `RETRIEVAL_DOCUMENT` versus `RETRIEVAL_QUERY` — which places the vectors appropriately for query-document matching.

**Calling `embed_documents([query])` for a query is a real bug** that produces no error and measurably worse retrieval.

## 4. Practical Example

**What to pin and why:**

```python
VertexAIEmbeddings(model_name="text-embedding-005")   # explicit version
```

```
Never a floating alias. If the provider updates the model
behind the name, new query vectors may no longer be
comparable with indexed document vectors — silent,
corpus-wide retrieval degradation with no deploy on your side.

Store the model name in every chunk's metadata too, so a
migration can run side-by-side with a filter-based cutover.
```

**Caching, which is genuinely worth it:**

```python
from langchain.embeddings import CacheBackedEmbeddings

cached = CacheBackedEmbeddings.from_bytes_store(emb, store,
                                                namespace=emb.model_name)
```

```
Re-running ingestion after a chunking tweak re-embeds
everything by default. With a cache keyed on content, only
changed chunks are re-embedded.

The namespace matters: keying the cache by model name
prevents serving vectors from a different model after a
model change, which would be a silent and severe bug.
```

**Batching and rate limits:** the adapter batches, but a large corpus will still hit provider quotas. Explicit batch sizing with backoff, plus checkpointing which chunks completed, is what makes a multi-hour embedding job survivable.

## 5. Why It Matters

- **The query/document method distinction** is a silent recall bug when confused.
- **Pinning the model version** prevents provider updates degrading retrieval.
- **Cache namespacing by model** prevents cross-model vector contamination.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Using `embed_documents` for queries** | Wrong task type; silent recall loss |
| **Floating model alias** | Provider updates change behaviour silently |
| **Unnamespaced cache** | Vectors from an old model served after a change |
| **No checkpointing** | Failed jobs restart from zero |
| **Rate limits unhandled** | Job dies partway through the corpus |
| **Dimension mismatch on migration** | Index rejects vectors of a different size |

**On cost:** embedding is the main one-time ingestion expense, and a mistake that forces a full re-embed pays it twice. Running the pipeline on a 1% sample first — checking task types, chunk sizes, and metadata — costs almost nothing relative to that.

**On local models:** `HuggingFaceEmbeddings` runs locally with no per-call cost and no data leaving the environment, which can matter for a residency review. The trade is quality and the operational burden of hosting, and it's worth evaluating on your own corpus rather than on a public benchmark.

## 7. Interview Answer

> "LangChain's embeddings interface is two methods — embed_documents for a batch and embed_query for one query — over any provider.
>
> The important detail is that those two aren't just batching. For asymmetric models the adapter sets different task types, RETRIEVAL_DOCUMENT versus RETRIEVAL_QUERY, which places the vectors appropriately for query-document matching. Calling embed_documents with a single query is a real bug that produces no error and measurably worse retrieval — it's the kind of thing that costs you recall for months without anyone noticing.
>
> I'd pin the model version explicitly rather than using a floating alias. If the provider updates the model behind the name, new query vectors may stop being comparable with indexed document vectors — silent corpus-wide degradation with no deploy on my side. And I'd store the model name in every chunk's metadata, so a migration can run side-by-side with a filter-based cutover.
>
> Caching is genuinely worth setting up. CacheBackedEmbeddings keyed on content means re-running ingestion after a chunking tweak only re-embeds what changed, instead of the whole corpus. The namespace parameter matters a lot there — keying the cache by model name prevents serving vectors from a different model after a model change, which would be silent and severe.
>
> On operations, the adapter batches but a large corpus still hits provider quotas. Explicit batch sizing with backoff and checkpointing of completed chunks is what makes a multi-hour embedding job survivable rather than something that restarts from zero on the first rate limit.
>
> And since embedding is the main one-time ingestion cost, I'd run the whole pipeline on a one percent sample first — checking task types, chunk sizes, and metadata — before paying for the full corpus. A configuration error found afterwards means paying twice."

## 8. Likely Follow-ups

**Q: Why are there two embedding methods?**
Because many models embed queries and documents differently — the adapter sets different task types for each. Using embed_documents for a query applies the wrong task type, which costs recall with no error raised, so the distinction isn't just about batching.

**Q: Why pin the model version?**
Because a floating alias lets the provider update the model underneath you. Indexed document vectors came from the old model while new query vectors come from the new one, and if the space shifted they're no longer properly comparable — silent, corpus-wide degradation with no change on your side.

**Q: What does the cache namespace do?**
It scopes cached vectors to a specific model. Without it, after changing models the cache would serve vectors produced by the old one, mixing embedding spaces silently. Keying the namespace on the model name makes that impossible.

**Q: How do you handle a large embedding job?**
Explicit batch sizing with backoff for rate limits, and checkpointing which chunks completed so a failure resumes rather than restarts. Embedding a large corpus takes hours and costs real money, so a job that can't resume will fail repeatedly and expensively.

**Q: Would you consider local embedding models?**
Worth evaluating, particularly where data residency matters — no per-call cost and nothing leaving the environment. The trade is typically quality and the operational burden of hosting, and I'd measure it on our own corpus rather than trusting a public benchmark.

## 9. Common Mistakes

- Using `embed_documents` for queries.
- Referencing the model by a floating alias.
- Caching without a model-scoped namespace.
- No checkpointing on long embedding jobs.
- Embedding the full corpus before verifying on a sample.

## 10. What to Remember

- **`embed_documents` and `embed_query` set different task types** — not interchangeable.
- **Pin the model version**; store it in chunk metadata.
- **Namespace the embedding cache by model name.**
- **Batch, back off, and checkpoint** for large jobs.
- **Sample-run the pipeline first** — embedding is the main one-time cost.
