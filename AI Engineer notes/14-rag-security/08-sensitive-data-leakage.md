# Sensitive Data Leakage

> **Phase 14 · RAG SECURITY · Topic 08**

## 1. Definition

Sensitive content reaching someone who shouldn't see it — through retrieval, through the generated answer, or through the system's operational surfaces like logs, caches, and traces. The last category is the one most often overlooked.

## 2. Simple Explanation

You can get the access-control filter perfectly right and still leak.

The answer text, the citation, the log line, the cached response, the error message, and the evaluation dataset are all places sensitive content can end up. A RAG system has many more exits than the primary response path.

## 3. How It Works

**The leakage surfaces, in order of how often they're missed:**

| Surface | Mechanism |
|---|---|
| **Retrieval** | ACL filter missing or post-applied |
| **Answer text** | Model summarizes content the user shouldn't see |
| **Citations** | Revealing a document's *existence* is itself disclosure |
| **Logs and traces** | Query and retrieved text written to shared logging |
| **Caches** | Response cache serving one user's answer to another |
| **Error messages** | Stack traces including chunk content |
| **Eval datasets** | Production queries with PII used for tuning |
| **Metrics/monitoring** | Sample answers in dashboards |

**The principle:** classify data once, then enforce at every exit — not just at retrieval.

## 4. Practical Example

**The cache leak, which is easy to build accidentally:**

```python
# ❌ Semantic response cache keyed on query text
cache_key = hash(normalize(query))
if cached := cache.get(cache_key):
    return cached

# User A (finance team) asks "what's the Q3 merger provision?"
#   → answer cached, containing restricted content
# User B (retail staff) asks the same question
#   → CACHE HIT. They get A's answer, ACL filter never ran.

# ✅ Cache key must include the entitlement context
cache_key = hash(normalize(query), sorted(caller.groups), caller.tenant)
```

**The existence-disclosure problem:**

```
❌ "I found 3 documents about Project Titan but you don't have
    access to them."
   → confirms Project Titan exists, which may be the sensitive fact.

✅ "I don't have information about that."
   → indistinguishable from genuinely having nothing.

Abstention for "filtered out" and abstention for "doesn't exist"
must produce identical responses.
```

**Logging in a regulated context:**

```
Log:  query_hash, chunk_ids, scores, latency, caller_id, config_version
Do NOT log:  raw query text, retrieved chunk text, answer text

If you need content for debugging, write it to a separate
access-controlled store with short retention — not to the
general application log that operators and dashboards read.
```

## 5. Why It Matters

- **Getting retrieval filtering right is necessary and not sufficient.**
- **Caches and logs are the surfaces that reach production unnoticed**, because they're added for performance and observability rather than reviewed as security surfaces.
- **In banking, a leak is a reportable incident**, not a bug.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Cache keyed without entitlements** | Cross-user answer serving |
| **Raw content in application logs** | Operators see what users can't |
| **Existence disclosure in abstentions** | The filtered set is itself sensitive |
| **Error messages containing chunk text** | Stack traces leak |
| **Eval datasets built from production** | PII propagated into a less-controlled store |
| **Dashboards showing sample answers** | Broad audience, sensitive content |
| **Summarization crossing boundaries** | Model combines a permitted and a restricted chunk |

**On the debugging tension:** logging query and answer text makes debugging vastly easier, and it's exactly what you can't do freely with sensitive content. The workable compromise is logging identifiers and hashes in the general log, with full content in a separate short-retention, access-controlled store that requires an explicit reason to access.

**On the summarization risk:** if a user is entitled to chunk A but not chunk B, and both reach the context through a filtering bug, the answer may combine them in a way that discloses B's content without citing it. That's why post-retrieval entitlement re-verification is worth having as defense in depth.

## 7. Interview Answer

> "Sensitive data leakage is content reaching someone who shouldn't see it — and the important framing is that getting the retrieval ACL filter right is necessary but not sufficient. A RAG system has many more exits than the primary response path.
>
> The surfaces I'd enumerate: retrieval itself, the answer text, citations, logs and traces, caches, error messages, evaluation datasets, and monitoring dashboards. The last several are the ones that reach production unnoticed, because they're added for performance and observability rather than reviewed as security surfaces.
>
> The cache leak is the one I'd highlight. A semantic response cache keyed on query text means user A from the finance team asks a question, the answer is cached, and user B from retail asks the same question and gets a cache hit — receiving A's answer with the ACL filter never running. The fix is including the entitlement context in the cache key: groups, tenant, clearance.
>
> Citations have a subtler version. Saying 'I found three documents about Project Titan but you're not authorized' confirms Project Titan exists, which may itself be the sensitive fact. Abstention for 'filtered out' and abstention for 'doesn't exist' have to produce identical responses.
>
> On logging, there's a real tension: logging query and answer text makes debugging vastly easier and it's exactly what you can't do freely with sensitive content. The compromise I'd use is logging identifiers, hashes, chunk IDs, and scores in the general application log, with full content in a separate short-retention access-controlled store that requires an explicit reason to access.
>
> And I'd add post-retrieval entitlement re-verification as defense in depth — because if a filtering bug lets a restricted chunk into the context, the model may summarize it into the answer without even citing it."

## 8. Likely Follow-ups

**Q: What's the most commonly missed leakage surface?**
Caches. A semantic response cache or an embedding cache keyed only on query text serves one user's result to another, bypassing the ACL filter entirely. They're added for performance and rarely reviewed as a security surface. The fix is including entitlement context — groups, tenant — in the cache key.

**Q: Can citations leak?**
Yes. Revealing that a document exists can be the disclosure, even without its content. "I found three documents you're not authorized to view" confirms those documents exist. Abstention responses must be identical whether content was filtered out or never existed.

**Q: How do you handle logging in a regulated context?**
Log identifiers and hashes — query hash, chunk IDs, scores, caller ID, config version — in the general application log. Put raw content in a separate access-controlled store with short retention, requiring an explicit reason to access. That preserves debuggability without putting sensitive content where operators and dashboards can read it.

**Q: What about evaluation datasets?**
They're a real propagation path — production queries and answers with PII moved into a less-controlled store used by more people. I'd redact at the point of extraction, not later, and treat the eval dataset as carrying the same classification as its source. Synthetic or heavily redacted eval sets are safer where they're sufficient.

**Q: Why re-verify entitlements after retrieval?**
Defense in depth. If a filtering bug lets a restricted chunk into the context, the model may summarize its content into the answer without citing it — so the leak isn't even attributable. A cheap re-check that every chunk reaching the prompt is one the caller is entitled to catches that class of bug before it becomes an incident.

## 9. Common Mistakes

- Caches keyed without entitlement context.
- Raw query and answer text in general application logs.
- Abstention messages that reveal filtered documents exist.
- Evaluation datasets built from production without redaction.
- Assuming a correct retrieval filter is sufficient.

## 10. What to Remember

- **Retrieval filtering is necessary, not sufficient.** A RAG system has many exits.
- **Caches are the most-missed surface** — key on entitlement context, not just query text.
- **Existence disclosure counts** — abstention must be identical for "filtered" and "absent."
- **Log identifiers, not content.** Full content goes to a separate short-retention store.
- **Re-verify entitlements post-retrieval** as defense in depth.
