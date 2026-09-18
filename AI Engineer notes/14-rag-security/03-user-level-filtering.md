# User-Level Filtering

> **Phase 14 · RAG SECURITY · Topic 03**

## 1. Definition

Restricting retrieval by attributes of the individual caller rather than only by group membership — their own records, their branch, their region, their clearance level. It's needed when authorization depends on a relationship between the user and the data, not just a role.

## 2. Simple Explanation

Group-based filtering answers "is this person in a role that can see this class of document?"

User-level filtering answers "is this *this person's* record?" A relationship manager can see their own clients' files, not every client file. That's not a role question — it's a per-row relationship.

## 3. How It Works

**The two authorization shapes:**

```
GROUP-BASED     acl_group ∩ caller.groups ≠ ∅
                "Can people in this role see this document class?"

USER-LEVEL      owner_id = caller.id
                OR customer_id IN caller.assigned_customers
                OR branch_id = caller.branch
                "Does THIS caller have a relationship to THIS record?"
```

**Where the attributes come from:**

| Attribute | Source |
|---|---|
| `caller.id` | Identity token |
| `caller.branch`, `caller.region` | HR / directory system |
| `caller.assigned_customers` | CRM — **can be large and dynamic** |
| `caller.clearance` | Entitlement service |

**The scale problem:** a relationship manager with 400 assigned customers produces a filter with 400 values. At scale that's an expensive filter, and it changes as assignments change.

## 4. Practical Example

**The filter-size problem and how to avoid it:**

```
❌ Enumerate the relationship in the filter:
   customer_id IN [c-0012, c-0447, c-1183, ... 400 values]
   → large filter, slow, and it must be rebuilt whenever
     assignments change

✅ Denormalize the relationship into the chunk:
   At ingestion, tag each customer document with:
     { "customer_id": "c-0447", "assigned_rm": "u-8891",
       "branch_id": "br-204" }
   Filter becomes:  assigned_rm = caller.id
   → single-value filter, fast

   Cost: reassignments require updating affected chunks' metadata.
```

**Separating the two corpora is usually cleaner:**

```
Policy corpus      — group-based ACL, shared, changes slowly
Customer records   — user-level filtering, per-record, changes often

Different indexes, different filtering strategies, different
re-index cadences. Merging them forces the worst of both.
```

**Row-level security in the data layer, where available:**

```
Some stores (e.g. BigQuery row-level security) enforce per-user
row visibility at the database level, so the application can't
accidentally bypass it. Where the vector store supports an
equivalent, it's stronger than application-level filtering —
the check can't be forgotten in a new code path.
```

## 5. Why It Matters

- **Group filtering is insufficient** when authorization depends on a relationship rather than a role.
- **It's the common case for customer data** in banking — RMs, branch staff, regional managers.
- **The filter-size and freshness problems are real**, and denormalization is the standard answer.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Large enumerated filters** | 400-value IN clauses are slow and fragile |
| **Assignment changes** | Reassigning a customer requires updating chunk metadata |
| **Mixing corpora** | Policy and customer data have different filtering needs |
| **Application-level only** | A new code path can forget the filter |
| **Highly selective filters** | ANN search degrades toward brute force |
| **Caller attribute staleness** | The caller's assigned-customer list is cached and stale |

**On the selectivity problem:** user-level filters are often extremely selective — one RM's customers out of millions of records. That's exactly the regime where ANN graph traversal degrades. For very selective filters, a metadata-first query (find the matching records, then rank among them) may outperform filtered vector search entirely.

**On defense in depth:** application-level filtering is the primary control, but a second check before returning results — re-verifying that each returned chunk's owner matches the caller — catches bugs in a new code path. It's cheap and it's the difference between a bug and a breach.

## 7. Interview Answer

> "User-level filtering restricts retrieval by attributes of the individual caller rather than only group membership — their own records, their assigned customers, their branch. It's needed when authorization depends on a relationship between the user and the data rather than a role.
>
> Group filtering answers 'can people in this role see this document class.' User-level answers 'is this this person's record.' A relationship manager can see their own clients' files, not every client file — that's per-row, not per-role.
>
> The practical problem is filter size. If an RM has four hundred assigned customers, enumerating them produces a four-hundred-value filter that's slow and has to be rebuilt whenever assignments change. The standard fix is denormalizing the relationship into the chunk — tag each customer document with its assigned RM at ingestion, so the filter becomes a single-value equality check. The cost is that reassignments require updating chunk metadata.
>
> I'd also keep the corpora separate. Policy documents use group-based ACLs, change slowly, and are shared. Customer records use per-record filtering and change often. Different indexes, different filtering strategies, different re-index cadences — merging them forces the worst of both.
>
> Two things on robustness. User-level filters are extremely selective — one RM's customers out of millions — which is exactly the regime where ANN graph traversal degrades toward brute force, so for very selective filters a metadata-first query may beat filtered vector search. And I'd add a defense-in-depth check: re-verify that each returned chunk's owner matches the caller before returning. It's cheap and it catches a new code path that forgot the filter, which is the difference between a bug and a breach."

## 8. Likely Follow-ups

**Q: How do you avoid huge enumerated filters?**
Denormalize the relationship into the chunk. Instead of filtering `customer_id IN [400 values]`, tag each customer document with its assigned relationship manager at ingestion and filter `assigned_rm = caller.id`. Single-value equality, fast. The trade-off is that reassignments require a metadata update on affected chunks.

**Q: Should customer data and policy documents share an index?**
Usually not. They have different authorization models, different change rates, and different re-index cadences. Policy is shared and group-filtered; customer records are per-record filtered and change constantly. Separate indexes let each use the right strategy rather than forcing a compromise.

**Q: How does this affect retrieval performance?**
User-level filters are extremely selective, which is the worst case for ANN search — the graph structure doesn't help within a tiny arbitrary subset, so traversal degrades toward brute force. For very selective filters, querying metadata first to find matching records and then ranking among them may be faster than filtered vector search.

**Q: How do you handle assignment changes?**
If you denormalized, reassigning a customer means updating the `assigned_rm` field on that customer's chunks — a metadata update, not a re-embed, so it's cheap. It needs its own trigger though, since the content didn't change and content-hash re-indexing would skip it. That's the same structural gap as permission staleness generally.

**Q: What's your defense in depth here?**
A post-retrieval verification that each returned chunk's owner or assignment matches the caller, run before results reach the model. It duplicates the pre-filter, which is the point — a new code path that forgets the filter gets caught. It's cheap, and in a customer-data context the cost of a miss is a breach rather than a bad answer.

## 9. Common Mistakes

- Enumerating hundreds of IDs in a filter instead of denormalizing.
- Sharing one index between policy documents and customer records.
- Relying solely on application-level filtering with no secondary check.
- Not triggering re-indexing on assignment changes, since content didn't change.
- Ignoring that highly selective filters degrade ANN performance.

## 10. What to Remember

- **Per-relationship, not per-role.** "Is this *this caller's* record?"
- **Denormalize the relationship into the chunk** to avoid huge enumerated filters.
- **Separate customer-record and policy corpora** — different auth models and change rates.
- **Very selective filters degrade ANN search** — consider metadata-first querying.
- **Add a post-retrieval ownership re-check** as defense in depth.
