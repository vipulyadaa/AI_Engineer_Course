# Re-Embedding

> **Phase 06 · EMBEDDINGS · Topic 20**

## 1. Definition

Recomputing embeddings for existing content — either incrementally when a chunk changes, or wholesale when the embedding model changes. The second is an expensive migration that needs a safe cutover path.

## 2. Simple Explanation

Two very different operations share this name.

**Incremental re-embedding** happens when a document is edited — you re-embed the chunks that changed. Routine, cheap, should be automated.

**Full re-embedding** happens when you change the embedding model — every vector is invalidated and the entire corpus must be recomputed. Expensive, risky, and needs a migration plan.

## 3. How It Works

**Incremental, driven by content hashing:**

```python
for doc in changed_documents:
    chunks = chunk(clean(parse(load(doc))))
    for c in chunks:
        c.embedded_text = breadcrumb(c) + "\n\n" + c.body
        c.hash = sha256(c.embedded_text)

    existing = index.get_chunks(doc_id=doc.id)
    unchanged = {e.chunk_id for e in existing
                 if e.hash in {c.hash for c in chunks}}

    to_embed = [c for c in chunks if c.chunk_id not in unchanged]
    index.upsert(embed(to_embed))                       # only what changed
    index.delete(ids={e.chunk_id for e in existing}     # reconcile deletes
                     - {c.chunk_id for c in chunks})
```

**Without the hash check, editing one paragraph re-embeds an entire document.** With it, a 300-page policy update might re-embed four chunks.

**Full re-embedding, done safely:**

```
1. Store `embedding_model` in every chunk's metadata
2. Index NEW vectors alongside the old, tagged with the new model
3. Query filters on model version → the two spaces never mix
4. Evaluate both on a golden set (recall@k, groundedness)
5. Cut over by changing the query filter    ← instant, reversible
6. Delete old vectors once confident
```

## 4. Practical Example

**Why in-place re-embedding is dangerous:**

```
Re-embedding 500,000 chunks in place. Job fails at 310,000.

  310,000 chunks: model B vectors
  190,000 chunks: model A vectors
  Queries:        embedded with model B

The 190,000 model-A chunks now score essentially RANDOMLY —
not worse, meaningless. Retrieval collapses for 38% of the
corpus with no error and no obvious signal pointing at the cause.

Rolling back means re-embedding 310,000 chunks with model A.

A PARTIAL migration is worse than no migration.
```

**When to trigger a re-embed:**

| Trigger | Scope |
|---|---|
| Document content changed | Incremental — changed chunks only |
| Chunking strategy changed | Full — chunk boundaries moved |
| Enrichment changed (breadcrumb format) | Full — embedded text changed |
| Embedding model changed | Full — with side-by-side migration |
| Metadata only changed | **None** — update metadata in place |

**That last row matters:** permission changes, effective dates, and other metadata updates don't require re-embedding. But note the corollary — content-hash-based incremental re-indexing *skips* those documents entirely, so permission syncs need their own trigger.

## 5. Why It Matters

- **Incremental re-embedding is what makes re-indexing routine** rather than a project.
- **In-place full re-embedding is the dangerous failure** — a partial migration is worse than none.
- **The `embedding_model` metadata field** is what makes migration safe, and it costs nothing at ingestion.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No content hashing** | Every re-index re-embeds everything |
| **In-place model migration** | Partial failure leaves a mixed, broken index |
| **No `embedding_model` field** | Can't tell which vectors are which; no safe cutover |
| **Upsert without delete reconciliation** | Removed content stays retrievable forever |
| **Hashing the raw text, not the embedded text** | Enrichment changes go undetected |
| **Metadata-only changes triggering a re-embed** | Wasted cost |
| **Assuming ACL freshness follows from content re-indexing** | It doesn't — separate trigger needed |

