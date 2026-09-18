# Metadata Filtering

> **Phase 09 · ADVANCED RAG · Topic 11**

## 1. Definition

Restricting the retrieval candidate set by structured attributes — access group, date, document type, product, language — before or during the vector search. It's how access control, freshness, and scoping are enforced in RAG.

## 2. Simple Explanation

Not every chunk should be a candidate for every query.

A user shouldn't retrieve documents they're not cleared for. A question about current policy shouldn't retrieve last year's superseded version. A query about credit cards shouldn't compete against mortgage documents.

Filtering narrows the search to chunks that are *eligible*, then ranks within them.

## 3. How It Works

```
query + user context
   │
   ▼
build filter:  acl_group IN user.groups
           AND effective_date <= today
           AND (expiry_date IS NULL OR expiry_date > today)
           AND product = "credit_card"          (if extractable)
   │
   ▼
vector search CONSTRAINED to matching chunks
   │
   ▼
top-k from the eligible set
```

**Pre-filter vs. post-filter — this is the critical distinction:**

| | Pre-filter | Post-filter |
|---|---|---|
| **Order** | Filter, then search within the subset | Search everything, then discard |
| **Correctness** | Returns k eligible results | Asked for 10, may return 3 |
| **Security** | Ineligible chunks never scored | Ineligible chunks were retrieved, then dropped |
| **Verdict** | **Required for access control** | Unacceptable for ACL |

**Post-filtering silently under-retrieves.** You request top-10, six are filtered out, the model gets four — with no signal that anything is missing. That's a quality bug as well as a security one.

## 4. Practical Example

**The metadata schema that makes this possible:**

```json
{
  "chunk_id":       "policy-fees-2026#3.2:0",
  "acl_group":      ["retail-public", "staff"],
  "effective_date": "2026-01-01",
  "expiry_date":    null,
  "product":        "international_transfers",
  "doc_type":       "policy",
  "language":       "en",
  "source_uri":     "https://.../fees.pdf#page=14"
}
```

All of it attached at ingestion. None of it reconstructable later.

**Filtering on effective date is the fix for a specific, common bug:**

```
Without date filtering:
  Query: "what's the international wire fee?"
  Retrieves BOTH the 2025 schedule ($40) and the 2026 schedule ($45).
  The model picks one — often the one that ranked higher, which is
  arbitrary. Confidently wrong 50% of the time.

With date filtering:
  Only the currently effective version is a candidate.
  Deterministic and correct.
```

## 5. Why It Matters

- **It's the enforcement point for access control**, which is usually a launch requirement in banking.
- **It's the fix for stale-document conflicts**, which otherwise produce confidently wrong answers.
- **It improves retrieval quality as a side effect** — a smaller, more relevant candidate set ranks better.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Post-filtering for ACL** | Leaks, and silently under-retrieves |
| **Over-filtering** | An extracted filter that's too narrow eliminates the correct answer |
| **Filter extraction errors** | Inferring `product = "mortgage"` from an ambiguous query excludes the right documents |
| **Highly selective filters slow ANN search** | The graph structure doesn't help within an arbitrary tiny subset |
| **Stale ACL metadata** | Source permissions changed but the index wasn't updated |
| **No fallback when the filter yields nothing** | Empty result set with no graceful handling |

**The selectivity performance problem is real and worth knowing:** HNSW navigates a graph built over all vectors. If a filter admits only 0.1% of them, traversal keeps hitting ineligible nodes and search degrades toward brute force over the subset. Some vector databases handle this by switching strategies based on filter selectivity; some don't. It's worth testing at your actual selectivity.

**On ACL freshness:** permissions change independently of content. A document's ACL can change without its text changing, so content-hash-based incremental re-indexing will skip it. Permission syncs need their own trigger.

## 7. Interview Answer

> "Metadata filtering restricts the retrieval candidate set by structured attributes — access group, effective date, document type, product — before the vector search.
>
> The most important distinction is pre-filter versus post-filter. Pre-filtering constrains the search so only eligible chunks are ever scored. Post-filtering searches everything and discards afterwards. For access control it has to be pre-filtering, because post-filtering means ineligible documents were retrieved and ranked before being dropped, which is a real incident. It's also a quality bug — you asked for ten results, six get filtered out, and the model gets four with no signal that anything is missing.
>
> The other filter I'd always apply is effective date. Without it, a query about wire fees retrieves both the 2025 and 2026 fee schedules, and the model picks whichever ranked higher — which is arbitrary, so it's confidently wrong about half the time. Date filtering makes that deterministic.
>
> All of this depends on metadata captured at ingestion — ACL group, effective date, product, source URI. None of it is reconstructable later, so it has to be designed in from the start.
>
> Two operational things I'd watch. Highly selective filters can degrade ANN search performance, because the graph structure doesn't help within a tiny arbitrary subset — worth testing at your real selectivity. And ACL metadata goes stale independently of content: a document's permissions can change without its text changing, so content-hash-based incremental re-indexing skips it. Permission syncs need their own trigger."

## 8. Likely Follow-ups

**Q: Why must access-control filtering happen before retrieval?**
Two reasons. Security: post-filtering means documents the user can't see were retrieved, scored, and held in memory before being dropped — any bug or log statement in that path leaks. And quality: post-filtering silently under-retrieves, because the top-k was computed over an ineligible population, so you end up with fewer results than requested and no indication.

**Q: How do you extract filters from a natural-language query?**
Either a small classifier or an LLM with a structured output schema mapping the query to filter fields — that's essentially self-query retrieval. The risk is over-filtering: inferring a product constraint from an ambiguous query excludes the correct answer. I'd make extracted filters optional rather than mandatory, or fall back to unfiltered retrieval when the filtered set is too small.

**Q: What metadata should you store?**
ACL group for security, effective and expiry dates for freshness, source URI with an anchor for citation, document type and product for scoping, language for multilingual corpora, and a content hash for incremental re-indexing. It's all cheap to attach at ingestion and painful to backfill.

**Q: How does filtering affect ANN performance?**
A highly selective filter can degrade it significantly. HNSW traverses a graph built over all vectors, so when only a tiny fraction are eligible, traversal repeatedly hits ineligible nodes and degrades toward brute force. Some vector databases detect this and switch to a different strategy; others don't. I'd benchmark at the selectivity my real filters produce rather than assuming it's free.

**Q: How do you keep ACL metadata fresh?**
With its own sync, separate from content ingestion. Permissions change without content changing, so a content-hash-based pipeline will skip those documents entirely. I'd either poll the source system's permission state on a schedule, or subscribe to permission-change events where available. An alternative architecture is resolving permissions at query time against a live authorization service rather than storing them in the index, which is fresher but adds a lookup.

## 9. Common Mistakes

- Post-filtering for access control.
- Not filtering by effective date, so superseded documents compete with current ones.
- Making extracted filters mandatory, so a bad extraction eliminates the answer.
- Assuming ACL metadata stays fresh through content-based re-indexing.
- Not benchmarking ANN performance at realistic filter selectivity.

## 10. What to Remember

- **Constrain the candidate set by structured attributes** before ranking.
- **Pre-filter, never post-filter** — post-filtering leaks and silently under-retrieves.
- **Always filter by effective date**, or superseded documents produce arbitrary answers.
- **Metadata is captured at ingestion** or not at all.
- **ACL freshness needs its own sync** — permissions change without content changing.
