# "How Would You Handle Multi-Tenancy?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 25**

## 1. Definition

A design question about serving multiple isolated organizations from one system. The decision is an isolation model — shared index with filters, index per tenant, or full stack per tenant — and each trades cost against blast radius.

*Related: [24](24-how-would-you-implement-access-control.md) is about users within one tenant. This is about isolation between organizations.*

## 2. Simple Explanation

Access control decides which documents a user sees. Multi-tenancy decides whether Bank A's data can ever reach Bank B — and the answer has to be "no" by construction, not by correctness of code.

The difference matters because a filtering bug inside one tenant is an incident; a filtering bug across tenants is a breach.

## 3. How It Works

```
THE THREE MODELS

SHARED INDEX + TENANT FILTER
  cheapest, scales to many tenants
  isolation depends on a filter being right, every time,
  on every code path
  → the blast radius of one bug is every tenant

INDEX PER TENANT
  isolation by construction — a query against tenant A's
  index cannot return tenant B's data
  per-index overhead; hundreds of tenants gets expensive
  → the usual choice for regulated B2B

FULL STACK PER TENANT
  separate project, separate keys, separate everything
  strongest, most expensive, operationally heavy
  → reserved for tenants who contractually require it
```

**The decision rule:** if a cross-tenant leak would be a reportable breach, a filter on a shared index is the wrong model. Regulated B2B almost always lands on index-per-tenant.

## 4. Practical Example

**Why "just add a tenant_id filter" is insufficient:**

```
It requires the filter to be present on:
  · dense retrieval
  · lexical retrieval
  · the document fetch by chunk ID
  · the cache lookup
  · the evaluation harness
  · every analytics and debugging query

Six code paths, and the failure on any one is silent.
Nothing errors. A tenant simply sees another tenant's
policy document in an answer.

The defensive version: tenant scope resolved once at the
request boundary and carried in a context object that
every data-access function requires as a parameter —
so omitting it is a compile or type error rather than
a runtime leak.

That turns "remember to filter" into "cannot forget".
```

**The things people forget to scope:**

```
CACHES         semantic cache keyed without tenant →
               one tenant's answer served to another.
               The highest-severity, easiest-to-make bug
               in the list.
RATE LIMITS    per-tenant, or one tenant's spike degrades
               everyone (noisy neighbour)
LOGS & TRACES  contain retrieved chunk text — tenant
               data in a shared logging sink
EVAL SETS      golden sets built from real queries carry
               tenant data
METRICS        aggregate quality metrics hide a single
               tenant's collapse
ENCRYPTION     per-tenant CMEK if contractually required,
               which forces at least index-per-tenant
```

**Per-tenant configuration, which is the real operational cost:**

```
Tenants differ in more than data:
  · different corpora → different chunk sizes suit them
  · different thresholds → different risk tolerance
  · different models → some contractually restricted
  · different prompts → tone and disclaimers

So the system needs configuration as data rather than as
code, and evaluation has to run per tenant — because a
change that improves the average can regress one tenant
badly, and the average will hide it.

That per-tenant evaluation requirement is the cost people
underestimate.
```

## 5. Why It Matters

- **Isolation by construction beats isolation by filter** when a leak is a breach.
- **Six code paths need the filter** and each failure is silent.
- **Per-tenant evaluation** is required, because averages hide single-tenant collapse.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Shared index for regulated tenants | A single bug is a cross-org breach |
| Filter as a convention, not a type requirement | Someone forgets, silently |
| Cache without tenant in the key | One tenant's answer served to another |
| No per-tenant rate limits | Noisy neighbour degrades everyone |
| Aggregate metrics only | A tenant's quality collapse is invisible |
| Tenant config in code | Every tenant change is a deploy |

**On the hybrid model:** shared index for small tenants, dedicated index for large or regulated ones, with the same code path and a tenant-level configuration flag deciding which. It's the practical answer for a product with a long tail of small customers and a handful of demanding ones — but it means both paths must be tested, and the shared path carries the strict-filter discipline regardless.

**On onboarding and offboarding:** a new tenant's index has to be created, populated, and evaluated before traffic reaches it. Offboarding is harder — deleting a tenant means removing their vectors, documents, caches, logs, traces, and eval sets. The forgotten stores are the same ones listed above, which is why enumerating them up front pays off twice.

## 7. Interview Answer

