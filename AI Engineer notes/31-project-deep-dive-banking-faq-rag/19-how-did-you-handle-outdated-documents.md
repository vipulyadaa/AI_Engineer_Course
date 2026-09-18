# "How Did You Handle Outdated Documents?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 19**
>
> ⚠️ **An answer framework.** Describe your actual approach. "Full re-index
> on a schedule" is a real answer with real weaknesses worth naming.

## 1. Definition

A question about index freshness. In banking it's a correctness question rather than a housekeeping one — a superseded fee schedule that stays retrievable is a system that confidently quotes withdrawn policy.

## 2. Simple Explanation

Documents change. If the index still holds the old version, the system will answer from it — with full confidence and a valid citation.

The harder half is deletion: a policy that's withdrawn doesn't produce a new document to overwrite the old one. It produces nothing, and nothing doesn't trigger an update.

## 3. How It Works

```
THE THREE CASES

UPDATED    a new version of an existing document
           → re-chunk, re-embed, replace by chunk ID
           → and delete chunks that no longer exist,
             because the new version may have fewer

SUPERSEDED a policy replaced by a different document
           → the old one must stop being retrievable,
             and it isn't detected by watching for
             changed files

DELETED    a policy withdrawn entirely
           → the absence is the signal, which means it
             needs reconciliation rather than events
```

**The deletion case is the one that breaks systems**, because an event-driven pipeline has no event to react to.

## 4. Practical Example

**Why deletion needs reconciliation, not events:**

```
EVENT-DRIVEN     file written → re-index
                 works for create and update
                 CANNOT see a file that was removed

RECONCILIATION   periodically list the source of truth,
                 list the distinct document IDs in the
                 index, and delete the difference

Run it on a schedule, not in response to anything.

Without it, the index accumulates ghosts — chunks from
documents that no longer exist anywhere, still retrievable,
still citable, and pointing at a source URI that 404s.
```

**The effective-date field, which does the interpretive work:**

```
Every chunk carries:
  effective_from   when the policy took effect
  effective_to     when it was superseded, or null
  version          the document version

Three uses:
  1. FILTER at query time: effective_to IS NULL → only
     current policy is retrievable
  2. AUDIT: "what would the system have answered in March"
     is answerable, which matters when a customer disputes
     an answer they were given
  3. DISAMBIGUATE: if two versions are retrieved, the model
     can see which is current

Use 2 is why you SOFT-delete rather than hard-delete in
banking. A hard delete makes the audit question
unanswerable.
```

**The two-index trap worth naming:**

```
The vector index and the document store are separate
systems, and they drift.

Delete a chunk's vector but leave its text → an orphan
Delete the text but leave the vector → retrieval returns
a chunk ID that fetches nothing, and the failure surfaces
as an empty context rather than as an error

Reconciliation has to cover BOTH directions, and the fetch
path has to handle a missing document explicitly rather
than silently producing empty context.
```

**On the honest simple version:** a full re-index on a schedule handles updates and deletions correctly, because rebuilding from the current source of truth naturally excludes what's gone. Its weaknesses are cost, the staleness window between runs, and no audit trail of what changed. Saying "we rebuilt nightly, which was correct but blunt" is a good answer.

## 5. Why It Matters

- **Deletion has no event** — it needs scheduled reconciliation.
- **Effective dates make "what did it say in March" answerable** — an audit requirement.
- **Vector store and document store drift** in both directions.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We re-indexed periodically" with no detail | Doesn't address deletion or staleness |
| Handling updates but not deletions | Ghost chunks accumulate silently |
| Hard deletes in a regulated domain | Destroys the audit trail |
| No effective dates | Can't filter to current policy or reconstruct |
| Reconciling one store only | Orphans in the other |

**On the staleness window:** the real question is how long an out-of-date answer is acceptable, and that's a business decision. A fee change effective the first of the month must be live that day — which means either a scheduled run timed to that, or an event-driven path for documents flagged as time-critical. Naming the window and tying it to the update mechanism is what makes the answer concrete.

