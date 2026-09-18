# Memory (ADK)

> **Phase 21 · GOOGLE ADK · Topic 07**

## 1. Definition

ADK's mechanism for recall beyond the current session — a memory service that stores and retrieves information from past conversations, distinct from session state which is scoped to one conversation.

## 2. Simple Explanation

Session state is what this conversation knows. Memory is what previous conversations left behind.

Memory retrieval is a search problem, so it inherits every retrieval failure mode — irrelevant results, stale content, and missing what mattered.

## 3. How It Works

```
SESSION STATE     this conversation — structured, exact
MEMORY SERVICE    past conversations — searched, approximate

  add_session_to_memory(session)   ingest a finished session
  search_memory(query)             retrieve relevant past
                                   information
```

**Implementations:** an in-memory service for development, or a Vertex AI RAG-backed memory service for production.

**Memory is retrieval**, so what comes back is whatever the search surfaced — not a guaranteed complete record.

## 4. Practical Example

**The banking design position:**

```
Storing "this customer complained about fees in March" is
useful for continuity — and it is:

  · personal data with retention obligations
  · subject to erasure requests
  · a data-quality risk if the extracted fact is wrong
  · a privacy expectation issue — customers may not expect
    a chatbot to remember previous complaints

A wrong stored memory is worse than no memory. It persists,
gets retrieved confidently, and nobody reviews it.
```

**What I'd actually store:**

```
STRUCTURED, VERIFIABLE FACTS
  account tier, language preference, open case IDs,
  accessibility needs

NOT free-text model-generated summaries of what was said

Structured facts can be validated, corrected, expired, and
deleted. Generated summaries can't easily be any of those —
and a summary asserting something the customer didn't say
is very hard to detect once stored.
```

**That distinction is the substantive point**, and it generalizes well beyond ADK.

**The severe failure to design against:**

```
Cross-user memory leakage.

If memory isn't strictly partitioned by authenticated user,
one customer's stored information can surface in another's
session. That's a breach, and it's an easy bug — memory
search scoped by conversation rather than by verified user
identity is enough to cause it.

Memory reads need the same authorization as any other data
access, applied at the point of retrieval.
```

**Consent, which comes before the engineering:** whether a customer expects a banking assistant to remember previous conversations is a product and legal question. Memory that's useful and unexpected is still a privacy problem, and in some jurisdictions it needs an explicit basis.

## 5. Why It Matters

- **Memory is retrieval** with all of retrieval's failure modes.
- **Structured facts over generated summaries** — they can be corrected and deleted.
- **Cross-user leakage** is the severe failure, and it's an easy bug.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Cross-user leakage** | A breach; memory must be user-partitioned |
| **Wrong facts persisting** | Stored and retrieved confidently, never reviewed |
| **Stale memory** | Preferences and circumstances change |
| **Generated summaries** | Can't be validated or corrected |
| **Retention and erasure** | Memory is personal data |
| **Unexpected recall** | A privacy expectation issue even when accurate |

**On staleness:** a memory that a customer was on the Premier tier a year ago may be wrong now. Memories about mutable facts need either an expiry or a rule that they're treated as a hint to verify rather than as truth — retrieving a stale tier and answering from it is exactly the failure grounding is meant to prevent.

**On whether to use memory at all:** for a banking FAQ assistant, most value comes from retrieving policy documents rather than remembering past conversations. Memory adds privacy, retention, and correctness obligations for a benefit that's often modest. I'd want a specific use case justifying it rather than enabling it because the framework offers it.

## 7. Interview Answer

> "Session state is what this conversation knows; memory is what previous conversations left behind. ADK provides a memory service — adding a finished session to memory, and searching memory from a later one — with a Vertex AI RAG-backed implementation for production.
>
> The first thing to say is that memory is retrieval, so it inherits every retrieval failure mode: irrelevant results, stale content, and missing what mattered. What comes back is whatever the search surfaced, not a guaranteed complete record.
>
> For banking, what I'd store is structured verifiable facts — account tier, language preference, open case IDs, accessibility needs — rather than free-text model-generated summaries of what was said. Structured facts can be validated, corrected, expired, and deleted. Generated summaries can't easily be any of those, and a summary asserting something the customer didn't say is very hard to detect once stored. A wrong stored memory is worse than no memory, because it persists, gets retrieved confidently, and nobody reviews it.
>
> The severe failure I'd design against is cross-user leakage. If memory isn't strictly partitioned by authenticated user, one customer's stored information can surface in another's session — and that's a breach. It's an easy bug: memory search scoped by conversation rather than by verified user identity is enough to cause it. So memory reads need the same authorization as any other data access, applied at the point of retrieval.
>
> On staleness, a memory that a customer was Premier tier a year ago may be wrong now. Memories about mutable facts need either an expiry or a rule that they're a hint to verify rather than truth — retrieving a stale tier and answering from it is exactly the failure grounding exists to prevent.
>
> And before any of the engineering: whether a customer expects a banking assistant to remember previous conversations is a product and legal question. Memory that's useful and unexpected is still a privacy problem, and in some jurisdictions it needs an explicit basis.
>
> Which leads to my actual position — for a banking FAQ assistant, most value comes from retrieving policy documents rather than remembering past conversations. Memory adds privacy, retention, and correctness obligations for a benefit that's often modest. I'd want a specific use case justifying it rather than enabling it because the framework offers it."

## 8. Likely Follow-ups

**Q: How does memory differ from session state?**
State is structured and exact within one conversation; memory is searched and approximate across past conversations. Memory is fundamentally a retrieval problem, so what comes back is whatever the search surfaced rather than a guaranteed record.

**Q: What would you store in memory?**
Structured verifiable facts — tier, language preference, open case IDs — not free-text summaries of what was said. Structured facts can be validated, corrected, expired, and deleted; a generated summary asserting something the customer didn't say is very hard to detect once stored.

**Q: What's the severe risk?**
Cross-user leakage. Memory search scoped by conversation rather than verified user identity can surface one customer's information in another's session, which is a breach. Memory reads need the same authorization as any other data access, applied at retrieval.

**Q: How do you handle stale memories?**
Either an expiry on memories about mutable facts, or a rule that they're a hint to verify rather than truth. Retrieving a tier from a year ago and answering from it is exactly the failure grounding is meant to prevent, so verification before use is the safer default.

**Q: Would you use memory at all?**
Only with a specific justifying use case. For a banking FAQ assistant most value comes from retrieving policy documents, not remembering conversations — and memory adds privacy, retention, correctness, and consent obligations for a benefit that's often modest.

## 9. Common Mistakes

- Memory not partitioned by authenticated user.
- Storing model-generated summaries that can't be corrected.
- No expiry on memories about mutable facts.
- Treating memory as outside retention and erasure policy.
- Enabling memory because the framework offers it, without a use case.

## 10. What to Remember

- **Memory is retrieval** — approximate, with retrieval's failure modes.
- **Structured facts, not generated summaries** — correctable and deletable.
- **Partition strictly by authenticated user** — leakage is a breach.
- **Stale memories are hints to verify**, not truth.
- **Justify memory with a use case**; it carries real obligations.
