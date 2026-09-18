# Privacy

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 05**

## 1. Definition

Ensuring customer data in an AI system is only used for its intended purpose, only reachable by those entitled to it, retained no longer than permitted, and deletable on request — across every store the system creates.

## 2. Simple Explanation

Privacy in a RAG system isn't mainly about the model. It's about the surprising number of places customer data ends up.

The index, the payload store, session state, checkpoints, traces, logs, caches, and the evaluation set are all customer data stores. Most don't look like databases, which is why they get missed.

## 3. How It Works

```
THE STORES A RAG/AGENT SYSTEM CREATES

  vector index + chunk payload store
  conversation session store
  agent/graph checkpoints
  traces and observability data
  prompt and response logs
  semantic / response caches
  long-term agent memory
  the evaluation golden set
  backups of all of the above

Each needs: access control, retention limit, deletion path,
encryption, and residency.
```

**That list is the answer to most privacy questions**, because the controls are well understood — it's the completeness of the inventory that fails.

## 4. Practical Example

**The deletion request, which tests the whole design:**

```
"Delete everything you hold about me."

Must reach:
  □ chunks derived from their documents, in the index
  □ chunk payloads
  □ every session and its state
  □ every checkpoint in every thread — not just current state
  □ traces containing their queries and answers
  □ logs containing prompts or responses
  □ cached responses keyed on their queries
  □ long-term memory entries
  □ the golden set, if their queries were sampled into it
  □ backups, within the retention window

And it must emit an audit record per store, because
"we deleted it" needs evidence.

A system that deletes only the primary store leaves the
data in eight other places — and checkpoints in particular
are a full history, not just the latest state.
```

**That checklist is the substantive contribution here.** The controls are standard; the inventory is what people get wrong.

**Purpose limitation, which is the subtler obligation:**

```
Data collected to answer a customer's question may not be
usable to:
  · train or tune a model
  · build a golden set
  · analyze customer behaviour

Each is a different purpose and may need a separate basis.
Sampling production queries into an evaluation set feels
like engineering hygiene and is a processing purpose —
that's the one teams create without noticing.
```

**Minimization in practice:**

```
· hash user identifiers in logs rather than storing them
· log argument keys, not values, by default
· capture full prompts on failure or a low sample, not
  universally
· redact identifiers in the golden set where the specific
  value doesn't affect the test
· don't store what you don't need — the cheapest control
```

## 5. Why It Matters

- **The inventory is what fails**, not the controls — most stores don't look like databases.
- **Deletion must reach checkpoints and traces**, which hold full history.
- **Sampling queries into an eval set is a processing purpose**, created without noticing.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Incomplete store inventory** | Data survives a deletion request |
| **Checkpoints holding full history** | Deleting current state isn't enough |
| **Traces and logs excluded** | Treated as infrastructure |
| **Golden set from real queries** | A customer data store nobody classifies |
| **Purpose creep** | Evaluation use without a basis |
| **No deletion audit record** | Erasure can't be evidenced |

**On backups, honestly:** a backup taken before deletion still contains the data. The defensible position is a bounded retention policy with documentation that the data ages out within it — not a claim of immediate erasure everywhere. Overclaiming here is worse than stating the limit.

**On caches:** a response cache keyed on a normalized query can return one customer's answer to another if the key doesn't include identity and permissions. That's both a privacy failure and a correctness one, and it's an easy bug because caching feels like a performance concern rather than a security one.

## 7. Interview Answer

> "Privacy in a RAG system isn't mainly about the model — it's about the surprising number of places customer data ends up. The vector index and payload store, session state, agent checkpoints, traces, logs, caches, long-term memory, the evaluation golden set, and backups of all of it. Most of those don't look like databases, which is exactly why they get missed.
>
> The test that exercises the whole design is a deletion request. 'Delete everything you hold about me' has to reach chunks derived from their documents, chunk payloads, every session and its state, every checkpoint in every thread — not just current state, because checkpoints are a full history — traces containing their queries, logs containing prompts or responses, cached responses keyed on their queries, long-term memory entries, the golden set if their queries were sampled into it, and backups within the retention window. With an audit record per store, because 'we deleted it' needs evidence.
>
> A system that deletes only the primary store leaves the data in eight other places. The controls themselves are standard — access control, retention, encryption, residency — it's the completeness of the inventory that fails.
>
> The subtler obligation is purpose limitation. Data collected to answer a customer's question may not be usable to train a model, build a golden set, or analyze behaviour — those are different purposes potentially needing separate bases. And sampling production queries into an evaluation set is the one teams create without noticing, because it feels like engineering hygiene rather than a processing purpose.
>
> For minimization in practice: hash user identifiers in logs, log argument keys rather than values by default, capture full prompts only on failure or a low sample rate, redact identifiers in the golden set where the value doesn't affect the test — a placeholder transaction ID exercises the same retrieval path. And don't store what you don't need, which is the cheapest control available.
>
> Two things I'd flag. Caches: a response cache keyed on a normalized query can return one customer's answer to another if the key doesn't include identity and permissions. That's a privacy failure and a correctness one, and it's easy to introduce because caching feels like a performance concern.
>
> And backups, honestly. A backup taken before deletion still contains the data. The defensible position is a bounded retention policy with documentation that it ages out within the window — not a claim of immediate erasure everywhere. Overclaiming there is worse than stating the limit."

## 8. Likely Follow-ups

**Q: Where does customer data end up in a RAG system?**
The index and payload store, session state, checkpoints, traces, logs, caches, long-term memory, the evaluation golden set, and backups. Most don't look like databases, so they're classified as infrastructure and excluded from retention and deletion policy.

**Q: What does a deletion request have to reach?**
All of those stores, including every checkpoint rather than just current state, and with an audit record per store as evidence. A system deleting only the primary store leaves the data in eight other places, which is exactly what an audit finds.

**Q: What's purpose limitation here?**
Data collected to answer a question may not be usable for training, evaluation, or behavioural analysis — those are different purposes. Sampling production queries into a golden set is the one teams create without noticing, because it feels like engineering hygiene rather than processing.

**Q: What's the risk with caches?**
A response cache keyed on a normalized query without identity and permissions can serve one customer's answer to another. It's both a privacy failure and a correctness failure, and it's easy to introduce because caching is treated as a performance concern rather than a security boundary.

**Q: How do you handle backups?**
Honestly — a backup taken before deletion still contains the data. The defensible position is a bounded retention policy with documentation that the data ages out within the window, rather than claiming immediate erasure everywhere. Overclaiming is worse than stating the limit.

## 9. Common Mistakes

- An incomplete inventory of stores holding customer data.
- Deleting current state but not checkpoint history.
- Treating traces and logs as infrastructure rather than customer data.
- Sampling production queries into an eval set without a basis.
- Caching without identity and permissions in the key.

## 10. What to Remember

- **The inventory fails, not the controls** — nine stores, most not database-shaped.
- **Deletion must reach every checkpoint**, not just current state.
- **Eval sets built from real queries are customer data stores.**
- **Cache keys need identity and permissions** or answers cross customers.
- **Be honest about backups** — bounded retention, not instant erasure.
