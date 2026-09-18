# Gemini RAG

> **Phase 19 · GOOGLE GEMINI · Topic 14**

## 1. Definition

A complete RAG system built on Google Cloud with Gemini as the generator — Document AI or custom parsing, Vertex AI embeddings, Vertex AI Vector Search, and Gemini for grounded generation with citations.

## 2. Simple Explanation

This is the reference architecture for the role: how the Google Cloud pieces fit together into a working, governable RAG system.

The interesting parts aren't the components — it's where the controls go.

## 3. How It Works

```
INGESTION (batch)
  GCS → Document AI / custom parse → clean → chunk
      → enrich (breadcrumbs) → embed (text-embedding-005)
      → Vector Search + payload store (Firestore/BigQuery)

QUERY (per request)
  authenticate → rewrite query → embed (RETRIEVAL_QUERY)
      → Vector Search with restricts (tenant, ACL, effective date)
      → + BM25 → RRF fuse → rerank → assemble context
      → Gemini (temp 0.1, system instruction, citations)
      → verify grounding → answer or abstain
```

**Vector Search stores vectors and restricts, not documents** — so chunk text lives in Firestore or BigQuery and is fetched by ID after retrieval. That's a required design, and it usefully means changing index technology later is a re-index rather than a data migration.

## 4. Practical Example

**Where the controls sit:**

```
PRE-FILTER IN THE ENGINE
  tenant, ACL groups, and effective date as Vector Search
  restricts — applied during the search, not after.
  Post-filtering leaks and silently under-retrieves.

EFFECTIVE DATE
  the filter that stops the system citing a superseded fee
  schedule as current. Grounding metrics won't catch that.

RELEVANCE THRESHOLD
  calibrated from labelled score distributions, not copied.
  It's what makes abstention possible.

CITATION
  source URI with a page anchor in chunk metadata, so every
  claim resolves to something a human can open.

VERIFICATION
  per-claim grounding check before answering; zero tolerance
  on numbers.
```

**Why hybrid matters specifically in banking:**

```
"What's the fee under clause 7.3(b)?"

"7.3(b)" carries almost no semantic signal, so dense
retrieval can miss it entirely while BM25 ranks it first.
Clause references, SWIFT codes, product names, error codes,
and form IDs are a large share of real banking queries.

So hybrid isn't an enhancement here — it's the default.
```

**Model tiering across the pipeline:**

```
query classification   → smallest tier
query rewriting        → smallest tier
generation             → Flash-class
complex investigation  → Pro-class, only when routed there
reranking              → a cross-encoder, not an LLM

One model everywhere means overpaying on the cheap steps
or underperforming on the hard ones.
```

## 5. Why It Matters

- **It's the reference architecture** for a Google Cloud AI Engineer role.
- **The controls — pre-filtering, effective date, threshold, verification** — are what make it shippable.
- **Hybrid retrieval is the default in banking**, because of exact identifiers.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Post-filtering permissions** | Leaks and under-retrieves |
| **No effective-date filter** | Superseded policy cited as current |
| **Dense-only retrieval** | Clause references and codes missed |
| **Uncalibrated threshold** | Abstention fires wrongly either way |
| **One model tier throughout** | Overpaying or underperforming |
| **Unverified claims** | Unsupported figures reach customers |

**On what's easy to under-invest in:** parsing. Teams spend weeks tuning retrieval parameters while a table-heavy fee schedule was flattened into unusable text at ingestion. Parsing quality is the ceiling on everything downstream, and reading a sample of extracted text is ten minutes that saves weeks.

**On the ingestion/query split:** ingestion is batch, inspectable, and rerunnable; the query path is what customers experience and regulators ask about. That's why I'd accept more framework convenience in ingestion and write the query path explicitly.

## 7. Interview Answer

