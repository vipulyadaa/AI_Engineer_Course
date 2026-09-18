# Metadata

> **Phase 11 · RAG RETRIEVAL · Topic 11**

## 1. Definition

Structured fields stored alongside each chunk's vector and text — identity, source, permissions, dates, content type. It's what makes filtering, citation, freshness resolution, and incremental re-indexing possible.

## 2. Simple Explanation

The vector tells you what a chunk *means*. Metadata tells you everything else about it: where it came from, who can see it, when it took effect, what kind of content it is.

Almost everything a production RAG system does beyond basic similarity search runs on metadata — and none of it can be added later without re-ingesting.

## 3. How It Works

**A production metadata schema:**

```json
{
  "chunk_id":       "policy-retail-2026#3.2:1",
  "doc_id":         "policy-retail-2026",
  "parent_id":      "policy-retail-2026#3.2",

  "title":          "Retail Banking Policy",
  "breadcrumb":     "Retail Banking Policy > 3. Fees > 3.2 International Transfers",
  "section_number": "3.2",
  "page":           14,
  "source_uri":     "https://.../policy.pdf#page=14",

  "acl_group":      ["retail-public", "staff"],
  "effective_date": "2026-01-01",
  "expiry_date":    null,

  "product":        "international_transfers",
  "doc_type":       "policy",
  "content_type":   "table",
  "language":       "en",

  "content_hash":   "a3f9c2...",
  "indexed_at":     "2026-02-14T03:00:00Z",
  "embedding_model":"text-embedding-005"
}
```

**What each group enables:**

| Group | Enables |
|---|---|
| Identity (`chunk_id`, `doc_id`, `parent_id`) | Deduplication, parent-child retrieval, updates |
| Source (`title`, `breadcrumb`, `page`, `source_uri`) | Citation, chunk enrichment |
| Access (`acl_group`) | Pre-retrieval security filtering |
| Temporal (`effective_date`, `expiry_date`) | Freshness, conflict resolution |
| Classification (`product`, `doc_type`, `content_type`) | Scoping, routing, prompt formatting |
| Operational (`content_hash`, `indexed_at`, `embedding_model`) | Incremental re-indexing, migration |

## 4. Practical Example

**The distinction people get wrong — metadata is not embedded:**

```
❌ Breadcrumb stored ONLY in metadata:
   → available for citation and filtering
   → contributes NOTHING to retrieval, because the vector
     was computed from the chunk text alone

✅ Breadcrumb in BOTH places:
   chunk text (embedded): "Retail Banking Policy > 3. Fees >
                           3.2 International Transfers
                           The fee is $45 for retail accounts..."
   metadata:              {"breadcrumb": "...", "section_number": "3.2"}

   → the text version shapes the embedding (recall gain)
   → the metadata version enables filtering and citation
```

**`embedding_model` in metadata is the field people forget**, and it's what makes a model migration tractable:

```
Migrating to a new embedding model:
  1. Index new vectors with embedding_model: "text-embedding-006"
  2. Query filters on the model version → old and new never mix
  3. Evaluate both on a golden set
  4. Cut over by changing the filter
  5. Delete old vectors

Without the field, you can't tell which vectors are which, and
mixing them silently breaks retrieval.
```

## 5. Why It Matters

- **It's captured at ingestion or never.** Backfilling means re-ingesting the corpus.
- **Everything beyond basic similarity search depends on it** — security, citation, freshness, updates.
- **The "metadata isn't embedded" distinction** is a precise point that shows real understanding.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Thin schema** | Can't filter, cite, or update incrementally |
| **Breadcrumb only in metadata** | Zero retrieval benefit — metadata isn't embedded |
| **Missing `effective_date`** | Superseded versions compete with current ones |
| **Missing `source_uri`/page** | Citations point at whole documents, useless on long ones |
| **Stale `acl_group`** | Permissions change without content changing; content-hash re-indexing skips them |
| **No `content_hash`** | Every re-index re-embeds everything |
| **No `embedding_model`** | Model migration becomes a full rebuild with no safe cutover |
| **Over-large metadata** | Storing full document text in metadata bloats the index |

