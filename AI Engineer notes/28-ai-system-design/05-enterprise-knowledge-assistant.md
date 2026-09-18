# Design: Enterprise Knowledge Assistant

> **Phase 28 · AI SYSTEM DESIGN · Topic 05**

## 1. Definition

An internal assistant answering employee questions across many heterogeneous sources — wikis, ticketing systems, code repositories, shared drives, HR systems — where the defining problems are permissions and source heterogeneity rather than generation.

## 2. Simple Explanation

A customer-facing assistant serves one corpus with uniform rules. An internal knowledge assistant serves twenty systems with different formats, different owners, different freshness, and — critically — different permissions per employee.

The hard problem isn't answering. It's knowing what this particular employee is allowed to see.

## 3. How It Works

```
INGESTION — per source, not one pipeline
  each source: its own connector, parser, chunking strategy,
  refresh cadence, and ACL extraction

  wiki        markdown, structure-aware, ACL from space
  tickets     structured + free text, ACL from project
  code        language-aware splitting, ACL from repo
  drive       mixed formats, ACL per file  ← the hard one
  HR          highly restricted, often excluded entirely

QUERY
  authenticate → resolve the employee's permissions
  → retrieve with per-source ACL filters
  → merge across sources → rerank → generate with
    source attribution
```

**Permissions are the design.** Everything else is a variation on standard RAG.

## 4. Practical Example

**Why permission handling is harder here:**

```
A customer-facing assistant has one rule: this customer
sees their own data and public documentation.

An internal assistant has:
  · per-space wiki permissions
  · per-project ticket visibility
  · per-repository code access
  · per-file drive sharing, including individual grants
  · group membership that changes constantly
  · inherited and overridden permissions

And ACLs copied into chunk metadata go stale immediately,
because someone changing teams changes access without any
document changing — so content-based re-indexing never
touches those chunks.

For this system I'd resolve permissions at QUERY TIME
against the source systems, using indexed metadata only to
narrow the candidate set. The staleness window of a sync
is unacceptable when group membership changes daily.
```

**That decision is the one to defend** — it costs latency and it's the only design that's correct.

**Source heterogeneity, handled per source:**

```
ONE PIPELINE PER SOURCE, not one pipeline for everything.

Each source has a different natural chunk unit:
  wiki    → section
  ticket  → the ticket, with comments
  code    → function or class
  drive   → document section

Forcing one chunking strategy across all of them produces
bad chunks everywhere. The connectors differ anyway, so
the chunking strategy may as well.
```

**Attribution matters more than usual:**

```
An employee needs to know whether an answer came from
official policy, a wiki page someone wrote, or a ticket
comment.

So source type and authority level belong in the citation,
not just the link:
  "per the HR policy (official)" vs
  "per a comment on TICKET-4821 (unverified)"

Without that distinction the assistant lends official
weight to someone's offhand remark — which is the
characteristic failure of internal knowledge systems.
```

## 5. Why It Matters

- **Permissions are the design**, and they're harder than in customer-facing systems.
- **Query-time permission resolution** is the correct choice when membership changes daily.
- **Source authority in citations** prevents a ticket comment being read as policy.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **One pipeline for all sources** | Bad chunks everywhere |
| **ACLs synced into metadata** | Stale within days |
| **No source authority in citations** | Offhand remarks read as policy |
| **Stale wiki content** | Confidently outdated answers |
| **HR and payroll included** | Usually should be excluded entirely |
| **Query-time ACL resolution latency** | The cost of correctness |

**On stale internal content:** wikis contain pages nobody has touched in four years, and the assistant will cite them confidently. Age-based down-weighting in reranking, and surfacing last-modified dates in citations, are cheap mitigations. The deeper fix is content ownership, which is an organizational problem the assistant can surface but not solve.

**On scope exclusions:** some sources should simply not be indexed — HR records, payroll, performance reviews, legal matters under privilege. Excluding them entirely is safer than relying on permission filters, because a filter bug in a system with per-file grants is likely and the consequences are severe. That's a scoping decision worth making explicitly at design time.

