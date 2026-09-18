# Hierarchical Retrieval

> **Phase 09 · ADVANCED RAG · Topic 10**

## 1. Definition

Retrieving in stages across levels of granularity — first narrow to the relevant documents or sections, then retrieve chunks within them. It scales retrieval to large corpora and uses document structure as a filter.

## 2. Simple Explanation

Searching a million chunks flat means every chunk competes with every other, and near-duplicates from unrelated documents crowd each other out.

Hierarchical retrieval works the way a person uses a library: find the right book, then the right chapter, then the right page. Each level narrows the search space so the next level operates on a smaller, more relevant set.

## 3. How It Works

```
Level 1: Document summaries        (10,000 summaries)
             ↓ retrieve top-5 documents
Level 2: Section summaries within those 5 documents
             ↓ retrieve top-10 sections
Level 3: Chunks within those sections
             ↓ retrieve top-5 chunks
         → context
```

1. **Index at multiple levels** — document summaries, section summaries, and leaf chunks, each embedded.
2. **Retrieve coarse first** — find the relevant documents or sections.
3. **Constrain the next search** to children of those results.
4. **Repeat** down to leaf chunks.

**Summaries are generated at ingestion**, usually by an LLM, and they're what makes the coarse levels searchable — a document's raw text is too long and too varied to embed usefully.

**RAPTOR** is the well-known research variant: recursively cluster chunks, summarize each cluster, embed the summaries, and repeat — building a tree bottom-up rather than relying on the document's own structure. Useful when documents have no usable hierarchy.

## 4. Practical Example

**Where flat retrieval breaks and hierarchy helps:**

```
Corpus: 200 product documents, each with a near-identical structure:
        Overview / Fees / Eligibility / Terms / Disputes

Query: "What are the dispute procedures for Premier Savings?"

FLAT retrieval:
  top-5 results are "Disputes" sections from five DIFFERENT products.
  They're textually near-identical, so they all match equally well.
  The right one may not be in the top-5 at all.

HIERARCHICAL:
  Level 1 → "Premier Savings" document (summary matches the product name)
  Level 2 → constrained to that document → "Disputes" section  ✅
```

**That's the real use case:** corpora with many structurally similar documents, where the distinguishing information is *which document*, not *which passage*.

**The cheaper alternative that often works as well:**

```
Metadata filtering.

If you can extract "Premier Savings" from the query and filter
metadata by product, you get the same narrowing with one search
instead of three — and no summary index to build or maintain.
```

Hierarchical retrieval is worth its complexity when the routing decision genuinely requires semantic matching against summaries, rather than a filterable attribute.

## 5. Why It Matters

- **It scales to large corpora** by reducing the effective search space at each step.
- **It fixes the similar-documents problem**, where flat retrieval can't distinguish which product's "Fees" section you want.
- **Knowing when metadata filtering does the same job more cheaply** is the more valuable judgment.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Cascading errors** | A wrong document at level 1 makes every subsequent level wrong. Unrecoverable |
| **Multiple round trips** | Each level is a search; latency is additive |
| **Summary quality is load-bearing** | A bad LLM summary at ingestion breaks routing for that whole document |
| **Ingestion cost** | Generating and embedding summaries at every level |
| **Multiple indexes to maintain** | Summaries and chunks must stay in sync as documents change |
| **Cross-document answers fail** | If the answer spans two documents, narrowing to one loses it |

**The cascading-error problem is the main risk.** Mitigate by retrieving more than one document at level 1 — top-5 rather than top-1 — so a single ranking mistake doesn't eliminate the correct path. The narrowing should be generous at the top and tight at the bottom.

**The cross-document limitation is structural.** "Compare Premier Savings to Premier Checking" needs two documents, and a hierarchy that narrows to one will fail. Route comparison questions to multi-query retrieval instead.

## 7. Interview Answer

> "Hierarchical retrieval searches in stages across levels of granularity — first find the relevant documents or sections, then retrieve chunks within them. It works like using a library: the right book, then the right chapter, then the right page.
>
> The case where it clearly wins is a corpus of many structurally similar documents. If I have two hundred product documents that each have a Fees section and a Disputes section, and someone asks about dispute procedures for Premier Savings, flat retrieval returns five near-identical Disputes sections from five different products — they all match equally well, and the right one may not even be in the top five. Narrowing to the Premier Savings document first solves that completely.
>
> Implementation needs summaries at each level, generated at ingestion, because a document's raw text is too long and varied to embed usefully.
>
> The main risk is cascading errors — a wrong document at level one makes everything below it wrong, and there's no recovery. I'd mitigate by being generous at the top: retrieve top-five documents rather than top-one, so a single ranking mistake doesn't eliminate the correct path.
>
> The honest caveat is that metadata filtering often achieves the same narrowing more cheaply. If I can extract 'Premier Savings' from the query and filter on a product attribute, I get one search instead of three, with no summary index to build or maintain. Hierarchical retrieval earns its complexity when the routing genuinely needs semantic matching against summaries rather than a filterable attribute.
>
> And it structurally fails on cross-document questions — 'compare Premier Savings to Premier Checking' needs two documents, so I'd route comparisons to multi-query retrieval instead."

## 8. Likely Follow-ups

**Q: How does this differ from parent-child retrieval?**
Parent-child is one retrieval pass — you search children and return parents. Hierarchical is multiple sequential passes, each narrowing the search space for the next. Parent-child solves the chunk-size tension; hierarchical solves the scale and similar-documents problem. They compose: hierarchical narrowing down to a document, then parent-child within it.

**Q: What is RAPTOR?**
A research approach that builds the hierarchy bottom-up: recursively cluster chunks, summarize each cluster with an LLM, embed the summaries, and repeat to form a tree. Retrieval can then draw from any level. It's useful when documents have no usable inherent structure to build levels from, at the cost of significant ingestion compute.

**Q: What happens when the first level picks the wrong document?**
Everything below it is wrong and there's no recovery — that's the defining weakness. The mitigation is generous top-level retrieval, taking top-5 documents rather than top-1, so one ranking error doesn't eliminate the correct path. Some systems also add a fallback to flat retrieval when confidence at the top level is low.

**Q: When would you use metadata filtering instead?**
Whenever the narrowing attribute is extractable from the query and stored as metadata. Filtering on `product = "Premier Savings"` achieves the same restriction in one search with no summary index, no extra latency, and no cascading error risk. I'd reach for hierarchy only when the routing requires semantic similarity to a summary rather than an exact attribute match.

**Q: How do you handle questions spanning multiple documents?**
Hierarchical retrieval structurally can't, if it narrows to one document. I'd detect comparison and multi-entity questions in routing and send them to multi-query retrieval instead — decompose into per-entity queries, retrieve for each, and fuse. That's a good example of why modular routing matters: no single retrieval strategy handles every question shape.

## 9. Common Mistakes

- Retrieving only the top-1 document at the coarse level, making cascading errors likely.
- Building a summary hierarchy when metadata filtering would do the same job.
- Not keeping summary and chunk indexes in sync as documents change.
- Using it for cross-document comparison questions, which it can't handle.
- Underinvesting in summary quality, which is load-bearing for routing.

## 10. What to Remember

- **Coarse-to-fine retrieval** — documents, then sections, then chunks.
- **Best for many structurally similar documents**, where "which document" is the hard part.
- **Cascading errors are the main risk** — be generous at the top level.
- **Metadata filtering often does the same job cheaper.** Check that first.
- **Fails on cross-document questions** — route comparisons to multi-query instead.
