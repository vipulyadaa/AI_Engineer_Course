# Design: Enterprise RAG System

> **Phase 28 · AI SYSTEM DESIGN · Topic 01**

## 1. Definition

A retrieval-augmented generation system serving an organization's internal documentation — the reference design that most other AI system design questions are a variation on.

## 2. Simple Explanation

The core is simple: ingest documents, retrieve relevant pieces, generate an answer with citations.

What makes it an enterprise system is everything around that — permissions, freshness, abstention, audit, cost, and the ability to prove why any answer was given.

## 3. How It Works

```
INGESTION (batch, scheduled)
  approved sources → parse → clean → chunk (structure-aware)
  → enrich (breadcrumbs) → embed → index + payload store

QUERY (per request)
  authenticate → rewrite query → embed
  → hybrid retrieve (dense + BM25) with pre-filters
  → RRF fuse → rerank (cross-encoder) → assemble context
  → generate (low temperature, citation-required)
  → verify grounding → answer + citations, or abstain

THROUGHOUT
  trace id, cost accounting, audit log
```

**Two pipelines with different properties:** ingestion is batch, inspectable, and rerunnable; the query path is what customers experience and regulators ask about.

## 4. Practical Example

**The requirements that shape the design:**

```
SCALE          how many documents, how many queries/day
FRESHNESS      how quickly must a policy change be reflected
PERMISSIONS    is the corpus uniformly readable, or per-user
LATENCY        interactive (<3s) or batch
ACCURACY       what's the cost of a wrong answer
AUDIT          must you explain any individual answer

Ask these before designing. A uniformly-readable corpus with
weekly freshness and no audit requirement is a very
different system from a permissioned one needing same-day
freshness and per-answer lineage.
```

**The decisions worth defending:**

```
STRUCTURE-AWARE CHUNKING with breadcrumbs prefixed into the
embedded text — a chunk saying "this fee is waived for the
first two transactions" is unretrievable without its
section context.

HYBRID RETRIEVAL — exact identifiers (clause references,
product codes) carry almost no semantic signal, so BM25
catches what dense retrieval misses.

PRE-FILTERING in the engine — post-filtering leaks and
silently under-retrieves.

EFFECTIVE-DATE FILTER — the control that stops a superseded
policy being cited as current. Groundedness metrics won't
catch that failure.

CALIBRATED RELEVANCE THRESHOLD — derived from labelled score
distributions, enabling abstention.

PER-CLAIM VERIFICATION with zero tolerance on numbers.
```

**Scaling, when asked:**

```
1M docs → ~10M chunks → ~30GB vectors at 768 dims
  · quantize before sharding — int8 is ~4× reduction for
    modest recall cost
  · shard by tenant if multi-tenant, which also fixes the
    filtered-recall problem
  · replicate for QPS, shard for corpus size — they don't
    substitute

10k queries/day is trivial. 10M/day means caching, model
tiering, and routing matter more than index choice.
```

## 5. Why It Matters

- **It's the reference design** most other AI system design questions vary on.
- **The requirements questions** are what separate a designed system from a recited one.
- **Effective-date filtering and abstention** are the controls that distinguish enterprise from demo.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Poor parsing** | The ceiling on everything downstream |
| **Post-filtering permissions** | Leaks and under-retrieves |
| **No effective-date filter** | Superseded policy cited as current |
| **No abstention path** | Answers from weak context |
| **Dense-only retrieval** | Exact identifiers missed |
| **No evaluation** | Every change is unfalsifiable |

**On what to build first:** ingestion and retrieval, then the golden set, then generation. Building generation first produces a demo that looks good on the three documents someone picked, and the evaluation that would have revealed the retrieval problem doesn't exist yet.

**On the most under-invested stage:** parsing. Teams spend weeks tuning retrieval while a table-heavy fee schedule was flattened into unusable text at ingestion. Reading a sample of extracted text against the source documents is ten minutes that prevents weeks of misdirected work.

## 7. Interview Answer

