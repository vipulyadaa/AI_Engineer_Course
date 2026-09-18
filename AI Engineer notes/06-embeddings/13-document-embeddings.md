# Document Embeddings

> **Phase 06 · EMBEDDINGS · Topic 13**

## 1. Definition

The vectors produced from corpus chunks at ingestion and stored in the index. They're computed once and reused across every query, which is what makes retrieval cost independent of corpus size.

## 2. Simple Explanation

Document embeddings are the expensive-once, cheap-forever side of retrieval.

You pay to embed every chunk during ingestion. After that, every query is a vector comparison rather than a model invocation — which is the entire reason vector search scales.

## 3. How It Works

```
INGESTION (once per chunk)
  chunk text
    + title/heading breadcrumb          ← enrichment
    ↓ embed(task_type="RETRIEVAL_DOCUMENT")
    ↓ normalize
  vector → index, with metadata

QUERY (per request)
  compare query vector against stored vectors — no model call
```

**What goes into the embedded text matters as much as the model:**

| Included | Effect |
|---|---|
| Chunk body | The content |
| **Document title + section heading** | **Large recall gain — free** |
| Effective date, product | Usually metadata only, not embedded |
| Contextual summary (LLM-generated) | Further gain, at ingestion cost |

**The breadcrumb is the highest-value enrichment:** a chunk saying "the fee is waived above $10,000" doesn't say which fee or which account. Prepending "Retail Banking Policy > 3.4 Monthly Maintenance Fee — Premier Accounts" supplies the vocabulary the body assumed.

## 4. Practical Example

**Metadata is NOT embedded — the most common conceptual error:**

```
❌ Breadcrumb stored ONLY in metadata
   → available for filtering and citation
   → contributes NOTHING to retrieval, because the vector
     is computed from the chunk TEXT alone

✅ Breadcrumb in BOTH places
   chunk text (embedded):  "Retail Banking Policy > 3.4 Monthly
                            Maintenance Fee — Premier Accounts
                            The fee is waived above $10,000..."
   metadata:               {"breadcrumb": "...", "section": "3.4"}

   → text version shapes the embedding (recall)
   → metadata version enables filtering and citation
```

**The three silent ingestion bugs:**

```
1. chunk_tokens > model.max_input
   → tail silently dropped from the VECTOR while the text
     is still stored and returned
   → content indexed and unretrievable

2. wrong task type (RETRIEVAL_QUERY on documents)
   → recall loss, no error

3. embedded_text ≠ stored_text
   → you embedded the enriched version but stored the raw one,
     or vice versa — the vector and the returned text diverge
```

**Storing what was actually embedded:**

```python
chunk.embedded_text = breadcrumb + "\n\n" + body
chunk.display_text  = body                    # what the LLM sees
chunk.embedded_hash = sha256(chunk.embedded_text)   # staleness check

# The hash makes vector/text divergence detectable — scan for
# chunks where the hash no longer matches the current text.
```

## 5. Why It Matters

- **Precomputation is what makes retrieval scale** — query cost independent of corpus size.
- **Breadcrumb enrichment is the cheapest large recall gain** and is routinely skipped.
- **The "metadata isn't embedded" point** is the most common conceptual error in RAG.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Chunk exceeds max input** | Silent truncation from the vector |
| **Wrong task type** | Recall loss with no error |
| **Breadcrumb only in metadata** | Zero retrieval benefit |
| **Embedded text ≠ stored text** | Vector and returned content diverge |
| **No re-embed on content change** | Stale vectors |
| **Full re-embed on every run** | Large recurring cost — use content hashing |
| **Model change without re-embedding** | Incomparable vectors |

**On incremental re-embedding:** hash the embedded text per chunk. On re-ingestion, only re-embed chunks whose hash changed. Without it, editing one paragraph re-embeds an entire document; with it, a 300-page policy update might re-embed four chunks. That's the difference between re-indexing being routine and being a project.

