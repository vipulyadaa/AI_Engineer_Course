# Authorization Before Retrieval

> **Phase 14 · RAG SECURITY · Topic 13**

## 1. Definition

Applying the caller's entitlements as a constraint on the vector search itself, so ineligible chunks are never scored or returned. It's the correct architecture for access-controlled RAG, on both security and quality grounds.

## 2. Simple Explanation

You tell the search engine "only consider documents this person can see," and it searches within that set.

The alternative — searching everything and discarding afterwards — means ineligible documents were retrieved, ranked, and held in memory before being dropped. That's a materially different security posture, and it also quietly breaks your results.

## 3. How It Works

```
request + identity
   │
   ▼
resolve entitlements → groups, tenant, clearance, assignments
   │
   ▼
build filter  ──────────┐
                        ▼
              vector search WITH filter
              (the index only considers matching chunks)
                        │
                        ▼
                 top-k eligible results
```

**Most vector databases support filtered search natively** — Vertex AI Vector Search, Pinecone, Weaviate, Qdrant, pgvector with a WHERE clause. It's a supported first-class operation, not something you have to work around.

**The two arguments, both decisive:**

```
SECURITY  ineligible chunks are never scored, never in process
          memory, never in a log line, never in an error trace.

QUALITY   you requested top-10 and you GET top-10 eligible results,
          rather than top-10 minus however many were stripped.
```

## 4. Practical Example

**Making it structural rather than a per-call discipline:**

```python
# ❌ Filter passed as a parameter — a new code path can omit it
def search(query, filters=None):
    return index.query(embed(query), filter=filters)

# ✅ Scoped client built from the authenticated request
class AuthorizedIndex:
    def __init__(self, caller):
        self._filter = {
            "acl_group": {"$in": caller.groups},
            "tenant_id": caller.tenant,
        }
    def query(self, text, k=10, extra_filter=None):
        f = {**self._filter, **(extra_filter or {})}
        return index.query(embed(text), filter=f, k=k)

# There is no code path that can search without the entitlement
# filter, because the only way to get a searcher is to construct
# one from an authenticated caller.
```

**That structural framing is the point.** The common failure isn't the main retrieval path — it's the "find similar documents" feature added six months later that queries by vector and forgets the filter. Making the filter impossible to omit removes that bug class.

**Handling filter selectivity:**

```
Very selective filters (one RM's 400 customers out of 5M records)
degrade HNSW traversal toward brute force.

Options:
  · metadata-first query, then rank among matches
  · partition the index by tenant/region so filters are less selective
  · benchmark at REAL selectivity rather than assuming it's free
```

## 5. Why It Matters

- **It's the correct architecture on both security and quality grounds**, which makes it an easy decision to defend.
- **The structural version removes a whole bug class** rather than relying on review discipline.
- **It's natively supported**, so there's no engineering argument for the alternative.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Highly selective filters slow ANN search** | Benchmark at real selectivity; consider partitioning |
| **Filter must be complete** | A missing dimension (tenant, clearance) is a gap |
| **Entitlement resolution latency** | A live authorization lookup per request adds time |
| **Stale entitlement snapshots** | Cached group membership can be out of date |
| **Filter passed as a parameter** | A new code path can omit it |

**On entitlement resolution:** you can snapshot the caller's groups at session start for speed, or resolve per request for freshness. In banking I'd resolve per request for high-sensitivity paths and cache with a short TTL elsewhere — the failure mode of a stale entitlement is a leak, not a slow response.

**On defense in depth:** even with pre-filtering, a cheap post-retrieval re-check that every returned chunk is one the caller is entitled to costs almost nothing and catches bugs in the filter construction itself. Pre-filter is the control; the re-check is the safety net.

## 7. Interview Answer

> "Authorization before retrieval means applying the caller's entitlements as a constraint on the vector search itself, so ineligible chunks are never scored or returned.
>
> There are two arguments and both are decisive. Security: ineligible chunks are never in process memory, never in a log line, never in an error trace — with post-filtering they were all three before being dropped. Quality: you requested top-ten and you get top-ten eligible results, rather than top-ten minus however many got stripped, which silently under-retrieves with no signal.
>
> Most vector databases support filtered search natively — Vertex AI Vector Search, Pinecone, Qdrant, pgvector with a WHERE clause — so there's no engineering argument for the alternative.
>
> The design detail I'd emphasize is making it structural rather than a per-call discipline. If the filter is a parameter, a new code path can omit it — and the classic failure isn't the main retrieval path, it's the 'find similar documents' feature added six months later that queries by vector and forgets it. Instead I'd construct a scoped searcher from the authenticated request, so there's no way to obtain a searcher without the entitlement filter baked in. That removes the bug class rather than relying on code review.
>
> Two operational notes. Very selective filters — one relationship manager's four hundred customers out of five million records — degrade HNSW traversal toward brute force, so I'd benchmark at real selectivity and consider partitioning the index. And entitlement resolution is a freshness-versus-latency choice: I'd resolve per request for high-sensitivity paths and cache with a short TTL elsewhere, because the failure mode of a stale entitlement is a leak, not a slow response.
>
> I'd also keep a cheap post-retrieval re-check as a safety net. Pre-filtering is the control; the re-check catches bugs in filter construction itself."

## 8. Likely Follow-ups

**Q: Why is pre-filtering better than post-filtering?**
Security and quality. Security: ineligible chunks are never scored or held in memory, so there's no path by which a log line or error trace exposes them. Quality: you get the number of eligible results you asked for, instead of that number minus however many were stripped, with no signal that anything is missing.

**Q: How do you make sure the filter is always applied?**
Construct a scoped searcher from the authenticated request rather than passing the filter as a parameter. If there's no way to obtain a searcher without entitlements baked in, there's no code path that can omit them. That converts a discipline problem into an impossibility.

**Q: What if the filter makes the search slow?**
Highly selective filters degrade ANN traversal because the graph structure doesn't help within a small arbitrary subset. Options: query metadata first and rank among matches, partition the index so filters are less selective within a partition, or accept the latency. The key is benchmarking at real selectivity rather than assuming filtered search is free.

**Q: Snapshot entitlements or resolve per request?**
Depends on sensitivity. Snapshotting at session start is faster but stale between refreshes. Resolving per request against an authorization service is always current at the cost of a lookup. For high-sensitivity paths I'd resolve per request, because the failure mode of a stale entitlement is a leak rather than a slow response.

**Q: Do you still need a post-retrieval check?**
As a safety net, yes. Pre-filtering is the control, but a cheap re-verification that every returned chunk is one the caller is entitled to catches bugs in the filter construction itself. It costs almost nothing, and in a context where a miss is a reportable incident, defense in depth is worth the few milliseconds.

## 9. Common Mistakes

- Passing the entitlement filter as an optional parameter.
- Post-filtering results instead of constraining the search.
- Not including every entitlement dimension — tenant, clearance, assignment.
- Assuming filtered ANN search performs the same as unfiltered.
- Caching entitlements without a short TTL on sensitive paths.

## 10. What to Remember

- **Constrain the search; never filter results afterwards.**
- **Two decisive arguments:** ineligible chunks never touched, and you get the k you asked for.
- **Make it structural** — a scoped searcher built from the authenticated request.
- **Benchmark at real filter selectivity**; very selective filters degrade ANN.
- **Keep a cheap post-retrieval re-check** as defense in depth.
