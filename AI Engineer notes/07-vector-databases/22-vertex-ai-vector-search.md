# Vertex AI Vector Search

> **Phase 07 · VECTOR DATABASES · Topic 22**

## 1. Definition

Google Cloud's managed vector search service, built on ScaNN. It provides large-scale approximate nearest-neighbour search with filtering, inside your GCP project — so data never leaves the environment.

## 2. Simple Explanation

It's the GCP-native vector store. You build an index from vectors in Cloud Storage or stream them in, deploy it to an endpoint, and query it with IAM-authenticated calls.

The reasons to choose it on GCP are residency, IAM integration, and it being the same infrastructure Google uses for its own retrieval — not a benchmark advantage.

## 3. How It Works

```
1. Write vectors + metadata to Cloud Storage (JSONL), or
   stream upserts via the API
2. Create an Index — batch or STREAM update mode
3. Deploy the Index to an IndexEndpoint
   (public, or private via VPC / Private Service Connect)
4. Query with a vector, neighbor count, and restricts
```

```python
endpoint.find_neighbors(
    deployed_index_id="policies_v3",
    queries=[qv],
    num_neighbors=20,
    filter=[Namespace("tenant", ["retail-uk"], []),
            Namespace("acl", user.groups, [])],   # allow / deny
)
```

**Two update modes, and the choice matters:**

| Mode | Behaviour |
|---|---|
| **Batch** | Rebuild from Cloud Storage periodically; cheaper |
| **Stream** | Upserts visible in seconds; higher cost |

## 4. Practical Example

**Why it usually wins for a GCP-based bank:**

```
1. RESIDENCY — vectors and metadata stay in the project and
   region. No third-party processor, no cross-border transfer.
2. IAM — access control uses the same identities and audit
   trail as everything else. No separate key to rotate.
3. VPC-SC — the endpoint can sit inside a service perimeter.
4. INTEGRATION — same project as the Gemini and embedding
   APIs; one billing account, one audit log.

These are compliance-review arguments, and in a regulated
environment they're decided before recall benchmarks are.
```

**The operational characteristics to know:**

```
· Filtering uses "restricts" — namespace tokens with allow
  and deny lists, applied during the search
· Numeric restricts support range filtering (effective dates)
· Index deployment takes time; it isn't instant
· Streaming updates cost more than batch rebuilds
· ScaNN parameters are partially exposed, not fully
```

**The design decision I'd actually make:**

```
Vector Search stores vectors + restricts. It is NOT a
document store.

So: chunk text and full metadata live in Firestore, BigQuery,
or Cloud Storage; Vector Search returns IDs and distances;
the app fetches payloads by ID.

That's a required design, not an optimization — and it has a
useful consequence: swapping the index later is a re-index,
not a data migration, because the source of truth was never
in the index.
```

**On the two update modes:** a policy corpus changing weekly fits batch — cheaper, and a rebuild is a natural verification point. A corpus where a retraction must take effect within minutes needs streaming. I'd default to batch and move to streaming only where freshness is a stated requirement, because the cost difference is real and batch rebuilds give a clean cutover.

## 5. Why It Matters

- **It's the default answer for a GCP AI engineer role**, and the reasons should be residency and IAM, not performance.
- **The separate-payload-store design** is required, and it happens to reduce lock-in.
- **Batch versus stream** is a real cost and freshness decision.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not a document store** | Payloads must live elsewhere |
| **Deployment latency** | Index changes aren't instant |
| **Streaming cost** | Materially higher than batch |
| **Limited parameter control** | ScaNN internals partly hidden |
| **GCP-only** | Not an option in a multi-cloud requirement |
| **Restricts are token-based** | Model ACLs as tokens deliberately |

**On restricts:** filtering works on namespace tokens with allow and deny lists, plus numeric ranges. It's expressive enough for tenant, ACL group, document type, and effective dates, but it isn't a general query language. Permission models need to be expressible as token sets — which is fine for group-based ACLs and awkward for rule-based ones, and worth checking against the actual authorization model before committing.

