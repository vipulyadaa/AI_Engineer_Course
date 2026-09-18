# Semantic Chunking

> **Phase 08 · RAG FUNDAMENTALS · Topic 11**

## 1. Definition

Splitting text where the *meaning* shifts rather than at fixed character counts. You embed consecutive sentences, measure similarity between neighbours, and cut where similarity drops — so boundaries fall at genuine topic changes.

## 2. Simple Explanation

Fixed-size chunking cuts at character 600 regardless of what's happening there. Semantic chunking reads the text and cuts where the subject changes.

The result is chunks that each cover one coherent topic, which is exactly what you want an embedding to represent. The cost is an extra embedding pass over every sentence in your corpus at ingestion time.

## 3. How It Works

1. **Split into sentences** (or small groups of 2–3 sentences for stability).
2. **Embed each unit.**
3. **Compute similarity between consecutive units** — cosine between neighbouring embeddings.
4. **Find the drops** — a low similarity between sentence `i` and `i+1` signals a topic shift.
5. **Cut at drops** below a threshold, usually set as a percentile of the similarity distribution rather than an absolute value.
6. **Enforce size bounds** — merge chunks below a minimum, force-split above a maximum.

```
sentence:      s1   s2   s3   s4   s5   s6   s7   s8
similarity:      .91  .88  .43  .89  .92  .38  .90
                           ↑cut            ↑cut

→ [s1 s2 s3] [s4 s5 s6] [s7 s8]
  each chunk covers one coherent topic
```

**Why percentile thresholds:** absolute cosine values aren't comparable across documents or embedding models. Cutting at the 5th percentile of a document's own similarity distribution adapts automatically.

## 4. Practical Example

**Where semantic chunking earns its cost:**

```
❌ Fixed 600-token split on a policy document:

Chunk 1: "...Premier accounts waive this fee entirely. ## Overdraft
          Protection. Overdraft protection is an optional service that
          covers transactions exceeding your available balance."
          ↑ two unrelated topics in one chunk; the embedding sits between them

✅ Semantic split:

Chunk 1: "...Premier accounts waive this fee entirely."       [fees topic]
Chunk 2: "Overdraft protection is an optional service..."     [overdraft topic]
          ↑ each embedding is specific
```

**But note what would also have fixed this:** splitting on the `##` markdown heading. If the document has structure, structure-aware chunking gets the same result for free.

**So the honest rule:** semantic chunking is for documents with *no usable structure* — transcripts, scanned prose, OCR'd text, continuous narrative. If there are headings, use them.

## 5. Why It Matters

- **It produces topically coherent chunks**, which is what makes an embedding specific and retrievable.
- **It's the right tool for unstructured prose** where there's nothing else to split on.
- **Knowing when *not* to use it** — structured documents — is the more useful judgment.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Ingestion cost** | An embedding call per sentence across the whole corpus. Significantly slower and more expensive than character splitting |
| **Variable chunk sizes** | Some chunks come out very small or very large; needs min/max enforcement |
| **Threshold sensitivity** | Too aggressive fragments the document; too lax produces one giant chunk |
| **Gradual topic drift** | A long passage that shifts slowly has no clear drop to cut at |
| **Often no better than structure-aware** | On documents with headings, markdown splitting matches it for free |
| **Re-running on updates** | Editing one paragraph can shift all downstream boundaries, invalidating chunk IDs |

**That last one is practically annoying:** with fixed-size chunking, an edit affects local chunks. With semantic chunking, a change in similarity can move every subsequent boundary, so incremental re-indexing by content hash becomes less effective.

## 7. Interview Answer

> "Semantic chunking splits where meaning shifts rather than at fixed character counts. You embed consecutive sentences, measure cosine similarity between neighbours, and cut where similarity drops — so boundaries land at genuine topic changes instead of arbitrary positions.
>
> The benefit is topically coherent chunks. A fixed six-hundred-token split can put the end of a fees section and the start of an overdraft section in the same chunk, and that chunk's embedding sits between two topics and matches neither well. Semantic splitting separates them.
>
> The honest caveat is that on documents with real structure, markdown-heading splitting achieves the same thing for free. Semantic chunking costs an embedding call per sentence across the entire corpus, which is a significant ingestion expense. So I'd reserve it for content with no usable structure — call transcripts, OCR'd prose, continuous narrative — and use structure-aware splitting wherever headings exist.
>
> Two implementation details. I'd set the split threshold as a percentile of the document's own similarity distribution rather than an absolute cosine value, because absolute values aren't comparable across documents or embedding models. And I'd enforce minimum and maximum chunk sizes on top, because pure semantic splitting produces very uneven chunks.
>
> One practical downside: an edit to one paragraph can shift every downstream boundary, which makes content-hash-based incremental re-indexing much less effective than it is with fixed-size splitting."

## 8. Likely Follow-ups

**Q: When would you use semantic chunking over recursive splitting?**
When the document has no usable structure — transcripts, OCR output, continuous prose without headings. If there are markdown headings, HTML sections, or function boundaries, structure-aware splitting gets equivalent coherence at a fraction of the ingestion cost. I'd try structure first and reach for semantic only when there isn't any.

**Q: How do you set the similarity threshold?**
As a percentile of the document's own distribution of consecutive-sentence similarities — typically cutting at the 5th or 10th percentile. Absolute cosine values don't transfer across documents or embedding models, so a hardcoded 0.5 behaves very differently on different content. I'd then validate by reading the resulting boundaries on a sample.

**Q: What's the cost?**
One embedding call per sentence at ingestion, versus zero for character splitting. On a corpus of a few million sentences that's a real expense in both money and time, and it recurs whenever you re-ingest. It's worth it when it materially improves recall on unstructured content, and not worth it when structure-aware splitting would have done the same job.

**Q: How do you handle gradual topic drift?**
It's the genuine weakness — a passage that shifts slowly has no sharp similarity drop to cut at, so semantic chunking either doesn't split it or splits it arbitrarily. Enforcing a maximum chunk size handles the practical consequence. Comparing each sentence against a rolling window average rather than just its immediate neighbour also helps detect slow drift.

**Q: Does it work on non-prose content?**
Poorly. Tables, code, and structured data don't have sentence-level semantic flow, so consecutive-embedding similarity is meaningless there. Those need their own strategies — keep tables whole, split code on function boundaries. I'd route by content type and apply semantic chunking only to the prose.

## 9. Common Mistakes

- Using it on documents that have headings, where structure-aware splitting is free and equivalent.
- Setting an absolute similarity threshold instead of a percentile.
- Not enforcing min and max chunk sizes on top of the semantic boundaries.
- Applying it to tables or code, where sentence similarity is meaningless.
- Ignoring that it breaks content-hash-based incremental re-indexing.

## 10. What to Remember

- **Cut where consecutive-sentence similarity drops** — boundaries at real topic shifts.
- **Use it only when there's no structure to split on.** Headings beat it for free.
- **Threshold as a percentile**, not an absolute cosine value.
- **Enforce min/max size bounds** on top of semantic boundaries.
- **Costs an embedding call per sentence** at ingestion, and complicates incremental re-indexing.
