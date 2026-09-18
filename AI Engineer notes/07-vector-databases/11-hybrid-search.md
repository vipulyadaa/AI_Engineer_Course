# Hybrid Search (in the Vector Store)

> **Phase 07 · VECTOR DATABASES · Topic 11**

## 1. Definition

Running lexical (BM25) and dense vector retrieval together and fusing the results. This topic covers the *storage-layer* question: whether one system serves both, and how fusion is implemented.

> The retrieval strategy itself is covered in [11-rag-retrieval/07-hybrid-search.md](../11-rag-retrieval/07-hybrid-search.md). Here the focus is the infrastructure.

## 2. Simple Explanation

Dense retrieval finds semantically similar text but misses exact identifiers. Lexical retrieval nails exact matches but misses paraphrases. Running both and fusing gives you the union of their strengths.

The infrastructure question is whether your vector store does the lexical half natively, or whether you operate a second search system.

## 3. How It Works

```
query ──┬── BM25 / sparse  ──→ ranked list A
        └── dense vector    ──→ ranked list B
                     │
                  FUSION (RRF)
                     │
                  top-k → rerank → context
```

**Reciprocal Rank Fusion:**

```
RRF_score(d) = Σ  1 / (k + rank_i(d))       k = 60 conventionally

Uses RANKS, not scores. That's the point: BM25 scores are
unbounded and corpus-dependent; cosine scores sit in [-1, 1].
They can't be compared or normalized reliably, so fusing on
rank sidesteps the problem entirely.
```

**Three implementation options:**

| Option | Detail |
|---|---|
| **Native hybrid** | Weaviate, Qdrant, Elasticsearch — one query, one system |
| **pgvector + Postgres FTS** | `tsvector` + `ts_rank` alongside vectors, same transaction |
| **Two systems + app-side RRF** | Vertex AI Vector Search + a lexical service |

## 4. Practical Example

**App-side fusion is ~20 lines, which matters for the build/buy call:**

```python
def rrf(lists: list[list[str]], k: int = 60, top: int = 20):
    scores = defaultdict(float)
    for ranked in lists:
        for rank, doc_id in enumerate(ranked, start=1):
            scores[doc_id] += 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)[:top]

dense  = vector_index.search(embed(q), top_k=50, filter=f)
sparse = lexical_index.search(q,       top_k=50, filter=f)
fused  = rrf([[h.id for h in dense], [h.id for h in sparse]])
```

**So "native hybrid support" is a convenience, not a capability gate** — a real consideration when a native-hybrid store would otherwise be chosen over a better-fitting one.

**Where the sparse half earns its keep, concretely:**

```
Query: "what is the fee under clause 7.3(b)"

  Dense:  retrieves fee-related chunks, may miss 7.3(b) entirely
          — "7.3(b)" carries almost no semantic signal
  Sparse: matches the literal token, ranks it first

Same for: account numbers, SWIFT codes, product names,
error codes, form IDs, regulatory references.

In banking these are a large share of real queries, which is
why I'd treat hybrid as the default rather than an enhancement.
```

**The operational cost of two systems:** two indexes to keep in sync, two sets of filters to keep consistent, and two failure modes. If a document is deleted from one and not the other, results become inconsistent in a way that's hard to notice. A single system that does both — or Postgres doing both in one transaction — removes that class of bug entirely.

## 5. Why It Matters

- **Hybrid reliably beats either half alone** on mixed query workloads.
- **RRF fuses on rank**, which is what makes incomparable score scales a non-issue.
- **Fusion is trivial to implement**, so native support shouldn't drive store selection.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Two systems to sync** | Deletes and updates can diverge silently |
| **Inconsistent filters across systems** | An ACL applied to one index only — a leak |
| **Normalizing scores instead of RRF** | Fragile; BM25 scale is corpus-dependent |
| **Latency = max of both** | Plus fusion; run them concurrently |
| **Weighting tuned by feel** | Should be measured on a golden set |

**On the filter-consistency risk:** this is the one that's genuinely dangerous. If the ACL filter is applied to the dense index and omitted from the lexical one, hybrid search becomes a bypass for the entire authorization model. Any two-system design needs the filter construction shared in one place, and a test that proves both halves honour it.

