# Contextual Retrieval

> **Phase 09 · ADVANCED RAG · Topic 13**

## 1. Definition

Prepending a short LLM-generated description of a chunk's place in its document *before embedding it*, so each chunk carries the context it would otherwise have lost by being isolated. An ingestion-time technique introduced by Anthropic in 2024.

## 2. Simple Explanation

A chunk taken out of its document loses everything the surrounding text established.

```
Raw chunk: "The fee is waived for balances above $10,000."

Waived from what? Which account? Which product?
The chunk is meaningless alone — and its embedding is
correspondingly vague.
```

Contextual retrieval fixes this at ingestion by having an LLM write a sentence situating the chunk, and prepending it before embedding:

```
"This chunk is from the Premier Savings Account fee schedule,
 discussing monthly maintenance fee waivers.
 The fee is waived for balances above $10,000."
```

Now the embedding knows what the chunk is about.

## 3. How It Works

```
For each chunk:
  1. Send the WHOLE document + this chunk to an LLM
  2. Prompt: "Give a short context that situates this chunk
              within the document, for search retrieval purposes."
  3. Prepend the generated context to the chunk text
  4. Embed the combined text
  5. Index it (and also index the contextualized text in BM25)
```

**Prompt caching is what makes this affordable.** The document is the same for every chunk in it, so it's a cached prefix — you pay full price for the document once and a small amount per chunk.

**The relationship to cheaper alternatives:**

| Technique | Context added | Cost |
|---|---|---|
| Title + heading prepend | Document title, section path | **Free** — no LLM |
| Contextual retrieval | LLM-written situating description | One cached LLM call per chunk |
| Parent-child | Full parent section returned | No ingestion cost, more query tokens |

**Try the free one first.** Prepending the title and heading breadcrumb captures much of the same benefit at zero cost, and it's the higher-leverage change per unit of effort.

## 4. Practical Example

**The measurable effect:**

```
Chunk: "The fee is waived for balances above $10,000."

Query: "how do I avoid the Premier monthly fee?"

Raw embedding:           no match — chunk never says "Premier",
                         "monthly", or "avoid"
Title+heading prepend:   good match — heading supplies "Premier Savings",
                         "Monthly Maintenance Fee"
Contextual retrieval:    good match, plus the LLM added "waiver
                         eligibility" phrasing the heading didn't have
```

Anthropic's published results reported substantial reductions in retrieval failure rate when combining contextual embeddings with contextual BM25 and reranking. The technique is real; the question is whether it beats the free alternative on *your* documents.

**Where it clearly wins over heading-prepending:** documents with poor or absent structure — transcripts, scanned reports, legacy content without headings. There's no breadcrumb to prepend, so the LLM has to construct the context.

## 5. Why It Matters

- **It directly targets the "chunk lacks context" failure**, which is one of the most common RAG quality problems.
- **It's ingestion-time**, so it costs nothing at query latency — unlike reranking or query rewriting.
- **Prompt caching makes it economically viable**, which it wouldn't otherwise be at corpus scale.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Ingestion cost** | One LLM call per chunk. Cached, but still real at a million chunks |
| **Re-ingestion cost** | Every re-index regenerates contexts unless you cache by content hash |
| **Document must fit in context** | Very long documents need a summary or a section instead of the full text |
| **LLM can hallucinate context** | Invents a document structure that doesn't exist |
| **Often redundant** | Title + heading prepending captures much of the benefit for free |
| **Adds tokens to every chunk** | Slightly larger index; marginal |

**The honest evaluation:** on well-structured documents with good headings, contextual retrieval's gain over simple breadcrumb-prepending is often small. On unstructured documents it's substantial. Measure both against your corpus before paying the ingestion bill.

## 7. Interview Answer

> "Contextual retrieval prepends a short LLM-generated description of a chunk's place in its document before embedding it. It's an ingestion-time technique from Anthropic.
>
> The problem is that a chunk taken out of its document loses everything the surrounding text established. A chunk saying 'the fee is waived for balances above ten thousand dollars' doesn't say which fee, which account, or which product — so its embedding is vague and it won't match a query about avoiding the Premier monthly fee. Prepending 'this chunk is from the Premier Savings fee schedule, discussing monthly maintenance fee waivers' fixes that.
>
> What makes it affordable is prompt caching. The document is identical for every chunk in it, so it's a cached prefix — you pay full price for the document once and a small amount per chunk. Without caching this would be prohibitive at corpus scale.
>
> The honest caveat I'd give is that simply prepending the document title and section heading breadcrumb captures a lot of the same benefit for free, with no LLM call at all. On well-structured documents the marginal gain from the LLM version is often small. Where it clearly wins is unstructured content — transcripts, scanned reports, legacy documents with no headings — because there's no breadcrumb to prepend and the LLM has to construct the context.
>
> So I'd try the free version first, measure, and only pay for contextual retrieval if the gap justifies it. The advantage over query-time techniques like reranking is that it costs nothing at query latency — the work happens once at ingestion."

## 8. Likely Follow-ups

**Q: How is this different from just prepending the heading?**
Heading-prepending uses the document's existing structure, which is free and deterministic. Contextual retrieval has an LLM write a situating description, which can capture relationships the heading doesn't express and works on documents with no structure at all. On well-structured documents the difference is often small, which is why I'd measure before paying for it.

**Q: What's the cost at scale?**
One LLM call per chunk, with the document as a cached prefix. For a million chunks that's a million calls — affordable with caching but not trivial, and it recurs on every full re-index. I'd cache generated contexts by chunk content hash so re-ingestion only regenerates what changed.

**Q: What if the document doesn't fit in the model's context?**
Use a document summary plus the surrounding section rather than the full text. That loses some cross-document-wide context but keeps the technique viable. For very large documents, section-level context is usually sufficient anyway — the useful signal is local.

**Q: Does it help BM25 too?**
Yes, and Anthropic's results indexed the contextualized text in both. The added context introduces terms the raw chunk lacked — "Premier," "monthly maintenance" — which BM25 can then match lexically. That's arguably a larger relative gain for BM25 than for dense retrieval, since BM25 has no semantic bridging at all.

**Q: How does it compare to parent-child retrieval?**
They solve the same problem differently. Contextual retrieval pays at ingestion and keeps chunks small at query time. Parent-child pays at query time in context tokens and needs no ingestion LLM calls. Contextual is better when context budget is tight; parent-child is better when ingestion cost is the constraint or the document genuinely needs to be read at section granularity. They can be combined.

## 9. Common Mistakes

- Paying for contextual retrieval without first trying free heading-prepending.
- Not using prompt caching, making the ingestion cost prohibitive.
- Regenerating contexts on every re-index instead of caching by content hash.
- Assuming it always beats simpler alternatives — on structured documents it often doesn't.
- Only indexing contextualized text in the vector store and not in BM25.

## 10. What to Remember

- **LLM-written context prepended to each chunk before embedding.** Ingestion-time.
- **Prompt caching makes it viable** — the document is a cached prefix across its chunks.
- **Title + heading prepending is the free alternative** — try it first and measure the gap.
- **Clearly wins on unstructured content** with no headings to prepend.
- **Index the contextualized text in BM25 too** — arguably a bigger relative gain there.
