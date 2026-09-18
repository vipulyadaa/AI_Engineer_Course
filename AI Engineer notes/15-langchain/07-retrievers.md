# Retrievers

> **Phase 15 · LANGCHAIN · Topic 07**

## 1. Definition

The query-side abstraction: anything implementing "given a query string, return relevant documents." Vector stores expose one, and several composite retrievers add behaviour on top.

## 2. Simple Explanation

A retriever is one method — query in, documents out. That uniformity lets retrieval strategies be swapped or stacked without changing the code around them.

The useful ones aren't the basic vector-store retriever; they're the composites that add reranking, multi-query, and parent-document expansion.

## 3. How It Works

```python
retriever = store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"k": 20, "score_threshold": 0.55,
                   "filter": {"tenant_id": tenant}},
)
docs = retriever.invoke("international transfer fee")
```

**The composites worth knowing:**

| Retriever | What it adds |
|---|---|
| **ContextualCompressionRetriever** | Reranking or extraction over base results |
| **MultiQueryRetriever** | Generates query variations, unions results |
| **ParentDocumentRetriever** | Searches small chunks, returns larger parents |
| **EnsembleRetriever** | Fuses several retrievers with RRF |
| **SelfQueryRetriever** | Extracts metadata filters from the question |

## 4. Practical Example

**The two that most improve quality:**

```
1. ParentDocumentRetriever
   Embed small chunks for precise matching; return the
   larger parent section for context.

   Fixes the fundamental tension: small chunks retrieve
   better, large chunks answer better. This gets both,
   and it's the highest-value composite for policy documents.

2. ContextualCompressionRetriever with a cross-encoder
   Retrieve top-20 by embedding, rerank to top-5 by a model
   that sees query and document together.

   Typically the largest single quality gain in a RAG
   pipeline for its cost.
```

**One to be careful with:**

```
SelfQueryRetriever extracts metadata filters from natural
language — "fees changed after 2024" → filter on
effective_date.

Useful, and risky: a model-generated filter on an
ACCESS-CONTROL field would be a security hole. Any
self-query filtering must be restricted to non-security
metadata, with permission filters applied separately and
unconditionally in code.
```

**That separation is the important design rule** — model-influenced filters and security filters must never share a mechanism.

**On EnsembleRetriever:** it fuses vector and BM25 retrievers with reciprocal rank fusion, which is the right way to do hybrid search. Worth knowing that both retrievers must receive the same permission filter — a filter applied to one and not the other turns hybrid search into an authorization bypass.

## 5. Why It Matters

- **ParentDocumentRetriever resolves the chunk-size tension**, which is a real structural win.
- **Reranking via compression** is usually the biggest single quality gain available.
- **Model-generated filters must be separated from security filters.**

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Self-query filters on security fields** | Authorization bypass |
| **Ensemble with inconsistent filters** | One index unfiltered — a leak |
| **MultiQuery cost** | An extra LLM call plus N retrievals |
| **Parent documents too large** | Context budget consumed by few results |
| **Compression dropping needed context** | Extractive compression removing qualifiers |
| **Threshold without calibration** | Over- or under-filtering |

**On extractive compression:** compressors that extract only the "relevant" sentences can remove qualifying conditions — "this fee is waived for the first two transactions" loses "for Premier customers" if that sentence wasn't judged relevant. For policy content I'd prefer reranking whole chunks over extracting sentences, because the conditions are the part that matters.

**On MultiQueryRetriever:** generating three query variations costs an LLM call plus three retrievals, and the union then needs deduplication and reranking. It helps most when queries are short or use vocabulary unlike the corpus — worth measuring on a golden set rather than enabling by default.

## 7. Interview Answer

> "A retriever is a single method — query string in, documents out. The uniformity is what lets retrieval strategies be swapped or stacked, and the interesting ones are the composites rather than the plain vector-store retriever.
>
> The two that most improve quality are ParentDocumentRetriever and ContextualCompressionRetriever with a cross-encoder. Parent-document embeds small chunks for precise matching but returns the larger parent section for context — that resolves the fundamental tension where small chunks retrieve better and large chunks answer better. For policy documents it's the highest-value composite. And compression with a reranker retrieves top-twenty by embedding then reranks to top-five with a model that sees query and document together, which is usually the largest single quality gain in a RAG pipeline for its cost.
>
> The one I'd be careful with is SelfQueryRetriever. It extracts metadata filters from natural language — 'fees changed after 2024' becomes a date filter. That's useful and it's risky, because a model-generated filter on an access-control field would be a security hole. So self-query filtering has to be restricted to non-security metadata, with permission filters applied separately and unconditionally in code. Model-influenced filters and security filters must never share a mechanism — that's the design rule I'd hold to.
>
> Same concern with EnsembleRetriever, which fuses vector and BM25 with reciprocal rank fusion. That's the right way to do hybrid search, but both retrievers must receive the same permission filter. Applying it to one and not the other turns hybrid search into an authorization bypass, and it's an easy mistake because they're configured separately.
>
> One caution on compression: extractive compressors that pull out only the relevant sentences can remove qualifying conditions. 'This fee is waived for the first two transactions' loses 'for Premier customers' if that sentence wasn't judged relevant — and the conditions are exactly the part that matters in policy content. So I'd rerank whole chunks rather than extract sentences.
>
> And MultiQueryRetriever costs an LLM call plus N retrievals plus deduplication. It helps most when queries are short or use vocabulary unlike the corpus, so I'd measure it on a golden set rather than enabling it by default."

## 8. Likely Follow-ups

**Q: Which retriever gives the biggest quality gain?**
ContextualCompressionRetriever with a cross-encoder reranker, usually — retrieve broadly by embedding, then rerank with a model that sees query and document together. ParentDocumentRetriever is close behind for policy content, because it resolves the small-chunks-retrieve-better, large-chunks-answer-better tension.

**Q: What's the risk with SelfQueryRetriever?**
Model-generated filters. If the model can produce a filter on an access-control field, that's an authorization hole. Self-query has to be restricted to non-security metadata, with permission filters applied separately in code — the two must never share a mechanism.

**Q: What should you watch with EnsembleRetriever?**
That both underlying retrievers receive the same permission filter. They're configured separately, so it's easy to filter the vector retriever and not the BM25 one — which makes hybrid search an authorization bypass. Shared filter construction with a test covering both is the fix.

**Q: Is extractive compression safe for policy content?**
Not really. Extracting only the sentences judged relevant can drop the qualifying conditions — losing "for Premier customers" from a waiver rule — and those conditions are the part that determines whether the answer applies. Reranking whole chunks is safer.

**Q: Is MultiQueryRetriever worth it?**
Sometimes. It costs an LLM call plus several retrievals plus deduplication, and it helps most when queries are short or phrased unlike the corpus. I'd measure it on a golden set rather than turning it on by default, since the gain is query-distribution dependent.

## 9. Common Mistakes

- Allowing self-query to generate filters on security fields.
- Filtering one ensemble branch and not the other.
- Using extractive compression on conditional policy text.
- Enabling MultiQuery without measuring its benefit.
- Returning parent documents so large they consume the context budget.

## 10. What to Remember

- **A retriever is one method**; the composites are where the value is.
- **ParentDocumentRetriever** resolves the chunk-size tension.
- **Reranking via compression** is usually the largest quality gain.
- **Security filters never share a mechanism with model-generated ones.**
- **Both ensemble branches need the same permission filter.**
