# Vector Search

> **Phase 20 · VERTEX AI · Topic 10**

## 1. Definition

Vertex AI's managed approximate nearest-neighbour service, built on ScaNN. It stores vectors with filterable restricts, serves them from a deployed index endpoint, and keeps data inside the project.

> Vector databases generally are in [07-vector-databases](../07-vector-databases/). This topic is the Vertex AI specifics.

## 2. Simple Explanation

You give it vectors with metadata tokens, deploy an index to an endpoint, and query with a vector plus filters.

The two things to internalize are that it stores vectors and restricts rather than documents, and that filtering works on tokens rather than as a general query language.

## 3. How It Works

```
1. write vectors + restricts to GCS as JSONL, or stream upserts
2. create an Index — BATCH or STREAM update mode
3. deploy it to an IndexEndpoint (public, or private via PSC)
4. query with a vector, neighbor count, and restricts
```

```python
endpoint.find_neighbors(
    deployed_index_id="policies_v3",
    queries=[query_vector],
    num_neighbors=20,
    filter=[Namespace("tenant", ["retail-uk"], []),
            Namespace("acl",    user.groups,  [])],
    numeric_filter=[NumericNamespace("effective_from",
                                     value_int=today, op="LESS_EQUAL")],
)
```

## 4. Practical Example

**The design that's required, and its useful consequence:**

```
Vector Search stores VECTORS and RESTRICTS. Not documents.

So chunk text and full metadata live in Firestore, BigQuery,
or GCS; Vector Search returns IDs and distances; the
application fetches payloads by ID.

That's required rather than optional — and the useful
consequence is that changing index technology later is a
re-index rather than a data migration, because the source
of truth was never inside the index.
```

**Restricts, and what they can and can't express:**

```
CAN     token allow/deny lists — tenant, ACL groups,
        document type, language
        numeric ranges — effective dates, versions

CAN'T   arbitrary boolean logic, joins, or computed
        predicates

So the permission model has to be expressible as token sets.
That's fine for group-based ACLs and awkward for rule-based
ones, and it's worth checking against the actual
authorization model before committing.
```

**Batch versus stream update mode:**

```
BATCH   rebuild from GCS periodically. Cheaper, and the
        rebuild is a natural verification and cutover point.
STREAM  upserts visible in seconds. Materially more expensive.

I'd default to batch for a policy corpus changing weekly,
and use stream only where a retraction has to take effect
within minutes. That's a stated freshness requirement, not
a default.
```

**Measuring what you're getting:** the ScaNN parameters are only partly exposed, so recall isn't directly tunable. But it's still measurable — build a FAISS exact index over the same vectors offline, run sampled production queries against both with realistic restricts applied, and compare top-k overlap. Knowing your recall matters even when you can't change it.

## 5. Why It Matters

- **Vectors and restricts, not documents** — a required design with a useful lock-in consequence.
- **Restricts are token-based**, so the permission model has to fit that shape.
- **Recall is measurable even when not tunable**, via an offline exact baseline.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expecting it to store text** | It doesn't; payloads live elsewhere |
| **Permission model that isn't token-expressible** | Restricts can't represent it |
| **Streaming by default** | Materially higher cost with no stated need |
| **Index deployment latency** | Changes aren't instant |
| **Restrictive filters degrading recall** | ANN recall falls under selective filters |
| **Recall never measured** | Managed doesn't mean known |

**On filtered recall:** a restrictive filter reduces the eligible population and ANN recall degrades accordingly, which is why recall must be measured *with* realistic restricts rather than on the open corpus. In an access-controlled system every query is filtered, so an unfiltered benchmark measures a configuration that never runs.

**On deployment timing:** creating and deploying an index takes time — it isn't a seconds-scale operation. That matters for planning a re-index or a migration, and it's a reason to build the new index alongside the old and cut over by filter rather than replacing in place.

## 7. Interview Answer

> "Vector Search is Google's managed ANN service, built on ScaNN. You write vectors and restricts to GCS or stream upserts, create an index, deploy it to an index endpoint, and query with a vector, a neighbour count, and restricts.
>
> The first thing to internalize is that it stores vectors and restricts, not documents. Chunk text and full metadata live in Firestore or BigQuery or GCS, Vector Search returns IDs and distances, and the application fetches payloads by ID. That's required rather than a design choice — and the useful consequence is that changing index technology later is a re-index rather than a data migration, because the source of truth was never inside the index.
>
> Second, restricts are token-based. Allow and deny lists on namespaces for tenant, ACL groups, document type, and language, plus numeric ranges for effective dates. What they can't do is arbitrary boolean logic or computed predicates — so the permission model has to be expressible as token sets. That's fine for group-based ACLs and awkward for rule-based ones, and it's worth checking against the actual authorization model before committing rather than discovering it during implementation.
>
> On update mode, batch rebuilds from GCS periodically and is cheaper, with the rebuild acting as a natural verification and cutover point. Streaming makes upserts visible in seconds and costs materially more. I'd default to batch for a policy corpus changing weekly and use streaming only where a retraction has to take effect within minutes — that's a stated freshness requirement, not a default.
>
> Two things I'd do that people skip. Measure recall: ScaNN parameters are only partly exposed so recall isn't directly tunable, but it's still measurable. Build a FAISS exact index over the same vectors offline, run sampled production queries against both with realistic restricts applied, and compare top-k overlap. Knowing what you're getting matters even when you can't change it.
>
> And measure it *with* the restricts. A restrictive filter reduces the eligible population and ANN recall degrades accordingly. In an access-controlled system every query is filtered, so an unfiltered benchmark measures a configuration that never actually runs."

## 8. Likely Follow-ups

**Q: Does Vector Search store the chunk text?**
No — vectors and restricts only. Payloads live in Firestore, BigQuery, or GCS and are fetched by ID after retrieval. That's required, and it usefully means swapping index technology later is a re-index rather than reconstructing your data.

**Q: How does filtering work?**
Through restricts — token allow and deny lists on namespaces, plus numeric ranges for things like effective dates. It's not a general query language, so the permission model has to be expressible as token sets. Group-based ACLs fit well; rule-based ones are awkward.

**Q: Batch or streaming updates?**
Batch by default — cheaper, and the rebuild is a natural verification and cutover point. Streaming when there's a stated freshness requirement, like a retraction taking effect within minutes. The cost difference is material enough that it shouldn't be the default.

**Q: Can you measure recall on a managed index?**
Yes, even though the ScaNN parameters aren't fully exposed. Build a FAISS exact index over the same vectors offline, run sampled production queries against both, and compare top-k overlap. Knowing your recall matters even when you can't tune it directly.

**Q: Does filtering affect recall?**
Yes — a restrictive filter reduces the eligible population and ANN recall degrades. So recall must be measured with realistic restricts applied. In an access-controlled system every query is filtered, so an unfiltered benchmark describes a configuration that never runs in production.

## 9. Common Mistakes

- Expecting Vector Search to return document text.
- Designing a permission model that restricts can't express.
- Using streaming updates without a freshness requirement.
- Never measuring recall because the index is managed.
- Benchmarking recall without realistic restricts applied.

## 10. What to Remember

- **Vectors and restricts only** — payloads elsewhere, fetched by ID.
- **Restricts are token-based** — the ACL model must fit that shape.
- **Batch by default; stream only for stated freshness needs.**
- **Measure recall against an offline FAISS exact baseline.**
- **Measure it with realistic filters** — every production query is filtered.
