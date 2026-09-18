# Embeddings (Vertex AI)

> **Phase 20 · VERTEX AI · Topic 09**

## 1. Definition

Vertex AI's text and multimodal embedding models, accessed through the same IAM and regional controls as everything else on the platform, with task types that distinguish queries from documents.

> Embeddings conceptually are in [06-embeddings](../06-embeddings/). This is the Vertex AI surface.

## 2. Simple Explanation

You call an embedding model and get a vector. The Vertex AI specifics worth knowing are the task types, the output dimensionality option, and version pinning.

Task types are the one that silently costs recall when you get them wrong.

## 3. How It Works

```python
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

model = TextEmbeddingModel.from_pretrained("text-embedding-005")

docs = model.get_embeddings([
    TextEmbeddingInput(text=chunk, task_type="RETRIEVAL_DOCUMENT")
])
query = model.get_embeddings([
    TextEmbeddingInput(text=q, task_type="RETRIEVAL_QUERY")
])
```

**Task types matter:** `RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`, `SEMANTIC_SIMILARITY`, `CLASSIFICATION`, `CLUSTERING`, and others. The retrieval pair is asymmetric by design, and using the same type for both costs recall with no error.

**Output dimensionality** can be reduced below the default, trading a small amount of quality for proportionally less storage and faster search.

## 4. Practical Example

**The task type mistake, concretely:**

```
Embedding queries with RETRIEVAL_DOCUMENT instead of
RETRIEVAL_QUERY.

Nothing errors. Similarity scores look normal. Retrieval
is measurably worse, and the cause is invisible unless you
compare.

It's the kind of bug that persists for months because
everything appears to work — which is exactly why it's
worth naming explicitly.
```

**Reduced dimensionality, and when it's worth it:**

```
output_dimensionality=256 instead of 768

  storage: 3× less
  search:  faster
  quality: measurably but modestly lower

Worth testing on a golden set. At small corpus sizes the
storage saving is irrelevant and you should take the full
dimensions. At tens of millions of vectors it's a real
memory reduction that might remove the need to shard.
```

**Operational setup for ingestion:**

```
· pin the model version explicitly, never a floating alias
· store embedding_model in every chunk's metadata, so a
  migration can run side by side with a filter cutover
· batch with backoff for rate limits
· checkpoint completed chunk IDs so a failed job resumes
· cache by content hash so re-ingestion only re-embeds
  what changed
· run the pipeline on a 1% sample first — embedding the
  full corpus twice is the expensive mistake
```

**Version pinning specifically:** if the provider updates the model behind a floating name, indexed document vectors came from the old model while new query vectors come from the new one. If the space shifted, they're no longer properly comparable — silent, corpus-wide degradation with no deploy on your side.

## 5. Why It Matters

- **Task types are asymmetric** and getting them wrong costs recall silently.
- **Version pinning** prevents corpus-wide degradation from a provider update.
- **Reduced dimensionality** is a real lever at scale and irrelevant below it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Wrong task type** | Silent recall loss |
| **Floating model alias** | Provider updates change behaviour |
| **No `embedding_model` in metadata** | No safe migration path |
| **No checkpointing** | Failed jobs restart from zero |
| **Full corpus before a sample run** | Paying twice for a config error |
| **Reduced dimensions without testing** | Quality loss for no needed benefit |

**On cost:** embedding a large corpus is the main one-time ingestion expense. A content-hash cache is what stops it recurring on every re-index, and a 1% sample run is what stops a task-type or chunking mistake costing a full second pass.

**On multimodal embeddings:** Vertex AI provides a multimodal embedding model placing images and text in a shared space. For a document-heavy banking corpus, describing images with a vision model and embedding the description usually beats it — the descriptions are inspectable and debuggable, and CLIP-style models are weak at reading text in images.

## 7. Interview Answer

> "Vertex AI's embedding models are accessed through the same IAM and regional controls as everything else. The specifics worth knowing are task types, output dimensionality, and version pinning.
>
> Task types are the one I'd stress. RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY are asymmetric by design, and embedding queries with the document task type costs recall with no error raised — similarity scores look normal, retrieval is measurably worse, and the cause is invisible unless you compare. It's the kind of bug that persists for months because everything appears to work, which is why it's worth naming explicitly.
>
> Version pinning is the second. If the provider updates the model behind a floating name, indexed document vectors came from the old model while new query vectors come from the new one — and if the space shifted, they're no longer properly comparable. That's silent corpus-wide degradation with no deploy on my side. So I'd pin explicitly and store the embedding model name in every chunk's metadata, which is what makes a side-by-side migration with a filter cutover possible.
>
> Output dimensionality can be reduced below the default — 256 instead of 768 gives three times less storage and faster search for a measurable but modest quality cost. Whether that's worth it depends entirely on scale: at a small corpus the storage saving is irrelevant and I'd take full dimensions, while at tens of millions of vectors it's a real memory reduction that might remove the need to shard. I'd test it on a golden set rather than assume either way.
>
> Operationally, for ingestion: batch with backoff for rate limits, checkpoint completed chunk IDs so a failed job resumes rather than restarting, cache by content hash so re-ingestion only re-embeds what changed, and run the whole pipeline on a one percent sample first. Embedding is the main one-time ingestion cost, so a task-type or chunking error discovered after the full run means paying twice.
>
> On multimodal — Vertex AI has a multimodal embedding model putting images and text in a shared space. For a document-heavy banking corpus I'd usually prefer describing images with a vision model and embedding the description instead: the descriptions are inspectable and debuggable, and CLIP-style models are specifically weak at reading text in images, which is most of what our images contain."

## 8. Likely Follow-ups

**Q: What are task types for?**
They tell the model how the text will be used. RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY are asymmetric, placing queries and documents appropriately for matching. Using the document type for a query costs recall with no error raised, which makes it a long-lived silent bug.

**Q: Why pin the model version?**
Because a floating alias lets the provider update the model underneath you. Indexed vectors came from the old version, new query vectors from the new one, and if the space shifted they're no longer comparable — corpus-wide degradation with no change on your side.

**Q: When would you reduce dimensionality?**
At scale, where storage and search cost matter — 256 instead of 768 is three times less memory for a modest quality cost, which might remove the need to shard. Below a few million vectors the saving is irrelevant, so take the full dimensions and test before reducing.

**Q: How do you run a large embedding job?**
Batched with backoff for rate limits, checkpointing completed chunk IDs so failures resume, and cached by content hash so re-ingestion only re-embeds what changed. And a one percent sample run first, because a configuration error found after the full run means paying for it twice.

**Q: Would you use the multimodal embedding model?**
For natural imagery, yes. For a document-heavy banking corpus I'd prefer describing images with a vision model and embedding the description — inspectable, debuggable, and better quality, because CLIP-style models are weak at reading text in images, which is most of what banking images contain.

## 9. Common Mistakes

- Using the document task type for queries.
- Referencing the model by a floating alias.
- Not storing the embedding model name in chunk metadata.
- Embedding the full corpus before a sample run.
- Reducing dimensionality without measuring the quality cost.

## 10. What to Remember

- **`RETRIEVAL_QUERY` vs `RETRIEVAL_DOCUMENT`** — asymmetric; confusing them is silent.
- **Pin the version** and store it in chunk metadata.
- **Reduced dimensions matter at scale**, not below it — test first.
- **Batch, back off, checkpoint, cache by content hash.**
- **Sample-run the pipeline** before paying for the full corpus.
