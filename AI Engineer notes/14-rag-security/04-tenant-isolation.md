# Tenant Isolation

> **Phase 14 · RAG SECURITY · Topic 04**

## 1. Definition

Ensuring that in a multi-tenant RAG system, one tenant's data can never be retrieved by another. The isolation model — shared index with filtering, separate namespaces, or separate indexes — is an architectural decision with direct security consequences.

## 2. Simple Explanation

If you serve multiple customers, banks, or business units from one system, a cross-tenant leak is the worst failure that system can have.

The question is how much you rely on a filter being applied correctly versus making cross-tenant access structurally impossible.

## 3. How It Works

**Three isolation models, by strength:**

| Model | Isolation | Cost | Use when |
|---|---|---|---|
| **Shared index + tenant filter** | Logical only — a bug leaks | Lowest | Many small tenants, low sensitivity |
| **Namespace per tenant** | Stronger — queries scoped to a namespace | Moderate | The common middle ground |
| **Index per tenant** | Physical — cross-tenant query is impossible | Highest | High sensitivity, regulated, few large tenants |

**The security difference in one line:**

```
Shared index:  isolation depends on every query including the filter.
               One code path that forgets it = cross-tenant leak.

Separate index: there is no query that can reach another tenant's
               data. The bug class doesn't exist.
```

**In banking, separate indexes per tenant is usually the defensible answer** — the cost is operational, the alternative is a class of bug that can end the product.

## 4. Practical Example

**The failure mode shared indexes have and separate indexes don't:**

```python
# The main retrieval path — correct
def search(query, caller):
    return index.query(embed(query),
                       filter={"tenant_id": caller.tenant})   # ✅

# Six months later, a new feature — the "similar documents" panel
def find_similar(chunk_id):
    vec = index.get(chunk_id).vector
    return index.query(vec, k=5)          # ❌ NO TENANT FILTER

# Cross-tenant leak. Code review missed it. Tests passed —
# the test fixtures only had one tenant.
```

**With a namespace or index per tenant, that function physically cannot return another tenant's data**, because the connection or namespace is tenant-scoped.

**Making it structural rather than relying on discipline:**

```python
# Tenant-scoped client, resolved once from the request context
class TenantIndex:
    def __init__(self, tenant_id):
        self._ns = f"tenant-{tenant_id}"
    def query(self, vec, **kw):
        return backend.query(vec, namespace=self._ns, **kw)

# There is no code path that takes a tenant_id parameter and
# could be passed the wrong one — the scoping happens at
# construction, from the authenticated request.
```

**The other isolation surfaces people forget:**

```
· Embedding cache keyed by query text → cache hit across tenants
· Semantic response cache              → same problem, worse
· Logs and traces                      → tenant data in shared logs
· Evaluation datasets                  → one tenant's queries used
                                         to tune another's system
· Model fine-tuning on tenant data     → data in weights, no isolation
```

## 5. Why It Matters

- **Cross-tenant leakage is often an existential incident**, not a bug to fix next sprint.
- **The isolation model is an architectural choice** that's expensive to change later.
- **Caches and logs are isolation surfaces** that are routinely overlooked.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Shared index, forgotten filter** | One code path leaks everything |
| **Tests with one tenant** | Isolation bugs invisible in testing |
| **Shared caches** | Cross-tenant hits on query or response caches |
| **Shared logs** | Tenant data visible to operators of other tenants |
| **Per-tenant index cost** | Overhead × number of tenants; poor for many small tenants |
| **Noisy neighbour** | Shared infrastructure; one tenant's load affects others |
| **Fine-tuning on pooled data** | No isolation is possible once it's in the weights |

**On testing:** isolation bugs are invisible in single-tenant test fixtures. Every test environment should have at least two tenants with overlapping content, and there should be an explicit test asserting that tenant A's query never returns tenant B's chunk — for *every* retrieval code path.