> "The first thing I'd establish is that this is a different problem from user-level access control. Access control decides which documents a user sees inside one organization. Multi-tenancy decides whether Bank A's data can ever reach Bank B — and that has to be no by construction, not by the code being correct.
>
> The distinction matters because the consequences differ. A filtering bug inside one tenant is an incident. A filtering bug across tenants is a reportable breach.
>
> There are three models. A shared index with a tenant filter is cheapest and scales to many tenants, but isolation depends on that filter being applied correctly on every code path, every time. An index per tenant gives isolation by construction — a query against tenant A's index physically cannot return tenant B's data. And a full stack per tenant, with separate projects and keys, which is the strongest and the most operationally expensive.
>
> My rule is: if a cross-tenant leak would be a reportable breach, a filter on a shared index is the wrong model. For regulated B2B that's almost always the case, so index-per-tenant is the default.
>
> The reason 'just add a tenant_id filter' is insufficient is the number of code paths. The filter has to be on dense retrieval, lexical retrieval, the document fetch by chunk ID, the cache lookup, the evaluation harness, and every analytics query. Six paths, and a failure on any one is silent — nothing errors, a tenant just sees another tenant's document in an answer.
>
> If I did build shared, the defensive shape is: resolve tenant scope once at the request boundary into a context object, and make every data-access function require it as a parameter. Then omitting it is a type error rather than a runtime leak. That turns 'remember to filter' into 'cannot forget', which is the only version I'd trust.
>
> The things people forget to scope are the ones I'd check first. Caches — a semantic cache keyed without tenant serves one tenant's answer to another, and that's the easiest severe bug to make. Rate limits, or one tenant's traffic spike degrades everyone. Logs and traces, which contain retrieved chunk text, so tenant data ends up in a shared logging sink. Golden evaluation sets, which are built from real queries. And encryption keys, if per-tenant CMEK is contractual — that requirement alone forces at least index-per-tenant.
>
> The operational cost people underestimate is configuration and evaluation. Tenants differ in more than data — different corpora suit different chunk sizes, different risk tolerances mean different abstention thresholds, some have contractual model restrictions, and prompts differ in tone and disclaimers. So configuration has to be data rather than code, and evaluation has to run per tenant. A change that improves the average can badly regress one tenant, and the average will hide it.
>
> A practical middle ground is a hybrid: shared index for a long tail of small tenants, dedicated indexes for large or regulated ones, selected by a configuration flag on the same code path. It works, but both paths have to be tested and the shared path carries the strict-filter discipline regardless.
>
> And offboarding is worth planning up front — deleting a tenant means removing vectors, documents, caches, logs, traces, and eval sets. It's the same list of forgotten stores, which is why enumerating them early pays off twice."

## 8. Likely Follow-ups

**Q: Shared index or index per tenant?**
Index per tenant if a cross-tenant leak would be a reportable breach, which in regulated B2B it is. Shared is cheaper and scales further, but its isolation depends on a filter being right on six separate code paths.

**Q: How is this different from access control?**
Access control is within a tenant — an incident if it fails. Multi-tenancy is between organizations — a breach if it fails. The severity difference is what justifies paying for isolation by construction.

**Q: What gets forgotten?**
Caches, rate limits, logs and traces, evaluation sets, and encryption keys. The semantic cache is the worst one: keyed without tenant, it serves one tenant's answer to another, and nothing about the answer looks wrong.

**Q: How do you make a shared index safe?**
Resolve tenant scope at the request boundary into a context object that every data-access function requires as a parameter. Omitting it becomes a type error rather than a silent leak — that's the only version worth trusting.

**Q: What's the hidden operational cost?**
Per-tenant configuration and evaluation. Tenants need different thresholds, chunk sizes, models, and prompts, and a change improving the average can regress one tenant badly — which aggregate metrics won't show.

## 9. Common Mistakes

- Treating multi-tenancy as the same problem as access control.
- A shared index where a leak would be a breach.
- The tenant filter as a convention rather than a type requirement.
- Unscoped caches, logs, and rate limits.
- Only aggregate quality metrics.

## 10. What to Remember

- **A cross-tenant leak is a breach**, not an incident — that sets the model.
- **Index per tenant** for regulated B2B; isolation by construction.
- **Six code paths need the filter**; make it un-omittable via types.
- **Caches, logs, rate limits, eval sets** are the forgotten stores.
- **Evaluate per tenant** — averages hide single-tenant collapse.
