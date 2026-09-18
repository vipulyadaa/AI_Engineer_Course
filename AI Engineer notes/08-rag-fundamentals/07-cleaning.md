# Cleaning

> **Phase 08 · RAG FUNDAMENTALS · Topic 07**

## 1. Definition

Removing noise from parsed text before chunking — boilerplate, navigation, repeated headers and footers, encoding artifacts, and empty content. The goal is that every chunk carries signal, not template.

## 2. Simple Explanation

Everything in a chunk contributes to its embedding. If every chunk contains "Confidential — Acme Bank — Page 14 of 203," that shared text pulls all your embeddings toward each other, and the model's ability to distinguish between chunks drops across the entire corpus.

Cleaning is removing the text that's present in every chunk and therefore distinguishes none of them.

## 3. How It Works

1. **Strip repeated boilerplate** — lines appearing across many pages or documents at the same position.
2. **Remove navigation and UI text** — menus, breadcrumbs, cookie banners, "Skip to content."
3. **Normalize whitespace** — collapse runs of spaces and blank lines; strip trailing whitespace.
4. **Fix encoding artifacts** — ligatures (`ﬁ` → `fi`), mojibake, smart quotes, non-breaking spaces.
5. **Drop empty or near-empty content** — chunks that are only whitespace, a page number, or a single heading.
6. **Decide on PII** — redact, tokenize, or tag it for filtering (see §6).
7. **Preserve structure** — do *not* strip markdown headings or table pipes; downstream chunking needs them.

**What NOT to clean** is as important as what to clean:

| Keep | Why |
|---|---|
| Headings | Chunk boundaries and citation metadata |
| Table markup | The row-column relationship is the answer |
| Lists and numbering | "Step 3" is meaningful |
| Units and currency symbols | `$45` ≠ `45` |
| Section numbers | Citation targets |

## 4. Practical Example

**Boilerplate detection by frequency:**

```python
from collections import Counter

# Count lines across all pages of a document
line_counts = Counter(
    line.strip() for page in pages for line in page.splitlines() if line.strip()
)

# A line appearing on >60% of pages is almost certainly boilerplate
threshold = 0.6 * len(pages)
boilerplate = {line for line, n in line_counts.items() if n > threshold}

cleaned = [
    "\n".join(l for l in page.splitlines() if l.strip() not in boilerplate)
    for page in pages
]
```

**Why the effect is larger than it looks:**

```
Chunk A (raw):  "Confidential — Acme Bank — Page 14. International wire
                 transfers incur a $45 fee for retail accounts."
Chunk B (raw):  "Confidential — Acme Bank — Page 87. Overdraft protection
                 is available on checking accounts."

~40% of each chunk's tokens are identical boilerplate.
Their embeddings are artificially similar. Retrieval discriminates worse
between them — and between every other chunk in the corpus.
```

## 5. Why It Matters

- **Boilerplate degrades discrimination corpus-wide**, not just in the chunks that contain it.
- **It wastes context budget** — tokens spent on "Page 14 of 203" are tokens not spent on the answer.
- **It's cheap to fix at ingestion** and expensive to work around later.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Over-cleaning** | Stripping headings or table markup destroys structure the chunker needs |
| **Aggressive regex** | A pattern meant to remove page numbers also removes monetary amounts |
| **Removing units/symbols** | `$45` becomes `45`; the answer loses its meaning |
| **Language-specific rules applied globally** | An English-tuned cleaner mangles other languages |
| **Cleaning after chunking** | Boilerplate has already influenced chunk boundaries |
| **Not validating** | Cleaning bugs are silent; the text just quietly gets worse |

