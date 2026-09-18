# "What Data Did You Use?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 05**
>
> ⚠️ **An answer framework.** Describe your actual corpus — including its size,
> honestly. Scale is the detail most easily checked against everything else
> you've said.

## 1. Definition

A question about the corpus — what it contained, where it came from, what condition it was in, and what that implied for the design.

## 2. Simple Explanation

The interesting part isn't what the documents were about. It's what shape they were in, because document condition determines most of the design decisions downstream.

A corpus of clean markdown and a corpus of scanned PDFs with tables are the same problem with completely different answers.

## 3. How It Works

```
WHAT TO DESCRIBE

CONTENT      what kind of documents, roughly how many
FORMAT       PDF, HTML, markdown, database records —
             and whether scanned
STRUCTURE    headings and sections, or unstructured prose
SPECIAL      tables, forms, images, code
FRESHNESS    how often they change
OWNERSHIP    who maintains them
PERMISSIONS  uniformly readable, or per-user

Format and structure drive chunking. Freshness drives
ingestion design. Permissions drive the retrieval filter.
```

**Each property maps to a decision**, and connecting them is what makes this more than a description.

## 4. Practical Example

**The property that most shapes the design:**

```
TABLES

A fee schedule IS a table. That single fact determines:
  · whether Document AI or a simple parser is needed
  · whether chunks can be fixed-size (they can't)
  · whether the header row must be repeated across chunks
  · whether the most-queried document retrieves at all

If the corpus has tables and they were flattened into text,
that's the highest-leverage problem in the system — and
naming it shows you know where RAG quality actually comes
from.
```

**Connecting properties to decisions:**

```
"The documents were structured with numbered sections, so
 chunking followed the section boundaries rather than a
 fixed size."

"They were updated quarterly, so batch re-ingestion on a
 schedule was sufficient — a change reaching the system
 within a day was acceptable."

"They were uniformly readable by all staff, so there was
 no per-user permission filter — which simplified
 retrieval considerably, and is the thing that would change
 first at enterprise scale."

Each is a property and a consequence. That's the structure.
```

**On size, honestly:** a few hundred documents is a different system from a hundred thousand. At small scale, retrieval quality depends on chunking and the embedding model rather than on index architecture — and saying that shows you know what scale does and doesn't change, which is more impressive than a large number.

## 5. Why It Matters

- **Document condition determines most downstream decisions** — that's the connection to make.
- **Tables are the highest-leverage property** if the corpus has them.
- **Honest scale** — it's the detail most easily checked against everything else.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Describing content without format | Format drives the design |
| No connection to design decisions | A description, not an analysis |
| Inflating corpus size | Inconsistent with everything else you said |
| No mention of tables or structure | The properties that matter most |
| Ignoring freshness and ownership | They shape ingestion and governance |

**On parsing quality:** if the corpus was PDFs, the question of what the extracted text actually looked like is worth raising unprompted. Reading a sample of extracted text against the source documents is a ten-minute check that catches table collapse and column interleaving — and mentioning having done it, or wishing you had, signals knowing where RAG systems actually fail.

**On data you didn't use:** naming what was deliberately excluded is worth doing — customer data, internal drafts, anything unapproved. Source allowlisting is both a governance control and the primary defence against retrieval poisoning, so having scoped the corpus deliberately is a point in your favour.

## 7. Interview Answer

> "[**Your corpus.** The structure below connects properties to decisions.]
>
> "The corpus was [**what kind of documents**], roughly [**honest number**], in [**format**].
>
> The properties that mattered for the design were structure, tables, and freshness.
>
> [**Structure**] They had numbered sections and sub-sections, so chunking followed section boundaries rather than a fixed size — fixed-size chunks split rules away from their conditions.
>
> [**Tables**] Several of the most-queried documents were essentially tables — the fee schedule in particular. That mattered a lot, because a table flattened into text becomes number soup with rows separated from their headers, and it's the document customers ask about most. So parsing had to preserve the header-value relationship, and small tables were kept whole regardless of chunk size.
>
> [**Freshness**] They changed [**how often**], so [**your ingestion approach**] — batch re-ingestion on a schedule was sufficient, because a change reaching the system within a day was acceptable.
>
> [**Permissions**] They were [**uniformly readable / per-user**], so [**consequence**]. If it were uniformly readable: that simplified retrieval considerably, and it's the thing that would change first at enterprise scale, because a permission filter has to be applied in the engine rather than after retrieval.
>
> One thing I'd raise: with PDFs, what the extracted text actually looks like matters more than people expect. Reading a sample against the source documents is a ten-minute check that catches table collapse and column interleaving — and parsing quality is the ceiling on everything downstream, so a flattened table can't be recovered by any amount of retrieval tuning.
>
> And on what was deliberately excluded — [**anything you scoped out**]. Only approved published documentation, no internal drafts or customer data. That's a governance control and it's also the primary defence against retrieval poisoning, since injected content has to get into the corpus first."

## 8. Likely Follow-ups

**Q: How large was the corpus?**
[**Your honest number.**] And what it implied — at a few hundred documents, retrieval quality depends on chunking and the embedding model rather than index architecture, which is worth saying because it shows you know what scale changes.

**Q: What format were the documents?**
[**Yours.**] And the consequence — PDFs mean parsing quality is the ceiling on everything downstream, structured markdown means chunking can follow headings directly, and scanned documents mean OCR or Document AI rather than a text extractor.

**Q: Were there tables?**
[**If yes, this is the important answer.**] A fee schedule is a table, and flattening it into text produces number soup with rows separated from headers. It's usually the most-queried document, so getting it wrong is the highest-leverage failure in the system.

**Q: How often did they change?**
[**Yours**] — and the consequence for ingestion. Quarterly changes mean scheduled batch re-ingestion is fine; daily changes mean event-driven ingestion and a much shorter staleness window, which is a different design.

**Q: What did you deliberately exclude?**
Only approved published documentation — no internal drafts, no customer data, nothing unapproved. That's a governance control, and source allowlisting is also the primary defence against retrieval poisoning since injected content has to enter the corpus first.

## 9. Common Mistakes

- Describing content without format or structure.
- Not connecting properties to design decisions.
- Inflating the corpus size.
- No mention of tables when the corpus had them.
- Not having checked what the extracted text actually looked like.

## 10. What to Remember

- **Document condition determines the design** — connect each property to a decision.
- **Tables are the highest-leverage property** and usually the most-queried content.
- **Be honest about scale** — it's checked against everything else you said.
- **Parsing quality is the ceiling** — mention reading a sample.
- **Name what you excluded** — source scoping is a governance and security control.
