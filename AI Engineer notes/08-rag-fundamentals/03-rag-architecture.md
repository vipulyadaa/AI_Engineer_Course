# RAG Architecture

> **Phase 08 · RAG FUNDAMENTALS · Topic 03**

## 1. Definition

The end-to-end system design of a RAG application: an offline ingestion pipeline that turns documents into a searchable index, and an online query pipeline that retrieves, assembles context, and generates. Each stage is independently measurable and independently breakable.

## 2. Simple Explanation

Two pipelines that meet at the vector store.

**Ingestion** runs on a schedule and is a data engineering problem — load, parse, clean, chunk, embed, index. **Query** runs per request and is a latency-sensitive serving problem — embed, retrieve, rerank, prompt, generate.

Thinking of them as one thing is the most common design mistake. They have different SLAs, different failure modes, and usually different owners.

## 3. How It Works

```
INGESTION (offline, batch, scheduled)
┌──────────┐  ┌───────┐  ┌───────┐  ┌────────┐  ┌───────┐  ┌──────────────┐
│ Sources  │→ │ Parse │→ │ Clean │→ │ Chunk  │→ │ Embed │→ │ Vector store │
│ PDF/DB/  │  │       │  │       │  │        │  │       │  │  + metadata  │
│ web/API  │  └───────┘  └───────┘  └────────┘  └───────┘  └──────┬───────┘
└──────────┘                                                      │
                                                                  │
QUERY (online, per request, latency-budgeted)                     │
┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│ User     │→ │ Query     │→ │ Retrieve │← │ Filter │← ─────────┘
│ question │  │ transform │  │ top-k    │  │ by ACL │
└──────────┘  └───────────┘  └────┬─────┘  └────────┘
                                  ↓
                            ┌──────────┐  ┌─────────┐  ┌─────┐  ┌────────┐
                            │ Rerank   │→ │ Build   │→ │ LLM │→ │ Answer │
                            │ (cross-  │  │ context │  │     │  │ + cites│
                            │ encoder) │  └─────────┘  └─────┘  └────────┘
                            └──────────┘
```

**The stages, and what each owns:**

| Stage | Owns | Fails as |
|---|---|---|
| Parse | Text fidelity from PDFs, tables, scans | Garbled text, lost table structure |
| Chunk | Retrievable units that contain complete ideas | Split facts, orphaned context |
| Embed | Semantic vector quality | Poor domain fit; wrong model for the language |
| Index | Fast approximate nearest-neighbour search | Recall loss from index tuning |
| Filter | Access control, freshness, source scoping | Data leakage if applied after retrieval |
| Retrieve | Candidate recall | Right chunk not in top-k |
| Rerank | Precision of the final set | Latency cost; marginal on easy queries |
| Generate | A grounded, cited answer | Hallucination, ignoring context |

## 4. Practical Example

**A production-shaped banking FAQ architecture:**

```
INGEST (nightly + on document update)
  Confluence + PDF policy docs + product DB
    → Unstructured.io parse (tables preserved as markdown)
    → strip headers/footers/boilerplate
    → markdown-aware chunking, ~600 tokens, 80 overlap
    → prepend doc title + section heading to each chunk   ← big recall win
    → embed (text-embedding-005)
    → upsert to Vertex AI Vector Search
       metadata: {doc_id, section, product, audience, effective_date, acl_group}

QUERY (p95 budget 2.5s)
  question
    → ACL filter built from the caller's groups          ← BEFORE retrieval
    → hybrid retrieve: BM25 top-20 + dense top-20 → RRF fuse
    → cross-encoder rerank → top 4
    → prompt: instructions + context + question
    → Gemini → answer + section citations
    → groundedness check on the output (async, logged)
```

**Two details that carry most of the quality:** prepending the document title and section heading to each chunk, and applying the ACL filter *before* retrieval rather than filtering results afterwards.

## 5. Why It Matters

- **Stage separation is what makes a RAG system debuggable.** If you can't measure retrieval independently of generation, every failure looks the same.
- **Ingestion and query have different SLAs.** Ingestion can take an hour; query has a 2-second budget. Conflating them leads to bad design decisions in both.
- **Most quality lives upstream.** Parsing and chunking decisions constrain everything downstream and can't be recovered later.

## 6. Trade-offs / Failure Modes

| Decision | Trade-off |
|----------|-----------|
| **Chunk size** | Small = precise but fragmentary. Large = complete but dilutes the embedding |
| **top-k** | High = better recall, more cost and distraction. Low = cheap, risks missing the answer |
| **Reranking** | Big precision gain, adds 100–300ms and a model dependency |
| **Hybrid vs. dense only** | Hybrid catches exact terms (account numbers, product codes) dense search misses; more infrastructure |
| **Re-index cadence** | Frequent = fresh, costs compute. Infrequent = stale answers |
| **Filter before vs. after retrieval** | Before is correct and secure; after can leak and silently reduces your effective k |

