# Chunking

> **Phase 08 · RAG FUNDAMENTALS · Topic 08**

## 1. Definition

Splitting documents into smaller units that get embedded and retrieved independently. A chunk is the atomic unit of retrieval — whatever the system can find, it finds a chunk at a time.

## 2. Simple Explanation

You can't embed a 200-page document into one useful vector — it would average everything it contains into a meaningless blur. So you split it.

The tension: a chunk must be **small enough that its embedding is specific** and **large enough to contain a complete answer**. Split too small and a fact loses the context that makes it interpretable. Split too large and the embedding blurs across topics.

## 3. How It Works

The strategies, in increasing sophistication:

| Strategy | How | Use for |
|---|---|---|
| **Fixed-size** | Every N characters/tokens | Baseline only; splits mid-sentence |
| **Recursive character** | Try `\n\n`, then `\n`, then `. `, then space — respect the largest boundary that fits | **The sensible default** |
| **Structure-aware** | Split on markdown headings, HTML sections, code functions | When documents have real structure |
| **Semantic** | Split where consecutive sentence embeddings diverge | Unstructured prose; costs an embedding pass |
| **Parent-child** | Embed small chunks, return their larger parent | Best of both — precision in search, context in the prompt |

**Always add overlap.** 10–20% of chunk size, so a fact spanning a boundary appears complete in at least one chunk.

**Always enrich.** Prepend the document title and section heading to each chunk before embedding — an isolated chunk loses the context that says what it's about.

## 4. Practical Example

**Why enrichment matters more than most tuning:**

```
❌ Raw chunk:
   "The fee is $45 for retail accounts and $25 for Premier."

   Query: "international wire transfer cost"
   → Poor match. The chunk never says "wire" or "international."

✅ Enriched chunk:
   "Retail Fees Schedule > 3.2 International Transfers
    The fee is $45 for retail accounts and $25 for Premier."

   → Strong match. The heading supplies the topic the body assumed.
```

This is one of the cheapest, largest recall improvements available, and it's frequently skipped.

**Sensible defaults to start from:**

```
chunk_size    ≈ 500–800 tokens        (prose)
overlap       ≈ 10–15% of chunk_size
splitter      = recursive, structure-aware where structure exists
enrichment    = title + heading breadcrumb prepended
tables        = kept whole, never split by character count
code          = split on function/class boundaries
```

Then tune against a real eval set rather than by feel.

## 5. Why It Matters

- **Chunking is the highest-leverage decision in the ingestion pipeline**, and usually the biggest single lever on retrieval quality.
- **It's unrecoverable downstream.** A fact split across two chunks can't be reassembled by a reranker or a better prompt.
- **It interacts with everything** — chunk size affects embedding quality, top-k choice, context budget, and cost per query.

## 6. Trade-offs / Failure Modes

| Chunk too small | Chunk too large |
|---|---|
| Facts split across boundaries | Embedding blurs multiple topics |
| Pronouns lose their referent | Retrieved chunk is mostly irrelevant filler |
| Need higher top-k to reassemble | Wastes context budget and money |
| More chunks = higher index cost | Lower precision; the answer is buried |

| Other failures | Detail |
|---|---|
| **Tables split mid-table** | Column headers orphaned from data rows |
| **No overlap** | A fact straddling a boundary appears complete in neither chunk |
| **One strategy for all content types** | Prose, tables, and code need different splitting |
| **No enrichment** | Chunks lose the topic their heading supplied |
| **Tuning by intuition** | Chunk size must be measured against a real eval set |

## 7. Interview Answer

> "Chunking splits documents into the units that get embedded and retrieved. A chunk is the atomic unit of retrieval — whatever the system finds, it finds a chunk at a time.
>
> The core tension is that a chunk has to be small enough for its embedding to be specific and large enough to contain a complete answer. Too small and a fact loses the context that makes it interpretable, or gets split across a boundary. Too large and the embedding blurs across topics and the retrieved text is mostly filler.
>
> My default is recursive character splitting that respects structure — try paragraph breaks first, then sentences — at around five to eight hundred tokens with ten to fifteen percent overlap. Structure-aware splitting on markdown headings where the documents have real structure.
>
> The single highest-value thing I'd do is enrichment: prepend the document title and section heading to each chunk before embedding. A raw chunk might say 'the fee is forty-five dollars for retail accounts,' which matches a query about international wire costs poorly because the chunk never says 'wire' or 'international' — the heading did. Prepending the breadcrumb fixes that, and it's one of the cheapest large recall wins available.
>
> Two rules I'd hold to. Tables never get split by character count — the header row has to stay with the data. And chunk size gets tuned against a real eval set, not by intuition, because the right answer depends heavily on your document type and query style."

## 8. Likely Follow-ups

**Q: How do you choose chunk size?**
Empirically, against an eval set of real questions with known correct sources. I'd sweep sizes — say 256, 512, 800, 1200 tokens — and measure recall@k for each. The right answer depends on document type and query style: short factual lookups favour smaller chunks, questions needing reasoning across a passage favour larger. Starting point is 500–800 tokens for prose, then measure.

**Q: What does overlap do and how much?**
It prevents a fact that straddles a boundary from being incomplete in both chunks. Typically 10–20% of chunk size. The cost is index size and some duplicate content in retrieval results. Too much overlap means near-duplicate chunks crowding the top-k, which wastes context on repeated text.

**Q: What is parent-child chunking?**
Embed small chunks for precise matching, but return a larger parent chunk to the LLM. You get retrieval precision from the small unit and complete context from the large one. It's the cleanest resolution of the size tension and it's my default for documents where facts need surrounding context to interpret.

**Q: How do you chunk tables and code?**
Tables stay whole where possible; if a table must be split, repeat the header row in each piece so columns stay labeled. A useful variant is indexing both a natural-language summary of the table and the raw table — the summary retrieves semantically, the table gives exact values. Code splits on function or class boundaries, ideally with the file path and imports prepended so the chunk is interpretable in isolation.

**Q: What is semantic chunking and is it worth it?**
It embeds consecutive sentences and splits where the similarity between them drops, so boundaries fall at genuine topic shifts rather than arbitrary character counts. It's worth it for unstructured prose with no headings. For documents that already have markdown or HTML structure, structure-aware splitting gets most of the benefit for none of the embedding cost — so I'd try structure first.

## 9. Common Mistakes

- Using fixed-size character splitting as the production strategy.
- No overlap.
- Not prepending title and section heading before embedding.
- Splitting tables by character count.
- Choosing chunk size by intuition rather than measuring recall@k.
- One chunking strategy for prose, tables, and code alike.

## 10. What to Remember

- **The chunk is the atomic unit of retrieval.** Everything downstream inherits these boundaries.
- **The tension:** small enough to be specific, large enough to contain the answer.
- **Default:** recursive structure-aware splitting, 500–800 tokens, 10–15% overlap.
- **Enrich with title + heading breadcrumb** — cheapest big recall win.
- **Tune against an eval set**, and never split tables by character count.
