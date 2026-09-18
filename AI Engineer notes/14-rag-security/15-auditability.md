# Auditability

> **Phase 14 · RAG SECURITY · Topic 15**

## 1. Definition

The ability to reconstruct, after the fact, exactly what a RAG system did for a given request — what was asked, what was retrieved, what authorization applied, what was answered, and which configuration produced it. In regulated domains it's a requirement, not an observability nicety.

## 2. Simple Explanation

Six months after an incident, someone asks: *why did the assistant tell this customer their transfer was free?*

Answering that requires knowing what was retrieved, which document version it came from, what the prompt was, which model version ran, and who was entitled to what at that moment. If you didn't log it then, you can't reconstruct it now.

## 3. How It Works

**The audit record:**

```json
{
  "trace_id": "...", "timestamp": "...",
  "caller_id": "...", "caller_groups": ["..."], "tenant_id": "...",

  "query_hash": "...",              // not raw text, in a PII context
  "rewritten_query_hash": "...",
  "filters_applied": {"acl_group": [...], "effective_date": "..."},
  "candidates_before_filter": 500,
  "candidates_after_filter": 180,   // ← proves filtering ran

  "retrieved_chunk_ids": ["..."],
  "chunk_versions": {"chunk-x": "content_hash-abc"},   // ← which VERSION
  "top_scores": [0.87, 0.81, ...],
  "reranked": true,

  "abstained": false,
  "answer_hash": "...",
  "citations": ["..."],

  "config_version": "rag-v4.2.1",
  "prompt_version": "banking-faq-v7",
  "embedding_model": "text-embedding-005",
  "llm_model": "gemini-2.5-pro-002",
  "temperature": 0.0
}
```

**The two fields that make reconstruction possible and are most often missing:**

```
chunk_versions   — WHICH version of the document was retrieved.
                   The document has been revised twice since;
                   without the content hash you can't know what
                   the model actually read.

config_version   — WHICH pipeline configuration ran. Chunking,
                   prompt, models, thresholds have all changed.
```

## 4. Practical Example

**Reconstructing an incident:**

```
Complaint: "the assistant told me my transfer was free in March."

With a full audit record:
  · trace shows chunk policy-fees#3.2 retrieved
  · chunk_versions shows content_hash "abc123"
  · that hash maps to the pre-March-15 version of the document,
    which did say the first two transfers were free
  · config_version shows prompt v6, which lacked the
    "state all qualifying conditions" instruction

Conclusion: the answer was CORRECT for the policy in force at
the time, and the prompt has since been improved.
Defensible in five minutes.

Without chunk_versions and config_version:
  you know a chunk ID was retrieved. The document has been
  revised twice since. You cannot determine what the model read.
  Not defensible.
```

**The PII tension:**

```
Log:      query_hash, chunk_ids, chunk_versions, scores, filters,
          counts, config versions, caller ID
Separate: raw query text, retrieved chunk text, answer text
          → access-controlled store, short retention,
            explicit-reason access

You keep full reconstructability without putting content where
operators and dashboards can read it.
```

## 5. Why It Matters

- **It's a regulatory requirement in banking**, not an observability feature.
- **Chunk versions and config versions are what make reconstruction possible**, and they're the fields most often absent.
- **It's also your debugging substrate** — the same record answers "why was this answer wrong?"

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No chunk version** | Can't determine what the model actually read |
| **No config version** | Can't attribute behavior to a pipeline state |
| **Raw content in general logs** | PII exposure to operators and dashboards |
| **Candidate counts not logged** | Can't prove authorization filtering ran |
| **Short retention** | Regulatory windows often exceed default log retention |
| **Immutability not enforced** | Audit logs that can be modified aren't audit logs |
| **Trace not propagated** | Can't correlate across ingestion, retrieval, and generation |

**On immutability:** an audit log that engineers can edit doesn't serve its purpose. Write-once storage, or at minimum append-only with access controls and integrity checking, is what makes it an audit record rather than a debug log.

