# Advanced RAG

> **Phase 09 · ADVANCED RAG · Topic 02**

## 1. Definition

The set of techniques layered onto naive RAG to improve retrieval quality — grouped by *where* they act: before retrieval (pre-retrieval), during it, and after it (post-retrieval). Each addresses a specific measured failure.

## 2. Simple Explanation

Advanced RAG isn't one thing. It's a menu of optimizations organized by which stage they fix.

The useful mental model is three intervention points:

- **Pre-retrieval** — improve the query or the index before searching.
- **Retrieval** — improve how you search.
- **Post-retrieval** — improve the candidates after searching.

Knowing which stage your problem is in tells you which techniques are even relevant.

## 3. How It Works

```
              ┌─── PRE-RETRIEVAL ───────────────────────┐
query ───────▶│ rewrite · expand · multi-query · HyDE   │
              │ route · decompose · classify intent     │
              └──────────────────┬──────────────────────┘
                                 ▼
              ┌─── RETRIEVAL ───────────────────────────┐
              │ hybrid (BM25 + dense) · metadata filter │
              │ self-query · parent-child · graph       │
              └──────────────────┬──────────────────────┘
                                 ▼
              ┌─── POST-RETRIEVAL ──────────────────────┐
              │ rerank · compress · dedupe · diversify  │
              │ verify relevance · order for position   │
              └──────────────────┬──────────────────────┘
                                 ▼
                          context → LLM
```

**Plus ingestion-side techniques**, which are often the highest-value and least discussed:

| Ingestion technique | What it fixes |
|---|---|
| Structure-aware chunking | Facts split across boundaries |
| Title/heading enrichment | Chunks that lose their topic |
| Contextual retrieval (chunk summaries) | Chunks that need document context |
| Multi-representation indexing | One chunk, several embeddings (summary + raw) |
| Hierarchical/parent-child indexing | Precision vs. context tension |

## 4. Practical Example

**Diagnosis-driven selection** — matching a measured symptom to a technique:

```
Measurement                              Diagnosis            Technique
────────────────────────────────────────────────────────────────────────────
recall@20 high, recall@5 low             ranking problem      rerank
recall@20 also low                       upstream problem     chunking, hybrid,
                                                              embedding model
Exact IDs/codes missed                   lexical gap          hybrid (BM25)
Vague queries retrieve poorly            query quality        rewrite / HyDE
Multi-part queries retrieve half         query structure      multi-query /
                                                              decomposition
Chunk retrieved but lacks context        chunk granularity    parent-child
Answer needs 2+ chained facts            single-hop limit     multi-hop / agentic
Retrieval returns nothing relevant       coverage gap         corrective RAG,
                                                              fallback to web/none
Latency too high                         over-engineering     adaptive: skip
                                                              retrieval when
                                                              unnecessary
```

**The production default** that covers most cases without much complexity:

```
query
  → ACL + date metadata filter
  → hybrid: BM25 top-20 ∥ dense top-20 → RRF
  → cross-encoder rerank → top-4
  → position-aware context assembly
  → grounded prompt with abstention + citations
```

That's maybe 250ms of added latency over naive RAG and addresses the large majority of common failures.

## 5. Why It Matters

- **The stage taxonomy turns a grab-bag into a diagnostic tool.** You pick techniques by measured symptom, not by fashion.
- **Most real gains are on the ingestion side**, which gets the least attention.
- **Every addition costs latency and complexity**, so justification by measurement is the discipline that matters.

## 6. Trade-offs / Failure Modes

| Technique | Adds | Worth it when |
|---|---|---|
| Hybrid retrieval | Index + fusion complexity | Almost always in enterprise |
| Reranking | 100–300ms | recall@20 ≫ recall@5 |
| Query rewriting | One LLM call (~300ms) | Queries are vague or conversational |
| Multi-query | N× retrieval cost | Queries are multi-part |
| HyDE | One LLM call | Query and document vocabulary differ sharply |
| Contextual retrieval | Ingestion cost per chunk | Chunks are meaningless standalone |
| Agentic RAG | Several round trips, unpredictable latency | Genuinely multi-step questions |