**On hashing the right thing:** hash the text that was *actually embedded*, including the breadcrumb and any enrichment — not the raw chunk body. Otherwise a change to the enrichment format won't be detected and vectors will silently diverge from what they should represent.

**On cost:** embedding a large corpus is the main one-time ingestion expense. Incremental re-embedding is what stops it recurring, which makes the content hash one of the highest-value metadata fields you can store.

## 7. Interview Answer

> "Two different operations share this name. Incremental re-embedding when a document changes — routine, cheap, automated. And full re-embedding when the embedding model changes — expensive, risky, and needing a migration plan.
>
> For incremental, the mechanism is content hashing. Hash the text that was actually embedded, including the breadcrumb, and on re-ingestion only re-embed chunks whose hash changed. Without that, editing one paragraph re-embeds a whole document; with it, a three-hundred-page policy update might re-embed four chunks. That's the difference between re-indexing being routine and being a project.
>
> One detail: hash the *embedded* text, not the raw body. Otherwise a change to the enrichment format goes undetected and vectors silently diverge from what they should represent.
>
> For a model change, the critical point is never doing it in place. If I re-embed five hundred thousand chunks in place and the job fails at three hundred and ten thousand, the remaining hundred and ninety thousand score essentially randomly against new-model queries — not worse, meaningless, because vectors from different models occupy different spaces. Retrieval collapses for thirty-eight percent of the corpus with no error, and rolling back means re-embedding what I already did. A partial migration is worse than no migration.
>
> So: store the embedding model version in every chunk's metadata, index the new vectors alongside the old tagged with the new model, filter queries by model version so the spaces never mix, evaluate both on a golden set, and cut over by changing one query filter. That makes cutover and rollback both instant.
>
> One thing worth knowing about what does *not* require re-embedding: metadata-only changes — permissions, effective dates — should update in place. But the corollary is that content-hash-based incremental re-indexing skips those documents entirely, so permission syncs need their own trigger. That's a real gap people miss."

## 8. Likely Follow-ups

**Q: How do you make re-embedding incremental?**
Hash the embedded text per chunk and store it. On re-ingestion, only re-embed chunks whose hash changed, and reconcile deletes for chunk IDs the new version no longer produces. That turns a full-corpus cost into re-embedding whatever actually changed.

**Q: What should you hash?**
The text that was actually embedded — including the breadcrumb and any enrichment — not the raw chunk body. Hashing the raw body means a change to the enrichment format goes undetected, and the stored vectors silently stop representing what you think they represent.

**Q: Why not re-embed in place when changing models?**
Because a partial failure leaves a mixed index where old-model vectors score meaninglessly against new-model queries — not degraded, meaningless, since the spaces are different. Retrieval collapses for the unmigrated fraction with no error, and rolling back means redoing the completed work. Side-by-side with a filter-based cutover avoids all of it.

**Q: What triggers a full re-embed?**
A model change, a chunking strategy change since boundaries move, or an enrichment change since the embedded text differs. Document content changes are incremental. Metadata-only changes require no re-embedding at all — just an in-place metadata update.

**Q: What's the gap with metadata-only changes?**
Content-hash-based incremental re-indexing skips documents whose content hasn't changed — which is correct for cost, but it means permission changes are never picked up, since ACLs change without content changing. Those need their own sync trigger, or query-time authorization against a live service.

## 9. Common Mistakes

- No content hashing, so every re-index re-embeds everything.
- Hashing the raw body instead of the embedded text.
- Re-embedding in place when changing models.
- Upserting without reconciling deletes.
- Assuming permission changes are picked up by content-based re-indexing.

## 10. What to Remember

- **Two operations:** incremental (content changed) and full (model changed).
- **Hash the embedded text** — including enrichment — for incremental re-embedding.
- **Never migrate models in place.** A partial migration is worse than none.
- **Store `embedding_model` per chunk** — it makes cutover and rollback instant.
- **Metadata-only changes need no re-embed** — but they also need their own sync trigger.
