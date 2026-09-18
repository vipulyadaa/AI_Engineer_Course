# Metadata Filtering

> **Phase 07 · VECTOR DATABASES · Topic 10**

## 1. Definition

Restricting a vector search to chunks matching structured conditions — tenant, permissions, document type, effective date. Whether the filter is applied *during* the search or *after* it is the property that matters.

## 2. Simple Explanation

Semantic similarity alone can't express "only documents this user is allowed to see" or "only the currently effective policy version." Those are structured constraints, and they need a structured filter alongside the vector search.

The engineering question is where the filter runs.

## 3. How It Works

**Three strategies:**

| Strategy | Mechanism | Problem |
|---|---|---|
| **Post-filter** | ANN for top-k, then discard non-matching | Leaks; returns fewer than k |
| **Pre-filter** | Restrict the candidate set, then search | Can strand a graph walk |
| **Filtered search** | Check eligibility *during* traversal | The correct approach |

```
POST-FILTER, why it fails:

  search top-10 → 10 chunks
  filter by ACL → 2 survive

  The user asked for 10 results and got 2 — and the 8 other
  documents they WERE allowed to see were never considered,
  because top-10 was computed over the whole corpus.

  It under-retrieves AND it means ineligible content was
  retrieved and scored before being discarded.
```

**What production engines do:** push the filter into the index traversal, so ineligible vectors are never candidates and top-k is computed over the eligible population. Vertex AI Vector Search, Qdrant, Weaviate, and pgvector (via SQL predicates with the index) all support this.

## 4. Practical Example

**The metadata schema that makes filtering work:**

```python
{
  "chunk_id":       "policy-wire-2024-c07",
  "doc_id":         "policy-wire-2024",
  "tenant_id":      "retail-uk",          # isolation
  "acl_groups":     ["all-staff", "ops"], # authorization
  "doc_type":       "policy",             # scoping
  "effective_from": "2024-01-01",         # temporal
  "effective_to":   None,                 # None = current
  "language":       "en",
  "source_uri":     "gs://.../wire.pdf#p12",  # citation
  "embedding_model":"text-embedding-005",     # migration
  "embedded_hash":  "a3f9...",                # incremental re-embed
}
```

**Three filters that should be on essentially every query:**

```
1. tenant_id       — isolation; a bug here is a data breach
2. acl_groups      — authorization; likewise
3. effective_date  — currency; superseded policies must not
                     be retrievable as if current

The third is the one teams forget, and it's the cause of the
"confidently cites the 2022 fee schedule" failure.
```

**The recall trap:**

```
Filter matching 40% of the corpus     → recall roughly holds
Filter matching  1% of the corpus     → recall degrades
Filter matching 0.1% of the corpus    → recall can collapse

A graph walk through a corpus where 99.9% of nodes are
ineligible gets stranded — it runs out of eligible neighbours
and terminates early.

Mitigations:
  · exact scan when the filtered set is small (best)
  · separate indexes per tenant (namespaces)
  · raise ef_search / nprobe under restrictive filters
```

## 5. Why It Matters

- **Filter placement is an access-control property**, so it's a hard requirement on the store.
- **Effective-date filtering** is what stops the system citing superseded policy as current.
- **Restrictive filters degrade ANN recall**, which is the non-obvious interaction.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Post-filtering** | Leaks, and returns fewer than k |
| **Restrictive filters collapsing recall** | Graph walk strands |
| **Stale ACLs in metadata** | Permissions change without content changing |
| **No effective-date filter** | Superseded documents cited as current |
| **Over-filtering** | Legitimate results excluded; looks like a retrieval bug |
| **Unindexed filter fields** | Filtering itself becomes the bottleneck |

**On stale ACLs — the subtle one:** permissions in chunk metadata are a snapshot from ingestion time. If someone leaves a team, their access changes but no document content changed, so content-hash-based re-indexing never touches those chunks. Either run a dedicated permission sync, or resolve authorization at query time against a live service and use metadata only to narrow. In a bank I'd argue for the latter for anything sensitive.

