# Table Chunking

> **Phase 10 · RAG CHUNKING · Topic 10**

## 1. Definition

Keeping tabular data retrievable and interpretable — preserving the row-column relationship, keeping headers attached to data, and often indexing a natural-language rendering alongside the raw table.

## 2. Simple Explanation

A table's meaning is entirely in its structure. `$45` means nothing; `$45` *at the intersection of "International" and "Retail"* means something.

Flatten the table and you destroy that relationship. The numbers are still there and nobody — including the LLM — can tell which belongs to what.

## 3. How It Works

1. **Never split a table by character or token count.** Treat it as an atomic unit.
2. **Preserve structure as markdown or HTML**, not as flattened text.
3. **If a table must be split, repeat the header row** on every piece.
4. **Prepend the table's caption and section heading** — a table alone lacks the topic.
5. **Consider dual indexing** — index both a natural-language summary and the raw table.
6. **Tag `content_type: table`** in metadata so retrieval and prompting can treat it appropriately.

## 4. Practical Example

**Why flattening destroys the answer:**

```
Original:
  | Transfer type | Retail | Premier |
  |---------------|--------|---------|
  | Domestic wire | $25    | $0      |
  | International | $45    | $25     |

❌ Flattened by a naive parser:
  "Transfer type Retail Premier Domestic wire $25 $0 International $45 $25"

  Query: "What's the Premier international wire fee?"
  → The chunk contains $25, $0, $45, $25 with no recoverable
    association. Even if retrieved, the model guesses — and
    "$25" appears twice, meaning different things.

✅ Markdown preserved:
  → The model reads the intersection correctly.
```

**Dual indexing — the technique worth knowing:**

```
Chunk A (summary, for semantic retrieval):
  "Fee schedule for wire transfers. Covers domestic and
   international transfers for Retail and Premier account tiers.
   Domestic wires are free for Premier customers; international
   transfers cost $45 retail and $25 Premier."

Chunk B (raw table, linked to A):
  | Transfer type | Retail | Premier |
  |---------------|--------|---------|
  | Domestic wire | $25    | $0      |
  | International | $45    | $25     |

Retrieval matches the SUMMARY (natural language, matches how
people ask). Then return BOTH — the summary for context and the
table for exact values.
```

**Why dual indexing works:** a raw table embeds poorly, because it's mostly numbers and short labels with none of the vocabulary a question uses. The summary carries the searchable language; the table carries the precise values.

**Splitting a large table, when unavoidable:**

```
| Product | Fee | Terms |     ← header repeated
| A       | $10 | ...   |
| B       | $12 | ...   |
---
| Product | Fee | Terms |     ← repeated on the next chunk
| C       | $15 | ...   |
```

## 5. Why It Matters

- **Tables hold the precise, high-stakes facts** — fees, rates, limits, thresholds. Getting them wrong is expensive.
- **They're the most common parsing casualty**, and the damage is invisible downstream.
- **Dual indexing is a concrete, specific technique** that signals real experience.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Split mid-table** | Header orphaned from rows; values unattributable |
| **Flattened to text** | Row-column relationship destroyed |
| **Raw table embedded alone** | Mostly numbers and terse labels — poor semantic match |
| **Very large tables** | Exceed chunk size; must split with header repetition |
| **Merged and nested cells** | Break naive markdown conversion |
| **No caption or heading** | The table doesn't say what it's about |
| **Dual index drift** | Summary and table updated inconsistently |

**The LLM-summary-generation cost:** dual indexing means generating a summary per table at ingestion, which is an LLM call each. For a corpus with thousands of tables that's a real expense — though small compared to the cost of serving wrong fee information.

**Merged cells are the parsing edge case** that most often defeats automated conversion. A table with a cell spanning two columns has no clean markdown representation. HTML preserves it; markdown doesn't. For complex tables, keeping HTML is sometimes the better choice.

## 7. Interview Answer

> "Tables are the case where chunking by character count is unambiguously wrong, because a table's meaning is entirely in its structure. Forty-five dollars means nothing; forty-five dollars at the intersection of 'International' and 'Retail' means something.
>
> So the rules are: never split a table by token count, preserve it as markdown or HTML rather than flattening it, and if it genuinely must be split, repeat the header row on every piece.
>
> The technique I'd highlight is dual indexing. A raw table embeds poorly — it's mostly numbers and terse column labels, with none of the vocabulary a question uses. So I'd generate a natural-language summary of the table at ingestion and index that for semantic retrieval, linked to the raw table. Retrieval matches the summary, which reads like how people actually ask; then I return both, so the model has the searchable context and the exact values.
>
> I'd also prepend the table's caption and section heading, because a table alone doesn't say what it's about.
>
> The failure I'd emphasize is that flattening is invisible downstream. The chunk still contains all the numbers, so nothing looks broken — but the model is guessing at which value belongs to which row and column. In a fee schedule where the same figure appears twice meaning different things, that produces confidently wrong answers about money. It's the kind of bug that only shows up when someone checks an answer against the source."

## 8. Likely Follow-ups

**Q: What's the biggest risk with tables?**
Silent flattening at the parsing stage. The chunk still contains every number, so no metric fires and nothing looks broken — but the associations are gone and the model guesses. In a fee table where the same amount appears in two cells meaning different things, that produces confidently wrong financial answers. Reading parsed output by hand is the only reliable detection.

**Q: What is dual indexing and why does it help?**
Index both an LLM-generated natural-language summary of the table and the raw table, linked together. The summary carries the vocabulary that matches how people ask questions; the raw table carries the precise values. Retrieval matches the summary and you return both. It fixes the problem that a table of numbers embeds poorly against a natural-language query.

**Q: How do you handle a table too large for one chunk?**
Split by rows and repeat the header on each chunk, so every piece keeps its column labels. Also repeat the caption and section heading. For very large tables — hundreds of rows — a summary-plus-query approach may be better: index a summary, and when precise lookup is needed, query the underlying structured data rather than retrieving table text.

**Q: Markdown or HTML for table representation?**
Markdown for simple tables — it's compact, LLMs read it well, and it's token-efficient. HTML when the table has merged or nested cells, which markdown can't represent. The trade-off is that HTML is more verbose and costs more tokens. I'd default to markdown and fall back to HTML for structurally complex tables.

**Q: What if the answer requires computation over a table?**
That's usually a signal the data should be in a database rather than only in a retrieved chunk. "What's our average international fee across products" is a query, not a retrieval. The right architecture routes computational questions to a structured store — text-to-SQL — and keeps RAG for interpretive questions about the policy text.

## 9. Common Mistakes

- Letting a generic text splitter treat table rows as split points.
- Flattening tables to unstructured text at parse time.
- Embedding the raw table alone without a summary or caption.
- Splitting a large table without repeating the header row.
- Using RAG for questions that are really computations over tabular data.

## 10. What to Remember

- **A table's meaning is its structure.** Flattening destroys the answer invisibly.
- **Never split by token count.** If you must split, repeat the header row.
- **Dual index:** an LLM summary for semantic matching, the raw table for exact values.
- **Prepend the caption and section heading** — a table alone lacks its topic.
- **Computational questions belong in SQL**, not in retrieved table text.
