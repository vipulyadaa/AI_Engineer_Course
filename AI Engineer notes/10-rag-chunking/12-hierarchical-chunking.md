# Hierarchical Chunking

> **Phase 10 · RAG CHUNKING · Topic 12**

## 1. Definition

Chunking a document at multiple levels of granularity at once — document, section, paragraph — and indexing the levels so retrieval can operate at whichever granularity fits the question.

## 2. Simple Explanation

One chunk size can't serve every question.

"What's the international wire fee?" wants a small precise chunk. "Summarize our fee policy" wants a whole section. "What topics does this document cover?" wants a document-level summary.

Hierarchical chunking builds all of them, so retrieval can pick the right level rather than forcing everything through one granularity.

## 3. How It Works

```
Document
  └─ Document summary        (LLM-generated, ~200 tokens)  → indexed
      ├─ Section: "3. Fees"
      │    └─ Section summary (~150 tokens)                → indexed
      │        ├─ Paragraph chunk (~400 tokens)            → indexed
      │        ├─ Paragraph chunk (~400 tokens)            → indexed
      │        └─ Table chunk                              → indexed
      └─ Section: "4. Disputes"
           └─ ...
```

1. **Split at each level** — document, section, paragraph.
2. **Generate summaries** for the coarse levels, since raw section text is too long and varied to embed usefully.
3. **Index all levels**, with `level` and `parent_id` in metadata.
4. **At query time**, either search all levels together, or route by question type.
5. **Deduplicate across levels** — don't return both a section summary and its child paragraph.

**Distinction from [parent-child retrieval](../09-advanced-rag/09-parent-child-retrieval.md):** parent-child indexes *only* children and returns parents. Hierarchical indexes *every* level as independently searchable.

## 4. Practical Example

**Different question types finding their level:**

```
"What's the Premier international wire fee?"
  → matches the PARAGRAPH chunk containing the fee table row.
    Precise, minimal context.

"What does our fee policy cover?"
  → matches the SECTION SUMMARY for "3. Fees".
    No paragraph chunk contains an overview — only the summary does.

"What's in the Retail Banking Policy document?"
  → matches the DOCUMENT SUMMARY.
    Nothing else can answer this.
```

**That middle and last case is the point.** Flat chunking at any single size cannot answer "what does this cover" questions, because no chunk contains an overview — overviews don't exist in the source text, they have to be generated.

**Deduplication across levels is essential:**

```
top-5 raw results:
  1. section summary "3. Fees"
  2. paragraph "3.2 International Transfers"   ← child of #1
  3. paragraph "3.1 Domestic Transfers"        ← child of #1
  4. document summary                          ← ancestor of all
  5. paragraph from a different document

Returning all five sends overlapping content at three granularities.
→ Collapse: keep the most specific matching level per subtree,
  or keep the summary and drop its children.
```

## 5. Why It Matters

- **It answers "global" questions** that flat chunking structurally cannot.
- **It lets one index serve different question granularities** without compromising on a single size.
- **It's the ingestion-side counterpart** to hierarchical retrieval.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Ingestion cost** | LLM summary generation at every coarse level |
| **Index size** | 1.3–1.5× more vectors than flat chunking |
| **Summary quality is load-bearing** | A bad summary makes that whole subtree unfindable |
| **Deduplication required** | Otherwise results overlap across levels |
| **Re-summarization on updates** | A paragraph edit may invalidate its section and document summaries |
| **Often unnecessary** | If all questions are specific lookups, the coarse levels are dead weight |

**The update-propagation problem is the real operational cost.** Change one paragraph and, strictly, its section summary and document summary are both stale. Regenerating them on every edit is expensive; not regenerating them means summaries drift from content. A practical compromise is regenerating summaries on a schedule rather than on every change, and accepting bounded staleness at the coarse levels.

**When to skip it:** if your query logs show only specific factual lookups, summary levels are pure cost. Check before building.

## 7. Interview Answer

> "Hierarchical chunking splits a document at multiple granularities at once — document, section, paragraph — and indexes all of them, so retrieval can operate at whichever level fits the question.
>
> The motivation is that one chunk size can't serve every question type. 'What's the international wire fee' wants a small precise chunk. 'What does our fee policy cover' wants a section-level overview. And critically, no paragraph chunk contains an overview — overviews don't exist in the source text, they have to be generated. So flat chunking at any single size structurally cannot answer that second kind of question.
>
> Implementation is: split at each level, generate LLM summaries for the coarse levels since raw section text is too long to embed usefully, and index everything with level and parent_id in metadata.
>
> The thing that has to be handled carefully is deduplication across levels. A top-five result set can contain a section summary, two of its child paragraphs, and the document summary — that's the same content at three granularities, wasting context. I'd collapse to the most specific matching level per subtree.
>
> The operational cost I'd flag is update propagation. Changing one paragraph technically invalidates its section summary and its document summary. Regenerating those on every edit is expensive, so the practical compromise is regenerating coarse summaries on a schedule and accepting bounded staleness at those levels.
>
> And I'd check the query logs first. If everything users ask is a specific factual lookup, the summary levels are pure cost with no benefit."

## 8. Likely Follow-ups

**Q: How is this different from parent-child retrieval?**
Parent-child indexes only the small children and returns their parents — one searchable level, two storage levels. Hierarchical indexes every level as independently searchable, so a query can match a section summary directly. Parent-child solves the chunk-size tension; hierarchical additionally enables overview-level questions.

**Q: How do you generate the summaries?**
An LLM at ingestion, prompted to summarize the section or document for retrieval purposes — emphasizing what topics it covers rather than producing a narrative abstract, since the summary's job is to match "what does this cover" queries. With prompt caching, the document is a shared prefix across its sections, which cuts the cost substantially.

**Q: How do you handle deduplication across levels?**
Track parent relationships in metadata and collapse results within a subtree — keep the most specific match, or keep the summary and drop its children depending on the question type. Returning a summary and its own paragraphs is redundant context. I'd apply this after fusion and before building the prompt.

**Q: What happens when a document is updated?**
The changed paragraph is re-chunked and re-embedded, but its section and document summaries are now potentially stale. Regenerating them on every edit is expensive; the practical approach is marking them dirty and regenerating on a schedule. That means accepting bounded staleness at coarse levels, which is usually fine since summaries change slowly even when details do.

**Q: When is it not worth it?**
When your query distribution is all specific factual lookups, which you can check from production logs. The summary levels cost LLM calls at ingestion, extra index size, and update-propagation complexity — and if nobody asks overview questions, none of that buys anything. I'd measure the query mix before building it.

## 9. Common Mistakes

- Building it before checking whether users actually ask overview-level questions.
- Not deduplicating across levels, sending the same content at three granularities.
- Treating summaries as free — they're LLM calls at ingestion and on every update.
- Letting coarse summaries drift arbitrarily far from updated content.
- Confusing it with parent-child retrieval, which indexes only one level.

## 10. What to Remember

- **Index document, section, and paragraph levels** so retrieval picks the right granularity.
- **Coarse levels need generated summaries** — raw section text embeds poorly.
- **It's the only way to answer "what does this cover" questions** — overviews don't exist in the source.
- **Deduplicate across levels** or results overlap badly.
- **Update propagation is the real cost.** Regenerate summaries on a schedule, not per edit.