**The architectural rule worth stating:** apply authorization **before** retrieval, as a filter on the candidate set. Filtering after retrieval means the top-k was computed over documents the user can't see, so you quietly get fewer results — and any leakage of even chunk metadata is a real incident.

## 7. Interview Answer

> "I'd describe it as two pipelines that meet at the vector store, because they have completely different characteristics.
>
> Ingestion is offline and batch — load from sources, parse, clean, chunk, embed, and upsert to the index with metadata. It's a data engineering problem, it can take an hour, and it runs on a schedule or on document update.
>
> Query is online and latency-budgeted — embed the question, filter by the caller's permissions, retrieve top-k, optionally rerank, build the prompt, generate. That's a serving problem with a couple-of-seconds budget.
>
> The reason I separate them explicitly is debuggability. If I can't measure retrieval independently of generation, every failure looks identical. So I'd instrument recall@k on retrieval and groundedness on generation, and when something's wrong I know which half to look at.
>
> Two design decisions I'd call out. First, the ACL filter goes *before* retrieval, as a constraint on the candidate set — filtering afterwards means top-k was computed over documents the user can't see, so you silently get fewer results, and any leakage is a real incident. Second, prepending the document title and section heading to each chunk before embedding. That's a small change that consistently gives one of the biggest recall improvements, because an isolated chunk loses the context that tells you what it's about.
>
> And I'd emphasize that most of the quality lives upstream. Parsing and chunking decisions constrain everything downstream — a table split in half at ingestion can't be repaired by a better reranker."

## 8. Likely Follow-ups

**Q: Where do you put the access-control filter?**
Before retrieval, as a metadata pre-filter on the index so the search only considers documents the caller is entitled to. Post-filtering is both a security risk and a quality problem: you asked for 10 results, 6 get stripped, and now the model has 4 — with no signal that it's missing anything. Most vector databases support metadata filtering natively during the search.

**Q: How do you keep the index fresh?**
Event-driven where possible — a document-update webhook triggers re-parse, re-chunk, re-embed, and upsert for just that document. A scheduled full reconciliation catches anything missed. I'd store a content hash per chunk so unchanged chunks skip re-embedding, and an `effective_date` in metadata so retrieval can prefer current versions and the answer can flag when a document is old.

**Q: Would you always add a reranker?**
Not always. It's a real precision gain — a cross-encoder scores query and chunk jointly rather than comparing independent embeddings — but it costs 100 to 300 milliseconds and adds a model dependency. I'd measure first: if recall@20 is much higher than recall@4, reranking has room to help. If they're close, retrieval is already precise and the reranker mostly buys latency.

**Q: How do you handle multiple document types — PDFs, tables, code?**
Different parsers and different chunking strategies, unified at the embedding stage. Tables should stay intact as markdown or be summarized rather than split by character count. Code should chunk on function boundaries. The metadata should record the content type so you can filter and so the prompt can format it appropriately. A single generic chunker across all types is a common source of quality loss.

**Q: How would you scale this to millions of documents?**
The index is the main concern — approximate nearest-neighbour structures like HNSW or IVF, and I'd measure the recall loss they introduce against exact search on a sample. Shard by tenant or domain if the corpus partitions naturally, which also helps access control. Ingestion becomes a distributed batch job with a work queue. And I'd cache aggressively at the query layer — embedding cache for repeated questions, and a semantic response cache for near-duplicate queries.

## 9. Common Mistakes

- Treating ingestion and query as one pipeline with one SLA.
- Filtering by permissions after retrieval instead of before.
- Not instrumenting retrieval and generation separately.
- Using one chunking strategy for every document type.
- Optimizing the prompt when the problem is upstream in parsing or chunking.

## 10. What to Remember

- **Two pipelines, one vector store.** Ingestion is batch data engineering; query is latency-budgeted serving.
- **Instrument the stages separately** — recall@k for retrieval, groundedness for generation.
- **ACL filter goes before retrieval**, never after.
- **Prepend title + section heading to chunks** — one of the cheapest large recall wins.
- **Quality lives upstream.** Bad parsing and chunking cannot be fixed downstream.

High Level Flow
================

                    DOCUMENTS
                       │
                       ↓
                 Work Queue
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Worker 1     Worker 2     Worker 3
          │            │            │
          ↓            ↓            ↓
       Parse         Parse         Parse
       Chunk         Chunk         Chunk
       Embed         Embed         Embed
          │            │            │
          └────────────┼────────────┘
                       ↓
                  Vector DB
                  ANN Index
                 (HNSW / IVF)
                       ↑
                       │
                       │
User Query ──→ Query Layer
                  │
                  ├── Embedding Cache
                  │
                  ├── Semantic Response Cache
                  │
                  ↓
            Hybrid Retrieval
            ├── BM25
            └── Dense ANN
                  ↓
                RRF
                  ↓
              Top 20
                  ↓
              Reranker
                  ↓
                Top 4
                  ↓
                 LLM
                  ↓
               Answer
