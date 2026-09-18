# Authorization After Retrieval

> **Phase 14 · RAG SECURITY · Topic 14**

## 1. Definition

Filtering or re-checking results after the vector search has run. As the **primary** control it's a security and quality defect. As a **secondary** check on top of pre-filtering, it's useful defense in depth.

## 2. Simple Explanation

Post-filtering means you searched everything, then threw away what the user can't see.

That's wrong as your only control, for two reasons that are worth keeping separate: the ineligible content was retrieved and handled, and you silently end up with fewer results than you asked for.

But re-checking *after* pre-filtering is a different thing entirely, and it's worth doing.

## 3. How It Works

**Post-filtering as the primary control — what actually happens:**

```
1. search ALL 500,000 chunks           → top 10
2. strip the 6 the caller can't see
3. model receives 4 chunks

SECURITY  6 ineligible chunks were embedded-compared, ranked,
          deserialized, and held in process memory. Any log
          statement, exception trace, or debugger session
          in that window exposes them.

QUALITY   You asked for 10. You got 4. Nothing signals that
          6 were removed, so the answer is incomplete for
          reasons invisible to everyone.
```

**Post-check as defense in depth — the useful version:**

```
1. pre-filter → search constrained to eligible chunks
2. results returned
3. RE-VERIFY each returned chunk against the caller's entitlements
4. if any fails → do not return; alert; investigate

Step 3 duplicates step 1 deliberately. That's the point —
it catches a bug in filter construction, not a bug in the model.
```

## 4. Practical Example

**The under-retrieval problem, made concrete:**

```
Requested k = 10.

Post-filter:  4 eligible results reach the model.
              The answer is thin. Nobody knows why.
              The metric that would reveal it — candidates
              before vs. after filtering — isn't logged.

Pre-filter:   10 eligible results reach the model.
              The search considered only the ~180,000 chunks
              the caller can see and returned the best 10 of those.
```

**The defense-in-depth check:**

```python
def retrieve(query, caller):
    results = authorized_index(caller).query(query, k=10)   # pre-filtered

    # Duplicate check — catches filter construction bugs
    for r in results:
        if not entitled(caller, r.metadata):
            alert("AUTHZ_BYPASS", chunk=r.id, caller=caller.id)
            raise SecurityError("authorization invariant violated")

    return results
```

**Why the alert matters more than the block:** if this ever fires, you have a filter bug that would otherwise have leaked silently. The exception protects that request; the alert protects every other request.

**A legitimate post-retrieval use that isn't authorization:**

```
Redaction. A caller may be entitled to a document but not to
the account numbers within it. Retrieve it, then redact fields
by clearance before it reaches the prompt.

That's field-level masking, applied after retrieval by necessity —
distinct from deciding whether the document is retrievable at all.
```

## 5. Why It Matters

- **The distinction between "post-filter as primary control" and "post-check as safety net" is exactly what an interviewer is probing.**
- **The under-retrieval consequence is often missed** — people frame post-filtering purely as a security issue.
- **Field-level redaction legitimately happens after retrieval**, which is worth distinguishing.

## 6. Trade-offs / Failure Modes

| Post-filtering as primary | Consequence |
|---|---|
| Ineligible chunks scored and held | Exposure via logs, traces, memory |
| Silent under-retrieval | Incomplete answers, no signal |
| Effective k unpredictable | Varies by caller and query |
| Wasted compute | Ranking documents you'll discard |

| Post-check as secondary | Consideration |
|---|---|
| Small latency cost | Negligible — a metadata comparison per result |
| Should never fire | If it does, you have a filter bug — alert loudly |
| Doesn't replace pre-filtering | It's a net, not the floor |

**The one case where post-filtering is unavoidable:** if entitlement can only be determined by inspecting the chunk's content rather than its metadata — which usually indicates a metadata design problem. The right fix is extracting the entitlement-relevant attribute into metadata at ingestion so it becomes pre-filterable.

## 7. Interview Answer

> "Post-retrieval authorization is filtering after the vector search has run, and the answer depends entirely on whether it's the primary control or a secondary check.
>
> As the primary control it's a defect, for two reasons worth keeping separate. Security: the ineligible chunks were embedded-compared, ranked, deserialized, and held in process memory before being dropped — so any log statement or exception trace in that window exposes them. And quality: you asked for ten results, six were stripped, the model got four, and nothing signals that anything was removed. The answer is thin for reasons invisible to everyone, including whoever's debugging it later.
>
> That second point is the one people miss. Post-filtering is usually framed purely as a security issue, but it also makes your effective k unpredictable and caller-dependent.
>
> As a secondary check on top of pre-filtering, though, it's worth having. After the filtered search returns, re-verify that every returned chunk is one the caller is entitled to. That deliberately duplicates the pre-filter, which is the point — it catches a bug in filter construction. And if it ever fires, the alert matters more than the block: the exception protects that one request, and the alert tells you about a bug that would otherwise have leaked silently.
>
> There's one legitimate post-retrieval operation that isn't authorization: field-level redaction. A caller may be entitled to a document but not to the account numbers inside it, so you retrieve it and mask fields by clearance before it reaches the prompt. That's masking, not an access decision, and it necessarily happens after retrieval.
>
> The one case where post-filtering is genuinely unavoidable is when entitlement depends on chunk content rather than metadata — and that usually means the metadata design is wrong. The fix is extracting that attribute at ingestion so it becomes pre-filterable."

## 8. Likely Follow-ups

**Q: Is post-filtering ever acceptable?**
As a secondary check on top of pre-filtering, yes — it's useful defense in depth against filter-construction bugs. As the primary control, no. The only genuine exception is when entitlement can only be determined from chunk content rather than metadata, and that usually indicates the metadata schema needs the relevant attribute extracted at ingestion.

**Q: What's the quality problem with post-filtering?**
Silent under-retrieval. You request top-k, some results are stripped, and the model receives fewer chunks with no indication. Your effective k becomes unpredictable and caller-dependent, and answers are incomplete for reasons nobody can see — including whoever debugs it later, unless candidate counts before and after filtering are logged.

**Q: What should happen if the post-check fires?**
Block that request, and alert loudly. The block protects one user; the alert tells you there's a filter-construction bug that would otherwise have leaked silently across every other request. This check should never fire in normal operation, so any firing is a signal rather than routine handling.

**Q: How is redaction different?**
Redaction is field-level masking within a document the caller is entitled to see — they can read the case file but not the account numbers. That's a different decision from whether the document is retrievable at all, and it necessarily happens after retrieval because you need the content to mask it. It's not post-filtering authorization.

**Q: What if entitlement depends on the chunk's content?**
That's the signal that the metadata design is incomplete. The right fix is extracting the entitlement-relevant attribute — a customer ID, a classification level — into metadata at ingestion so it becomes pre-filterable. Falling back to content inspection at query time means accepting post-filtering's problems unnecessarily.

## 9. Common Mistakes

- Using post-filtering as the primary access control.
- Framing it as only a security issue and missing the under-retrieval problem.
- Not logging candidate counts before and after filtering.
- Treating a post-check failure as routine rather than as a bug signal.
- Accepting content-based entitlement instead of fixing the metadata schema.

## 10. What to Remember

- **As the primary control: a defect.** As a secondary check: useful defense in depth.
- **Two problems:** ineligible chunks handled, and silent under-retrieval.
- **The post-check should never fire** — if it does, alert loudly; that's a filter bug.
- **Field-level redaction is legitimate post-retrieval work**, and distinct from authorization.
- **Content-based entitlement means fix the metadata**, not accept post-filtering.
