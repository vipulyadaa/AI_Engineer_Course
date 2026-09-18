# PDF Chunking

> **Phase 10 · RAG CHUNKING · Topic 11**

## 1. Definition

Chunking PDFs is really a **parsing** problem first. A PDF has no paragraphs, tables, or reading order — only glyphs at coordinates — so structure must be reconstructed before any chunking decision is meaningful.

## 2. Simple Explanation

A PDF isn't a document. It's drawing instructions: "put this character at these coordinates."

There is no notion of "this is a heading," "this is a table," or "read this column before that one." Everything you need for good chunking has to be inferred from position, font, and spacing — and if that inference is wrong, chunking is operating on garbage.

## 3. How It Works

**The pipeline, in order of what breaks:**

1. **Detect whether there's a text layer** — scanned PDFs have none. Route those to OCR.
2. **Reconstruct reading order** — multi-column layouts read across the fold produce interleaved nonsense.
3. **Extract tables** with structure preserved, not flattened.
4. **Identify headings** from font size, weight, and numbering.
5. **Strip repeated headers and footers** detected across pages.
6. **Emit markdown**, then chunk on that structure.
7. **Preserve page numbers** in metadata, for citation anchors.

**Tooling, by capability:**

| Tool | Handles | Fails on |
|---|---|---|
| `pypdf` | Simple single-column text | Columns, tables, scans |
| `pdfplumber` | Text + basic table extraction | Complex layouts |
| `Unstructured.io` | Layout, tables, mixed formats | Very complex financial layouts |
| **Document AI** (Google Cloud) | Forms, tables, scans, enterprise OCR | Per-page cost |
| Vision LLM on page images | Hardest layouts, good at tables | Cost; can hallucinate values |

## 4. Practical Example

**The column interleaving failure:**

```
Two-column page:

  ┌──────────────┬──────────────┐
  │ Fees for     │ Eligibility  │
  │ international│ requires     │
  │ transfers    │ proof of     │
  │ are $45.     │ income.      │
  └──────────────┴──────────────┘

❌ Naive left-to-right extraction:
  "Fees for Eligibility international requires transfers proof of
   are $45. income."

  → Unreadable. Embeds to a vector matching nothing.
  → Chunking this is meaningless regardless of strategy.

✅ Layout-aware:
  "Fees for international transfers are $45.
   Eligibility requires proof of income."
```

**The scanned-PDF trap:**

```python
text = extract_text(pdf)
if len(text.strip()) < 100 * page_count:
    # Almost certainly a scan with no text layer
    text = ocr(pdf)          # ← without this check, you index NOTHING
                             #   and the failure is completely silent
```

**Page anchors for citation:**

```json
{
  "source_uri": "https://.../fees.pdf#page=14",
  "page": 14,
  "section": "3.2 International Transfers"
}
```

Without the page number captured at parse time, a citation can only point at the whole PDF — which for a 200-page policy document is nearly useless to a reviewer.

## 5. Why It Matters

- **PDFs are the dominant enterprise document format**, especially in banking, legal, and regulatory contexts.
- **PDF parsing is the most common silent RAG failure** — no error, just quietly unretrievable content.
- **Page anchors are what make citation usable** on long documents.

## 6. Trade-offs / Failure Modes

| Failure | Symptom | Fix |
|---|---|---|
| **Scanned, no text layer** | Document produces zero chunks | Detect empty text → OCR |
| **Column interleaving** | Sentences jumping between topics mid-line | Layout-aware parser |
| **Flattened tables** | Numbers with no recoverable labels | Table-aware extraction to markdown |
| **Headers/footers in every chunk** | All embeddings converge | Detect lines repeating across pages |
| **Lost page numbers** | Citation points at a 200-page PDF | Capture page in metadata at parse time |
| **Ligature/encoding artifacts** | `ﬁ`, `â€™`, mojibake | Unicode normalization after extraction |
| **OCR errors on figures** | `$45` becomes `$4S` | Validate; flag low-confidence OCR in metadata |