**On PII:** this is where you decide. Options are redaction (replace with a placeholder — safest, loses information), tokenization (replace with a reversible token — allows re-identification for authorized users), or tagging in metadata (keep the text, filter at retrieval by the caller's clearance). The right choice depends on whether the PII is *the answer* or incidental to it. In banking, incidental PII in example text should generally be redacted at ingestion; PII that's the substance of a record needs retrieval-time access control instead.

## 7. Interview Answer

> "Cleaning removes noise from parsed text before chunking — boilerplate, navigation, encoding artifacts, empty content.
>
> The reason it matters more than it sounds is that everything in a chunk contributes to its embedding. If every chunk contains 'Confidential, Acme Bank, Page 14 of 203,' that shared text is maybe forty percent of a short chunk's tokens, and it pulls all the embeddings toward each other. That degrades discrimination across the entire corpus, not just in those chunks.
>
> The detection I'd use is frequency-based — count lines across pages, and anything appearing on more than about sixty percent of them is boilerplate. That's more robust than hand-written regexes, which tend to over-match.
>
> What not to clean is equally important. I'd preserve headings because they're chunk boundaries and citation metadata, table markup because the row-column relationship is often the answer, and units and currency symbols because forty-five dollars isn't forty-five. Over-aggressive cleaning is a real failure mode — a regex meant to strip page numbers that also strips monetary amounts.
>
> PII is the decision I'd flag explicitly. There are three options: redact it, tokenize it reversibly, or tag it in metadata and filter at retrieval. Which one depends on whether the PII is the answer or incidental to it. Incidental PII in example text should be redacted at ingestion. PII that's the substance of a record needs retrieval-time access control instead, because redacting it would make the record useless."

## 8. Likely Follow-ups

**Q: How do you detect boilerplate automatically?**
Frequency across pages or documents. Count normalized lines and flag anything appearing on a large fraction of pages, typically above 50–60%. For web content, structural heuristics work too — text inside nav, footer, or aside elements. The frequency approach is more robust than regex because it adapts per document instead of encoding assumptions.

**Q: What's the risk of over-cleaning?**
Destroying structure the downstream stages need. If you strip markdown headings, structure-aware chunking has nothing to chunk on and you lose section metadata for citation. If you normalize away table pipes, the table becomes a word soup. And aggressive numeric regexes can remove the very figures that constitute the answer. I'd validate by reading samples before and after.

**Q: How do you handle PII in documents?**
Three options with different trade-offs. Redaction replaces it with a placeholder — safest, but destroys information. Tokenization replaces it with a reversible token so authorized users can re-identify. Tagging keeps the text and filters at retrieval by the caller's clearance. The choice depends on whether the PII is incidental or is the substance of the record. And whichever you pick, you need detection you trust — regex catches structured PII like account numbers reasonably, but names and free-text disclosures need an NER model or an LLM pass.

**Q: Should you lowercase the text?**
Not for dense retrieval — modern embedding models handle case fine and casing carries signal, like distinguishing an acronym from a word. For BM25 in a hybrid setup, the keyword index typically lowercases as part of its own analysis chain, which is separate from what you store. So I'd keep the original text and let each retrieval method apply its own normalization.

**Q: How do you validate cleaning didn't break anything?**
Diff a sample before and after and read it. Track average chunk length — a sharp drop suggests over-cleaning. Keep a golden set of questions whose correct chunks you know and verify those chunks are still present and retrievable after any cleaning change. Cleaning bugs don't throw errors, so manual inspection plus a regression set is the only real defense.

## 9. Common Mistakes

- Stripping markdown headings or table markup along with the noise.
- Writing aggressive regexes that also remove real content like amounts.
- Cleaning after chunking, so boilerplate already influenced the boundaries.
- Not detecting boilerplate per document, using global hardcoded patterns instead.
- Ignoring PII until a security review rather than deciding at ingestion.

## 10. What to Remember

- **Everything in a chunk shapes its embedding.** Shared boilerplate degrades discrimination corpus-wide.
- **Detect boilerplate by frequency across pages**, not by hand-written regex.
- **Preserve headings, tables, units, section numbers** — those carry meaning.
- **Over-cleaning is a real failure mode.** Validate by reading before and after.
- **Decide PII handling at ingestion:** redact, tokenize, or tag-and-filter.
