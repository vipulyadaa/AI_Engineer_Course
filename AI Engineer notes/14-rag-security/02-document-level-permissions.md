# Document-Level Permissions

> **Phase 14 · RAG SECURITY · Topic 02**

## 1. Definition

Authorization applied at the granularity of a source document, inherited by every chunk derived from it. It's the standard model because source systems define permissions at that level, and mapping them to chunks is the main integration task.

## 2. Simple Explanation

A Confluence page, a SharePoint file, or a policy PDF has an access list in its source system. Every chunk cut from it inherits that access list.

The engineering problem is faithfully translating the source system's permission model into something you can filter on at query time — and keeping it in sync as permissions change.

## 3. How It Works

```
Source document
  └─ permissions: [finance-team, compliance, exec]
       │
       ▼ inherited at ingestion
  ├─ chunk 1  acl_group: [finance-team, compliance, exec]
  ├─ chunk 2  acl_group: [finance-team, compliance, exec]
  └─ chunk 3  acl_group: [finance-team, compliance, exec]

Query time: acl_group ∩ caller.groups ≠ ∅
```

**The two implementation models:**

| | Snapshot at ingestion | Resolve at query time |
|---|---|---|
| Where permissions live | Chunk metadata | Authorization service |
| Freshness | Stale until re-synced | Always current |
| Query latency | No extra cost | One lookup per request |
| Handles complex models | Poorly — flattening loses semantics | Fully |
| Use for | Large corpora, moderate sensitivity | High-sensitivity content |

## 4. Practical Example

**The flattening problem:**

```
Source permission model (SharePoint-like):
  · inherited from parent site: [all-staff] READ
  · explicit grant:             [finance-team] WRITE
  · explicit DENY:              [contractors] — overrides inheritance

Flattened naively to acl_group = ["all-staff", "finance-team"]
  → the DENY on contractors is LOST.
  → a contractor in all-staff can now retrieve it.

Correct flattening must compute EFFECTIVE permissions,
resolving inheritance and deny rules, not just union the grants.
```

**The staleness gap:**

```
Document permissions tightened at source:
  was: [all-staff]     now: [finance-team]

Content unchanged → content_hash unchanged → incremental
re-indexing SKIPS this document.

The index still says [all-staff]. Everyone can still retrieve it.
Indefinitely.
```

**A hybrid that works in practice:**

```
Snapshot acl_group at ingestion for fast pre-filtering,
AND re-verify entitlement for high-sensitivity chunks at
query time before returning them.

Fast path for the bulk; authoritative check where it matters.
```

## 5. Why It Matters

- **Source systems define permissions at document level**, so this is the natural integration point.
- **Flattening complex models incorrectly is a silent authorization bypass.**
- **Permission staleness is structural** — content-based re-indexing cannot catch it.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Naive flattening** | Deny rules and inheritance lost; over-permissive |
| **Staleness** | Permissions change without content changing |
| **No permission sync trigger** | Content-hash re-indexing skips permission-only changes |
| **Missing ACL defaulting open** | Fail closed instead |
| **Group membership staleness** | The document's ACL is right; the caller's group list is stale |
| **Deleted documents** | Removed at source, still in the index and retrievable |

**Group membership is the second staleness surface** and it's easy to forget. Even with perfectly current document ACLs, a cached list of the caller's groups can be stale — someone left a team and still resolves as a member. Group membership should be resolved per request from the identity provider, or cached with a short TTL.

**On deletes:** a document removed at source must be removed from the index. Otherwise it remains retrievable by whoever had access, indefinitely. That's a reconciliation job, not something change feeds reliably deliver.

## 7. Interview Answer

> "Document-level permissions means authorization at the granularity of the source document, inherited by every chunk cut from it. It's the standard model because source systems define permissions that way, so the engineering task is faithfully translating their model into something filterable at query time.
>
> The trap is flattening. A SharePoint-style model has inheritance from a parent site, explicit grants, and explicit deny rules. If I naively union the grants into an access group list, the deny rules are lost — so a contractor who's denied explicitly but included via inheritance can now retrieve the document. Correct flattening has to compute *effective* permissions, resolving inheritance and denies, not just collect grants.
>
> The structural problem is staleness. Permissions change without content changing, so content-hash-based incremental re-indexing skips those documents entirely. A document whose access was tightened from all-staff to finance-team keeps its old permissive ACL in the index indefinitely. That needs its own sync trigger.
>
> There's a second staleness surface people forget: group membership. Even with perfectly current document ACLs, a cached list of the caller's groups can be stale — someone left a team and still resolves as a member. I'd resolve group membership per request from the identity provider, or cache with a short TTL.
>
> In practice I'd use a hybrid: snapshot the ACL at ingestion for fast pre-filtering across the bulk of the corpus, and re-verify entitlement at query time for high-sensitivity chunks before returning them. Fast path for most content, authoritative check where staleness would be an incident.
>
> And deletes need reconciliation — a document removed at source must be removed from the index, or it stays retrievable by whoever had access indefinitely."

## 8. Likely Follow-ups

**Q: How do you translate a complex source permission model?**
Compute effective permissions rather than unioning grants — resolve inheritance, apply deny rules, and flatten to the set of principals who genuinely have read access. Getting this wrong is an authorization bypass, not a bug, so I'd validate the flattening against the source system's own access-check API on a sample.

**Q: Why does permission staleness happen?**
Because permissions change independently of content, and incremental re-indexing keyed on content hash skips documents whose text hasn't changed. It's structural — a content-based pipeline cannot detect a permission-only change. It needs a separate poll or event subscription, or query-time resolution.

**Q: Snapshot or query-time resolution?**
Snapshot is fast and works for large corpora at moderate sensitivity, but it's stale between syncs and loses complex model semantics. Query-time resolution is always current and handles arbitrary complexity, at the cost of a lookup per request. I'd use a hybrid — snapshot for the bulk, query-time re-verification for high-sensitivity content.

**Q: What about group membership changes?**
A second staleness surface, and easy to overlook. Perfectly current document ACLs don't help if the caller's group list is cached and stale — someone who left a team still resolves as a member. Resolve group membership per request from the identity provider, or cache with a short TTL and accept a bounded window.

**Q: What happens when a document is deleted at source?**
It must be removed from the index, or it stays retrievable indefinitely by whoever had access. Change feeds miss deletions more often than updates, so this needs a scheduled reconciliation comparing indexed document IDs against the current source inventory — not just an event subscription.

## 9. Common Mistakes

- Unioning grants without resolving deny rules and inheritance.
- Assuming content-based re-indexing keeps permissions fresh.
- Caching group membership without a short TTL.
- Defaulting to open when ACL metadata is missing.
- Relying on change events alone for deletions.

## 10. What to Remember

- **Chunks inherit the source document's permissions.** Translating the model faithfully is the task.
- **Flatten to EFFECTIVE permissions** — naive grant-unioning loses deny rules.
- **Permission staleness is structural** — content-hash re-indexing cannot catch it.
- **Group membership is a second staleness surface.** Resolve per request or cache briefly.
- **Hybrid:** snapshot for speed, query-time re-verification for high-sensitivity content.
