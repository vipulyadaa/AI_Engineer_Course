# Document Parsing

> **Phase 08 · RAG FUNDAMENTALS · Topic 06**

## 1. Definition

Converting raw file bytes into clean text with its structure preserved — headings, tables, lists, reading order. It's the stage where most RAG quality is silently lost, because parsing damage is invisible downstream and unrecoverable.

## 2. Simple Explanation

A PDF isn't a document — it's drawing instructions. "Put this glyph at these coordinates." There is no notion of a paragraph, a table, or reading order in the file itself.

So parsing is reconstruction: inferring from positions that these two columns are separate, that these cells form a table, that this line is a heading. Bad reconstruction produces text that reads as nonsense — and nonsense embeds to a vector that matches nothing.

## 3. How It Works

1. **Detect layout** — single column, multi-column, sidebars, headers, footers.
2. **Establish reading order** — a two-column page read left-to-right across the fold produces interleaved gibberish.
3. **Extract tables** — preserve row/column structure rather than flattening to a word soup.
4. **Identify headings** — from font size, weight, numbering. These become chunk metadata and chunk boundaries.
5. **OCR where needed** — scanned pages have no text layer at all.
6. **Emit structured text**, usually markdown, so downstream chunking can be structure-aware.

**Parser options, in rough order of capability and cost:**

| Tool | Good for | Weakness |
|------|----------|----------|
| `pypdf` / `pdfplumber` | Simple text PDFs; fast, free | Columns, tables, scans |
| `Unstructured.io` | Mixed formats, layout-aware, table support | Slower, heavier dependency |
| **Document AI** (Google Cloud) | Forms, tables, scans; enterprise-grade OCR | Per-page cost |
| **LLM-based parsing** (vision model on page images) | Hardest layouts; genuinely good at tables | Expensive; can hallucinate content |

**That last risk is real:** a vision model asked to transcribe a table can invent a plausible cell value. For high-stakes documents, verify against a deterministic extraction.

## 4. Practical Example

**Why a flattened table is unretrievable:**

```
Original table:
  ┌────────────────┬──────────┬───────────┐
  │ Transfer type  │ Retail   │ Premier   │
  ├────────────────┼──────────┼───────────┤
  │ Domestic wire  │ $25      │ $0        │
  │ International  │ $45      │ $25       │
  └────────────────┴──────────┴───────────┘

❌ Naive extraction:
   "Transfer type Retail Premier Domestic wire $25 $0 International $45 $25"
   → Question: "What's the Premier international wire fee?"
     The text contains $45, $25, $0, $25 with no recoverable association.
     Even if retrieved, the LLM cannot reliably answer.

✅ Markdown-preserving extraction:
   | Transfer type | Retail | Premier |
   |---------------|--------|---------|
   | Domestic wire | $25    | $0      |
   | International | $45    | $25     |
   → row/column relationship survives; the LLM reads it correctly.
```

**The validation habit that catches this:** after any parser change, print 20 random chunks and read them. Parsing bugs are visually obvious and statistically invisible — no metric fires, retrieval just quietly gets worse for the affected documents.

## 5. Why It Matters

- **It's the most common root cause of RAG failure**, and the least often suspected — people debug prompts and rerankers while the source text is garbled.
- **Structure carries meaning.** A heading tells you what a chunk is about; a table's shape carries the answer.
- **Damage here is unrecoverable.** No embedding model or reranker repairs interleaved columns.

## 6. Trade-offs / Failure Modes

| Failure | Symptom | Fix |
|---------|---------|-----|
| **Column interleaving** | Sentences that jump between topics mid-line | Layout-aware parser |
| **Flattened tables** | Numbers with no recoverable labels | Extract to markdown or HTML |
| **Headers/footers in every chunk** | All chunks share text → embeddings converge | Detect lines repeating across pages and strip |
| **Scanned pages yield nothing** | Document produces zero chunks, silently | Detect empty text layer → route to OCR |
| **Lost headings** | No section metadata for citation or chunking | Use a parser that emits structure |
| **Ligatures / encoding artifacts** | `ﬁ`, `â€™`, mojibake | Unicode normalization after extraction |
| **LLM parser hallucination** | Invented table values | Cross-check against deterministic extraction |