**On measuring recall:** as with any managed service, index internals are partly hidden. The same FAISS exact-baseline approach applies — build a flat index over the same vectors offline and compare top-k overlap on sampled production queries, with realistic restricts applied.

## 7. Interview Answer

> "Vertex AI Vector Search is Google Cloud's managed vector search service, built on ScaNN. You write vectors and metadata to Cloud Storage or stream them in, create an index, deploy it to an endpoint, and query with a vector, a neighbour count, and restricts.
>
> For a GCP-based bank it's usually the right default, and the reasons are compliance rather than benchmarks. Vectors and metadata stay in the project and region, so there's no third-party processor and no cross-border transfer. Access control is IAM, using the same identities and audit trail as everything else, so there's no separate API key to manage and rotate. The endpoint can sit inside a VPC Service Controls perimeter. And it's the same project as the Gemini and embedding APIs — one billing account, one audit log. Those are the arguments that get decided before anyone compares recall numbers.
>
> The design point I'd raise is that it stores vectors and restricts, not documents. So chunk text and full metadata live in Firestore or BigQuery or Cloud Storage, Vector Search returns IDs and distances, and the application fetches payloads by ID. That's required rather than optional — and it has a useful consequence: swapping the index later is a re-index, not a data migration, because the source of truth was never inside the index.
>
> Two operational choices. Update mode — batch rebuilds from Cloud Storage are cheaper and give a clean verification and cutover point; streaming makes upserts visible in seconds but costs materially more. I'd default to batch for a policy corpus that changes weekly, and use streaming only where a retraction has to take effect within minutes.
>
> And filtering: restricts are namespace tokens with allow and deny lists, plus numeric ranges for things like effective dates. That's expressive enough for tenant, ACL group, and document type, but it isn't a general query language — the permission model has to be expressible as token sets. Fine for group-based ACLs, awkward for rule-based ones, and worth checking against the real authorization model before committing.
>
> As with any managed index I'd still measure recall against a FAISS exact baseline offline, with realistic restricts applied, since the ScaNN internals are only partly exposed."

## 8. Likely Follow-ups

**Q: Why choose it on GCP?**
Residency and IAM, mainly. Data stays in the project and region with no third-party processor, access control uses existing identities and audit trails, and the endpoint can sit in a VPC Service Controls perimeter. In a regulated environment those settle the choice before performance comparisons start.

**Q: Does it store the chunk text?**
No — it stores vectors and restricts. Payloads live in Firestore, BigQuery, or Cloud Storage, and the application fetches them by ID after retrieval. That's a required design, and a useful side effect is that changing index technology later is a re-index rather than a data migration.

**Q: Batch or streaming updates?**
Batch by default — cheaper, and a rebuild is a natural point to verify before cutover. Streaming when freshness is a stated requirement, like a retraction that must take effect within minutes. The cost difference is real enough that it shouldn't be chosen by default.

**Q: How does filtering work?**
Through restricts: namespace tokens with allow and deny lists, applied during the search, plus numeric restricts for ranges like effective dates. It covers tenant, ACL group, and document type well, but it isn't a general query language — the permission model has to be expressible as token sets.

**Q: Can you measure its recall?**
Yes, the same way as any managed index. Build a FAISS exact flat index over the same vectors offline, run sampled production queries against both with realistic restricts applied, and compare top-k overlap. The ScaNN internals are partly hidden, but the recall it delivers is still measurable.

## 9. Common Mistakes

- Expecting it to store and return chunk text.
- Choosing streaming updates without a freshness requirement.
- Assuming restricts are a general query language.
- Justifying the choice on benchmarks rather than residency and IAM.
- Not measuring recall because the index is managed.

## 10. What to Remember

- **GCP-native, ScaNN-based, data stays in the project** — the compliance argument.
- **IAM and VPC-SC integration**, not a separate credential to manage.
- **Vectors and restricts only** — payloads live elsewhere, fetched by ID.
- **Batch by default; streaming when freshness is required.**
- **Restricts are token-based** — the ACL model must fit that shape.
