# "How Did Ingestion Work?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 06**
>
> ⚠️ **An answer framework.** Describe your actual pipeline, including where it
> was manual. A scripted pipeline run by hand is a normal starting point.

## 1. Definition

A question about the batch pipeline that turns source documents into a searchable index — and about whether you treated it as a one-off script or as something that runs repeatedly.

## 2. Simple Explanation

Ingestion is load, parse, clean, chunk, enrich, embed, index. That sequence is the same everywhere.

What distinguishes the answer is what happens on the second run — whether re-ingestion is incremental, what happens on failure, and how you knew the output was right.

## 3. How It Works

```
1. LOAD      from the source location
2. PARSE     extract text and structure
3. CLEAN     strip headers, footers, boilerplate
4. CHUNK     structure-aware, with overlap
5. ENRICH    prefix breadcrumbs into the text; attach
             metadata
6. EMBED     with the document task type
7. INDEX     upsert by deterministic chunk ID
8. RECONCILE delete chunks the source no longer produces
```

**Step 8 is the one that's usually missing**, and it means withdrawn content stays retrievable indefinitely.

## 4. Practical Example

**What makes re-ingestion cheap:**

```
DETERMINISTIC CHUNK IDS
  derived from document ID + position + content hash
  → re-running upserts the same IDs rather than duplicating

CONTENT HASHING
  hash the text that was actually EMBEDDED, including the
  breadcrumb
  → only re-embed chunks whose hash changed

Without hashing, editing one paragraph re-embeds the whole
document. With it, a 300-page policy update might re-embed
four chunks.

And hash the embedded text, not the raw body — otherwise
a change to the enrichment format goes undetected and the
vectors silently stop representing what you think they do.
```

**Delete reconciliation, concretely:**

```
current_ids = chunk IDs the source produces now
indexed_ids = chunk IDs in the index for that document

delete(indexed_ids − current_ids)

That handles a document being withdrawn (current is empty)
and a document shrinking from twelve chunks to nine.

Without it, upsert-only ingestion leaves orphans — and in
banking, retracted content staying retrievable is a
compliance problem rather than untidiness.
```

**Verification before the index goes live:**

```
· indexed chunk count matches expected
· sample 50 chunks and read them against the source
· run the golden set — is recall at target?
· compare against the currently live index

Skipping the golden-set check is how a subtly broken index
reaches production — wrong task type on the embeddings,
truncated chunks, a misconfigured metric. None of those
throw an error; they just quietly make retrieval worse.
```

## 5. Why It Matters

- **Delete reconciliation** is usually missing, and retracted content stays retrievable.
- **Content hashing on the embedded text** makes re-ingestion incremental.
- **Verification before activation** catches silently broken indexes.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We ran a script" | Says nothing about the second run |
| No delete reconciliation | Withdrawn content stays retrievable |
| Non-deterministic chunk IDs | Re-runs duplicate |
| No checkpointing | Failures restart from zero |
| Hashing raw text, not embedded text | Enrichment changes go undetected |
| No verification before going live | Silently broken indexes ship |

**On being honest about maturity:** if ingestion was a script run manually when documents changed, say so. That's a normal starting point, and describing what you'd add — incremental hashing, delete reconciliation, a verification step — is a better answer than implying a pipeline that didn't exist. The follow-up "how did you handle a document being deleted?" is where an overclaim comes apart.

**On cost:** embedding is the main one-time expense, so running the whole pipeline on a one percent sample first — checking chunk boundaries, task types, and metadata — costs almost nothing and catches the configuration errors you'd otherwise discover after paying for the full corpus.

## 7. Interview Answer

> "[**Your pipeline.** The sequence is standard; the interesting parts are what happens on re-runs.]
>
> "The sequence was load from [**source**], parse, clean, chunk, enrich, embed, and index. Cleaning stripped repeated headers and footers — a 'confidential, internal use only' line on every page ends up in a large share of chunks otherwise, adding noise to the embeddings for nothing.
>
> The enrichment step prefixed the section path into the chunk text before embedding, so a chunk reading 'this fee is waived for the first two transactions' carries the document and section it came from.
>
> [**Then the parts that matter on the second run:**]
>
> Chunk IDs were deterministic — derived from document ID, position, and a content hash — so re-running upserts the same IDs rather than creating duplicates. That makes a failed run just re-runnable.
>
> [**If you had content hashing:**] The hash was over the text that was actually embedded, including the breadcrumb, not the raw chunk body. That matters because a change to the enrichment format would otherwise go undetected and the vectors would silently stop representing what I thought they did. With the hash, editing one paragraph re-embeds a handful of chunks instead of the whole document.
>
> [**Delete reconciliation:**] On each ingestion, the chunk IDs the source produces now are diffed against what's indexed for that document, and the difference is deleted. That handles a document being withdrawn — the current set is empty — and a document shrinking from twelve chunks to nine. Without it, upsert-only ingestion leaves orphans, and in banking retracted content staying retrievable is a compliance problem rather than untidiness.
>
> Before an index went live I'd check the chunk count against expected, read fifty sampled chunks against the source documents, and run the golden set. Skipping that last one is how a subtly broken index reaches production — a wrong embedding task type or truncated chunks don't throw an error, they just quietly make retrieval worse.
>
> [**Be honest about maturity.** If ingestion was a script run manually when documents changed, say so — that's a normal starting point. Then describe what you'd add: incremental hashing, delete reconciliation, and a verification gate. The follow-up 'how did you handle a document being deleted?' is where an overclaim comes apart.]"

## 8. Likely Follow-ups

**Q: What happened on re-ingestion?**
With deterministic chunk IDs, re-running upserts the same IDs rather than duplicating. With content hashing over the embedded text, only changed chunks are re-embedded — so a policy update re-embeds a handful of chunks rather than the whole document.

**Q: How did you handle a deleted document?**
By diffing the chunk IDs the source produces now against what's indexed for that document and deleting the difference. For a withdrawn document the current set is empty, so everything goes. Upsert-only ingestion leaves orphans that stay retrievable indefinitely.

**Q: What should the content hash cover?**
The text that was actually embedded, including the breadcrumb and any enrichment — not the raw chunk body. Otherwise a change to the enrichment format goes undetected and the stored vectors silently stop representing what they should.

**Q: How did you know the index was correct?**
Chunk count against expected, a sample of chunks read against the source documents, and the golden set run before activation. That last check catches subtly broken indexes — wrong task types, truncated chunks — which produce no error and just degrade retrieval.

**Q: What would you add?**
[**Your honest gap.**] Usually checkpointing so a failed multi-hour embedding job resumes rather than restarting, event-driven triggers rather than scheduled runs, or a sample-run gate before committing to the full corpus embedding cost.

## 9. Common Mistakes

- Answering "we ran a script" with nothing about re-runs.
- No delete reconciliation.
- Non-deterministic chunk IDs producing duplicates.
- Hashing the raw body rather than the embedded text.
- No verification step before an index goes live.

## 10. What to Remember

- **The sequence is standard** — the second run is what's interesting.
- **Deterministic chunk IDs** make re-runs idempotent.
- **Hash the embedded text**, including breadcrumbs.
- **Diff and delete** — otherwise retracted content stays retrievable.
- **Verify before activation** — broken indexes don't raise errors.