## 7. Interview Answer

> "Parsing converts raw file bytes into clean text with structure preserved. It's where most RAG quality is silently lost.
>
> The thing to understand about PDFs specifically is that a PDF isn't a document — it's drawing instructions, glyphs at coordinates. There's no paragraph, no table, no reading order in the file. So parsing is reconstruction, inferring that these two columns are separate or that these cells form a table. Bad reconstruction gives you text that reads as nonsense, and nonsense embeds to a vector that matches nothing.
>
> The case I'd use is tables. A naive extractor flattens a fee table into 'Transfer type Retail Premier Domestic wire $25 $0 International $45 $25.' If someone asks for the Premier international wire fee, the text contains four dollar amounts with no recoverable association — even if that chunk is retrieved, the model can't answer correctly. Extracting to markdown preserves the row-column relationship and the model reads it fine.
>
> On tooling, pypdf is fine for simple text PDFs, Unstructured.io handles layout and tables reasonably, and Document AI is the enterprise option when you have scans and forms. LLM-based parsing on page images handles the hardest layouts well, but it can hallucinate cell values, so for high-stakes documents I'd cross-check it.
>
> The habit I'd insist on is reading twenty random chunks by hand after any parser change. Parsing bugs are visually obvious and statistically invisible — no metric fires, retrieval just quietly degrades for the affected documents."

## 8. Likely Follow-ups

**Q: How do you handle tables in RAG?**
Preserve them as markdown or HTML so row-column relationships survive, and keep a table in one chunk rather than splitting it. For large tables, repeat the header row in each chunk so the columns stay labeled. An alternative that works well is generating a natural-language summary of the table alongside the raw table and indexing both — the summary retrieves on semantic queries, the table gives the model exact values.

**Q: How do you know parsing is bad?**
Read the chunks. Sample twenty at random after any change and check they're coherent. Programmatically, watch chunks-per-document for unexpected drops, flag documents producing zero chunks, and look for chunks with abnormally low text-to-whitespace ratios or high non-ASCII density. But the manual read catches things no metric does.

**Q: When would you use an LLM to parse documents?**
When the layout genuinely defeats deterministic parsers — complex multi-column financial reports, forms, or scanned documents with mixed content. A vision model on page images does well on those. The caveats are cost, which is per-page and significant at corpus scale, and hallucination risk on values. I'd use it selectively on the documents that need it rather than as the default parser.

**Q: How do you strip headers and footers?**
Detect lines that repeat across many pages at similar vertical positions and remove them. It matters more than it sounds: if every chunk contains "Confidential — Acme Bank — Page N," that shared text pulls all the embeddings toward each other and degrades discrimination across the whole corpus.

**Q: What about documents in multiple languages?**
Detect language per document or per section and store it in metadata, so retrieval can filter or boost by language. The embedding model matters — a multilingual model handles cross-language retrieval, a monolingual one won't match a Spanish query to English content. And some parsers handle non-Latin scripts and right-to-left text poorly, so validate by hand on a sample of each language.

## 9. Common Mistakes

- Using a basic text extractor on complex PDFs and assuming it worked.
- Flattening tables into unstructured text.
- Not stripping repeated headers and footers.
- Never manually reading parsed output.
- Trusting LLM-based parsing on numeric tables without verification.

## 10. What to Remember

- **A PDF is drawing instructions, not a document.** Parsing is reconstruction.
- **Parsing damage is unrecoverable** — no downstream stage fixes interleaved columns.
- **Tables must keep their structure** — markdown, not flattened text.
- **Strip repeated headers/footers**, or all embeddings converge.
- **Read 20 random chunks by hand** after any parser change. Metrics won't catch it.
