# Failure Mode: Bad Metadata

> **Phase 13 · RAG FAILURE MODES · Topic 14**

## 1. Definition

Missing, wrong, or stale structured fields on chunks. Since filtering, citation, freshness resolution, and incremental re-indexing all run on metadata, bad metadata breaks capabilities rather than degrading quality — and the failures are usually silent.

## 2. Simple Explanation

Metadata is what makes a RAG system more than similarity search.

Access control, citation, version resolution, incremental updates — all of them read metadata. Get it wrong and you don't get worse answers, you get a security hole, an unciteable answer, or a document that never updates.

## 3. How It Works

**The failures, by field:**

| Field | If missing | If wrong |
|---|---|---|
| `acl_group` | No access control possible | **Data leakage** — the worst outcome |
| `effective_date` | Superseded versions compete | Wrong version filtered in or out |
| `source_uri` / `page` | Citations point at whole documents | Users sent to the wrong place |
| `content_hash` | Every re-index re-embeds everything | Changed chunks skipped |
| `embedding_model` | Model migration is a risky rebuild | Old and new vectors mixed |
| `chunk_id` / `parent_id` | Dedup and parent-child break | Wrong parent returned |

**Why it's mostly silent:**

```
Wrong acl_group     → the user gets a document they shouldn't.
                      No error. Detected only by audit.
Missing source_uri  → citation renders as a bare document name.
                      Looks slightly unhelpful, not broken.
Stale acl_group     → permissions changed at source; content-hash
                      re-indexing SKIPPED the document entirely.
```

## 4. Practical Example

**The stale-ACL gap, which is structural:**

```
Incremental re-indexing keyed on content_hash:
  document content unchanged → hash unchanged → SKIPPED

But the document's permissions changed at the source:
  was: acl_group = ["hr-team"]
  now: acl_group = ["hr-team", "all-staff"]   (or the reverse)

The index still has the old ACL. Either people who should now
see it can't, or — far worse — people who should no longer see
it still can.

Content-based incremental re-indexing cannot catch this by design.
Permission syncs need their OWN trigger.
```

**Validation at ingestion:**

```python
REQUIRED = ["chunk_id", "doc_id", "source_uri", "acl_group",
            "effective_date", "content_hash", "embedding_model"]

for chunk in chunks:
    missing = [f for f in REQUIRED if not chunk.metadata.get(f)]
    assert not missing, f"{chunk.chunk_id} missing: {missing}"

    # Type and range validation catches wrong values, not just missing ones
    assert is_valid_date(chunk.metadata["effective_date"])
    assert chunk.metadata["acl_group"], "empty ACL — fail closed"
```

**Fail closed on ACL:** a chunk with an empty or missing access group should be *unretrievable*, not universally retrievable. That default choice is the difference between a bug and an incident.

## 5. Why It Matters

- **Wrong ACL metadata is a data-leakage incident**, not a quality issue.
- **It's captured at ingestion or never** — backfilling means re-ingesting.
- **The failures are silent** and detected by audit rather than by monitoring.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Missing ACL, defaulting open** | Fail closed instead |
| **Stale ACL** | Content-hash re-indexing skips permission-only changes |
| **No effective_date** | Version conflicts unresolvable |
| **Missing source_uri/page** | Citations unusable on long documents |
| **No embedding_model field** | Model migration has no safe cutover |
| **Breadcrumb only in metadata** | No retrieval benefit — metadata isn't embedded |
| **No validation at ingestion** | Bad metadata enters and stays |

**The "metadata isn't embedded" point** is worth repeating because it's the most common conceptual error: storing the heading breadcrumb in metadata gives you filtering and citation and zero recall improvement. It has to be in the chunk text too, prepended before embedding.

**Auditing existing metadata:**

```
% chunks with each required field present
% chunks whose acl_group matches the current source permission
% chunks whose effective_date is parseable and plausible
% chunks whose source_uri resolves

Run periodically; these degrade over time as sources change.
```

## 7. Interview Answer

> "Bad metadata is missing, wrong, or stale structured fields on chunks. It matters disproportionately because filtering, citation, freshness resolution, and incremental re-indexing all run on metadata — so bad metadata breaks capabilities rather than just degrading quality.
>
> The most serious case is access control. Wrong `acl_group` means a user retrieves a document they shouldn't, with no error anywhere — detected by audit, not by monitoring. So the design decision I'd insist on is failing closed: a chunk with an empty or missing access group should be unretrievable, not universally retrievable. That default is the difference between a bug and an incident.
>
> The structural gap I'd flag is stale ACLs. Incremental re-indexing keyed on content hash skips documents whose content hasn't changed — but permissions change independently of content. So a document whose access group was tightened at the source keeps its old, looser ACL in the index indefinitely, and content-based re-indexing cannot catch it by design. Permission syncs need their own trigger, either polling the source system or resolving permissions at query time against a live authorization service.
>
> Beyond ACLs: `effective_date` for version resolution, `source_uri` with a page anchor for usable citation, `content_hash` for incremental updates, and `embedding_model` so a model migration has a safe cutover rather than being a risky in-place rebuild.
>
> And the conceptual point people get wrong most: metadata isn't embedded. Storing the heading breadcrumb in metadata gives you filtering and citation and zero recall benefit — the vector is computed from the chunk text alone. It has to be in both places.
>
> All of it is captured at ingestion or never, so I'd validate required fields at ingestion and audit them periodically, because they degrade as sources change."

## 8. Likely Follow-ups

**Q: Which metadata failure is most serious?**
Wrong or stale `acl_group`, because it's a data-leakage incident rather than a quality problem, and it's silent — nothing errors, and it's found by audit rather than monitoring. That's why the system should fail closed on missing ACL rather than treating it as unrestricted.

**Q: Why does ACL metadata go stale?**
Because permissions change independently of content, and incremental re-indexing keyed on content hash skips documents whose text hasn't changed. It's a structural gap, not an oversight — content-based pipelines cannot detect permission-only changes. It needs a separate sync, or query-time authorization against a live service.

**Q: Can you add metadata later?**
Not without re-ingesting, for most fields. Source URI, page numbers, and heading structure come from the parsing stage and can't be reconstructed from an indexed chunk. Some fields like authority tier could be added by a separate pass if you can map chunks back to source documents, but the general answer is that the schema has to be designed up front.

**Q: What's the "metadata isn't embedded" point?**
The vector is computed from the chunk text alone. Metadata is stored alongside it for filtering and display but has no effect on semantic matching. So putting the heading breadcrumb only in metadata gives you citation support and zero retrieval improvement — it needs to be prepended to the chunk text as well, serving two different purposes.

**Q: How do you audit metadata quality?**
Periodically check the percentage of chunks with each required field present, whether `acl_group` still matches current source permissions, whether `effective_date` is parseable and plausible, and whether `source_uri` resolves. These degrade over time as source systems change, so it's a recurring check rather than a one-time validation.

## 9. Common Mistakes

- Defaulting to open access when ACL metadata is missing.
- Assuming content-hash re-indexing keeps ACLs fresh.
- Storing the breadcrumb only in metadata, expecting a recall benefit.
- No validation of required fields at ingestion.
- Omitting `embedding_model`, making model migration a risky rebuild.

## 10. What to Remember

- **Metadata breaks capabilities, not just quality** — filtering, citation, freshness, updates.
- **Wrong ACL is an incident, not a bug.** Fail closed on missing access groups.
- **ACL staleness is structural** — content-hash re-indexing cannot catch permission changes.
- **Metadata isn't embedded.** The breadcrumb must be in the chunk text too.
- **Captured at ingestion or never.** Validate at write time; audit periodically.
