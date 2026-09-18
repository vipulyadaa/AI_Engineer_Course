# Ingestion Pipeline

> **Phase 08 · RAG FUNDAMENTALS · Topic 04**

## 1. Definition

The offline process that turns raw source documents into a searchable index: load → parse → clean → chunk → embed → store. It runs on a schedule or on document change, and its output constrains everything the query pipeline can achieve.

## 2. Simple Explanation

Ingestion is where RAG quality is won or lost, and it's the least glamorous part.

A table split across two chunks, a PDF whose columns got interleaved, a page header repeated into every chunk — none of those can be fixed by a better embedding model, a reranker, or a cleverer prompt. The damage is baked in.

## 3. How It Works

```
Sources → Load → Parse → Clean → Chunk → Enrich → Embed → Upsert
```

1. **Load** — pull from the source: file storage, Confluence, SharePoint, a database, a web crawl, an API.
2. **Parse** — extract text with structure preserved. PDFs, tables, and scans are the hard cases.
3. **Clean** — strip boilerplate (headers, footers, nav), normalize whitespace, drop empty or near-empty content.
4. **Chunk** — split into retrievable units that contain complete ideas.
5. **Enrich** — prepend document title and section heading; attach metadata.
6. **Embed** — vectorize each chunk with the embedding model.
7. **Upsert** — write vectors, text, and metadata to the index, keyed so re-runs update rather than duplicate.

**Metadata is the part people under-invest in.** At minimum:

```json
{
  "doc_id": "policy-fees-2026",
  "chunk_id": "policy-fees-2026#3.2:0",
  "title": "Retail Fees Schedule",
  "section": "3.2 International Transfers",
  "source_uri": "https://.../fees.pdf#page=14",
  "effective_date": "2026-01-01",
  "content_type": "table",
  "acl_group": "retail-public",
  "content_hash": "a3f9…"
}
```

That enables citation, access control, freshness filtering, and incremental re-indexing — none of which you can retrofit cheaply.

## 4. Practical Example

**Incremental re-indexing with a content hash** — the detail that makes re-runs cheap:

```python
for doc in changed_documents:
    chunks = chunk(clean(parse(load(doc))))
    for c in chunks:
        c.hash = sha256(c.text)

    existing = index.get_chunks(doc_id=doc.id)          # what's already there
    unchanged = {e.chunk_id for e in existing if e.hash in {c.hash for c in chunks}}

    to_embed = [c for c in chunks if c.chunk_id not in unchanged]
    vectors  = embed(to_embed)                          # only the changed ones
    index.upsert(vectors)
    index.delete(ids=[e.chunk_id for e in existing
                      if e.chunk_id not in {c.chunk_id for c in chunks}])
```

Without the hash check, editing one paragraph re-embeds the entire document. With it, a 300-page policy update might re-embed four chunks.

**The delete step matters too.** If a section is removed from a document and you only upsert, the old chunk stays in the index forever and will eventually be retrieved — serving deleted policy as current.

Deletion flow
===============

             Document changed
                    ↓
             Get latest version
                    ↓
               Parse document
                    ↓
                 Chunk it
                    ↓
          Compare old vs new chunks
                    ↓
       ┌────────────┼─────────────┐
       ↓            ↓             ↓
   Unchanged      Changed       Deleted
       ↓            ↓             ↓
      Skip       Re-embed       DELETE
                    ↓
                  UPSERT
                    ↓
                Vector DB

## 5. Why It Matters

- **Ingestion constrains the achievable quality ceiling.** Retrieval can only find what ingestion put there, in the form ingestion put it.
- **It's where cost concentrates** — embedding a large corpus is the main one-time expense, and incremental re-indexing is what keeps it from recurring.
- **It's where compliance lives** — ACL tags, source URIs for citation, and effective dates all get attached here or not at all.

## 6. Trade-offs / Failure Modes

| Failure | Impact | Fix |
|---------|--------|-----|
| **Bad PDF parsing** | Interleaved columns, lost tables → unretrievable content | Layout-aware parser; validate a sample by hand |
| **Boilerplate not stripped** | Every chunk contains the same header → embeddings converge | Strip repeated lines detected across pages |
| **No deletes on re-index** | Removed content stays retrievable forever | Reconcile: delete chunk IDs no longer produced |
| **Full re-embed on every run** | Large recurring cost | Content-hash-based incremental updates |
| **Metadata missing** | Can't cite, can't permission, can't filter by date | Attach at ingestion; it's expensive to backfill |
| **Silent parse failures** | A document produces zero chunks and nobody notices | Assert chunk counts per document; alert on drops |
| **Embedding model changed** | New vectors incompatible with old ones | Re-embed the whole corpus; version the index |

