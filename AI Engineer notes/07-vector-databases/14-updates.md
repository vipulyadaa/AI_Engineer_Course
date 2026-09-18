# Updates

> **Phase 07 · VECTOR DATABASES · Topic 14**

## 1. Definition

Modifying content already in the index — changed document text, changed metadata, or both. The two cases have very different costs, and conflating them is the usual source of waste.

## 2. Simple Explanation

If the text changed, the vector is wrong and must be recomputed. If only metadata changed — permissions, effective dates, tags — the vector is still correct and only the metadata needs writing.

Most stores let you update metadata without touching the vector. Systems that re-embed on every change are usually paying for this distinction not being made.

## 3. How It Works

```
CONTENT CHANGED
  re-chunk → re-embed changed chunks → upsert
  → reconcile deleted chunk ids

METADATA CHANGED ONLY
  update metadata in place; vector untouched
  → cheap, fast, no embedding call

BOTH
  treat as a content change, carry new metadata through
```

**The content hash decides which path you're on:**

```python
new_hash = sha256(breadcrumb(chunk) + chunk.body)
if new_hash != stored_hash:
    re_embed_and_upsert(chunk)
else:
    index.update_metadata(chunk.chunk_id, chunk.metadata)
```

## 4. Practical Example

**Where re-chunking makes this harder than it looks:**

```
A policy document is edited: one paragraph inserted on page 3.

If chunking is position-based, EVERY chunk after that point
shifts. Content hashes all change. The whole document
re-embeds even though one paragraph changed.

Mitigation: chunk on STRUCTURE — sections and headings —
so a chunk's identity is "section 4.2" rather than "characters
8000-9000". An insertion then changes only the section
containing it.

This is a concrete reason structure-aware chunking pays off
operationally, not just for retrieval quality.
```

**Updates are not atomic, and that matters:**

```
Re-embedding a document takes seconds to minutes. During that
window a query can retrieve:

  · old chunks for sections not yet updated
  · new chunks for sections already updated
  · both versions of a section, if delete lags upsert

Result: the generator sees contradictory fee figures and either
picks one arbitrarily or produces an answer citing both.

Mitigations:
  · version documents and filter to one version at query time
  · index the new version, then flip the doc's active version
  · accept it for low-stakes corpora, never for pricing or policy
```

**For a banking corpus I'd version.** Every chunk carries `doc_version`; a small lookup table names the active version per document; queries filter on it. The update becomes: index version N+1 fully, then flip one row. Readers never see a mixed state.

## 5. Why It Matters

- **Metadata-only updates should be cheap** — conflating them with content updates wastes the largest recurring cost.
- **Update windows expose mixed states**, which produces contradictory answers rather than merely stale ones.
- **Structure-aware chunking keeps updates small**, an operational benefit distinct from retrieval quality.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Re-embedding on metadata changes** | Wasted cost for no benefit |
| **Position-based chunking** | One inserted paragraph re-embeds a whole document |
| **Non-atomic updates** | Mixed old/new chunks retrieved together |
| **Upsert without delete** | Old chunks linger when a doc shrinks |
| **Index degradation** | Updates are delete+insert; graph quality erodes |
| **Update storms** | A bulk metadata change floods the write path |

**On updates degrading the index:** in graph indexes an update is effectively a delete plus an insert, so a frequently-updated corpus accumulates tombstones and degrades exactly like a high-delete one. High-churn corpora need scheduled rebuilds, and that should be planned capacity rather than a surprise.

**On update storms:** a compliance reclassification touching a hundred thousand documents' ACLs, applied naively, is a hundred thousand individual writes. Batch them, rate-limit, and run off-peak — and prefer query-time authorization against a live service for permissions precisely so this class of bulk update doesn't hit the index at all.

## 7. Interview Answer

> "The first thing is separating content updates from metadata updates. If the text changed, the vector is wrong and must be recomputed. If only permissions or effective dates changed, the vector is still correct and only the metadata needs writing. Most stores support metadata-only updates, and systems that re-embed on every change are usually paying because that distinction wasn't made. A content hash per chunk decides which path you're on.
>
> The thing that makes content updates harder than expected is re-chunking. If chunking is position-based, inserting one paragraph on page three shifts every chunk after it, all the hashes change, and the whole document re-embeds for a one-paragraph edit. Chunking on structure — sections and headings — means a chunk's identity is 'section 4.2' rather than a character range, so an insertion only changes the section containing it. That's a concrete operational reason for structure-aware chunking, separate from the retrieval-quality argument.
>
> The failure mode I'd actually design around is that updates aren't atomic. Re-embedding a document takes seconds to minutes, and during that window a query can retrieve old chunks for sections not yet updated alongside new chunks for sections already done — or both versions of a section if the delete lags the upsert. The generator then sees contradictory fee figures and either picks one arbitrarily or cites both. That's worse than being stale, because it's incoherent.
>
> For a banking corpus I'd version. Every chunk carries a doc_version, a small table names the active version per document, and queries filter on it. The update becomes: index version N plus one fully, verify, then flip one row. Readers never see a mixed state and rollback is flipping it back.
>
> Two operational points. Updates in a graph index are effectively delete plus insert, so a high-churn corpus accumulates tombstones and degrades the same way a high-delete one does — scheduled rebuilds should be planned capacity. And bulk metadata changes, like a compliance reclassification touching a hundred thousand ACLs, need batching and off-peak scheduling. Which is another argument for resolving permissions at query time against a live service, so that class of update never hits the index at all."

## 8. Likely Follow-ups

**Q: Do metadata changes require re-embedding?**
No. If the text is unchanged the vector is still correct, so only the metadata needs updating — which most stores support in place. Re-embedding on metadata changes is pure waste, and a content hash per chunk is what lets the pipeline tell the two cases apart.

**Q: What makes content updates expensive?**
Position-based chunking. Inserting a paragraph shifts every subsequent chunk boundary, so all their hashes change and the whole document re-embeds for a small edit. Structure-aware chunking gives chunks stable identities tied to sections, so only the edited section changes.

**Q: What happens during an update window?**
Queries can see a mixed state — old chunks for un-updated sections, new chunks for updated ones, sometimes both versions of the same section. The generator then produces contradictory or arbitrarily-chosen figures, which is worse than being stale because it's incoherent.

**Q: How do you make updates atomic?**
Version at the document level. Every chunk carries a doc_version, a lookup table names the active version, and queries filter on it. Indexing the new version fully and then flipping one row makes the switch atomic from a reader's point of view, and rollback is flipping it back.

**Q: Do frequent updates hurt the index?**
Yes. In a graph index an update is a delete plus an insert, so tombstones accumulate and connectivity degrades exactly as with heavy deletion — recall drifts down and latency up. High-churn corpora need scheduled rebuilds as planned capacity rather than an emergency response.

## 9. Common Mistakes

- Re-embedding when only metadata changed.
- Position-based chunking that amplifies small edits.
- Assuming updates are atomic from a reader's perspective.
- Upserting without removing chunks the new version no longer produces.
- Applying bulk metadata changes without batching or scheduling.

## 10. What to Remember

- **Separate content updates from metadata updates** — a content hash decides which.
- **Structure-aware chunking keeps edits local**, operationally as well as for quality.
- **Updates aren't atomic** — mixed states produce contradictory answers.
- **Version documents and flip the active version** for atomic cutover.
- **Updates degrade graph indexes** like deletes do; schedule rebuilds.