**On retention:** regulatory retention requirements for financial records commonly run years, while default application log retention is days or weeks. Audit records need their own retention policy, separate from operational logging, and usually a different storage tier.

**On proving a negative:** `candidates_before_filter` and `candidates_after_filter` are how you demonstrate that authorization filtering actually ran on a given request. Without them you can assert it; with them you can show it.

## 7. Interview Answer

> "Auditability is being able to reconstruct, after the fact, exactly what the system did for a given request. In banking it's a requirement rather than an observability nicety.
>
> The scenario that defines what you need: six months later someone asks why the assistant told a customer their transfer was free. Answering that requires knowing what was retrieved, which *version* of that document, what the prompt was, which model version ran, and what authorization applied.
>
> Two fields make reconstruction possible and they're the ones most often missing. Chunk version — a content hash of what was actually retrieved, because the document has been revised twice since and the chunk ID alone tells you nothing about what the model read. And config version — which chunking strategy, prompt, models, and thresholds were in force.
>
> With those, the incident resolves in five minutes: the chunk hash maps to the pre-March version of the policy, which did say the first two transfers were free, so the answer was correct for the policy in force at the time, and the prompt has since been improved. Without them, you know a chunk ID was retrieved and you cannot determine what it said.
>
> The other field I'd insist on is candidate counts before and after filtering. That's how you *demonstrate* authorization filtering actually ran on a given request, rather than asserting it.
>
> In a PII context there's a tension: the audit record needs to be reconstructable and the content is sensitive. I'd log hashes, IDs, versions, scores, and counts in the audit record, with raw query, chunk, and answer text in a separate access-controlled store with short retention requiring an explicit reason to access.
>
> And two properties that make it an audit log rather than a debug log: immutability — append-only with integrity checking — and its own retention policy, because regulatory windows run years while default log retention runs days."

## 8. Likely Follow-ups

**Q: What's the most commonly missing field?**
Chunk version — a content hash of what was actually retrieved. Chunk IDs are stable across revisions, so without the version hash you know *which* chunk was retrieved but not what it said at that moment. Config version is the close second, for the same reason applied to the pipeline.

**Q: How do you handle PII in audit logs?**
Split them. The audit record holds hashes, IDs, versions, scores, filters, and counts — everything needed to prove what happened. Raw query, chunk, and answer text go to a separate access-controlled store with short retention and explicit-reason access. That preserves reconstructability without putting content where operators and dashboards read it.

**Q: How do you prove authorization filtering ran?**
Log candidate counts before and after filtering. A record showing 500 candidates before and 180 after demonstrates the filter was applied and how much it constrained the search. Without those numbers you can assert filtering happened; with them you can show it, which is what an auditor wants.

**Q: What makes it an audit log rather than a debug log?**
Immutability and retention. Append-only storage with integrity checking, so records can't be modified after the fact — an editable audit log doesn't serve its purpose. And a retention policy driven by regulatory requirements, which for financial records commonly runs years, versus default application log retention of days or weeks.

**Q: Does auditability help with anything besides compliance?**
Substantially — it's the same substrate you use for debugging. The record that answers "why did the assistant say this in March" is the record that answers "why is this answer wrong today." Chunk IDs, scores, filters, and config versions are exactly what you need to localize a failure to ingestion, retrieval, or generation.

## 9. Common Mistakes

- Logging chunk IDs without content versions.
- No config version, making behavior unattributable to a pipeline state.
- Raw content in general application logs.
- Not logging candidate counts before and after filtering.
- Audit records in mutable storage with operational log retention.

## 10. What to Remember

- **Reconstruct what happened:** query, retrieval, versions, authorization, answer, config.
- **Chunk version and config version** are what make reconstruction possible — and are usually missing.
- **Candidate counts before/after filtering** prove authorization ran.
- **Split the record:** hashes and IDs in the audit log, content in a separate controlled store.
- **Immutable, with its own retention policy.** Regulatory windows run years.