**The one that bites hardest in production:** silent failures. A parser that returns empty text for scanned PDFs will quietly index nothing, and the only symptom is that certain questions never get good answers. Assert on chunks-per-document and alert when it drops.

## 7. Interview Answer

> "The ingestion pipeline turns raw documents into a searchable index: load, parse, clean, chunk, enrich with metadata, embed, and upsert. It's offline and batch, triggered on a schedule or on document change.
>
> I'd emphasize that this is where RAG quality is actually won. A table split across two chunks or a PDF whose columns got interleaved can't be fixed by a better embedding model or a reranker — the damage is baked in before retrieval ever runs.
>
> Two things I'd design in from the start. First, rich metadata — document ID, section, source URI, effective date, content type, and ACL group. That's what enables citation, access control, and freshness filtering, and it's expensive to backfill later. Second, content hashing per chunk so re-indexing is incremental. Without it, editing one paragraph re-embeds the whole document; with it, a 300-page policy update might re-embed four chunks.
>
> The failure mode I'd guard against hardest is silent failures. A parser that returns empty text for scanned PDFs indexes nothing, and the only symptom is that certain questions never get good answers — which looks like a retrieval problem and isn't. So I'd assert on chunks-per-document and alert when the count drops unexpectedly.
>
> And I'd make sure re-indexing includes deletes. If a section is removed from a document and you only upsert, the old chunk stays in the index and will eventually be retrieved — serving deleted policy as current."

## 8. Likely Follow-ups

**Q: How do you handle document updates efficiently?**
Content-hash each chunk. On re-ingestion, re-embed only chunks whose hash changed, and delete chunk IDs that the new version no longer produces. Trigger on a webhook from the source system where available, with a scheduled full reconciliation as a safety net. That turns re-indexing from a full-corpus cost into a near-zero incremental one.

**Q: What metadata do you attach and why?**
`doc_id` and `chunk_id` for identity and deduplication, `source_uri` with a page or section anchor for citation, `title` and `section` for both citation and chunk enrichment, `effective_date` for freshness filtering and for flagging stale answers, `content_type` so tables and code can be handled differently, `acl_group` for pre-retrieval access filtering, and `content_hash` for incremental updates. All of it is cheap at ingestion and painful to add later.

**Q: How do you validate the pipeline is working?**
Assert on counts — documents in, chunks out, vectors upserted — and alert when the ratio shifts. Sample chunks by hand after any parser change, because parsing bugs are visually obvious and statistically invisible. And maintain a small golden set of questions whose correct source chunk you know, then verify after every ingestion run that those chunks are still retrievable.

**Q: What happens when you change the embedding model?**
The whole corpus has to be re-embedded, because vectors from different models aren't comparable — a query embedded with the new model won't match chunks embedded with the old one. I'd version the index, build the new one alongside the old, evaluate both on a golden set, then cut over. Doing it in place means a period where retrieval is silently broken.

**Q: How do you handle very large corpora?**
Parallelize the parse-and-chunk stage as a distributed batch job with a work queue, since it's embarrassingly parallel per document. Batch the embedding calls, since per-call overhead dominates otherwise. Upsert in bulk rather than per-chunk. And prioritize — index the documents that answer the most common questions first, so the system is useful before the full corpus is done.

## 9. Common Mistakes

- Treating ingestion as a one-time script rather than a maintained pipeline.
- Re-embedding everything on every run instead of hashing for incremental updates.
- Upserting without deleting, so removed content stays retrievable.
- Skipping metadata and trying to add it later.
- Not alerting on chunks-per-document, so parse failures go unnoticed.

## 10. What to Remember

- **Load → parse → clean → chunk → enrich → embed → upsert.** Offline and batch.
- **Quality ceiling is set here.** Parsing and chunking damage is unrecoverable downstream.
- **Metadata at ingestion or never** — citation, ACL, freshness all depend on it.
- **Content-hash for incremental re-indexing**, and always reconcile deletes.
- **Alert on chunks-per-document.** Silent parse failures are the worst failure mode.
