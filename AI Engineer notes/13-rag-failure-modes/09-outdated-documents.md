# Failure Mode: Outdated Documents

> **Phase 13 · RAG FAILURE MODES · Topic 09**

## 1. Definition

Serving answers from superseded content — a policy that was revised, a fee that changed, a product that was withdrawn. The retrieval is technically correct and the answer is wrong, with a citation to a real document.

## 2. Simple Explanation

RAG's main advantage over fine-tuning is that facts can be updated by re-indexing. That advantage only exists if you actually re-index — and if superseded versions stop being retrievable.

Two separate problems: the index is stale relative to the source, and the index contains old versions alongside new ones.

## 3. How It Works

**The two failure paths:**

```
1. INDEX STALE
   Source document updated → index not refreshed
   → serving the old version because the new one isn't there

2. OLD VERSIONS STILL PRESENT
   New version indexed → old version never removed
   → both retrievable; the model picks arbitrarily
```

**The controls:**

| Control | Addresses |
|---|---|
| Event-driven re-indexing on document change | Index staleness |
| Scheduled full reconciliation | Missed change events |
| `effective_date` / `expiry_date` filtering | Old versions competing |
| Delete reconciliation on re-index | Orphaned chunks |
| `indexed_at` freshness monitoring | Detecting staleness |
| Answer-level date disclosure | Making age visible to the user |

## 4. Practical Example

**The delete-reconciliation bug, which is easy to write:**

```python
# ❌ Upsert only
for chunk in new_chunks:
    index.upsert(chunk)
# Section 3.2 was REMOVED from the document in this revision.
# Its old chunk is still in the index. Forever.
# It will be retrieved and served as current policy.

# ✅ Reconcile
existing_ids = index.get_chunk_ids(doc_id=doc.id)
new_ids      = {c.chunk_id for c in new_chunks}
index.upsert(new_chunks)
index.delete(ids=existing_ids - new_ids)    # ← the line people omit
```

**Freshness monitoring:**

```
Per document: days since indexed_at vs. source last_modified

  policy-fees-2026    indexed 2026-02-14   source 2026-02-14   ✅
  policy-retail-2025  indexed 2025-11-03   source 2026-01-20   ⚠️ 78 days stale
  product-terms       indexed 2024-08-11   source 2024-08-11   ✅ (unchanged)

Alert on: source newer than indexed_at by more than the SLA.
```

**Disclosure when content is old:**

```
"International wire transfers cost $45 for retail accounts
 [Retail Fees Schedule § 3.2, effective 2026-01-01]."

Including the effective date lets the user judge currency,
and it costs nothing.
```

## 5. Why It Matters

- **It undermines RAG's core advantage.** The whole point is that facts update by re-indexing.
- **The answer is confidently wrong with a real citation**, which is the most dangerous shape.
- **In banking, serving superseded policy has compliance consequences**, not just quality ones.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Upsert without delete** | Removed sections stay retrievable forever |
| **No effective_date filter** | Old and new versions compete; model picks arbitrarily |
| **Change events missed** | Webhooks are unreliable; need scheduled reconciliation |
| **ACL changes without content changes** | Content-hash re-indexing skips them entirely |
| **No freshness monitoring** | Staleness invisible until a user complains |
| **Over-aggressive date filtering** | Breaks legitimate historical questions |

**The ACL-freshness case is a specific gap:** permissions change independently of content, so a content-hash-based incremental pipeline skips those documents entirely. Permission syncs need their own trigger — polling the source system's permission state, or resolving permissions at query time against a live authorization service.

**On re-indexing cadence:** event-driven where the source supports it, with a scheduled full reconciliation as a safety net. Change feeds miss deletions more often than they miss updates, which is exactly why reconciliation matters.

## 7. Interview Answer

> "Outdated documents means serving answers from superseded content. The retrieval is technically correct and the answer is wrong, with a citation to a real document — which is the most dangerous failure shape, because the citation implies verification that didn't happen.
>
> There are two separate problems. The index can be stale relative to the source — the document was updated and we didn't re-index. Or old versions can still be present alongside new ones, so both are retrievable and the model picks arbitrarily.
>
> The second one has a specific common bug: upserting without deleting. If a section is removed in a revision and you only upsert the new chunks, the old section's chunk stays in the index forever and will eventually be served as current policy. Reconciling — deleting chunk IDs the new version no longer produces — is one line people omit.
>
> The prevention for version competition is effective and expiry date metadata with a retrieval filter, so superseded versions aren't candidates. That makes it deterministic rather than dependent on ranking.
>
> For staleness, event-driven re-indexing on document change where the source supports it, plus a scheduled full reconciliation as a safety net — change feeds miss deletions more often than updates. And freshness monitoring: alert when a source document is newer than its indexed_at by more than the SLA.
>
> One gap worth flagging: permissions change independently of content, so a content-hash-based incremental pipeline skips those documents entirely. ACL syncs need their own trigger.
>
> And I'd include the effective date in citations. It costs nothing and lets the user judge currency themselves."

## 8. Likely Follow-ups

**Q: How do you keep the index fresh?**
Event-driven re-indexing triggered by document-change webhooks where the source supports them, with a scheduled full reconciliation as a safety net. Content-hash per chunk so only changed chunks are re-embedded. And freshness monitoring comparing source last-modified to indexed_at, alerting past an SLA.

**Q: What's the delete-reconciliation bug?**
Upserting new chunks without removing chunk IDs the new version no longer produces. If a section is deleted in a revision, its old chunk stays in the index and will eventually be retrieved and served as current. It's a one-line omission with a long tail of wrong answers.

**Q: How do you stop old versions competing with new ones?**
Effective and expiry dates in chunk metadata, filtered at retrieval so only currently-effective content is a candidate. That's deterministic. Without it, both versions are retrievable and the model picks whichever ranked higher, which is arbitrary with respect to correctness.

**Q: What about ACL changes?**
They're a specific gap, because permissions change without content changing, so a content-hash-based incremental pipeline skips those documents. That needs its own sync — polling the source system's permission state on a schedule, subscribing to permission-change events, or resolving permissions at query time against a live authorization service.

**Q: Should you delete old versions entirely?**
Not necessarily. Historical questions legitimately need them — "what was the fee in 2025" should retrieve the 2025 schedule. I'd keep them with expiry dates set, filtered out of default retrieval but available when the query references a past period. Hard deletion loses information you may need for audit purposes too.

## 9. Common Mistakes

- Upserting without reconciling deletes.
- No effective_date filtering, so versions compete.
- Relying on change webhooks alone without scheduled reconciliation.
- Assuming ACL freshness follows from content re-indexing.
- No freshness monitoring, so staleness surfaces as a user complaint.

## 10. What to Remember

- **Two problems:** index stale vs. source, and old versions still present.
- **Upsert without delete** leaves removed sections retrievable forever.
- **effective_date / expiry filtering** makes version selection deterministic.
- **Event-driven re-indexing plus scheduled reconciliation** — change feeds miss deletions.
- **ACL freshness needs its own trigger** — permissions change without content changing.