**On weighting:** RRF can be weighted per source. The honest position is that you can't know the right weights without measuring — build a golden set with a realistic mix of semantic and exact-match queries, sweep the weighting, and pick empirically. Unweighted RRF is a reasonable default and better than a guessed weight.

## 7. Interview Answer

> "Hybrid search runs lexical and dense retrieval together and fuses the results. Dense finds paraphrases and semantic matches; lexical nails exact identifiers. The fusion is almost always reciprocal rank fusion — sum one over sixty plus rank across the lists.
>
> The reason RRF uses ranks rather than scores is important. BM25 scores are unbounded and corpus-dependent; cosine scores sit between minus one and one. They can't be compared or normalized reliably, so fusing on rank sidesteps the problem entirely. That's why score normalization approaches tend to be fragile and RRF is the standard.
>
> On infrastructure, there are three options: a store with native hybrid like Weaviate or Elasticsearch; Postgres with pgvector plus full-text search in one transaction; or two systems with fusion in the application. And I'd point out that app-side RRF is about twenty lines of code — so native hybrid support is a convenience, not a capability gate. It shouldn't be the reason to pick a store that fits worse otherwise.
>
> For banking specifically I'd treat hybrid as the default rather than an enhancement, because a large share of real queries contain exact identifiers — clause references like 7.3(b), SWIFT codes, product names, error codes, form IDs. A string like '7.3(b)' carries almost no semantic signal, so dense retrieval can miss it entirely while BM25 ranks it first.
>
> The risk in a two-system design that I'd guard hardest is filter consistency. If the ACL filter is applied to the dense index and omitted from the lexical one, hybrid search becomes a bypass for the whole authorization model. So the filter construction has to live in one shared place with a test proving both halves honour it — and that's a real argument for Postgres doing both in a single transaction, since it removes the sync and consistency problem outright.
>
> On weighting, RRF can weight sources, but you can't know the right weights without measuring. I'd build a golden set with a realistic mix of semantic and exact-match queries and sweep it. Unweighted is a sensible default and better than a guess."

## 8. Likely Follow-ups

**Q: Why fuse on rank rather than score?**
Because BM25 scores are unbounded and corpus-dependent while cosine scores sit in a fixed range — they're not comparable and normalization between them is fragile. RRF uses only rank position, so the score scales never have to be reconciled. That robustness is why it's the default despite being very simple.

**Q: Do you need a store with native hybrid support?**
No. App-side RRF over two result lists is about twenty lines of code, so native support is convenience rather than capability. I wouldn't let it drive store selection over things that actually matter, like filtered-search behaviour, residency, or operational fit.

**Q: What's the risk of running two systems?**
Divergence. Deletes or updates applied to one index and not the other produce silently inconsistent results. More seriously, if an ACL filter is applied to the dense index but omitted from the lexical one, hybrid search bypasses authorization entirely. Shared filter construction plus a test covering both halves is the mitigation.

**Q: When does the sparse half matter most?**
Exact identifiers — clause references, account and SWIFT codes, product names, error codes, form IDs. Those carry almost no semantic signal, so dense retrieval can miss them completely while BM25 ranks them first. In banking that's a large enough share of queries to make hybrid the default.

**Q: How do you weight the two sources?**
By measuring. Build a golden set with a realistic mix of semantic and exact-match queries, sweep the weights, and pick empirically. Unweighted RRF is a reasonable starting default; a weight chosen by intuition is worse than no weight at all.

## 9. Common Mistakes

- Normalizing and adding raw scores instead of using RRF.
- Applying filters to one index and not the other.
- Choosing a vector store primarily for native hybrid support.
- Running the two retrievals sequentially instead of concurrently.
- Guessing fusion weights rather than measuring them.

## 10. What to Remember

- **Dense for meaning, sparse for exact identifiers** — hybrid beats either alone.
- **RRF fuses on rank**, which makes incomparable score scales irrelevant.
- **App-side fusion is ~20 lines** — native support isn't a capability gate.
- **Filter consistency across both indexes is a security requirement.**
- **Measure the weighting on a golden set** with a realistic query mix.