> "The architecture is two pipelines. Ingestion is batch: documents from GCS, parsed with Document AI or a custom parser, cleaned, chunked with structure awareness, enriched with breadcrumbs, embedded with text-embedding-005, and written to Vertex AI Vector Search with the chunk text in Firestore or BigQuery. Vector Search stores vectors and restricts, not documents — so payloads are fetched by ID after retrieval. That's required, and it usefully means changing index technology later is a re-index rather than a data migration.
>
> The query path: authenticate, rewrite the query for context, embed with the query task type, search Vector Search with restricts on tenant, ACL groups, and effective date, run BM25 in parallel, fuse with reciprocal rank fusion, rerank with a cross-encoder, assemble context with numbered sources, generate with Gemini at temperature around 0.1 with a grounding system instruction, verify the claims, and either answer with citations or abstain.
>
> The parts I'd emphasize are the controls. Permission filters go in the engine as restricts, applied during the search — post-filtering both leaks and silently under-retrieves. The effective-date filter is the one teams forget and it's what stops the system citing a superseded fee schedule as current, which grounding metrics won't catch. The relevance threshold is calibrated from labelled score distributions, not copied, because it's what makes abstention possible. And verification per claim before answering, with zero tolerance on numbers.
>
> Hybrid retrieval is the default here rather than an enhancement. A query like 'what's the fee under clause 7.3(b)' — that string carries almost no semantic signal, so dense retrieval can miss it entirely while BM25 ranks it first. Clause references, SWIFT codes, product names, and form IDs are a large share of real banking queries.
>
> I'd also tier models across the pipeline: smallest tier for classification and query rewriting, Flash-class for generation, Pro-class only where a request was routed to complex investigation, and a cross-encoder rather than an LLM for reranking.
>
> The thing most under-invested in is parsing. Teams spend weeks tuning retrieval while a table-heavy fee schedule was flattened into unusable text at ingestion. Parsing quality is the ceiling on everything downstream, and reading a sample of extracted text is ten minutes that saves weeks."

## 8. Likely Follow-ups

**Q: Where does the chunk text live?**
Not in Vector Search — it stores vectors and restricts only. Chunk text and full metadata go in Firestore, BigQuery, or GCS, fetched by ID after retrieval. That's a required design, and it means swapping index technology later is a re-index rather than a data migration.

**Q: Why is hybrid retrieval the default in banking?**
Because exact identifiers are a large share of real queries — clause references, SWIFT codes, product names, error codes, form IDs. Strings like "7.3(b)" carry almost no semantic signal, so dense retrieval can miss them entirely while BM25 ranks them first.

**Q: Which filters go on every query?**
Tenant and ACL groups for isolation and authorization, and effective date for currency. The effective-date filter is the one most often missed, and it's what prevents the system citing a superseded fee schedule as if it were current — a failure groundedness metrics pass.

**Q: How do you tier models across the pipeline?**
Smallest tier for classification and query rewriting, Flash-class for generation, Pro-class only for requests routed to complex investigation, and a cross-encoder rather than an LLM for reranking. One model everywhere means overpaying on the simple steps or underperforming on the hard ones.

**Q: What's most commonly under-invested in?**
Parsing. It's the ceiling on everything downstream, so a flattened table at ingestion can't be recovered by any amount of retrieval tuning. Reading a sample of extracted text against the source documents is ten minutes of work that prevents weeks of misdirected optimization.

## 9. Common Mistakes

- Filtering permissions after retrieval rather than in the engine.
- Omitting the effective-date filter.
- Dense-only retrieval in a corpus full of exact identifiers.
- Using one model tier across the whole pipeline.
- Tuning retrieval before verifying parsing quality.

## 10. What to Remember

- **Vector Search holds vectors and restricts**; payloads live elsewhere.
- **Pre-filter tenant, ACL, and effective date** in the engine.
- **Hybrid is the default** — exact identifiers dominate banking queries.
- **Calibrated threshold + per-claim verification** enable abstention.
- **Parsing is the ceiling** — check it before tuning anything else.
