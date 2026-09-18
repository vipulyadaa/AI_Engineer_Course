# Retrieval Filtering

> **Phase 11 · RAG RETRIEVAL · Topic 10**

## 1. Definition

Constraining which chunks are eligible for retrieval using structured metadata — access group, date, document type, product, language. It's how access control, freshness, and scoping are enforced.

## 2. Simple Explanation

Not every chunk should be a candidate for every query.

A user shouldn't retrieve documents they're not cleared for. A question about current policy shouldn't retrieve last year's superseded version. A credit card query shouldn't compete against mortgage documents.

Filtering decides what's *eligible*; ranking then orders what's eligible.

## 3. How It Works

```
query + caller identity
   │
   ▼
build filter:
   acl_group  IN caller.groups
   AND effective_date <= today
   AND (expiry_date IS NULL OR expiry_date > today)
   AND product = "credit_card"            (if confidently extractable)
   │
   ▼
vector search CONSTRAINED to matching chunks
   │
   ▼
top-k from the eligible set
```

**Pre-filter vs. post-filter — the critical distinction:**

| | Pre-filter | Post-filter |
|---|---|---|
| Order | Filter, then search the subset | Search all, then discard |
| Result count | Returns k eligible results | Asked for 10, may return 3 |
| Security | Ineligible chunks never scored | Ineligible chunks were retrieved first |
| Verdict | **Required for access control** | Unacceptable for ACL |

## 4. Practical Example

**Why post-filtering is both a security and a quality bug:**

```
Post-filter:
  1. Search all 500,000 chunks → top 10 by similarity
  2. Strip the 6 the user isn't cleared for
  3. Model receives 4 chunks

  Security:  6 chunks the user can't see were retrieved, scored,
             and held in memory. Any logging or error path leaks them.
  Quality:   You asked for 10 and got 4, with NO signal that
             anything is missing. Answers are incomplete for
             reasons nobody can see.

Pre-filter:
  1. Search only the ~180,000 chunks the user is cleared for
  2. Model receives 10 eligible chunks
```

**Date filtering fixes a specific common bug:**

```
Without:  "what's the international wire fee?"
          Retrieves both the 2025 schedule ($40) and 2026 ($45).
          The model picks whichever ranked higher — arbitrary.
          Confidently wrong roughly half the time.

With:     Only the currently effective version is eligible.
          Deterministic.
```

**Filter extraction must be soft:**

```python
filters = {"acl_group": caller.groups, "effective_date": {"lte": today}}
if extracted_product and extraction_confidence > 0.8:
    filters["product"] = extracted_product

results = search(query, filters)
if len(results) < 2 and "product" in filters:
    del filters["product"]                # over-filtered — retry
    results = search(query, filters)
```

## 5. Why It Matters

- **It's the enforcement point for access control**, usually a launch requirement in banking.
- **It fixes stale-document conflicts** that otherwise produce arbitrary answers.
- **It improves ranking as a side effect** — a smaller, more relevant candidate set ranks better.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Post-filtering for ACL** | Leaks, and silently under-retrieves |
| **Over-filtering from extraction** | An inferred constraint excludes the correct answer, silently |
| **Highly selective filters slow ANN search** | The graph structure doesn't help within a tiny arbitrary subset |
| **Stale ACL metadata** | Source permissions changed but the index wasn't updated |
| **No fallback on empty results** | Returns "no information" when a filter was too narrow |
| **Mandatory extracted filters** | Treat them as hints, not requirements |

**On ACL freshness:** permissions change independently of content. A document's ACL can change without its text changing, so content-hash-based incremental re-indexing skips it entirely. Permission syncs need their own trigger — either polling the source system's permission state on a schedule, or resolving permissions at query time against a live authorization service.

**On ANN performance:** HNSW navigates a graph built over all vectors. If a filter admits only 0.1% of them, traversal keeps hitting ineligible nodes and degrades toward brute force. Some vector databases switch strategies based on filter selectivity; some don't. Benchmark at your actual selectivity.

## 7. Interview Answer

> "Retrieval filtering constrains which chunks are eligible using structured metadata — access group, effective date, document type, product.
>
> The most important distinction is pre-filter versus post-filter. Pre-filtering constrains the search so only eligible chunks are ever scored. Post-filtering searches everything and discards afterwards, which is unacceptable for access control on two grounds. Security: six chunks the user can't see were retrieved, scored, and held in memory, so any logging or error path leaks them. And quality: you asked for ten results, six were stripped, and the model got four with no signal that anything was missing — answers are incomplete for reasons nobody can see.
>
> The other filter I'd always apply is effective date. Without it, a fee query retrieves both the 2025 and 2026 schedules and the model picks whichever ranked higher, which is arbitrary — so it's confidently wrong about half the time.
>
> For filters extracted from the query, I'd treat them as hints rather than requirements. If an inferred product constraint yields almost no results, retry without it and log that it happened. Over-filtering fails silently as 'I don't have information about that,' which looks identical to a genuine coverage gap.
>
> Two operational notes. Highly selective filters can degrade ANN performance, because the graph structure doesn't help within a tiny arbitrary subset — worth benchmarking at real selectivity. And ACL metadata goes stale independently of content, so content-hash-based re-indexing skips permission changes entirely. That needs its own sync trigger."

## 8. Likely Follow-ups

**Q: Why must ACL filtering happen before retrieval?**
Two reasons. Security: post-filtering means documents the user can't see were retrieved, scored, and held in memory before being dropped, so any bug or log statement in that path leaks them. Quality: post-filtering silently under-retrieves, because top-k was computed over an ineligible population.

**Q: How do you extract filters from a natural-language query?**
A small classifier or an LLM with a structured output schema — that's self-query retrieval. The risk is over-filtering, so I'd make extracted filters optional, validate them against an enumerated schema, and fall back to unfiltered retrieval when the filtered result set is empty or very small.

**Q: How does filtering affect ANN performance?**
A highly selective filter can degrade it substantially. HNSW traverses a graph built over all vectors, so when few are eligible, traversal repeatedly hits ineligible nodes and degrades toward brute force over the subset. Some vector databases detect this and switch strategies. I'd benchmark at the selectivity my real filters produce rather than assuming it's free.

**Q: How do you keep ACL metadata fresh?**
With its own sync separate from content ingestion, because permissions change without content changing and a content-hash pipeline will skip those documents. Either poll the source system's permission state on a schedule, or subscribe to permission-change events. An alternative is resolving permissions at query time against a live authorization service — fresher, at the cost of a lookup per request.

**Q: What metadata should you filter on?**
ACL group for security, effective and expiry dates for freshness, document type and product for scoping, and language for multilingual corpora. All attached at ingestion, since none of it is reconstructable later. Source URI with an anchor isn't a filter but belongs in the same metadata for citation.

## 9. Common Mistakes

- Post-filtering for access control.
- Not filtering by effective date, so superseded documents compete.
- Making extracted filters mandatory, so a bad extraction eliminates the answer.
- Assuming ACL metadata stays fresh through content-based re-indexing.
- Not benchmarking ANN performance at realistic filter selectivity.

## 10. What to Remember

- **Filter decides eligibility; ranking orders what's eligible.**
- **Pre-filter, never post-filter** — post-filtering leaks and silently under-retrieves.
- **Always filter by effective date** or superseded versions compete with current ones.
- **Extracted filters are hints** — retry unfiltered on empty results, and log it.
- **ACL freshness needs its own sync.** Permissions change without content changing.