**On storage:** metadata is cheap relative to vectors, but not free — some vector databases charge for it and some have per-field size limits. Store identifiers and short fields; store long text in the chunk field or a separate docstore.

## 7. Interview Answer

> "Metadata is the structured fields stored alongside each chunk's vector — identity, source, permissions, dates, content type. Almost everything a production RAG system does beyond basic similarity search runs on it: access filtering, citation, freshness resolution, incremental re-indexing.
>
> The critical property is that it's captured at ingestion or never. Backfilling means re-ingesting the corpus, so the schema has to be designed up front.
>
> The distinction I'd be precise about is that metadata is *not embedded*. The vector is computed from the chunk text alone. So if I store the heading breadcrumb only in metadata, I get citation and filtering support and zero retrieval benefit. The breadcrumb needs to be in both places — prepended to the chunk text so it shapes the embedding, and in metadata so I can filter and cite with it. That's the most common version of this mistake.
>
> The field people forget is the embedding model version. Without it, migrating to a new model is a full rebuild with no safe cutover — you can't tell which vectors came from which model, and mixing them silently breaks retrieval. With it, you index new vectors alongside old, filter queries by model version, evaluate both on a golden set, and cut over by changing a filter.
>
> And `acl_group` has a specific freshness problem: permissions change without content changing, so content-hash-based incremental re-indexing skips those documents entirely. Permission syncs need their own trigger."

## 8. Likely Follow-ups

**Q: What metadata is essential?**
Identity fields for deduplication and updates, `source_uri` with a page or section anchor for citation, `acl_group` for security filtering, `effective_date` for freshness, `content_type` for handling tables and code differently, and `content_hash` for incremental re-indexing. Everything else is useful; those are the ones whose absence breaks a capability entirely.

**Q: Why doesn't metadata help retrieval?**
Because only the chunk text is embedded. Metadata is stored alongside the vector for filtering and display, but it has no effect on the vector itself, so it can't improve semantic matching. To get retrieval benefit from a field like the heading breadcrumb, it has to be in the embedded text.

**Q: How do you handle metadata changes without content changes?**
Update the metadata in place without re-embedding — most vector databases support this. The important case is permissions, which change independently of content, so a content-hash-based pipeline will skip those documents. That needs a separate sync that polls or subscribes to permission changes in the source system.

**Q: How much metadata is too much?**
When it bloats the index without enabling anything — storing full document text in metadata, for instance, when it belongs in the chunk field or a docstore. Some vector databases have per-field size limits or charge for metadata storage. I'd store identifiers and short structured fields, and keep long text elsewhere.

**Q: How does metadata help with model migration?**
Storing the embedding model version per vector lets you run old and new models side by side in the same index, filtered apart at query time. You index the new vectors, evaluate both against a golden set, cut over by changing the query filter, then delete the old ones. Without that field you'd have to rebuild in place, which means a window where retrieval is silently broken.

## 9. Common Mistakes

- Designing a thin schema and trying to add fields later.
- Storing the breadcrumb only in metadata, expecting retrieval benefit.
- Omitting `effective_date`, so superseded documents compete.
- Not storing `embedding_model`, making migration a risky rebuild.
- Assuming ACL metadata stays fresh through content-based re-indexing.

## 10. What to Remember

- **Captured at ingestion or never.** Backfilling means re-ingesting.
- **Metadata is NOT embedded** — the breadcrumb must be in the chunk text too.
- **Six groups:** identity, source, access, temporal, classification, operational.
- **`embedding_model` makes migration safe;** `content_hash` makes re-indexing incremental.
- **ACL freshness needs its own sync** — permissions change without content changing.
