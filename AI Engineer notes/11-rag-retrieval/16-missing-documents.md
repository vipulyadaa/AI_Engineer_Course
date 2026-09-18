# Missing Documents

> **Phase 11 · RAG RETRIEVAL · Topic 16**

## 1. Definition

When the information needed to answer simply isn't in the index — never ingested, dropped during parsing, or genuinely not documented anywhere. It's the failure that looks like a retrieval problem and isn't.

## 2. Simple Explanation

There are two very different situations that present identically:

1. **The document exists but isn't in the index** — a parsing failure, a missed source, a deletion that wasn't reconciled. This is a bug.
2. **The information was never written down** — nobody documented it. This is a content gap.

Both produce "I don't have information about that." Only one is yours to fix in the pipeline.

## 3. How It Works

**The diagnostic:**

```
1. Search the index directly for distinctive terms from the question.
   Nothing?
        ↓
2. Search the SOURCE SYSTEM (Confluence, file share) for the same terms.
   ├─ Found in source, absent from index  → INGESTION BUG
   │    · document never loaded?
   │    · parsing produced zero chunks? (scanned PDF)
   │    · deleted from the index and not re-added?
   │    · excluded by an ingestion filter?
   └─ Absent from source too               → CONTENT GAP
        · legitimately undocumented
        · log it for the content team
```

**Detection at ingestion, so bugs don't reach production:**

```python
for doc in documents:
    chunks = pipeline(doc)
    assert len(chunks) > 0, f"ZERO CHUNKS: {doc.id}"
    metrics.record("chunks_per_doc", len(chunks), doc_type=doc.type)

# Alert if the distribution shifts — a parser regression shows up
# as chunks_per_doc dropping for one document type.
```

## 4. Practical Example

**The silent ingestion failure:**

```
200 policy PDFs ingested. 180 are text PDFs; 20 are scanned.

Text extraction on the scans returns ~0 characters.
Chunking produces 0 chunks.
No exception. No warning. Ingestion reports "200 documents processed."

Symptom, weeks later: questions about those 20 policies never
get good answers. Looks like a retrieval quality problem.
Is actually 10% of the corpus silently absent.

Prevention: assert chunks > 0 per document, and alert when
chunks-per-document drops for a document type.
```

**Turning content gaps into a useful output:**

```
Log every abstention with the query.
Cluster them monthly.

  cluster: "cryptocurrency policy"        (41 queries) ← no such policy exists
  cluster: "expedited transfer timing"    (28 queries) ← undocumented
  cluster: "joint account closure"        (19 queries) ← doc exists but
                                                         wasn't ingested ← BUG

That's a prioritized backlog: two documents to write, one
ingestion bug to fix. Derived entirely from failures.
```

## 5. Why It Matters

- **It's misdiagnosed as a retrieval problem**, sending effort to rerankers and embedding models that can't help.
- **Silent ingestion failures can hide a large fraction of the corpus**, with no error anywhere.
- **Abstention logs are a prioritized content backlog**, which is genuinely valuable output from a failure path.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Zero-chunk documents** | Scanned PDFs, empty files, parse errors — silent |
| **Deletes not reconciled** | Removed source content stays in the index, or index content has no source |
| **Ingestion filters too broad** | An exclusion rule silently drops a document class |
| **Source never connected** | A whole system nobody added to the pipeline |
| **No abstention logging** | Content gaps are invisible; no backlog is produced |
| **Answering anyway** | Without abstention, the model fabricates from irrelevant chunks |

**The worst outcome is not abstaining.** If the system answers a question whose information isn't indexed, it retrieves the nearest irrelevant chunks and produces a confident, plausible, fabricated answer — cited to real documents. That's worse than an obvious failure, because the citation manufactures false confidence.

**Coverage monitoring** is the proactive version: track what fraction of source documents produce chunks, and what fraction of queries retrieve anything above the relevance threshold. Both are cheap and both catch this early.

## 7. Interview Answer

> "Missing documents is when the information needed simply isn't in the index. It's the failure that looks like a retrieval problem and isn't — and it sends effort toward rerankers and embedding models that can't possibly help.
>
> There are two cases that present identically. Either the document exists but isn't indexed — a parsing failure, a missed source, an unreconciled delete — which is a bug. Or the information was never written down, which is a content gap. Both produce 'I don't have information about that,' and only one is fixable in the pipeline.
>
> The diagnostic is straightforward: search the index for distinctive terms, and if nothing comes back, search the source system for the same terms. Found in source and absent from the index means an ingestion bug. Absent from both means a content gap.
>
> The silent failure I'd guard against hardest is zero-chunk documents. A batch of scanned PDFs produces no extractable text, chunking yields nothing, and ingestion reports 'two hundred documents processed' with no error. Weeks later certain questions never get good answers and it looks like retrieval quality. I'd assert chunks-greater-than-zero per document and alert when chunks-per-document drops for a document type.
>
> And I'd turn the content-gap case into something useful: log every abstention with the query, cluster them monthly, and you get a prioritized backlog of documentation that should exist. That's valuable output from a failure path.
>
> The worst outcome is not abstaining at all — the system retrieves the nearest irrelevant chunks and produces a confident fabricated answer cited to real documents, which is worse than an obvious failure."

## 8. Likely Follow-ups

**Q: How do you distinguish an ingestion bug from a content gap?**
Search the source system for the same distinctive terms. If the content is there and not in the index, it's an ingestion bug. If it isn't in the source either, nobody documented it. That check takes a minute and determines whether the fix is engineering or content.

**Q: How do you detect zero-chunk documents?**
Assert on chunk count per document during ingestion and fail loudly rather than silently. Then monitor the chunks-per-document distribution by document type, so a parser regression shows up as a drop for one type. Scanned PDFs are the classic case — extraction returns essentially nothing and nothing errors.

**Q: What should the system do when information is missing?**
Abstain explicitly — say it doesn't have that information — and log the query. The alternative is retrieving the nearest irrelevant chunks and fabricating a confident answer cited to real documents, which is the worst possible outcome because the citations manufacture false confidence.

**Q: How do you turn this into something useful?**
Log abstentions with their queries and cluster them periodically. Clusters with high query volume and no supporting documentation are a prioritized list of content to write. Clusters where the document actually exists in the source system are ingestion bugs. Either way it's an actionable backlog derived from failures.

**Q: How do you monitor coverage proactively?**
Two cheap metrics. First, the fraction of source documents that produced chunks — anything below 100% is worth investigating. Second, the fraction of production queries that retrieve at least one chunk above the relevance threshold — a declining rate signals either corpus drift or an ingestion problem. Both catch this before users report it.

## 9. Common Mistakes

- Treating it as a retrieval quality problem and tuning rerankers.
- Not asserting on chunk counts, letting zero-chunk documents pass silently.
- Not abstaining, so the system fabricates from irrelevant chunks.
- Not logging abstentions, wasting the content-gap signal.
- Not reconciling deletes, leaving orphaned index entries or missing content.

## 10. What to Remember

- **Two cases, identical symptom:** ingestion bug vs. content gap. Check the source system.
- **Zero-chunk documents are silent** — assert on chunk count, alert on distribution shifts.
- **Abstain rather than fabricating** from the nearest irrelevant chunks.
- **Abstention logs cluster into a prioritized content backlog.**
- **Monitor coverage:** documents producing chunks, and queries retrieving above threshold.