**On the cost profile:** embedding a large corpus is the main one-time ingestion expense. Incremental re-embedding is what stops it recurring, which makes the content hash one of the highest-value metadata fields.

## 7. Interview Answer

> "Document embeddings are the vectors produced from corpus chunks at ingestion. They're computed once and reused across every query, which is what makes retrieval cost independent of corpus size — at query time you're comparing vectors, not running a model per chunk.
>
> What goes into the embedded text matters as much as the model choice. The highest-value thing is prepending the document title and section heading breadcrumb. A chunk saying 'the fee is waived above ten thousand dollars' doesn't say which fee or which account — the heading did. Prepending 'Retail Banking Policy, Monthly Maintenance Fee, Premier Accounts' supplies the vocabulary the body assumed, and it's free.
>
> The conceptual error I'd flag hardest is that metadata isn't embedded. The vector is computed from the chunk text alone, so storing the breadcrumb only in metadata gives you filtering and citation and zero retrieval benefit. It has to be in both places, serving two different purposes — in the text so it shapes the embedding, in metadata so you can filter and cite with it.
>
> Three silent ingestion bugs worth checking. Chunk size exceeding the model's max input, which drops the tail from the vector while the text is still stored and returned — so content is indexed and unretrievable with no error. Using the wrong task type, RETRIEVAL_QUERY instead of RETRIEVAL_DOCUMENT, which costs recall silently. And embedded text diverging from stored text, where you embedded the enriched version but stored the raw one.
>
> I'd store a hash of the text that was actually embedded, which makes that third case detectable — scan for chunks where the hash no longer matches. And it enables incremental re-embedding: only re-embed chunks whose hash changed. Without that, editing one paragraph re-embeds a whole document; with it, a three-hundred-page policy update might re-embed four chunks. That's the difference between re-indexing being routine and being a project."

## 8. Likely Follow-ups

**Q: What should go into the embedded text?**
The chunk body plus the document title and section heading breadcrumb. The breadcrumb is the highest-value addition because an isolated chunk loses the vocabulary its heading supplied, and adding it costs nothing. An LLM-generated contextual summary adds more at ingestion cost — worth measuring against the free version first.

**Q: Why doesn't metadata help retrieval?**
Because the vector is computed from the chunk text alone. Metadata is stored alongside for filtering and display but has no effect on the embedding, so it can't improve semantic matching. That's why the breadcrumb needs to be in the text as well — same information, two different mechanisms.

**Q: What are the silent ingestion bugs?**
Chunk size exceeding the model's input limit, which truncates the tail from the vector while the text remains stored and returned. Using the wrong task type for documents. And embedded text diverging from stored text. None produce an error; all degrade retrieval quietly.

**Q: How do you make re-indexing incremental?**
Hash the text that was actually embedded and store it per chunk. On re-ingestion, only re-embed chunks whose hash changed. That turns a full-corpus re-embed into re-embedding whatever actually changed — which for a large document update might be a handful of chunks rather than hundreds.

**Q: What happens if you change the embedding model?**
Every existing vector is invalidated, because vectors from different models occupy different spaces and aren't comparable. It's a full corpus re-embed. I'd store the model version per chunk, build the new index alongside the old, evaluate both on a golden set, and cut over by changing a query filter — making both cutover and rollback instant.

## 9. Common Mistakes

- Storing the breadcrumb only in metadata and expecting retrieval benefit.
- Chunk size exceeding the embedding model's max input.
- Using the query task type for documents.
- Not hashing the embedded text, so divergence is undetectable.
- Full re-embedding on every ingestion run.

## 10. What to Remember

- **Computed once at ingestion, reused every query** — that's what makes retrieval scale.
- **Prepend the title + section breadcrumb** to the embedded text. Cheapest large recall gain.
- **Metadata is NOT embedded** — the breadcrumb must be in the text too.
- **Three silent bugs:** input-limit truncation, wrong task type, embedded ≠ stored text.
- **Hash the embedded text** for staleness detection and incremental re-embedding.