**On version skew during re-indexing:** while a document is being re-indexed, some chunks are new and some old. A query landing in that window can retrieve both and produce an answer combining two versions. Writing new chunks under a new version tag and flipping the query filter atomically avoids it — the same side-by-side pattern used for embedding model migration.

## 7. Interview Answer

> "[**Your approach.** A scheduled full rebuild is a legitimate answer.]
>
> "[**If it was a rebuild**] We re-indexed the whole corpus on a schedule. That's blunt, and it's correct for the common cases — rebuilding from the current source of truth naturally excludes anything that's been removed. Its weaknesses are cost, the staleness window between runs, and no record of what actually changed.
>
> The case I'd draw out is deletion, because it's the one that breaks incremental pipelines. An event-driven design reacts to a file being written, so it handles creates and updates fine — but a withdrawn policy produces no event. There's nothing to react to. So deletion needs reconciliation rather than events: periodically list the document IDs in the source of truth, list the distinct document IDs in the index, and delete the difference. Run on a schedule, not in response to anything.
>
> Without that, the index accumulates ghosts — chunks from documents that no longer exist anywhere, still retrievable, still citable, pointing at a source URI that four-oh-fours. And in banking, confidently quoting a withdrawn policy with a citation is worse than failing to answer.
>
> The mechanism that does most of the work is effective dates on every chunk — effective from, effective to, and the document version. Query-time filtering on effective-to being null means only current policy is retrievable. And it makes an audit question answerable: what would the system have said in March? That matters when a customer disputes an answer they were given, which is why in a regulated domain you soft-delete rather than hard-delete. A hard delete makes that question unanswerable.
>
> Two operational points. First, the vector store and the document store are separate systems and they drift in both directions — a vector deleted with its text left behind is an orphan, and text deleted with the vector left behind means retrieval returns a chunk ID that fetches nothing. That one surfaces as an empty context rather than as an error, so the fetch path has to handle a missing document explicitly. Reconciliation covers both directions.
>
> Second, version skew during re-indexing. While a document is mid-reindex, some chunks are new and some are old, and a query in that window can retrieve both and produce an answer combining two versions. Writing new chunks under a new version tag and flipping the query filter atomically avoids it — same side-by-side pattern as an embedding model migration.
>
> And the staleness window is really a business question: how out of date is acceptable? A fee change effective the first of the month has to be live that day, which means either timing the scheduled run to it or having an event-driven path for documents flagged time-critical."

## 8. Likely Follow-ups

**Q: How do you detect a deleted document?**
You can't, from events — there's nothing to react to. It requires reconciliation: list document IDs in the source of truth, list them in the index, delete the difference, on a schedule.

**Q: Why soft delete rather than hard delete?**
Auditability. When a customer disputes an answer they were given, reconstructing what the system would have said at that time requires the superseded content still existing. Query-time filtering on effective dates keeps it out of retrieval without destroying it.

**Q: What if a document is being re-indexed when a query arrives?**
Version skew — some chunks new, some old, and an answer combining both. Writing under a new version tag and flipping the query filter atomically avoids it, which is the same pattern as an embedding model migration.

**Q: How fresh does the index need to be?**
That's a business decision, not a technical one. A fee change effective the first of the month must be live that day. The practical shape is a scheduled baseline plus an event-driven path for documents flagged time-critical.

**Q: What breaks between the two stores?**
Drift in both directions. An orphaned vector retrieves a chunk ID that fetches nothing, which surfaces as empty context rather than an error — so the fetch path needs to handle a missing document explicitly instead of silently passing nothing to the model.

## 9. Common Mistakes

- Handling updates and forgetting deletions.
- Assuming events can detect a removal.
- Hard deleting in a regulated domain.
- No effective dates, so current policy can't be filtered.
- Not handling a chunk ID whose document is gone.

## 10. What to Remember

- **Deletion needs reconciliation** — there is no deletion event.
- **Effective dates filter to current policy and enable audit.**
- **Soft delete in banking** — the audit question must stay answerable.
- **Both stores drift** — reconcile in both directions.
- **Version-tag and flip atomically** to avoid mixed-version answers.
