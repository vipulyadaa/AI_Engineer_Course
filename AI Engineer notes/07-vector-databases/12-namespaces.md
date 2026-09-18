# Namespaces

> **Phase 07 · VECTOR DATABASES · Topic 12**

## 1. Definition

Logical partitions within a vector index that separate vectors into independent groups. A query targets one namespace and cannot see the others — isolation enforced structurally rather than by a filter predicate.

## 2. Simple Explanation

A namespace is a separate room inside the same building. Vectors in namespace A are invisible to a query against namespace B, no matter what the query says.

Compared to a `tenant_id` metadata filter, the difference is where isolation comes from: a namespace makes cross-tenant retrieval impossible by construction, while a filter makes it dependent on the filter being correct on every query path.

## 3. How It Works

```
Index
 ├── namespace "tenant-retail-uk"     → 2.1M vectors
 ├── namespace "tenant-corporate-de"  → 0.8M vectors
 └── namespace "tenant-wealth-ch"     → 0.3M vectors

query(vector, namespace="tenant-retail-uk")
   → searches ONLY those 2.1M
   → other namespaces are not candidates at any point
```

**Three isolation levels:**

| Level | Isolation | Cost |
|---|---|---|
| **Metadata filter** | Logical; depends on every query being correct | Cheapest |
| **Namespace** | Structural, within one index | Low |
| **Separate index/project** | Physical; separate resources and keys | Highest |

## 4. Practical Example

**Why namespaces also help performance:**

```
10M vectors, one index, filter tenant_id = "wealth-ch" (0.3M)

  → HNSW walks a graph where 97% of nodes are ineligible
  → the walk strands; recall degrades

10M vectors across 3 namespaces, query the 0.3M namespace

  → the graph contains ONLY that tenant's vectors
  → full recall, faster search

Namespaces convert the restrictive-filter recall problem into
a non-problem, because the filter becomes the index boundary.
```

**That's the argument people miss.** Namespaces are usually framed as an isolation feature; they're equally an ANN recall fix.

**When namespaces are the wrong tool:**

```
· Cross-tenant search is a requirement
    → shared content must live somewhere queryable by all;
      typically a shared namespace queried in parallel
· Very many small tenants (thousands)
    → per-namespace index overhead dominates; a filter is better
· Permissions that don't partition cleanly
    → a user belonging to several groups isn't a namespace,
      it's an ACL filter

Namespaces handle the tenant axis. They do NOT replace
document-level authorization within a tenant.
```

**The typical production shape is both:** namespace for tenant isolation, ACL metadata filter for document-level permissions inside it. Two mechanisms because they answer two different questions.

## 5. Why It Matters

- **Structural isolation** is auditable in a way a filter predicate isn't.
- **They fix the restrictive-filter recall collapse** by making the filter an index boundary.
- **They don't replace ACL filtering** — tenant and document permissions are different axes.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No cross-namespace search** | Shared content must be handled deliberately |
| **Overhead per namespace** | Thousands of tiny namespaces is wasteful |
| **Uneven sizes** | A huge namespace and many tiny ones index differently |
| **Treated as full authorization** | It's tenant-level only |
| **Namespace chosen from user input** | Must derive from the authenticated session |

**On the last row — the actual security bug:** if the namespace comes from a request parameter rather than the verified session identity, a client can simply ask for another tenant's namespace. The namespace must be derived server-side from the authenticated principal, never accepted from the caller. This is the vector-store version of an IDOR vulnerability.

**On shared content:** in a bank, general product documentation is common to all tenants while contracts are tenant-specific. Duplicating shared content into every namespace wastes storage and makes updates N-fold. Querying a shared namespace plus the tenant namespace in parallel and fusing is cleaner, and it keeps one copy of the shared corpus.

## 7. Interview Answer

> "A namespace is a logical partition inside a vector index. A query targets one namespace and the others aren't candidates at any point in the search.
>
> The difference from a tenant_id metadata filter is where isolation comes from. With a filter, cross-tenant retrieval is prevented as long as every query path applies it correctly — so isolation depends on code being right everywhere. With a namespace it's structural: querying one namespace cannot return another tenant's vectors regardless of what the query says. That's much easier to audit, which matters in a regulated environment.
>
> The argument people miss is that namespaces are also a performance fix. If you have ten million vectors in one index and filter down to a tenant's three hundred thousand, an HNSW walk traverses a graph where ninety-seven percent of nodes are ineligible, strands, and loses recall. With namespaces, that tenant's graph contains only their vectors — full recall and a faster search. The restrictive-filter recall problem disappears because the filter becomes the index boundary.
>
> They don't replace ACL filtering though. A namespace handles the tenant axis. Document-level permissions within a tenant — a user belonging to several groups — don't partition cleanly and still need a metadata filter. The typical production shape is both: namespace for tenant isolation, ACL filter for document permissions inside it.
>
> The security bug I'd specifically guard against is the namespace being chosen from a request parameter rather than the authenticated session. If a client can name the namespace, they can ask for another tenant's data — it's the vector-store version of an IDOR vulnerability. The namespace has to be derived server-side from the verified principal.
>
> And one design point for banking: general product documentation is shared across tenants while contracts aren't. Duplicating shared content into every namespace wastes storage and makes updates N-fold, so I'd query a shared namespace alongside the tenant namespace in parallel and fuse — one copy of the shared corpus, still isolated where it matters."

## 8. Likely Follow-ups

**Q: Namespace or metadata filter for multi-tenancy?**
Namespace, where the tenant axis is clean. It's structural isolation rather than isolation that depends on every query path applying a predicate correctly, which is far easier to audit. A filter is still needed for document-level permissions within the tenant, so production usually runs both.

**Q: Do namespaces affect performance?**
Yes, favourably. A restrictive tenant filter over a shared index strands an ANN graph walk and degrades recall; a namespace makes that filter the index boundary instead, so the graph contains only eligible vectors. You get full recall and a smaller, faster search.

**Q: When are namespaces the wrong choice?**
When cross-tenant search is required, when you have thousands of tiny tenants where per-namespace overhead dominates, or when the permission model doesn't partition cleanly — a user in multiple overlapping groups isn't a namespace, it's an ACL filter.

**Q: How do you handle content shared across tenants?**
Put it in a shared namespace and query it in parallel with the tenant namespace, fusing the results. Duplicating it into every namespace wastes storage and turns every update into N updates, with a real risk of the copies drifting out of sync.

**Q: What's the security risk with namespaces?**
Taking the namespace from a request parameter. If the client names the namespace, they can request another tenant's data — the vector-store equivalent of an IDOR vulnerability. It must be derived server-side from the authenticated session, never accepted from the caller.

## 9. Common Mistakes

- Treating a namespace as complete authorization rather than tenant-level isolation.
- Accepting the namespace from client input.
- Creating thousands of tiny namespaces where a filter would be better.
- Duplicating shared content into every namespace.
- Missing that namespaces also solve the filtered-recall problem.

## 10. What to Remember

- **Structural isolation**, not a predicate that every query path must remember.
- **They fix filtered-ANN recall** by making the filter an index boundary.
- **Tenant axis only** — document ACLs still need a metadata filter.
- **Derive the namespace from the authenticated session**, never from the request.
- **Shared content goes in a shared namespace**, queried in parallel and fused.
