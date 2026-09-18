# Vector Stores (in LangChain)

> **Phase 15 · LANGCHAIN · Topic 06**

## 1. Definition

LangChain's uniform interface over vector databases — add documents, similarity search, and conversion to a retriever — so the store can be swapped with a configuration change.

> Vector databases themselves are covered in [07-vector-databases](../07-vector-databases/). This is the LangChain wrapper and where it leaks.

## 2. Simple Explanation

One API over Chroma, pgvector, Pinecone, Vertex AI Vector Search, and others. Add documents, search, get a retriever.

It works well for the common path and leaks exactly where the stores genuinely differ — which is filtering, index tuning, and namespaces.

## 3. How It Works

```python
store = VectorSearchVectorStore.from_components(
    project_id=PROJECT, region=REGION,
    index_id=INDEX_ID, endpoint_id=ENDPOINT_ID,
    embedding=emb,
)
store.add_documents(chunks)

hits = store.similarity_search_with_relevance_scores(
    query, k=20, filter={"tenant_id": "retail-uk"},
)
retriever = store.as_retriever(search_kwargs={"k": 20})
```

**Four methods carry most of the usage:** `add_documents`, `similarity_search`, `similarity_search_with_relevance_scores`, and `as_retriever`.

**Use the scored variant.** Plain `similarity_search` discards the scores, which means no relevance threshold and no abstention — you get k results regardless of whether any are relevant.

## 4. Practical Example

**Where the abstraction leaks:**

```
FILTER SYNTAX
  Chroma:     {"tenant": "x"}
  Qdrant:     nested must/should clauses
  Vertex AI:  Namespace restricts with allow/deny lists

A filter written for one store often doesn't transfer, which
undercuts the portability argument precisely where it matters
most — because filtering is how access control is enforced.

INDEX PARAMETERS
  ef_search, nprobe, and their equivalents are mostly not
  exposed. So recall-versus-latency tuning happens outside
  LangChain or not at all.

NAMESPACES
  Support varies and isn't uniformly represented.
```

**The permission question, which decides the design:**

```
Does the wrapper pass the filter to the ENGINE (pre-filter),
or apply it after retrieval (post-filter)?

That's a security property, not a performance detail, and it
varies by integration.

For an access-controlled corpus I'd verify it directly:
index two documents with different ACLs, query with a filter
for one, and confirm the other is never scored — not merely
absent from the results.
```

**That verification is the concrete thing to do**, because the answer isn't reliably documented and post-filtering both leaks and silently under-retrieves.

**On `from_documents`:** convenient for prototypes, dangerous in production — it can create an index implicitly with default parameters. Production indexes should be created deliberately with known settings and populated separately.

## 5. Why It Matters

- **Filtering is where the abstraction leaks**, and filtering is how access control works.
- **Pre- versus post-filtering** is a security property that varies by integration.
- **Scored search enables thresholds and abstention**; the plain variant doesn't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Filter syntax differs per store** | Undermines portability where it counts |
| **Post-filtering in the wrapper** | Leaks and under-retrieves |
| **Index parameters not exposed** | No recall/latency tuning |
| **`similarity_search` without scores** | No threshold, no abstention |
| **`from_documents` in production** | Implicit index creation with defaults |
| **Inconsistent score semantics** | Distance vs similarity varies by store |

**On score semantics:** some integrations return distances (lower is better), others similarities (higher is better), and `relevance_scores` normalizes differently per store. A threshold tuned against one integration's scores is meaningless against another's — so thresholds must be calibrated per store and re-calibrated after any store change.

**On what I'd actually do:** use the LangChain store for ingestion, where the uniform `add_documents` is genuinely convenient, and call the store's native client on the query path where filtering, scoring, and tuning all matter. That keeps the convenience where it's free and the control where it's needed.

## 7. Interview Answer

> "LangChain's vector store interface is add documents, similarity search, and as_retriever, over any supported database. It works well for the common path and leaks exactly where stores genuinely differ.
>
> The leak that matters is filtering. Chroma takes a flat dict, Qdrant takes nested must-should clauses, Vertex AI takes namespace restricts with allow and deny lists. A filter written for one store often doesn't transfer — which undercuts the portability argument precisely where it matters most, because filtering is how access control is enforced.
>
> And there's a deeper question: does the wrapper pass the filter to the engine as a pre-filter, or apply it after retrieval? That's a security property, not a performance detail, and it varies by integration. For an access-controlled corpus I'd verify it directly — index two documents with different ACLs, query with a filter for one, and confirm the other is never scored rather than merely absent from the results. The answer isn't reliably documented, and post-filtering both leaks and silently under-retrieves.
>
> A smaller but common issue: use similarity_search_with_relevance_scores rather than plain similarity_search. The plain version discards scores, which means no relevance threshold and no abstention — you get k results whether or not any are relevant. And score semantics vary by integration, distance versus similarity, so a threshold calibrated for one store is meaningless for another.
>
> Index parameters like ef_search and nprobe are mostly not exposed, so recall-versus-latency tuning happens outside LangChain or doesn't happen.
>
> What I'd actually do is split by stage: use the LangChain store for ingestion, where uniform add_documents is genuinely convenient, and call the native client on the query path where filtering, scoring, and tuning all matter. Convenience where it's free, control where it's needed.
>
> One more: from_documents is fine for prototypes and dangerous in production, because it can create an index implicitly with default parameters. Production indexes should be created deliberately with known settings."

## 8. Likely Follow-ups

**Q: Where does the abstraction leak?**
Filtering syntax, index tuning parameters, and namespace support — the three places stores genuinely differ. Filtering is the serious one, because a filter written for one store rarely transfers and filtering is the mechanism enforcing access control.

**Q: How do you check whether filtering is pre- or post-retrieval?**
Test it. Index two documents with different ACL values, query with a filter matching one, and confirm the other was never scored rather than just absent from the results. It's a security property that varies by integration and isn't reliably documented.

**Q: Why use the scored search variant?**
Because plain similarity_search discards scores, so there's no way to apply a relevance threshold or decide to abstain — you get k results regardless of relevance. Thresholding and abstention are the controls preventing answers built on weak context.

**Q: Can you tune the index through LangChain?**
Mostly not — ef_search, nprobe, and equivalents aren't uniformly exposed. That tuning has to happen through the native client or the provider console, which is part of why I'd use the native client on the query path.

**Q: How would you actually structure it?**
LangChain's store for ingestion, where add_documents is uniformly convenient, and the native client for querying, where filtering, scores, and index parameters all matter. That keeps the portability benefit in the stage where it's real and the control in the stage where it's needed.

## 9. Common Mistakes

- Assuming filter syntax transfers between stores.
- Not verifying whether filtering is applied pre- or post-retrieval.
- Using `similarity_search` and losing the scores.
- Reusing a relevance threshold across different integrations.
- Using `from_documents` to create production indexes.

## 10. What to Remember

- **Filtering is where the abstraction leaks** — and it's how access control works.
- **Verify pre- vs post-filtering yourself**; it's a security property.
- **Use the scored variant** so thresholds and abstention are possible.
- **Score semantics vary** — recalibrate thresholds per store.
- **LangChain for ingestion, native client for the query path.**
