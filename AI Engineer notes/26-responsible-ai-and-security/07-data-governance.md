# Data Governance

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 07**

## 1. Definition

Knowing what data the system holds, where it came from, who may use it, how long it's kept, and being able to evidence all of that. In a RAG system the distinctive part is lineage from an answer back to an approved source document.

## 2. Simple Explanation

Governance is the paperwork question with an engineering answer: can you prove, for any given answer, which document produced it, whether that document was approved, and whether it was current at the time?

If the answer is yes, most governance conversations become short.

## 3. How It Works

```
INGESTION GOVERNANCE
  · which sources are approved for the corpus
  · who approves a document's inclusion
  · document version, effective dates, owner
  · classification — public, internal, confidential

RUNTIME GOVERNANCE
  · which documents were retrieved for this answer
  · which version, effective on what date
  · who asked, and what they were entitled to see

RETENTION GOVERNANCE
  · what's kept, where, for how long
  · deletion path and evidence
```

**The chunk metadata schema is where ingestion governance becomes enforceable** — classification, owner, effective dates, and version have to be attached at load time or they can't be applied at query time.

## 4. Practical Example

**Source approval, which is the control people skip:**

```
An unapproved source in the corpus means the system can
answer from a document nobody signed off — a draft, a
superseded version, an internal discussion note.

So ingestion needs an allowlist of sources, not a crawl:
  · named GCS prefixes or document management systems
  · a document-level approval flag in metadata
  · rejection and alerting for anything outside it

That control also happens to be the primary defence against
retrieval poisoning, because injected content has to get
into the corpus first.
```

**That dual purpose is worth noting** — source governance is a compliance control and a security control at once.

**Answer-level lineage, which is what an auditor asks for:**

```
"Why did the system tell this customer the fee was $45 on
 3 March?"

Answerable from the trace:
  retrieved: fee-schedule-v4.2, chunk c07
  effective: 2024-01-01 → present
  approved:  by Retail Products, 2023-12-14
  prompt:    answer-v7
  model:     gemini-2.0-flash-001
  user:      entitled via acl group all-staff

That's a complete answer. Producing it requires the
metadata at ingestion and the trace at runtime — neither
can be reconstructed afterwards.
```

**Classification driving retrieval:**

```
Documents classified confidential shouldn't be retrievable
by a general customer-facing assistant at all, regardless
of ACLs.

So classification becomes a retrieval filter, not just a
label — which means it has to be in the chunk metadata and
in the query filter, like tenant and effective date.
```

## 5. Why It Matters

- **Answer-level lineage** is what most governance questions actually reduce to.
- **Source approval is both a compliance and a security control.**
- **Classification must be a retrieval filter**, not just a metadata label.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Crawled rather than allowlisted sources** | Unapproved content answerable |
| **No approval flag in metadata** | Can't enforce or evidence it |
| **Classification as a label only** | Confidential content retrievable |
| **Missing effective dates** | Superseded versions cited as current |
| **Lineage not traced at runtime** | Can't reconstruct why an answer happened |
| **Retention policy per store missing** | Data kept indefinitely by default |

**On what can't be reconstructed:** ingestion metadata and runtime traces both have to be captured at the time. An auditor asking six months later why a particular answer was given cannot be satisfied by re-running the query — the corpus and the model may both have changed. That's the argument for capturing lineage by default rather than on demand.

**On ownership:** governance metadata — who approved this document, when, and until when — is owned by the business, not engineering. The engineering contribution is making the metadata enforceable at query time and refusing to ingest documents that lack it. A pipeline that accepts documents with missing effective dates has made governance optional.

## 7. Interview Answer

> "Governance is the paperwork question with an engineering answer: can you prove, for any given answer, which document produced it, whether that document was approved, and whether it was current at the time. If yes, most governance conversations become short.
>
> It splits into three parts. Ingestion governance — which sources are approved, who approves a document, and its version, effective dates, owner, and classification. Runtime governance — which documents were retrieved for this answer, in which version, for a user entitled to see them. And retention governance — what's kept where, for how long, with a deletion path and evidence.
>
> The chunk metadata schema is where ingestion governance becomes enforceable. Classification, owner, effective dates, and version have to be attached at load time, because they can't be applied at query time otherwise — and retrofitting them means reprocessing the whole corpus.
>
> The control people skip is source approval. An unapproved source in the corpus means the system can answer from a document nobody signed off — a draft, a superseded version, an internal discussion note. So ingestion needs an allowlist of named sources rather than a crawl, with a document-level approval flag and rejection plus alerting for anything outside it. And that control is dual-purpose: it's the primary defence against retrieval poisoning too, because injected content has to get into the corpus first.
>
> What an auditor actually asks is 'why did the system tell this customer the fee was forty-five dollars on the third of March.' That should be answerable from the trace: which chunk, from which document version, effective on what dates, approved by whom and when, which prompt version, which model version, and what entitled the user to see it. That's a complete answer — and producing it requires the metadata at ingestion and the trace at runtime. Neither can be reconstructed later, because the corpus and the model may both have changed. That's the argument for capturing lineage by default rather than on demand.
>
> One design point: classification has to be a retrieval filter, not just a label. Documents classified confidential shouldn't be retrievable by a customer-facing assistant at all regardless of ACLs, which means classification belongs in the chunk metadata and in the query filter alongside tenant and effective date.
>
> And on ownership — who approved a document and until when is a business decision, not an engineering one. Engineering's contribution is making that metadata enforceable at query time and refusing to ingest documents that lack it. A pipeline that accepts documents with missing effective dates has quietly made governance optional."

## 8. Likely Follow-ups

**Q: What does governance reduce to in practice?**
Answer-level lineage — for any answer, which document and version produced it, whether it was approved, whether it was current, and what entitled the user to see it. If that's answerable from the trace, most governance questions are straightforward.

**Q: Why allowlist sources rather than crawl?**
Because an unapproved source means the system can answer from a draft, a superseded version, or an internal note nobody signed off. It's also the primary defence against retrieval poisoning, since injected content has to enter the corpus first — so it's a compliance and a security control at once.

**Q: How does classification work at runtime?**
As a retrieval filter, not just a label. Documents classified confidential shouldn't be retrievable by a customer-facing assistant regardless of ACLs, which means classification belongs in chunk metadata and in the query filter alongside tenant and effective date.

**Q: Why can't lineage be reconstructed later?**
Because the corpus and the model may both have changed. Re-running an old query six months on doesn't reproduce what happened, so the ingestion metadata and the runtime trace have to be captured at the time. That's why lineage is captured by default rather than on request.

**Q: Who owns governance metadata?**
The business — who approved a document, when, and until when are business decisions. Engineering's job is making that metadata enforceable at query time and refusing documents that lack it. A pipeline accepting missing effective dates has made governance optional.

## 9. Common Mistakes

- Crawling sources rather than using an approved allowlist.
- Classification stored as a label but not applied as a filter.
- Missing effective dates, so superseded content is citable as current.
- Assuming lineage can be reconstructed by re-running a query.
- Ingesting documents with incomplete governance metadata.

## 10. What to Remember

- **Answer-level lineage** is what governance questions reduce to.
- **Allowlist sources** — a compliance control and an anti-poisoning control.
- **Classification is a retrieval filter**, not just a label.
- **Capture lineage at the time** — it can't be reconstructed later.
- **Refuse documents with missing governance metadata**, or governance is optional.
