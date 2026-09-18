# Failure Mode: Bad Document Parsing

> **Phase 13 · RAG FAILURE MODES · Topic 01**

## 1. Definition

Text extraction that garbles or loses content — interleaved columns, flattened tables, scanned pages yielding nothing, boilerplate in every chunk. The damage happens at ingestion and cannot be repaired downstream.

## 2. Simple Explanation

Everything else in the pipeline operates on whatever parsing produced. If that's nonsense, retrieval is searching nonsense.

What makes it the worst failure mode is that **nothing errors**. Ingestion reports success, chunks exist, vectors are stored. The only symptom is that certain questions never get good answers — which looks like a retrieval problem and isn't.

## 3. How It Works

**The four parsing failures and their signatures:**

| Failure | Signature | Detection |
|---|---|---|
| **Scanned pages, no text layer** | Document produces 0 chunks | Assert chunks > 0 per document |
| **Column interleaving** | Sentences jumping between topics mid-line | Read chunks manually |
| **Flattened tables** | Numbers with no recoverable labels | Read chunks; check content_type |
| **Boilerplate in every chunk** | All embeddings unusually similar | Check for lines repeating across pages |

**Detection that runs automatically:**

```python
assert len(chunks) > 0, f"ZERO CHUNKS: {doc.id}"

metrics.record("chunks_per_doc", len(chunks), doc_type=doc.type)
# Alert when the distribution shifts — a parser regression shows
# up as chunks_per_doc dropping for one document type.

# Cheap text-quality heuristics
non_ascii_ratio  = count_non_ascii(text) / len(text)
avg_word_length  = mean(len(w) for w in text.split())
# Mojibake and OCR garbage show up as anomalies in both.
```

## 4. Practical Example

**The failure that costs most, because it's invisible:**

```
200 policy PDFs. 20 are scans.

Text extraction on the scans returns ~0 characters.
Chunking produces 0 chunks.
No exception. Ingestion logs "200 documents processed."

Weeks later: questions about those 20 policies never get good
answers. The team investigates retrieval — tunes chunk size,
tries a reranker, swaps the embedding model. None of it helps,
because 10% of the corpus was never indexed.
```

**Column interleaving:**

```
Two-column page, naive left-to-right extraction:

"Fees for Eligibility international requires transfers proof of
 are $45. income."

→ Unreadable. Embeds to a vector matching nothing.
→ Chunking this is meaningless regardless of strategy.
```

**The habit that catches all of it:** after any parser change, print 20 random chunks and read them. Parsing bugs are visually obvious and statistically invisible.

## 5. Why It Matters

- **It's the root cause most often misdiagnosed** as a retrieval problem.
- **Damage is unrecoverable downstream** — no reranker repairs interleaved columns.
- **Silent failure means it can hide a large fraction of the corpus** indefinitely.

## 6. Trade-offs / Failure Modes

**Fixes, by failure:**

| Failure | Fix |
|---|---|
| Scanned pages | Detect low text-per-page → route to OCR (Document AI) |
| Column interleaving | Layout-aware parser (Unstructured.io, Document AI) |
| Flattened tables | Table-aware extraction to markdown; keep tables whole |
| Boilerplate | Detect lines repeating across >60% of pages; strip |
| Encoding artifacts | Unicode normalization after extraction |

**The tooling ladder:** `pypdf` for simple text PDFs, `Unstructured.io` for layout and tables, Document AI for scans and forms, a vision LLM for the hardest layouts — with the caveat that vision models can hallucinate table values, so numeric extraction needs cross-checking.

## 7. Interview Answer

> "Bad parsing is text extraction that garbles or loses content — interleaved columns, flattened tables, scanned pages yielding nothing. It happens at ingestion and it can't be repaired downstream.
>
> What makes it the worst failure mode is that nothing errors. Ingestion reports success, chunks exist, vectors are stored. The only symptom is that certain questions never get good answers — which looks like a retrieval problem, so teams tune chunk size and try rerankers and swap embedding models while ten percent of the corpus was never indexed.
>
> The scanned-PDF case is the canonical one. Text extraction returns essentially nothing, chunking produces zero chunks, and the pipeline logs 'two hundred documents processed.' I'd guard against it by asserting chunks-greater-than-zero per document and monitoring the chunks-per-document distribution by document type, so a parser regression shows up as a drop for one type.
>
> Column interleaving is the other big one — a two-column page read left to right gives sentences alternating between unrelated topics, which is unreadable and embeds to a vector matching nothing.
>
> The habit I'd insist on is reading twenty random chunks by hand after any parser change. Parsing bugs are visually obvious and statistically invisible — no metric fires, retrieval just quietly gets worse for the affected documents.
>
> On tooling: pypdf for simple text PDFs, Unstructured.io for layout and tables, Document AI for scans and forms. A vision model handles the hardest layouts well but can hallucinate table values, so numeric extraction needs cross-checking."

## 8. Likely Follow-ups

**Q: How do you detect it?**
Assert on chunk count per document and alert when the distribution shifts by document type. Add cheap text-quality heuristics — non-ASCII ratio, average word length — to catch mojibake and OCR garbage. And read random chunks manually after any parser change, because that catches things no metric does.

**Q: Why is it the worst failure mode?**
Because it's silent and unrecoverable. Silent means it can hide a large fraction of the corpus indefinitely with no error anywhere. Unrecoverable means no downstream stage fixes it — a better reranker can't repair interleaved columns, and a better prompt can't reconstruct a flattened table.

**Q: How do you handle scanned documents?**
Detect them by checking extracted text length against page count — a text PDF yields hundreds of characters per page, a scan yields near zero. Route those to OCR, Document AI being the enterprise option. Then validate, because OCR errors on numbers are subtle and consequential, and flag low-confidence OCR in metadata.

**Q: What about tables specifically?**
Extract them to markdown so the row-column relationship survives, keep them as whole chunks, and never let a generic text splitter treat their newlines as split points. Flattening a fee table into "Transfer type Retail Premier Domestic $25 $0 International $45 $25" destroys the associations while leaving all the numbers present — which is why it's invisible.

**Q: Would you use an LLM to parse?**
Selectively, for documents that defeat deterministic parsers — complex financial layouts, forms, scans with mixed content. The caveats are per-page cost at corpus scale and hallucination risk on numeric values, which matters a lot in a fee schedule. I'd route only the hard documents and cross-check extracted figures.

## 9. Common Mistakes

- Assuming extraction worked because it didn't throw an error.
- Not asserting on chunk counts per document.
- Never reading parsed output by hand.
- Tuning retrieval when the content was never properly extracted.
- Trusting vision-model table extraction without verifying figures.

## 10. What to Remember

- **Silent and unrecoverable.** The worst combination.
- **Presents as a retrieval problem** — teams tune rerankers while the corpus is broken.
- **Assert chunks > 0 per document** and alert on distribution shifts.
- **Read 20 random chunks after any parser change.** Visually obvious, statistically invisible.
- **Scans, columns, tables, boilerplate** — four failures, four different fixes.
