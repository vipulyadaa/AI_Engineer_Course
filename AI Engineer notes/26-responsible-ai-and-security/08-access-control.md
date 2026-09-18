# Access Control

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 08**

## 1. Definition

Ensuring a user's request can only reach data and actions they're entitled to. In an AI system this has to be enforced at retrieval and at every tool, because the model itself cannot be trusted to withhold what it was given.

## 2. Simple Explanation

The rule is simple: if a user isn't entitled to a document, that document must never be in the context.

Not "the model shouldn't mention it." Not "the prompt says don't disclose it." Not in the context at all — because once it's there, the only thing preventing disclosure is the model choosing not to, which is not a control.

## 3. How It Works

```
THREE ENFORCEMENT POINTS

1. RETRIEVAL   filter in the engine by the authenticated
               user's permissions — pre-filter, not post
2. TOOLS       every tool executes as the end user, not the
               service account
3. OUTPUT      verify no identifier in the answer belongs to
               anyone else — defence in depth

Point 1 is primary. Points 2 and 3 exist because point 1
can be wrong.
```

**Pre-filtering versus post-filtering is the distinction that matters.** Post-filtering means ineligible documents were retrieved and scored before being discarded — and it silently under-retrieves, because top-k was computed over a population the user can't see.

## 4. Practical Example

**Why post-filtering fails twice:**

```
User asks a question. Retrieval returns top-10 over the
whole corpus. Six are documents this user can't see.

POST-FILTER: discard those six → four results.

Two failures:
  1. LEAK — the six were retrieved, scored, and present in
     the process before being discarded
  2. SILENT UNDER-RETRIEVAL — the user gets four results
     instead of ten, and the six documents they WERE
     entitled to, sitting at ranks 11-20, were never
     considered

The second one is the quiet failure. The user gets a worse
answer and nothing indicates why.
```

**That under-retrieval point is what makes it an engineering argument as well as a security one.**

**The permission freshness problem:**

```
ACLs copied into chunk metadata at ingestion are a snapshot.

When someone leaves a team, their access changes — but no
document content changed, so content-hash-based incremental
re-indexing never touches those chunks. The stale
permission persists indefinitely.

Two options:
  A. a dedicated permission sync, separate from content
     re-indexing
  B. resolve permissions at query time against a live
     service, using metadata only to narrow

For anything sensitive I'd take B. Option A has a window
between a permission change and the next sync, and that
window is exactly when a departure matters most.
```

**The agent-specific escalation path:**

```
If an agent's tools execute with the SERVICE ACCOUNT's
permissions, any user who can reach the agent can reach
everything the service account can.

That's a confused deputy, and it's the single largest
access control risk in agent design — because the
ergonomic implementation is the insecure one.
```

## 5. Why It Matters

- **Pre-filtering is a correctness requirement**, and post-filtering fails twice.
- **Permissions in metadata go stale** because ACL changes don't change content.
- **Tools running as the service account** is the largest agent escalation risk.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Post-filtering** | Leaks and silently under-retrieves |
| **Stale ACLs in chunk metadata** | Permission changes never propagate |
| **Tools as the service account** | Confused deputy escalation |
| **Prompt instructions as the control** | Not a control |
| **Restrictive filters degrading ANN recall** | Security correct, quality degraded |
| **Cache without identity in the key** | Answers served across users |

**On the recall interaction:** a restrictive permission filter reduces the eligible population and ANN recall degrades accordingly. So recall must be measured *with* realistic filters applied — an unfiltered benchmark describes a configuration that never runs. The fix is namespaces per tenant where the axis is clean, which turns the filter into an index boundary and restores recall.

**On defence in depth:** the output check — verifying every identifier in the answer has provenance from the session or a permitted tool — exists because the retrieval filter might be wrong. It's cheap, it catches a whole failure class, and it's structural rather than pattern-based, which makes it more reliable than scanning for account-number shapes.

