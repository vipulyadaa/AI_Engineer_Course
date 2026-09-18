# Naive RAG

> **Phase 09 · ADVANCED RAG · Topic 01**

## 1. Definition

The baseline RAG pattern: fixed-size chunks, dense-only retrieval, top-k by cosine similarity, stuff into a prompt, generate. No query transformation, no reranking, no filtering. It's the starting point every RAG system should begin at and few should ship.

## 2. Simple Explanation

Naive RAG is the version you build in an afternoon from a tutorial:

```
chunk by 1000 chars → embed → store → embed query → top 5 → prompt → answer
```

It works impressively well on a demo and degrades quickly on real corpora and real questions. Understanding *exactly where* it breaks is what motivates every technique in this phase.

## 3. How It Works

```
INGEST:  document → fixed-size split → embed → vector store
QUERY:   question → embed → cosine top-k → prompt → LLM → answer
```

**What's deliberately absent, and what each absence costs:**

| Missing | Consequence |
|---|---|
| Query transformation | Vague or multi-part questions retrieve poorly |
| Hybrid search | Exact identifiers, codes, and rare terms are missed |
| Metadata filtering | No access control, no freshness, no scoping |
| Reranking | Precision of the final top-k is whatever cosine gave you |
| Structure-aware chunking | Facts split across boundaries; tables shredded |
| Deduplication | Top-k can be five views of the same passage |
| Abstention instruction | Confident answers to out-of-scope questions |
| Evaluation | No idea whether any of it works |

## 4. Practical Example

**Where naive RAG fails, concretely:**

```
Q: "What's the fee on policy AC-4471-B?"
   → dense-only misses the exact identifier. Returns generic fee chunks.

Q: "Compare our overdraft policy to our credit line policy."
   → one embedding of a two-part question matches neither topic well.

Q: "What changed in the fee schedule this year?"
   → no date metadata, so it can't distinguish versions.
     Retrieves both, model picks one arbitrarily.

Q: "What's the weather?"
   → no abstention instruction. Answers from parametric knowledge,
     confidently, with no indication it wasn't grounded.

Q: any question about a table
   → fixed-size splitting shredded the table at ingestion.
     Unrecoverable.
```

**The upgrade path, roughly in order of value per unit of effort:**

```
1. Structure-aware chunking + title/heading enrichment   ← biggest, cheapest
2. Hybrid retrieval (BM25 + dense, RRF fusion)
3. Abstention instruction + citations in the prompt
4. Metadata filtering (ACL, date, type)
5. An eval set and recall@k / groundedness measurement   ← do this early
6. Reranking
7. Query transformation (rewrite, multi-query, HyDE)
```

**Step 5 arguably belongs first.** Without measurement, you can't tell which of the others helped.

## 5. Why It Matters

- **It's the right starting point.** Build it, measure it, then fix what the measurement says is broken.
- **It's the baseline every improvement is measured against.** "Advanced RAG improved things" is meaningless without it.
- **Its failure modes are the syllabus** for the rest of this phase.

## 6. Trade-offs / Failure Modes

| Failure | Advanced technique that addresses it |
|---|---|
| Exact identifiers missed | [Hybrid retrieval](04-hybrid-rag.md) |
| Vague or multi-part queries | [Query rewriting](05-query-rewriting.md), [multi-query](07-multi-query-retrieval.md) |
| Right chunk ranked just below top-k | [Reranking](14-reranking.md) |
| Chunk too small for context | [Parent-child retrieval](09-parent-child-retrieval.md) |
| No access control or freshness | [Metadata filtering](11-metadata-filtering.md) |
| Questions needing multiple hops | [Multi-hop RAG](20-multi-hop-rag.md) |
| Retrieval returns nothing useful | [Corrective RAG](21-corrective-rag.md) |
| Retrieval unnecessary for some queries | [Adaptive retrieval](17-adaptive-retrieval.md) |

