# Design: AI-Powered Search System

> **Phase 28 · AI SYSTEM DESIGN · Topic 12**

## 1. Definition

A search system where the result is a ranked list of documents rather than a generated answer — with semantic retrieval improving recall over keyword search, and generation used sparingly if at all.

## 2. Simple Explanation

RAG answers the question. Search returns documents and lets the user decide.

That difference changes the metrics, the failure modes, and how much the model should be involved — and often search is the better product, because a ranked list is verifiable in a way a generated answer isn't.

## 3. How It Works

```
query
  ▼
UNDERSTAND ─── spelling, expansion, intent classification
  ▼
RETRIEVE ───── hybrid: BM25 + dense, in parallel
  ▼
FUSE ───────── reciprocal rank fusion
  ▼
RERANK ─────── cross-encoder over top-50
  ▼
PRESENT ────── ranked results with snippets, filters, facets
  ▼
(optional) ─── a generated summary ABOVE the results, cited
```

**Generation is optional and secondary.** The ranked list is the product; a summary is an aid to it.

## 4. Practical Example

**Why search is sometimes the better product than RAG:**

```
RAG      one answer, confidently stated, which the user
         must trust
SEARCH   ranked documents the user evaluates themselves

For a compliance officer looking for the relevant policy,
search is better — they need to read the source, not a
paraphrase. For a customer asking about a fee, RAG is
better.

The question "should this be search or RAG?" is worth
asking explicitly, and the answer depends on whether the
user needs an answer or needs the document.
```

**That framing is the substantive contribution** — teams build RAG by default when search would serve the user better.

**Metrics differ fundamentally:**

```
RAG      groundedness, answer correctness, abstention
SEARCH   NDCG, MRR, click-through, time to first click,
         reformulation rate, zero-result rate

Search metrics are behavioural and available without
labelling — click-through and reformulation rate tell you
whether results were useful, immediately and at scale.

That's a significant practical advantage: search quality
is measurable from production traffic in a way generated
answer quality isn't.
```

**Hybrid retrieval matters even more here:**

```
Users search with exact terms — product names, clause
references, document titles, error codes. BM25 handles
those; dense retrieval handles "what's the policy on
overseas payments."

And in search the user SEES the results, so a bad match is
visibly bad — whereas in RAG a bad retrieval produces a
confident answer that hides it. Search fails more visibly,
which is a feature.
```

**Filters and facets** do work that generation can't: date ranges, document type, department, effective status. A user narrowing to "policies, effective now, retail banking" has expressed something no query rewriting would infer.

## 5. Why It Matters

- **Search or RAG is a real product question** — teams default to RAG wrongly.
- **Search metrics are behavioural** and measurable from production without labelling.
- **Search fails visibly**; RAG failures hide inside a confident answer.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Building RAG when search would serve better** | The user needed the document |
| **Dense-only retrieval** | Exact-term searches fail |
| **No filters or facets** | Users can't express structural intent |
| **Zero-result queries unhandled** | A dead end with no suggestion |
| **Generated summary unconvincing** | Adds cost without helping |
| **Ranking untuned against behaviour** | Click data available and unused |

**On the optional summary:** a generated summary above the results is useful when it saves the user opening three documents, and harmful when it's confidently wrong — because users trust the summary and don't read on. If it's included, it must cite the results it drew from and be measurably better than the snippets alone, which is worth testing rather than assuming.

**On zero results:** a search returning nothing is a dead end. Query relaxation — dropping the most restrictive term, suggesting spelling corrections, offering related topics — converts a failure into a next step. And the zero-result rate by query is a direct content-gap signal, the same way abstention rate is in RAG.

## 7. Interview Answer

> "RAG answers the question; search returns documents and lets the user decide. That difference changes the metrics, the failure modes, and how much the model should be involved.
>
> The question I'd ask first is whether this should be search or RAG at all, because teams build RAG by default when search would serve the user better. A compliance officer looking for the relevant policy needs to read the source, not a paraphrase — search is better. A customer asking about a fee needs an answer — RAG is better. It depends on whether the user needs an answer or needs the document.
>
> The pipeline: query understanding for spelling and expansion, hybrid retrieval with BM25 and dense in parallel, reciprocal rank fusion, cross-encoder reranking over the top fifty, then ranked results with snippets, filters, and facets. A generated summary above the results is optional and secondary — the ranked list is the product.
>
> Hybrid matters even more here than in RAG, because users search with exact terms — product names, clause references, document titles, error codes. BM25 handles those and dense handles 'what's the policy on overseas payments.'
>
> And there's a property worth naming: in search the user sees the results, so a bad match is visibly bad. In RAG a bad retrieval produces a confident answer that hides it. Search fails more visibly, which is a feature rather than a weakness.
>
> The metrics are fundamentally different and this is a real advantage. NDCG and MRR offline, but more usefully click-through rate, time to first click, reformulation rate, and zero-result rate from production. Those are behavioural and available without labelling — so search quality is measurable from live traffic in a way generated answer quality simply isn't. Ranking can be tuned against real behaviour rather than against a golden set someone had to label.
>
> Filters and facets do work that generation can't. A user narrowing to 'policies, effective now, retail banking' has expressed structural intent no query rewriting would infer, and offering that is cheaper and more precise than trying to parse it from natural language.
>
> Two things I'd handle deliberately. Zero results is a dead end, so query relaxation — dropping the most restrictive term, suggesting corrections, offering related topics — converts a failure into a next step. And zero-result rate by query is a direct content-gap signal, the same way abstention rate is in RAG.
>
> And if I include a generated summary, it has to cite the results it drew from and be measurably better than the snippets alone. It's useful when it saves opening three documents and harmful when it's confidently wrong, because users trust the summary and stop reading. That's worth testing rather than assuming."

## 8. Likely Follow-ups

**Q: When is search better than RAG?**
When the user needs the document rather than an answer — a compliance officer finding the relevant policy needs to read the source, not a paraphrase. Teams default to RAG, and asking the question explicitly often changes the product for the better.

**Q: How do the metrics differ?**
Search metrics are behavioural — click-through, time to first click, reformulation rate, zero-result rate — and available from production without labelling. That makes search quality measurable from live traffic in a way generated answer quality isn't.

**Q: Why does hybrid matter more in search?**
Because users search with exact terms — product names, clause references, error codes — far more than they phrase natural-language questions. BM25 handles those directly, and dense retrieval covers the conceptual queries.

**Q: What about zero results?**
It's a dead end unless you relax the query — dropping the most restrictive term, suggesting spelling corrections, offering related topics. And zero-result rate by query is a direct content-gap signal, the same role abstention rate plays in RAG.

**Q: Should you add a generated summary?**
Only if it's measurably better than the snippets alone and cites the results it drew from. It helps when it saves opening three documents and harms when it's confidently wrong, because users trust it and stop reading — so it's worth testing rather than assuming.

## 9. Common Mistakes

- Building RAG when the user needed the document.
- Dense-only retrieval, failing exact-term searches.
- No filters or facets for structural intent.
- Zero-result queries with no relaxation or suggestion.
- Adding a generated summary without testing whether it helps.

## 10. What to Remember

- **Ask search or RAG explicitly** — it depends on answer versus document.
- **Search metrics are behavioural** and free from production traffic.
- **Search fails visibly**; RAG failures hide inside a confident answer.
- **Filters express intent** that query rewriting can't infer.
- **Zero-result rate is a content-gap signal** — relax the query, don't dead-end.
