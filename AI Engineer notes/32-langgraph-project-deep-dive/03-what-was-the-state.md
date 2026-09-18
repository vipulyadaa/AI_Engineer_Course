# "What Was the State?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 03**
>
> ⚠️ **An answer framework.** Describe your actual state schema. The reducer
> question is where a considered answer shows.

## 1. Definition

A design question about the shared object every node reads and writes. The distinguishing details are what you deliberately kept *out* of it, and how concurrent updates merge.

## 2. Simple Explanation

State is the workflow's working memory — one typed object passed from node to node, where each node returns the fields it changed.

The interesting decisions are what belongs in it, what doesn't, and what happens when two nodes write the same field.

## 3. How It Works

```
A REALISTIC SCHEMA

  query             the original question
  rewritten_query   resolved to standalone
  user_context      identity, entitlements, tier
  retrieved         list of chunks with scores
  answer            the generated text
  citations         chunk IDs referenced
  verification      groundedness result
  attempt_count     for the refinement loop bound
  status            ok | needs_review | abstained | failed
  errors            accumulated, not overwritten

THE RULES THAT MATTER

  APPEND fields need a reducer — messages, errors,
  retrieved results across parallel branches

  OVERWRITE fields are the default — answer, status

  Getting that wrong is silent: a parallel branch's
  results vanish because the last writer won.
```

## 4. Practical Example

**The reducer decision, which is where this gets real:**

```
Two retrieval nodes run in parallel — dense and lexical.

DEFAULT BEHAVIOUR (overwrite):
  both write `retrieved`
  → the second one to finish wins
  → half the results silently disappear
  → nothing errors, and the workflow looks fine

WITH AN APPEND REDUCER:
  both contributions merge into one list
  → fusion and reranking see everything

This is the single most common LangGraph state bug, and
it only appears when branches run concurrently — so it
passes every sequential test.
```

**What to keep out of state:**

```
LARGE BLOBS       full document text. Every checkpoint
                  serializes the whole state, so putting
                  megabytes in it makes every transition
                  expensive. Store IDs; fetch on demand.

SECRETS           checkpoints are persisted, so anything
                  in state is written to durable storage.
                  Credentials belong in the runtime
                  config, not the state object.

RAW PII           if state is checkpointed, customer
                  questions and retrieved policy text
                  become a durable data store subject to
                  the same retention and access rules as
                  everything else.

DERIVED VALUES    anything recomputable from other
                  fields. It drifts, and then two fields
                  disagree.
```

**The PII point is the one that matters in banking**, and it's easy to miss because state feels ephemeral when it isn't.

**On typing:** a `TypedDict` with explicit fields rather than a loose dictionary. The value isn't type safety at runtime — it's that the schema documents what the workflow carries, and a node writing a field nobody declared is visible in review rather than discovered in production.

## 5. Why It Matters

- **Reducers decide what happens on concurrent writes** — the default silently drops data.
- **State gets persisted** — so it inherits PII and secrets obligations.
- **Keep blobs out** — every checkpoint serializes the whole object.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "A dict with whatever each node needs" | No schema, no reducers, no thought |
| No mention of reducers | The parallel-write bug |
| Full document text in state | Every checkpoint pays for it |
| Secrets or raw PII in state | Written to durable storage |
| Derived fields stored | They drift out of sync |
| One giant state for everything | Nodes can't be reasoned about independently |

**On state growth in loops:** a refinement loop that appends to state each iteration grows it every pass. With a checkpoint per step, that's quadratic serialization cost in the number of iterations. Either bound the loop tightly or store only the latest attempt plus a count, not every attempt's full output.

**On subgraph state:** if the workflow has subgraphs, they can have their own narrower schema with explicit mapping in and out. That's worth doing when a subgraph is reusable — it keeps the parent's state from becoming the union of everything any node ever needed.

## 7. Interview Answer

> "[**Your schema.** The reducer and exclusion points are what distinguish the answer.]
>
> "The state was a typed schema rather than a loose dictionary — [**your fields**]. Roughly: the original query, the rewritten standalone version, the user's identity and entitlements, the retrieved chunks with scores, the generated answer, the citations, the verification result, an attempt counter for the loop bound, a status field, and an accumulated error list.
>
> Typing it mattered less for runtime safety than for documentation — the schema says what the workflow carries, so a node writing an undeclared field shows up in review rather than in production.
>
> The decision I'd call out is reducers. Most fields overwrite, which is the default and usually right — the answer field should hold the latest answer. But append-style fields need an explicit reducer, and getting that wrong is the most common LangGraph bug I know of.
>
> Concretely: if dense and lexical retrieval run in parallel and both write to the retrieved field, the default behaviour is last-writer-wins. So half the results silently disappear, nothing errors, and the workflow looks completely normal. With an append reducer both contributions merge and the fusion step sees everything.
>
> What makes it nasty is that it only manifests when branches actually run concurrently, so it passes every sequential test you'd write.
>
> Then what I deliberately kept out. Large blobs — full document text stays out, because every checkpoint serializes the entire state object, so putting megabytes in it makes every transition expensive. Store chunk IDs and fetch the text when needed.
>
> Secrets, because checkpoints are persisted — anything in state gets written to durable storage, so credentials belong in the runtime config rather than the state object.
>
> And this is the one that matters most in banking: raw PII. If state is checkpointed, then customer questions and retrieved policy text become a durable data store, subject to the same retention, access control, and residency rules as the primary system. State feels ephemeral and it isn't, which is exactly why it gets missed.
>
> Also derived values — anything recomputable from other fields, because it drifts and then two fields disagree about the same thing.
>
> One thing I'd watch is state growth in loops. A refinement loop that appends each iteration's output grows the state every pass, and with a checkpoint per step that's quadratic serialization cost. So I'd store the latest attempt and a counter rather than every attempt's full output."

## 8. Likely Follow-ups

**Q: What's a reducer and when do you need one?**
A merge function for a field. You need one wherever multiple nodes — especially parallel ones — write the same field and you want contributions combined rather than replaced. The default overwrites, silently.

**Q: What's the most common state bug?**
Parallel branches writing the same field without an append reducer. The last one to finish wins, half the data disappears, nothing errors, and it passes every sequential test because it only appears under concurrency.

**Q: What shouldn't go in state?**
Large blobs, secrets, raw PII, and derived values. Every checkpoint serializes the whole object, and checkpoints are persisted — so state inherits the storage cost and the data-governance obligations of a real datastore.

**Q: Why type the state?**
For documentation more than runtime safety. The schema declares what the workflow carries, so a node writing an undeclared field is visible in review instead of discovered later.

**Q: What happens in a long loop?**
State grows each iteration if you append, and with a checkpoint per step the serialization cost is quadratic. Storing the latest attempt plus a counter rather than every attempt's output keeps it flat.

## 9. Common Mistakes

- An untyped dictionary with no declared schema.
- No reducers on fields that parallel branches write.
- Document text or other blobs in state.
- Secrets or raw PII in a persisted state object.
- Storing derived values that drift.

## 10. What to Remember

- **Reducers decide concurrent writes** — the default drops data silently.
- **The parallel-write bug passes sequential tests.**
- **State is persisted** — PII, secrets, and retention rules apply.
- **IDs, not blobs** — checkpoints serialize everything.
- **Bound loop growth** — appended state costs quadratically.
