# "How Would You Implement Access Control?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 24**

## 1. Definition

A design question about enforcing document-level permissions through a retrieval pipeline. The central insight is that the vector index must enforce them, because everything downstream is too late.

## 2. Simple Explanation

A RAG system reads documents on the user's behalf. If it can read documents the user can't, it will eventually repeat their contents to them.

The only reliable place to enforce that is inside the search itself — filter before retrieval, not after.

## 3. How It Works

```
THE ENFORCEMENT CHAIN

1. IDENTITY       the END USER's identity, propagated —
                  not the service account's
2. ENTITLEMENTS   resolve to a set of access tokens
                  (roles, regions, classifications)
3. PRE-FILTER     pass them into the search as a
                  restriction, not a post-hoc filter
4. RE-CHECK       verify the fetched documents match
                  before assembling context
5. AUDIT          log who asked what and which documents
                  were used
```

**Step 1 is where the classic vulnerability lives.** The application runs as a service account with broad read access; if the end user's identity never reaches the retrieval layer, every user effectively has the service account's permissions. That's the confused deputy problem.

## 4. Practical Example

**Why post-filtering fails, in two distinct ways:**

```
POST-FILTER: retrieve top-10, then drop unauthorized

FAILURE 1 — SILENT UNDER-RETRIEVAL
  A restricted user's top-10 might contain 8 documents
  they can't see. They get 2 results. The system doesn't
  know it under-retrieved, so it answers from thin
  context or abstains for the wrong reason.

FAILURE 2 — THE DATA WAS STILL READ
  The restricted documents were fetched into application
  memory, and their existence is inferable from timing
  and result counts. In a regulated environment, reading
  is itself the controlled action.

PRE-FILTER: search only the permitted subset.
  top-10 means 10 permitted results, and unauthorized
  content is never read.
```

**Denormalizing permissions onto chunks, and its cost:**

```
Each chunk carries its access tokens as searchable
restricts:

  chunk_id:  policy-v4#12
  restricts: ["role:retail-advisor",
              "region:eu",
              "class:internal"]

Query passes the user's tokens; the engine searches only
matching vectors.

THE COST: it's a denormalized copy of the permission
model. When someone's access is revoked, or a document is
reclassified, the index must be updated — and until it is,
the index is the stale authority.

MITIGATIONS:
  · store coarse, stable tokens (roles, classifications)
    rather than individual user IDs — role membership
    changes outside the index, so revoking a role takes
    effect immediately without re-indexing
  · re-check at fetch time against the live permission
    service, so a stale index under-filters at most by
    one hop
  · a reconciliation job for reclassified documents
```

**The two places it silently breaks:**

```
HYBRID SEARCH   dense and lexical retrievers are
                configured separately. The filter gets
                applied to one and not the other — and
                hybrid search becomes an authorization
                bypass.
                FIX: one filter-construction function,
                a test asserting both branches.

CACHING         a cached answer keyed on the question
                alone is served across permission
                boundaries.
                FIX: the permission scope is part of the
                cache key. Always.

Both are real regressions, both are silent, and both are
introduced by a change that looks unrelated to security.
```

## 5. Why It Matters

- **Pre-filter, not post-filter** — post-filtering leaks and under-retrieves.
- **The end user's identity must reach the retrieval layer**, not the service account's.
- **Hybrid search and caching** are where filtering silently breaks.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Filtering after retrieval | Unauthorized documents read; silent under-retrieval |
| Prompt-level access instructions | Not a control — the model can be argued out of it |
| Service account identity throughout | Every user has the deputy's permissions |
| Filter on one hybrid branch | Authorization bypass |
| Cache keyed on question only | Cross-user answer leak |
| Individual user IDs as restricts | Every permission change needs re-indexing |

**On the citation channel:** even with correct filtering, citations can leak. A response saying "I can't answer that, but see confidential-strategy-2026.pdf" discloses a filename the user shouldn't know exists. Citations must be restricted to documents in the permitted set, and abstention messages must not name what was excluded.