**The validation habit that matters most:** after any parser change, print 20 random chunks and read them. PDF parsing bugs are visually obvious and statistically invisible — no metric fires, retrieval just quietly gets worse for the affected documents.

**Also assert on chunks-per-document** and alert when it drops. A document that suddenly produces zero chunks is a parse failure, and without that alert you'd never know.

## 7. Interview Answer

> "PDF chunking is really a parsing problem first. A PDF has no paragraphs, tables, or reading order in the file — it's glyphs at coordinates. All the structure you need for chunking has to be reconstructed, and if that reconstruction is wrong, chunking is operating on garbage.
>
> The failure that costs most is column interleaving. A two-column page read naively left-to-right gives you sentences alternating between two unrelated topics, which is unreadable and embeds to a vector matching nothing. No chunking strategy recovers from that.
>
> The failure that's hardest to notice is scanned PDFs. They have no text layer, so extraction returns essentially nothing, the document produces zero chunks, and there's no error anywhere. The symptom is that certain questions never get good answers — which looks like a retrieval problem and isn't. So I'd explicitly check whether extracted text is plausible for the page count, and route to OCR when it isn't.
>
> On tooling, pypdf is fine for simple text PDFs, Unstructured.io handles layout and tables reasonably, and Document AI is the enterprise option for scans and forms. A vision model on page images handles the hardest layouts well but can hallucinate table values, so I'd verify those.
>
> Two things I'd build in regardless. Capture page numbers in metadata at parse time, because a citation pointing at a two-hundred-page PDF is useless to a reviewer — you need the page anchor. And assert on chunks-per-document with an alert when it drops, plus read twenty random chunks by hand after any parser change. Parsing bugs are visually obvious and statistically invisible."

## 8. Likely Follow-ups

**Q: How do you detect a scanned PDF?**
Check the ratio of extracted text length to page count. A text PDF yields hundreds to thousands of characters per page; a scan yields near zero. If it's below a threshold, route to OCR. Some PDFs are mixed — text pages plus scanned inserts — so I'd check per page rather than per document.

**Q: What's the hardest part of PDF parsing?**
Tables in complex layouts, and reading order in multi-column documents with sidebars and callouts. Financial and regulatory documents tend to have both. That's where the cost difference between a free parser and Document AI or a vision model actually shows up in retrieval quality.

**Q: How do you validate parsing quality?**
Read chunks manually after any parser change — twenty random samples catches things no metric does. Programmatically, assert on chunks-per-document and alert on drops, flag documents producing zero chunks, and watch for chunks with abnormally high non-ASCII density or low text-to-whitespace ratios. And keep a golden set of questions whose correct chunks you know, verified after every ingestion run.

**Q: Would you use an LLM to parse PDFs?**
Selectively. A vision model on page images handles complex layouts and tables genuinely well, better than deterministic parsers. The problems are cost — per page, significant at corpus scale — and hallucination risk on numeric values, which matters a lot in a fee schedule. I'd route only the documents that defeat deterministic parsing, and cross-check extracted figures.

**Q: How do you handle citation for PDFs?**
Capture the page number at parse time and store it in metadata alongside a source URI with a page fragment, like `fees.pdf#page=14`. Section headings too, where the parser can identify them. Citing at page and section level lets a reviewer open the document at the right place; citing the whole PDF is effectively no citation on a long document.

## 9. Common Mistakes

- Using a basic text extractor on complex PDFs and assuming it worked.
- Not detecting scanned pages, so they index as nothing, silently.
- Not capturing page numbers, making citations useless.
- Never reading parsed output by hand.
- Trusting vision-model extraction of numeric tables without verification.

## 10. What to Remember

- **A PDF is glyphs at coordinates.** Structure must be reconstructed before chunking means anything.
- **Detect scanned pages** and route to OCR — otherwise you index nothing, silently.
- **Column interleaving and flattened tables** are the two failures that destroy retrievability.
- **Capture page numbers** for citation anchors.
- **Read 20 random chunks by hand** after any parser change; assert on chunks-per-document.