## 7. Interview Answer

> "A customer-facing assistant serves one corpus with uniform rules. An internal knowledge assistant serves twenty systems with different formats, owners, freshness, and permissions per employee. The hard problem isn't answering — it's knowing what this particular employee is allowed to see.
>
> So permissions are the design. Wiki permissions are per space, ticket visibility per project, code access per repository, and drive sharing per file including individual grants — with group membership changing constantly and permissions that inherit and get overridden.
>
> ACLs copied into chunk metadata go stale immediately here, because someone changing teams changes their access without any document changing, so content-based re-indexing never touches those chunks. For this system I'd resolve permissions at query time against the source systems, using indexed metadata only to narrow the candidate set. That costs latency, and the staleness window of a sync is unacceptable when group membership changes daily.
>
> On ingestion, I'd build one pipeline per source rather than one pipeline for everything. Each source has a different natural chunk unit — a wiki section, a ticket with its comments, a function or class, a document section. Forcing one chunking strategy across all of them produces bad chunks everywhere, and the connectors differ anyway so the chunking may as well.
>
> Attribution matters more than usual here, and this is the point I'd emphasize. An employee needs to know whether an answer came from official policy, a wiki page someone wrote, or a ticket comment. So source type and authority level belong in the citation — 'per the HR policy, official' versus 'per a comment on ticket 4821, unverified'. Without that, the assistant lends official weight to someone's offhand remark, which is the characteristic failure of internal knowledge systems.
>
> Two more design decisions. Stale content: wikis contain pages nobody has touched in four years and the assistant will cite them confidently. Age-based down-weighting in reranking and surfacing last-modified dates in citations are cheap mitigations. The deeper fix is content ownership, which is organizational — the assistant can surface the problem but not solve it.
>
> And scope exclusions. Some sources shouldn't be indexed at all — HR records, payroll, performance reviews, legal matters under privilege. Excluding them entirely is safer than relying on permission filters, because a filter bug in a system with per-file grants is likely and the consequences are severe. That's worth deciding explicitly at design time rather than treating everything as indexable with filters applied."

## 8. Likely Follow-ups

**Q: What's the hard problem here?**
Permissions. Per-space wiki access, per-project tickets, per-repository code, per-file drive sharing with individual grants, and group membership changing constantly. Answering is standard RAG; knowing what this employee may see is the design.

**Q: Why resolve permissions at query time?**
Because ACLs in chunk metadata go stale immediately — a team change alters access without changing any document, so content-based re-indexing never updates those chunks. When membership changes daily, the staleness window of a sync is unacceptable.

**Q: Why one pipeline per source?**
Because each source has a different natural chunk unit — a wiki section, a ticket with comments, a function, a document section. One chunking strategy across all of them produces bad chunks everywhere, and since the connectors differ anyway, the chunking may as well.

**Q: What's the characteristic failure?**
The assistant lending official weight to an unofficial source — citing a ticket comment as though it were policy. The fix is putting source type and authority level in the citation, so "official policy" and "unverified comment" are visibly different to the reader.

**Q: Should everything be indexed?**
No. HR records, payroll, performance reviews, and privileged legal matters should be excluded entirely rather than filtered. A filter bug in a system with per-file grants is likely, and the consequences there are severe enough that exclusion is the safer design.

## 9. Common Mistakes

- One ingestion pipeline across heterogeneous sources.
- Syncing ACLs into metadata where membership changes daily.
- Citations without source authority level.
- No age down-weighting for stale wiki content.
- Indexing sensitive sources and relying on filters.

## 10. What to Remember

- **Permissions are the design**, not generation.
- **Resolve at query time** when group membership changes daily.
- **One pipeline per source** — different natural chunk units.
- **Source authority in citations** — policy versus unverified comment.
- **Exclude the most sensitive sources entirely** rather than filtering them.