**On what the audit log needs:** not just the query and the answer — the document IDs retrieved and the entitlement set used. Without the entitlements, a later investigation can't reconstruct why a document was or wasn't visible, which is the question an audit actually asks.

## 7. Interview Answer

> "The core principle is that access control has to be enforced inside the vector search, not after it — and the reason is that everything downstream is too late in two separate ways.
>
> If you retrieve the top ten and then drop what the user can't see, the first problem is silent under-retrieval: a restricted user might have eight of their top ten filtered out, so they get two results and the system doesn't know it under-retrieved. It answers from thin context, or abstains for the wrong reason.
>
> The second problem is worse — those documents were fetched into application memory. In a regulated environment, reading is itself the controlled action, so 'we read it and then discarded it' isn't a defence. And their existence is partly inferable from timing and result counts.
>
> Pre-filtering searches only the permitted subset, so top-ten means ten permitted results and the restricted content is never read.
>
> Mechanically: each chunk carries access tokens as searchable restricts — roles, regions, classifications. The query passes the user's resolved tokens and the engine searches only matching vectors.
>
> The identity question is where the classic vulnerability sits. The application typically runs as a service account with broad read access across the corpus. If the end user's identity doesn't reach the retrieval layer, every user effectively has the service account's permissions — that's the confused deputy problem, and it's the single most common way this gets built wrong.
>
> On the denormalization cost: those restricts are a copy of the permission model, so when access is revoked or a document is reclassified the index is stale until it's updated. Two mitigations. Store coarse, stable tokens — roles and classifications rather than individual user IDs — because role membership changes outside the index, so revoking someone's role takes effect immediately with no re-indexing. And re-check at fetch time against the live permission service, so a stale index under-filters by at most one hop.
>
> Then two places this silently breaks. Hybrid search: the dense and lexical retrievers are configured separately, so the filter gets applied to one and not the other, and hybrid search becomes an authorization bypass. One filter-construction function and a test asserting both branches.
>
> And caching: a cached answer keyed on the question alone gets served across permission boundaries. The permission scope is part of the cache key, always. Both of those are silent, and both get introduced by a change that looks unrelated to security.
>
> One more channel — citations. Even with correct filtering, a response saying 'I can't answer that, but see confidential-strategy dot pdf' discloses a filename the user shouldn't know exists. Citations restricted to the permitted set, and abstention messages that don't name what was excluded.
>
> And the audit log needs the entitlement set used, not just the query and the answer — otherwise an investigation can't reconstruct why a document was or wasn't visible, which is exactly what an audit asks."

## 8. Likely Follow-ups

**Q: Why not filter after retrieval?**
Two reasons. It silently under-retrieves — a restricted user gets 2 results from a top-10 search — and the unauthorized documents were still read into memory, which in a regulated environment is itself the controlled action.

**Q: What's the confused deputy problem here?**
The app runs as a service account with broad read access. If the end user's identity doesn't propagate to retrieval, every user inherits the service account's permissions and the system reads documents on their behalf that they can't access.

**Q: What happens when permissions change?**
The restricts on chunks are a denormalized copy, so the index goes stale. Storing coarse role tokens rather than user IDs means role changes take effect outside the index immediately; a fetch-time re-check against the live permission service bounds the staleness.

**Q: Where does filtering silently break?**
Hybrid search and caching. The two retrievers are configured separately so one keeps the filter, and a cache keyed on the question alone serves answers across permission boundaries. Both are introduced by changes that look unrelated to security.

**Q: Can citations leak?**
Yes. Naming a document in a refusal discloses that it exists. Citations must be restricted to the permitted set, and abstention messages must not reference what was filtered out.

## 9. Common Mistakes

- Post-filtering instead of pre-filtering.
- Relying on prompt instructions for access control.
- Not propagating the end user's identity.
- Applying the filter to one hybrid branch.
- Caching without the permission scope in the key.

## 10. What to Remember

- **Pre-filter in the engine** — post-filter leaks and under-retrieves.
- **Propagate the end user's identity**, not the service account's.
- **Coarse role tokens** beat user IDs as restricts.
- **Hybrid and cache** are the silent bypass paths.
- **Citations and refusals can leak filenames.**