**The over-engineering failure:** stacking query rewriting, multi-query, HyDE, reranking, and compression turns a 1-second response into 5 seconds, multiplies cost, and creates a pipeline nobody can debug — often for a recall gain a better chunking strategy would have delivered for free. Add one technique at a time and measure.

## 7. Interview Answer

> "Advanced RAG is a menu of techniques, and the useful way to organize it is by *where* they act — pre-retrieval, retrieval, and post-retrieval, plus ingestion-side work.
>
> Pre-retrieval is improving the query: rewriting, expansion, multi-query decomposition, HyDE, routing. Retrieval is improving the search itself: hybrid BM25-plus-dense, metadata filtering, parent-child, graph. Post-retrieval is improving the candidates: reranking, compression, deduplication, position-aware ordering.
>
> The reason the taxonomy matters is that it turns a grab-bag into a diagnostic. If recall@20 is high but recall@5 is low, that's a ranking problem and reranking fixes it. If recall@20 is also low, the problem is upstream and no reranker helps — I'd look at chunking, the embedding model, or whether I need hybrid. If exact identifiers are being missed, that's specifically a lexical gap and BM25 is the answer.
>
> My production default is a metadata filter, hybrid retrieval with reciprocal rank fusion, a cross-encoder rerank down to four chunks, and position-aware context assembly with a grounded prompt. That's about 250 milliseconds over naive RAG and covers most common failures.
>
> What I'd push back on is stacking everything. Query rewriting plus multi-query plus HyDE plus reranking plus compression turns a one-second response into five, multiplies cost, and creates something nobody can debug — often for a gain that better chunking would have given for free. I'd add one technique at a time and measure each."

## 8. Likely Follow-ups

**Q: How do you decide which techniques to add?**
From measurements. Compare recall at high k versus low k to separate ranking problems from retrieval problems. Look at the failing queries and categorize them — exact-match failures point to hybrid, vague-query failures point to rewriting, multi-part failures point to decomposition. Each technique addresses a specific symptom, so the diagnosis comes first.

**Q: What gives the biggest improvement for the least cost?**
Usually ingestion-side work: structure-aware chunking and prepending the document title and section heading to each chunk. It costs nothing at query time, it's a one-time ingestion change, and it consistently moves recall more than a reranker does. It gets less attention than reranking because it's less interesting to talk about.

**Q: What's the latency budget of a full advanced pipeline?**
Roughly: query rewriting 200–400ms as an LLM call, hybrid retrieval 20–80ms, reranking 100–300ms, generation 1–3s depending on output length. So a well-chosen pipeline adds a few hundred milliseconds. An over-stacked one with multi-query and agentic loops can add several seconds, which is usually a worse product even if recall improved.

**Q: Is agentic RAG always better?**
No. It's right for genuinely multi-step questions that need chained retrieval, and wrong for simple factual lookups where it adds several round trips of latency and cost for nothing. The sensible pattern is adaptive — classify the query and route simple ones through a single retrieval pass, reserving the agentic path for questions that need it.

**Q: How do you avoid over-engineering?**
Add one technique at a time, measure against a held-out eval set, and keep it only if the improvement justifies the latency and complexity. Track the latency budget explicitly as a constraint alongside quality. And periodically try removing components — a reranker added early may be doing nothing after chunking improved, and nobody ever checks.

## 9. Common Mistakes

- Adding techniques by fashion rather than by measured symptom.
- Stacking everything and ending up slow, expensive, and undebuggable.
- Focusing on query-side and post-retrieval tricks while ignoring ingestion.
- Not re-measuring whether earlier additions are still earning their cost.
- Treating agentic RAG as universally superior.

## 10. What to Remember

- **Three stages:** pre-retrieval (query), retrieval (search), post-retrieval (candidates) — plus ingestion.
- **Diagnose, then pick.** recall@20 ≫ recall@5 means rerank; both low means upstream.
- **Ingestion-side work is usually the biggest win** and gets the least attention.
- **Production default:** filter → hybrid + RRF → rerank → position-aware context → grounded prompt.
- **Every addition costs latency.** Add one at a time and measure.