> "Before designing I'd ask six things: scale in documents and queries per day, how quickly a policy change must be reflected, whether the corpus is uniformly readable or permissioned, the latency target, the cost of a wrong answer, and whether any individual answer has to be explainable. A uniformly-readable corpus with weekly freshness and no audit requirement is a very different system from a permissioned one needing same-day freshness and per-answer lineage.
>
> Assuming the enterprise case — permissioned, audited, interactive — the design is two pipelines.
>
> Ingestion is batch and scheduled: approved sources only, parsed, cleaned, chunked structure-aware, enriched with breadcrumbs, embedded, and written to a vector index with the chunk text in a separate payload store.
>
> The query path: authenticate, rewrite the query for context, embed with the query task type, hybrid retrieve with pre-filters applied in the engine, fuse with reciprocal rank fusion, rerank with a cross-encoder, assemble numbered context, generate at low temperature with citations required, verify grounding, and either answer with citations or abstain.
>
> The decisions I'd defend. Structure-aware chunking with breadcrumbs prefixed into the embedded text — a chunk saying 'this fee is waived for the first two transactions' is unretrievable without its section context. Hybrid retrieval, because exact identifiers like clause references carry almost no semantic signal and dense retrieval misses them. Pre-filtering in the engine, because post-filtering leaks and silently under-retrieves. A calibrated relevance threshold enabling abstention. And per-claim verification with zero tolerance on numbers.
>
> The one I'd emphasize is the effective-date filter, because it's the control that stops a superseded fee schedule being cited as current — and that failure passes every groundedness metric. The answer is faithful to the retrieved document; the document just shouldn't have been retrievable.
>
> On build order, ingestion and retrieval first, then the golden set, then generation. Building generation first produces a demo that looks good on three hand-picked documents, and the evaluation that would reveal the retrieval problem doesn't exist yet.
>
> And the stage most under-invested in is parsing. Teams spend weeks tuning retrieval while a table-heavy fee schedule was flattened into unusable text at ingestion. Parsing quality is the ceiling on everything downstream, and reading a sample of extracted text against the source documents is ten minutes that prevents weeks of misdirected work."

## 8. Likely Follow-ups

**Q: What would you ask before designing?**
Scale, freshness requirement, whether the corpus is permissioned, latency target, cost of a wrong answer, and whether individual answers must be explainable. Those six change the design substantially — a permissioned audited system is architecturally different from an open one.

**Q: Which decisions matter most?**
Structure-aware chunking with breadcrumbs in the embedded text, hybrid retrieval for exact identifiers, pre-filtering permissions in the engine, an effective-date filter, a calibrated relevance threshold enabling abstention, and per-claim verification with zero tolerance on numbers.

**Q: Why the effective-date filter specifically?**
Because it prevents a superseded policy being cited as current — and that failure passes every groundedness metric, since the answer is faithful to the retrieved document. The document just shouldn't have been retrievable, which is a filter problem rather than a generation one.

**Q: What order would you build in?**
Ingestion and retrieval, then the golden set, then generation. Building generation first produces a demo on hand-picked documents, and the evaluation that would have exposed the retrieval problem doesn't exist yet to contradict it.

**Q: What's most under-invested?**
Parsing. It's the ceiling on everything downstream — a flattened table can't be recovered by any amount of retrieval tuning. Reading a sample of extracted text against the source is ten minutes that saves weeks of optimizing the wrong stage.

## 9. Common Mistakes

- Designing before asking about permissions, freshness, and audit.
- Omitting the effective-date filter.
- Dense-only retrieval in a corpus full of identifiers.
- No abstention path.
- Building generation before retrieval and evaluation exist.

## 10. What to Remember

- **Ask six questions first** — they change the architecture substantially.
- **Two pipelines:** batch ingestion, per-request query path.
- **Effective-date filtering** catches a failure groundedness metrics pass.
- **Build ingestion → evals → generation**, in that order.
- **Parsing is the ceiling** — verify it before tuning anything else.