## 7. Interview Answer

> "The rule is that if a user isn't entitled to a document, that document must never be in the context. Not 'the model shouldn't mention it' — not in the context at all. Once it's there, the only thing preventing disclosure is the model choosing not to, and that isn't a control.
>
> There are three enforcement points. Retrieval, filtered in the engine by the authenticated user's permissions. Every tool, executing as the end user rather than the service account. And an output check verifying no identifier in the answer belongs to anyone else. The first is primary; the other two exist because the first can be wrong.
>
> The distinction that matters is pre-filtering versus post-filtering, and post-filtering fails twice. Say retrieval returns top-ten over the whole corpus and six are documents this user can't see. Post-filtering discards those six, leaving four. The first failure is the leak — those six were retrieved, scored, and present in the process before being discarded. The second is silent under-retrieval: the user gets four results instead of ten, and the six documents they *were* entitled to, sitting at ranks eleven to twenty, were never considered. They get a worse answer and nothing indicates why. That second one makes it an engineering argument as well as a security one.
>
> The subtle problem is permission freshness. ACLs copied into chunk metadata at ingestion are a snapshot, and when someone leaves a team their access changes without any document content changing — so content-hash-based incremental re-indexing never touches those chunks and the stale permission persists. Either you run a dedicated permission sync separate from content re-indexing, or you resolve permissions at query time against a live service using metadata only to narrow. For anything sensitive I'd take the second, because a sync has a window between the permission change and the next run — and that window is exactly when a departure matters most.
>
> In agent systems the largest risk is tools executing with the service account's permissions. Then any user who can reach the agent reaches everything the service account can — a confused deputy. And the ergonomic implementation is the insecure one, which is what makes it common.
>
> One interaction worth knowing: a restrictive permission filter reduces the eligible population and ANN recall degrades. So recall has to be measured with realistic filters — an unfiltered benchmark describes a configuration that never runs. Per-tenant namespaces fix it where the axis is clean, because the filter becomes an index boundary rather than a predicate."

## 8. Likely Follow-ups

**Q: Why is post-filtering wrong?**
It fails twice. Ineligible documents were retrieved and scored before being discarded, which is the leak. And top-k was computed over the whole corpus, so the user gets fewer results while documents they *were* entitled to, ranked just below, were never considered.

**Q: What's the problem with ACLs in chunk metadata?**
They're a snapshot from ingestion. A permission change doesn't change document content, so content-hash-based incremental re-indexing never touches those chunks and stale permissions persist indefinitely. It needs either a dedicated sync or query-time resolution against a live service.

**Q: Which would you choose?**
Query-time resolution for anything sensitive, with metadata used only to narrow. A sync leaves a window between the permission change and the next run, and that window is precisely when a departure or role change matters most.

**Q: What's the agent-specific risk?**
Tools executing with the service account's permissions rather than the end user's. Then anyone who can reach the agent can reach everything the service account can — a confused deputy. It's the largest access control risk in agent design and the ergonomic implementation is the insecure one.

**Q: Does filtering affect retrieval quality?**
Yes — a restrictive filter reduces the eligible population and ANN recall degrades. So recall must be measured with realistic filters applied, since an unfiltered benchmark describes a configuration that never runs. Per-tenant namespaces restore it by making the filter an index boundary.

## 9. Common Mistakes

- Filtering after retrieval rather than in the engine.
- Trusting ingestion-time ACLs to stay current.
- Tools running with service-account permissions.
- Prompt instructions treated as an access control.
- Benchmarking recall without realistic permission filters.

## 10. What to Remember

- **Not in the context at all** — the model withholding isn't a control.
- **Post-filtering leaks and under-retrieves** — two failures, one silent.
- **Metadata ACLs go stale**; prefer query-time resolution for sensitive data.
- **Tools execute as the end user**, never the service account.
- **Measure recall under realistic filters**; namespaces restore it.
