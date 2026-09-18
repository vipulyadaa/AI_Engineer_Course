# Interview Questions: Vertex AI Vector Search

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 06**

## 1. Definition

Google's managed ANN service, built on ScaNN. Interview questions test whether you understand what it stores, how filtering actually works, and whether you'd measure recall on a managed index.

## 2. Simple Explanation

It stores vectors with filterable tokens and returns nearest neighbours. It does not store your documents.

That last point is where most interview answers go wrong, and the follow-on consequence is the part worth knowing.

## 3. How It Works

```
STORES        vectors + restricts (token allow/deny lists,
              numeric ranges)
RETURNS       IDs and distances
DOES NOT      store chunk text or full metadata

SO
  chunk text lives in Firestore, BigQuery, or GCS
  the application fetches payloads by ID after retrieval
```

**And that constraint has a useful consequence:** because the source of truth was never inside the index, changing index technology later is a re-index rather than a data migration.

## 4. Practical Example

**The three answers that distinguish:**

```
1. "IT STORES VECTORS AND RESTRICTS, NOT DOCUMENTS"
   Plus the consequence — payloads elsewhere, fetched by
   ID, and lock-in bounded as a result.

2. "RESTRICTS ARE TOKEN-BASED"
   Namespace allow and deny lists plus numeric ranges,
   not a general query language. So the permission model
   has to be expressible as token sets — fine for
   group-based ACLs, awkward for rule-based ones.

   "I'd check that against the actual authorization model
    before committing" is the sentence that shows you'd
    have hit this.

3. "I'D MEASURE RECALL EVEN THOUGH IT'S MANAGED"
   Build a FAISS exact index over the same vectors offline,
   run sampled production queries against both with
   realistic restricts applied, compare top-k overlap.

   ScaNN internals are only partly exposed, so recall
   isn't directly tunable — but it's still measurable, and
   knowing what you're getting matters even when you can't
   change it.
```

**The third answer is the strongest**, because almost nobody measures recall on a managed index and the question of how you'd do it separates people who've thought about it.

**Batch versus streaming, when asked:**

```
Batch rebuilds from GCS periodically — cheaper, and the
rebuild is a natural verification and cutover point.
Streaming makes upserts visible in seconds and costs
materially more.

I'd default to batch for a policy corpus changing weekly,
and use streaming only where a retraction must take effect
within minutes. That's a stated freshness requirement, not
a default.
```

**The filtered-recall point:** a restrictive filter reduces the eligible population and ANN recall degrades. So recall measured on the open corpus describes a configuration that never runs — in an access-controlled system every query is filtered, and the gap can be large enough to change the design.

## 5. Why It Matters

- **It stores vectors and restricts, not documents** — and that bounds lock-in.
- **Restricts are token-based**, so the ACL model has to fit that shape.
- **Measuring recall on a managed index** is the answer almost nobody gives.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "It stores your documents" | It doesn't — the common error |
| "Filtering is like SQL" | Restricts are token-based |
| "It's managed so recall is fine" | Managed doesn't mean known |
| Streaming by default | Materially higher cost, no stated need |
| Recall measured unfiltered | Describes a configuration that never runs |
| No mention of deployment time | Index deployment isn't instant |

**On the ACL fit question:** restricts handle tenant, ACL group, document type, and effective-date ranges well. A permission model based on rules — "anyone in this region with this clearance during business hours" — doesn't reduce to token sets cleanly. Checking that before committing is the kind of thing that's cheap to verify and expensive to discover during implementation.

**On index deployment time:** creating and deploying an index isn't a seconds-scale operation, which matters when planning a re-index or migration. It's the argument for building the new index alongside the old and cutting over by changing a query filter, rather than replacing in place.

## 7. Interview Answer

> "Vertex AI Vector Search is Google's managed ANN service, built on ScaNN. The first thing worth stating is what it stores: vectors and restricts, not documents. Chunk text and full metadata live in Firestore, BigQuery, or GCS, and the application fetches payloads by ID after retrieval.
>
> That's a required design rather than a choice, and it has a useful consequence — because the source of truth was never inside the index, changing index technology later is a re-index rather than a data migration. So the constraint bounds lock-in, which is worth pointing out.
>
> Second, filtering. Restricts are token-based — namespace allow and deny lists plus numeric ranges for things like effective dates. That's not a general query language, so the permission model has to be expressible as token sets. That's fine for group-based ACLs and awkward for rule-based ones, like 'anyone in this region with this clearance during business hours'. I'd check that against the actual authorization model before committing, because it's cheap to verify and expensive to discover during implementation.
>
> Third, and this is the answer I'd lead on if asked what I'd do differently: I'd measure recall even though it's managed. The ScaNN internals are only partly exposed, so recall isn't directly tunable — but it's still measurable. Build a FAISS exact flat index over the same vectors offline, run sampled production queries against both, and compare top-k overlap. Knowing what you're getting matters even when you can't change it, and almost nobody does this on a managed index.
>
> And I'd measure it with realistic restricts applied, because a restrictive filter reduces the eligible population and ANN recall degrades. Recall on the open corpus describes a configuration that never runs — in an access-controlled system every query is filtered, and the gap between filtered and unfiltered can be large enough to change the design.
>
> On update mode, batch rebuilds from GCS are cheaper and the rebuild is a natural verification and cutover point. Streaming makes upserts visible in seconds and costs materially more, so I'd default to batch for a policy corpus changing weekly and use streaming only where a retraction must take effect within minutes — a stated freshness requirement rather than a default.
>
> One operational point: index deployment isn't instant. That matters for planning a re-index or migration, and it's the argument for building the new index alongside the old and cutting over by changing a query filter rather than replacing in place."

## 8. Likely Follow-ups

**Q: Does it store your documents?**
No — vectors and restricts only. Chunk text and metadata live in Firestore, BigQuery, or GCS and are fetched by ID. That's required, and the useful consequence is that changing index technology later is a re-index rather than a data migration.

**Q: How does filtering work?**
Through restricts — token allow and deny lists on namespaces, plus numeric ranges. It's not a general query language, so the permission model has to be expressible as token sets. Group-based ACLs fit well; rule-based ones don't, which is worth checking early.

**Q: Can you measure recall on a managed index?**
Yes, even without tuning access. Build a FAISS exact index over the same vectors offline, run sampled production queries against both, and compare top-k overlap — with realistic restricts applied, since filtered recall is the number that describes production.

**Q: Batch or streaming updates?**
Batch by default — cheaper, and the rebuild is a natural verification and cutover point. Streaming only where a retraction must take effect within minutes, which is a stated freshness requirement rather than a default, since the cost difference is material.

**Q: Why measure recall with filters applied?**
Because a restrictive filter reduces the eligible population and ANN recall degrades. Every production query in an access-controlled system carries a filter, so unfiltered recall describes a configuration that never actually runs — and the gap can be large enough to change the design.

## 9. Common Mistakes

- Saying it stores documents.
- Describing restricts as a general query language.
- Assuming managed means recall is known.
- Defaulting to streaming updates.
- Measuring recall without production filters.

## 10. What to Remember

- **Vectors and restricts, not documents** — and that bounds lock-in.
- **Restricts are token-based** — check the ACL model fits.
- **Measure recall against a FAISS exact baseline** — almost nobody does.
- **Measure it with realistic filters** applied.
- **Batch by default; streaming only on a stated freshness need.**
