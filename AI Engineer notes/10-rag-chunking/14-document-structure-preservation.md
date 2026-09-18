# Document Structure Preservation

> **Phase 10 · RAG CHUNKING · Topic 14**

## 1. Definition

Carrying a document's organizational structure — heading hierarchy, section numbering, lists, tables, cross-references — through parsing and chunking into the index, so it's available for retrieval, enrichment, and citation.

## 2. Simple Explanation

Structure is information the author already encoded for you.

A heading says what a section is about. A section number is a citation target. A list implies the items are parallel. A table's shape carries the answer. Throwing all of that away at parse time and then trying to recover meaning from raw text is doing work the document already did.

## 3. How It Works

**What to preserve, and what each is for:**

| Structure | Used for |
|---|---|
| **Heading hierarchy** | Chunk boundaries, breadcrumb enrichment, citation |
| **Section numbers** | Precise citation targets a reviewer can look up |
| **Page numbers** | PDF citation anchors |
| **Lists** | Keeping parallel items together |
| **Tables** | The row-column relationship that *is* the answer |
| **Emphasis (bold/italic)** | Often marks defined terms |
| **Cross-references** | "See § 4.2" — a retrieval hint |
| **Effective dates** | Freshness filtering and version resolution |

**The pipeline principle:** structure must survive every stage.

```
Parse    → emit markdown, not plain text
Clean    → strip boilerplate, KEEP headings and table markup
Chunk    → split on structure, carry the breadcrumb
Enrich   → prepend breadcrumb to chunk text before embedding
Index    → store structure fields in metadata
Retrieve → filter and cite using them
```

A single stage that flattens to plain text destroys everything downstream.

## 4. Practical Example

**The metadata that structure preservation produces:**

```json
{
  "chunk_id":   "policy-retail-2026#3.2:1",
  "breadcrumb": "Retail Banking Policy > 3. Fees > 3.2 International Transfers",
  "h1": "Retail Banking Policy",
  "h2": "3. Fees",
  "h3": "3.2 International Transfers",
  "section_number": "3.2",
  "page": 14,
  "content_type": "table",
  "effective_date": "2026-01-01",
  "source_uri": "https://.../policy.pdf#page=14"
}
```

**What each field enables:**

```
breadcrumb       → prepended to chunk text → big recall gain
section_number   → citation: "Retail Banking Policy § 3.2"
page             → the reviewer can open the PDF at the right page
content_type     → route tables to different prompt formatting
effective_date   → filter out superseded versions
h2 / h3          → filter retrieval to a section when the query names one
```

**The cross-reference case, which is often overlooked:**

```
Chunk text: "International transfer fees are subject to the waiver
             provisions in § 4.2."

If § 4.2 isn't retrieved, the answer is incomplete.
Preserving the cross-reference lets you detect it and
fetch the referenced section as an additional hop.
```

## 5. Why It Matters

- **Structure is free signal** the author already provided — discarding it is pure loss.
- **Citation quality depends entirely on it.** Without section and page, you can only cite whole documents.
- **It's the enabler for every other technique** — filtering, enrichment, hierarchical retrieval, conflict resolution by date.

## 6. Trade-offs / Failure Modes

| Failure | Consequence |
|---|---|
| **Parser emits plain text** | All structure lost at stage one; unrecoverable |
| **Cleaning strips headings** | Chunking has nothing to split on; no breadcrumb |
| **Structure in metadata only** | Doesn't affect the embedding — metadata isn't embedded |
| **Inconsistent source formatting** | Documents using bold instead of headings defeat detection |
| **Converted documents** | HTML-to-markdown and Word conversions often produce inconsistent levels |
| **No effective date captured** | Superseded versions compete with current ones |
| **Cross-references dropped** | Incomplete answers when a referenced section isn't retrieved |

**The most common and most costly mistake:** storing the breadcrumb in metadata but not prepending it to the chunk text. Metadata isn't embedded, so it does nothing for retrieval — you get citation support and none of the recall benefit. The breadcrumb needs to be in **both** places, for two different purposes.

## 7. Interview Answer

> "Document structure preservation means carrying the heading hierarchy, section numbers, page numbers, tables, and dates through parsing and chunking into the index.
>
> The framing I'd use is that structure is free signal the author already encoded. A heading tells you what a section is about; a section number is a citation target; a table's shape carries the answer. Discarding it at parse time and then trying to recover meaning from raw text is redoing work the document already did for you.
>
> The critical property is that it has to survive *every* stage. The parser emits markdown rather than plain text, cleaning strips boilerplate but keeps headings and table markup, chunking splits on structure and carries the breadcrumb, and the index stores it as metadata. A single stage that flattens to plain text destroys everything downstream.
>
> The mistake I see most is storing the breadcrumb in metadata but not prepending it to the chunk text. Metadata isn't embedded — it doesn't affect the vector at all. So you get citation support and none of the recall benefit. The breadcrumb needs to be in both places, serving two different purposes: in the text so it shapes the embedding, and in metadata so you can filter and cite with it.
>
> The payoff is concrete. Section and page numbers let a compliance reviewer open the source document at the right place, which is often a launch requirement. Effective dates let me filter out superseded policy versions, which otherwise compete with current ones and produce arbitrary answers. And content type lets me handle tables differently from prose in the prompt."

## 8. Likely Follow-ups

**Q: What's the most valuable structure to preserve?**
The heading breadcrumb, because it does double duty — prepended to chunk text it gives a large recall improvement, and stored as metadata it gives section-level citation. After that, effective dates, because without them superseded documents compete with current ones and the model picks arbitrarily.

**Q: Where does structure get lost?**
Most often at parsing, if the tool emits plain text rather than markdown. Second most often at cleaning, when an aggressive normalizer strips heading markers along with the noise. Third at chunking, if the splitter doesn't carry the heading forward. Any one of those loses it for good.

**Q: Why does the breadcrumb need to be in the text, not just metadata?**
Because only the chunk text is embedded. Metadata is stored alongside the vector for filtering and display, but it has no effect on the vector itself, so it can't improve semantic matching. Putting the breadcrumb only in metadata gives you citation and zero recall benefit — which is the most common version of this mistake.

**Q: How do you handle documents with inconsistent structure?**
Normalize during parsing where you can — detecting that bold-and-larger text is functioning as a heading, for instance. Where you can't, degrade gracefully to recursive splitting rather than assuming structure exists. And flag documents with no detectable structure, because those are also the ones where semantic chunking might be worth its cost.

**Q: What do you do with cross-references?**
Extract and store them. At minimum they're useful metadata; at best they enable a follow-up retrieval — if a retrieved chunk says "subject to the provisions in § 4.2" and § 4.2 wasn't retrieved, the answer is incomplete, and you can detect that and fetch the referenced section as an extra hop. That's a cheap and specific quality improvement most systems skip.

## 9. Common Mistakes

- Storing the breadcrumb in metadata but not prepending it to the chunk text.
- Using a parser that emits plain text instead of markdown.
- Stripping headings during cleaning along with the boilerplate.
- Not capturing effective dates, so superseded versions compete with current ones.
- Discarding cross-references that could trigger a follow-up retrieval.

## 10. What to Remember

- **Structure is free signal the author already encoded.** Discarding it is pure loss.
- **It must survive every stage** — parse, clean, chunk, index. One flattening destroys it.
- **Breadcrumb goes in BOTH the chunk text and metadata** — embedding vs. filtering/citation.
- **Section and page numbers are what make citation usable** on long documents.
- **Effective dates prevent superseded versions** from competing with current ones.