**On evaluating under filters:** every recall number should be measured with realistic filters applied. An unfiltered benchmark on a permissioned system measures a configuration that never runs in production.

## 7. Interview Answer

> "Metadata filtering restricts a vector search to chunks matching structured conditions — tenant, permissions, document type, effective date. The thing that matters is where the filter runs.
>
> Post-filtering — retrieve top-k then discard — fails two ways. It leaks, because ineligible content was retrieved and scored before being thrown away. And it under-retrieves: if the user asked for ten results and eight get filtered out, they get two, and the eight other documents they *were* allowed to see were never considered, because top-k was computed over the whole corpus. So filtered search, where eligibility is checked during index traversal, is a hard requirement rather than an optimization.
>
> Three filters belong on essentially every query. Tenant ID for isolation and ACL groups for authorization — a bug in either is a data breach. And effective date, which is the one teams forget and the cause of the system confidently citing a superseded fee schedule as if it were current.
>
> The non-obvious interaction is that restrictive filters degrade ANN recall. A graph walk through a corpus where ninety-nine point nine percent of nodes are ineligible gets stranded — it runs out of eligible neighbours and terminates early. So a filter matching forty percent is fine, and one matching a tenth of a percent can collapse recall. The mitigations are falling back to an exact scan when the filtered set is small, using per-tenant namespaces so the filter is structural rather than a predicate, or raising ef_search under restrictive filters. And it means any recall number should be measured *with* realistic filters — an unfiltered benchmark on a permissioned system measures a configuration that never actually runs.
>
> The subtle failure I'd flag is stale ACLs. Permissions in chunk metadata are a snapshot from ingestion. When someone leaves a team their access changes but no document content changed, so content-hash-based re-indexing never touches those chunks and they keep the old permissions. Either run a dedicated permission sync, or resolve authorization at query time against a live service and use metadata only to narrow. For anything sensitive in a bank I'd argue for the second."

## 8. Likely Follow-ups

**Q: Why is post-filtering wrong?**
It leaks — ineligible documents were retrieved and scored before being discarded — and it under-retrieves, because top-k was computed over the full corpus, so filtering leaves fewer than k results while eligible documents further down were never considered. Filtering during traversal fixes both.

**Q: What metadata do you index?**
Tenant ID, ACL groups, document type, effective-from and effective-to dates, language, source URI for citation, the embedding model version for migrations, and a content hash for incremental re-embedding. Tenant, ACL, and effective date are the three that should be on essentially every query.

**Q: How do filters affect recall?**
Restrictive ones degrade it sharply. A graph index walks through nodes, so when most are ineligible the walk strands and terminates early — a filter matching a tenth of a percent can collapse recall. Falling back to exact scan on small filtered sets, using namespaces, or raising ef_search are the mitigations.

**Q: What's the problem with permissions in metadata?**
They're a snapshot from ingestion. Permission changes don't change document content, so content-hash-based incremental re-indexing skips those chunks entirely and stale ACLs persist. You need a separate permission sync, or query-time authorization against a live service with metadata used only to narrow.

**Q: Should you benchmark retrieval with or without filters?**
With, using realistic ones. In a permissioned system every production query carries a filter, so an unfiltered recall number describes a configuration that never runs. The gap between the two is often large enough to change which index you'd choose.

## 9. Common Mistakes

- Filtering in application code after retrieval.
- Omitting an effective-date filter, so superseded documents are cited as current.
- Assuming unfiltered recall holds under production filters.
- Trusting ingestion-time ACLs to stay current.
- Not indexing the fields being filtered on.

## 10. What to Remember

- **Filter during traversal.** Post-filtering leaks and under-retrieves.
- **Tenant, ACL, effective date** — on essentially every query.
- **Restrictive filters can collapse ANN recall** — measure under realistic filters.
- **Metadata ACLs go stale** because permissions change without content changing.
- **Index the filter fields**, or filtering becomes the bottleneck.
