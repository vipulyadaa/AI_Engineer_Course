# Access-Controlled RAG

> **Phase 14 · RAG SECURITY · Topic 01**

## 1. Definition

A RAG architecture where retrieval is constrained by the caller's identity and entitlements, so a user can only ever retrieve content they're authorized to see. In regulated domains it's a launch requirement, not a feature.

## 2. Simple Explanation

The vector index doesn't know who's asking. By default, any query can retrieve any chunk.

Access-controlled RAG makes authorization part of the retrieval query itself — the search only ever considers documents this caller is entitled to. Anything else is a data-leakage design.

## 3. How It Works

```
request + caller identity
   │
   ▼
resolve entitlements  (groups, roles, tenant, clearance)
   │
   ▼
build a pre-filter:  acl_group IN caller.groups
                     AND tenant_id = caller.tenant
   │
   ▼
vector search CONSTRAINED to eligible chunks    ← authorization happens HERE
   │
   ▼
rerank → prompt → generate → answer + citations
```

**The architectural principle: authorize before retrieval, not after.** Filtering results after the search means ineligible documents were retrieved, scored, and held in memory — and it silently under-retrieves, because top-k was computed over a population the user can't see.

**The metadata this requires, captured at ingestion:**

```json
{
  "acl_group":  ["retail-public", "staff"],
  "tenant_id":  "bank-eu-01",
  "sensitivity":"internal",
  "source_system": "policy_management"
}
```

## 4. Practical Example

**Why post-filtering fails on two counts:**

```
Post-filter:
  1. Search all 500,000 chunks → top 10
  2. Strip the 6 the caller isn't cleared for
  3. Model gets 4 chunks

  SECURITY: 6 ineligible chunks were retrieved, scored, and held.
            Any log line, error trace, or debugging output leaks them.
  QUALITY:  Asked for 10, got 4, with no signal anything is missing.
            Answers are incomplete for reasons nobody can see.

Pre-filter:
  1. Search only the ~180,000 chunks the caller is cleared for
  2. Model gets 10 eligible chunks
```

**The failure that's easy to miss — citations and metadata leak too:**

```
Even if a chunk's TEXT is filtered, leaking its existence is a
disclosure. "I found 3 documents about the Project Titan merger
but you're not authorized to view them" confirms the project exists.

Abstention messages must not reveal what was filtered.
```

**Fail closed:**

```python
acl = chunk.metadata.get("acl_group")
if not acl:
    # A chunk with no access group is UNRETRIEVABLE, not public.
    # This default is the difference between a bug and an incident.
    raise IngestionError(f"{chunk.id}: missing acl_group")
```

## 5. Why It Matters

- **It's a launch blocker in banking**, not an enhancement — and it's architecturally impossible with fine-tuning.
- **The pre-filter/post-filter choice is both a security and a quality decision.**
- **It's the clearest argument for RAG over fine-tuning**: once a fact is in the weights, every user gets it.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Post-filtering** | Leaks and silently under-retrieves |
| **Missing ACL defaulting open** | Fail closed instead |
| **Stale ACL** | Permissions change without content changing; content-hash re-indexing skips them |
| **Leaky abstention messages** | Revealing that filtered documents exist |
| **Highly selective filters slow ANN search** | Benchmark at real selectivity |
| **Complex permission models** | Source ACLs are often richer than one group tag |

**On permission model complexity:** real source systems have inheritance, deny rules, and role hierarchies that don't map cleanly to a single group tag. Two approaches: flatten to an effective-groups list at ingestion (fast, needs re-sync on change), or resolve at query time against a live authorization service (always fresh, adds a lookup). In banking I'd lean toward query-time resolution for high-sensitivity content, because staleness there is an incident.

## 7. Interview Answer

> "Access-controlled RAG means retrieval is constrained by the caller's entitlements, so a user can only ever retrieve content they're authorized to see. In banking that's a launch requirement.
>
> The core architectural decision is authorizing *before* retrieval rather than after. Pre-filtering constrains the search so only eligible chunks are ever scored. Post-filtering searches everything and discards, which fails on two counts. Security: ineligible documents were retrieved, scored, and held in memory, so any log line or error trace leaks them. And quality: you asked for ten results, six were stripped, the model got four with no signal anything was missing — so answers are incomplete for reasons nobody can see.
>
> This also happens to be the strongest argument for RAG over fine-tuning. Access control is architecturally impossible once a fact is in the weights — every user gets it. With retrieval you filter the candidate set before the model sees anything.
>
> Two design choices I'd insist on. Fail closed: a chunk with a missing access group should be unretrievable, not public. That default is the difference between a bug and an incident. And abstention messages must not reveal what was filtered — saying 'I found three documents you're not authorized to view' confirms those documents exist, which is itself a disclosure.
>
> The hard part operationally is permission freshness. ACLs change without content changing, so content-hash-based incremental re-indexing skips those documents entirely. For high-sensitivity content I'd resolve permissions at query time against a live authorization service rather than storing them in the index, accepting the extra lookup — because a stale permission in banking is an incident, not a quality issue."

## 8. Likely Follow-ups

**Q: Why must filtering happen before retrieval?**
Security and quality. Security: post-filtering means ineligible documents were retrieved, scored, and held in process memory, so any logging or error path leaks them. Quality: post-filtering silently reduces effective k, because top-k was computed over a population including documents that get stripped.

**Q: How do you handle permission changes?**
They need their own sync trigger, because permissions change independently of content and content-hash-based re-indexing skips those documents by design. Either poll the source system's permission state on a schedule, subscribe to permission-change events, or resolve entitlements at query time against a live authorization service. The last is freshest and I'd use it for high-sensitivity content.

**Q: What if the source permission model is complex?**
Two options. Flatten to an effective-groups list at ingestion — fast at query time, but it needs re-syncing whenever permissions change and it can lose deny-rule semantics. Or resolve at query time against the authorization service, which handles arbitrary complexity and stays fresh at the cost of a lookup per request. The choice depends on sensitivity and latency budget.

**Q: Can abstention messages leak information?**
Yes, and it's easy to miss. "I found three documents about that but you're not authorized" confirms those documents exist, which may itself be the sensitive fact. Abstention should be indistinguishable between "nothing exists" and "nothing you can see" — the message must not reveal which case it was.

**Q: How does filtering affect retrieval performance?**
A highly selective filter can degrade ANN search, because the graph structure doesn't help within a small arbitrary subset and traversal degrades toward brute force. Some vector databases detect this and switch strategies. I'd benchmark at the selectivity my real filters produce rather than assuming filtered search is free.

## 9. Common Mistakes

- Post-filtering results instead of pre-filtering the search.
- Defaulting to open when ACL metadata is missing.
- Assuming content-based re-indexing keeps permissions fresh.
- Abstention messages that reveal filtered documents exist.
- Not benchmarking ANN performance at realistic filter selectivity.

## 10. What to Remember

- **Authorize before retrieval**, as a constraint on the candidate set. Never post-filter.
- **Post-filtering leaks AND silently under-retrieves.**
- **Fail closed** — missing ACL means unretrievable, not public.
- **Abstention must not reveal what was filtered.**
- **Permission freshness needs its own trigger**; query-time resolution for high sensitivity.