**On the cost trade-off:** index-per-tenant doesn't scale to thousands of small tenants. Namespaces are the usual middle ground: stronger than a filter, cheaper than a separate index, and supported natively by most vector databases.

## 7. Interview Answer

> "Tenant isolation is ensuring one tenant's data can never be retrieved by another. In a multi-tenant banking system a cross-tenant leak is often existential, not a bug to fix next sprint — so the question is how much you rely on a filter being applied correctly versus making cross-tenant access structurally impossible.
>
> There are three models. A shared index with a tenant filter is logical isolation only — it depends on every query including the filter. Namespaces per tenant are stronger, with queries scoped at the namespace level. Index per tenant is physical isolation: there's no query that can reach another tenant's data at all.
>
> The failure mode that argues for the stronger models: the main retrieval path has the filter and is correct. Six months later someone adds a 'similar documents' feature that queries by vector without the tenant filter. Code review misses it, and tests pass because the fixtures only had one tenant. That's a cross-tenant leak from a single omitted parameter.
>
> The way to make it structural is a tenant-scoped client resolved once from the authenticated request — so there's no code path that takes a tenant ID as a parameter and could be passed the wrong one. The scoping happens at construction.
>
> For banking I'd default to namespace-per-tenant at minimum, and separate indexes for high-sensitivity or few-large-tenant situations. Index-per-tenant doesn't scale to thousands of small tenants, which is where namespaces are the right middle ground.
>
> And the surfaces people forget: embedding and response caches keyed by query text can hit across tenants, logs and traces can pool tenant data, and evaluation datasets built from one tenant's queries shouldn't be used to tune another's system. Fine-tuning on pooled tenant data removes isolation entirely, since it's in the weights."

## 8. Likely Follow-ups

**Q: Shared index with filtering, or separate indexes?**
Separate — or at minimum namespaces — for anything sensitive. Shared-index filtering is logical isolation that depends on every code path applying the filter correctly, and a single omission leaks everything. Physical isolation removes the bug class. The counterargument is cost, which is why namespaces are the common middle ground.

**Q: How do you test isolation?**
Every test environment needs at least two tenants with overlapping content, and an explicit assertion that tenant A's query never returns tenant B's chunk — for every retrieval code path, not just the main one. Single-tenant fixtures make isolation bugs completely invisible, which is exactly how they reach production.

**Q: What are the non-obvious isolation surfaces?**
Caches, primarily. An embedding cache or semantic response cache keyed by query text can serve one tenant's result to another. Also shared logs and traces containing tenant data, and evaluation datasets built from one tenant's queries being used to tune the system another tenant uses. Each needs tenant scoping in its own right.

**Q: How do you make isolation structural rather than a discipline?**
Resolve a tenant-scoped client once from the authenticated request, so downstream code has no way to specify a tenant. If no function takes a tenant ID as a parameter, no function can be passed the wrong one. That converts a class of bug into an impossibility.

**Q: What about fine-tuning on tenant data?**
It removes isolation entirely — once data is in the weights, every user of that model has access to what it learned. That's a strong argument for RAG over fine-tuning in multi-tenant contexts, and it's a hard architectural constraint rather than a preference. If fine-tuning is needed, it has to be per-tenant models, which is expensive.

## 9. Common Mistakes

- Shared index with filters applied per-query rather than structurally.
- Single-tenant test fixtures, making isolation bugs invisible.
- Caches keyed without a tenant dimension.
- Tenant data in shared logs and traces.
- Fine-tuning on pooled tenant data.

## 10. What to Remember

- **Three models:** shared+filter (logical), namespace (stronger), separate index (physical).
- **Shared-index isolation depends on every code path** — one omission leaks everything.
- **Make it structural:** a tenant-scoped client resolved from the authenticated request.
- **Test with two tenants**, asserting cross-tenant queries return nothing.
- **Caches, logs, and eval sets are isolation surfaces too.** Fine-tuning removes isolation entirely.