**The honest caveat:** naive RAG is genuinely sufficient for some applications — a small, well-structured, rarely-changing corpus with straightforward factual questions. Adding a reranker and query rewriting to a 200-document FAQ with clean headings may buy nothing but latency. Complexity should be justified by measurement.

## 7. Interview Answer

> "Naive RAG is the baseline pattern — fixed-size chunks, dense-only retrieval, top-k by cosine, stuff into a prompt, generate. No query transformation, no hybrid search, no reranking, no filtering.
>
> It's what you build from a tutorial in an afternoon, and it demos well and degrades fast on real corpora. The value of naming it is that its specific failure modes motivate every technique in advanced RAG.
>
> Concretely: it misses exact identifiers because dense embeddings encode 'this is a policy number' rather than the specific string. It handles multi-part questions badly because one embedding of a two-topic question matches neither well. It has no access control or freshness filtering because there's no metadata. And with no abstention instruction it answers out-of-scope questions confidently.
>
> The upgrade path I'd follow, in order of value per effort: structure-aware chunking with title and heading enrichment first, because that's the biggest and cheapest win. Then hybrid retrieval. Then the prompt work — abstention and citations. Then metadata filtering. Then reranking and query transformation.
>
> But I'd actually put evaluation first, before any of it. Without recall@k and groundedness measured on a held-out set, I can't tell which change helped, and it's very easy to add a reranker and a query rewriter and end up slower with no quality gain.
>
> And I'd say that naive RAG is genuinely sufficient sometimes. A small, clean, stable corpus with straightforward factual questions may not need any of this — complexity should be justified by measurement, not by pattern-matching to what's fashionable."

## 8. Likely Follow-ups

**Q: What's the first thing you'd improve?**
Evaluation, so I know what to improve. After that, chunking — structure-aware splitting with the document title and section heading prepended to each chunk. That's consistently the largest recall gain for the least effort, and it's upstream so it constrains everything else. Reranking and query rewriting are more visible but usually smaller.

**Q: When is naive RAG good enough?**
Small, clean, well-structured corpora with stable content and direct factual questions. A 200-document FAQ with good headings, asked simple questions, may work fine without any additions. I'd measure rather than assume — if recall@5 is already 0.95, there's nothing for a reranker to fix and you'd be buying latency.

**Q: Why does dense-only retrieval fail on identifiers?**
Because embeddings encode meaning, not surface form. A policy number like AC-4471-B embeds as "an identifier of this shape," so all policy numbers land near each other and the specific one isn't distinguished. BM25 matches the exact token instead, which is why hybrid retrieval is the standard production fix.

**Q: How do you decide which advanced techniques to add?**
Diagnose from measurements, not from a list. If recall@20 is much higher than recall@5, reranking will help. If recall@20 is itself low, the problem is upstream in chunking or embedding. If queries are vague or multi-part, query transformation helps. If answers are ungrounded despite good retrieval, it's a prompt problem. Each technique addresses a specific measured failure.

**Q: What's the cost of adding all the advanced techniques?**
Latency and complexity. Reranking adds 100–300ms. Query rewriting adds an LLM call before retrieval. Multi-query multiplies retrieval cost. Agentic patterns add several round trips. A fully-loaded pipeline can turn a 1-second response into 4 seconds, and every component is something to monitor and debug. That's why each addition needs to justify itself against measured improvement.

## 9. Common Mistakes

- Shipping naive RAG without measuring it.
- Adding advanced techniques before establishing a baseline.
- Assuming complexity improves quality without evidence.
- Fixing retrieval with reranking when the problem is chunking.
- Dismissing naive RAG entirely — it's sufficient for some real applications.

## 10. What to Remember

- **Fixed chunks, dense-only, top-k, stuff, generate.** The baseline.
- **Build it first, measure it, then fix what the measurement shows.**
- **Its failure modes are the syllabus** for every advanced technique.
- **Upgrade order:** evaluation → chunking+enrichment → hybrid → prompt → filtering → rerank → query transform.
- **Sometimes it's enough.** Justify complexity with measurement.
