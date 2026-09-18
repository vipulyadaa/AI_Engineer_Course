# When Should an Agent Decide to Retrieve?

> **Phase 18 · AGENTIC RAG · Topic 03**

## 1. Definition

The decision of whether a given turn needs retrieval at all. Getting it wrong in one direction wastes cost and pollutes context; in the other, it produces ungrounded answers — which is far worse in a regulated setting.

## 2. Simple Explanation

Not every message needs a search. "Thanks, that's clear" doesn't. "What's the wire fee?" does.

The risk is asymmetric: retrieving unnecessarily costs a little money. *Not* retrieving when you should means the model answers from its own knowledge, which is exactly what a grounded system is built to avoid.

## 3. How It Works

```
ALWAYS RETRIEVE
  · any factual question about products, fees, policies
  · anything with a number, rate, date, or condition
  · anything the customer might act on
  · anything where being wrong has consequences

SAFE NOT TO RETRIEVE
  · acknowledgements: "thanks", "got it"
  · clarifying questions the agent asks the user
  · restating or summarizing what was already retrieved
  · meta questions: "can you repeat that?"

The safe list is short and closed. That's deliberate.
```

**The asymmetry is the whole design principle:**

```
Unnecessary retrieval   → a few cents, slight latency,
                          slightly more context
Missing retrieval       → an ungrounded answer presented
                          with the same confidence as a
                          grounded one

These are not comparable costs. Bias hard toward retrieving.
```

## 4. Practical Example

**Implementing the decision safely:**

```
NOT: "Decide whether you need to retrieve."
     → the model over-trusts its own knowledge

BUT: "You must retrieve before answering any question about
      products, fees, policies, rates, or account features.
      You may answer without retrieving ONLY for:
      acknowledgements, clarifying questions, and restating
      information already retrieved in this conversation.
      If unsure, retrieve."

A closed allowlist, not open judgment.
```

**Better still — make it a code decision where possible:**

```
A classifier or rule that routes acknowledgements away from
retrieval is deterministic, auditable, and free.

The model's judgment is needed for genuinely ambiguous turns.
Everything else should be decided in code, because code can
be tested and a model's judgment can't be, per-request.
```

**The follow-up case, which is subtler:**

```
Turn 1: "What's the international transfer fee?"
        → retrieved, answered $45 / $25 Premier

Turn 2: "And if I'm Premier?"
        → the answer may already be in the retrieved context

Retrieving again costs a little and risks nothing.
NOT retrieving risks answering from a partially-remembered
earlier result.

For banking I'd retrieve. The saving isn't worth the
grounding risk, and re-retrieval also refreshes anything
that changed.
```

## 5. Why It Matters

- **The risk is asymmetric** — that asymmetry should drive the whole design.
- **A closed allowlist beats open judgment** for deciding not to retrieve.
- **Code decisions are auditable**; per-request model judgment isn't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not retrieving when needed** | Ungrounded answer, full confidence |
| **Retrieving on every turn** | Wasted cost; context pollution |
| **Open-ended judgment** | The model over-trusts parametric knowledge |
| **Follow-ups answered from memory** | Partially-remembered earlier results |
| **No record of the decision** | Can't audit why an answer wasn't grounded |

**On context pollution:** retrieving for an acknowledgement inserts irrelevant chunks into the context, which can genuinely degrade the next answer. So "always retrieve" isn't free — but the degradation is small and recoverable, whereas an ungrounded answer isn't.

**On auditability:** the decision itself should be logged — retrieved or not, and why. If a regulator asks why a particular answer wasn't grounded in a document, "the model decided it didn't need to look" is only defensible if the decision was recorded and falls within a documented policy.

## 7. Interview Answer

> "The key point is that the risk is asymmetric. Retrieving unnecessarily costs a few cents, slight latency, and a little context pollution. Not retrieving when you should means the model answers from parametric knowledge — which is exactly what a grounded system exists to prevent, and it arrives with the same confidence as a grounded answer. Those aren't comparable costs, so I'd bias hard toward retrieving.
>
> Concretely, always retrieve for any factual question about products, fees, policies, rates, or account features; anything with a number, rate, date, or condition; and anything the customer might act on. It's safe not to retrieve for acknowledgements, clarifying questions the agent asks, and restating information already retrieved in this conversation. That safe list is short and closed, deliberately.
>
> The implementation detail matters. I wouldn't say 'decide whether you need to retrieve' — that invites the model to over-trust its own knowledge. I'd give a closed allowlist: you must retrieve for these categories, you may skip only for these three specific cases, and if unsure, retrieve.
>
> Better still, make it a code decision where possible. A rule or classifier routing acknowledgements away from retrieval is deterministic, auditable, and free. Model judgment should be reserved for genuinely ambiguous turns, because code can be tested and per-request model judgment can't.
>
> The subtler case is follow-ups. If turn one asked about the transfer fee and turn two asks 'and if I'm Premier', the answer may already be in the retrieved context. Retrieving again costs a little and risks nothing; not retrieving risks answering from a partially-remembered earlier result. For banking I'd retrieve — the saving isn't worth the grounding risk, and re-retrieval also picks up anything that changed.
>
> And I'd log the decision itself, retrieved or not and why. If a regulator asks why an answer wasn't grounded in a document, 'the model decided it didn't need to look' is only defensible if that decision was recorded and falls within a documented policy."

## 8. Likely Follow-ups

**Q: When is it safe not to retrieve?**
Acknowledgements, clarifying questions the agent asks, restating information already retrieved in the conversation, and meta questions like "can you repeat that". That's a deliberately short, closed list — anything factual about products, fees, policies, or account features always retrieves.

**Q: Why bias toward retrieving?**
Because the risks aren't comparable. Unnecessary retrieval costs a few cents and slight context pollution; missing retrieval produces an ungrounded answer delivered with full confidence. In a regulated system that's the exact failure the architecture exists to prevent.

**Q: How do you implement the decision?**
As a closed allowlist rather than open judgment — "you must retrieve for these categories, you may skip only for these three cases, if unsure retrieve." And where the case is mechanical, like acknowledgements, decide it in code, because code is deterministic, testable, and auditable.

**Q: What about follow-up questions?**
I'd retrieve. The answer might already be in context, but not retrieving risks answering from a partially-remembered earlier result, and re-retrieving also picks up anything that has changed. The saving doesn't justify the grounding risk in banking.

**Q: Does this need to be auditable?**
Yes. The decision to retrieve or not should be logged with its reason. If someone asks why a particular answer wasn't grounded in a source document, the defensible response is that the decision was recorded and falls within a documented policy — not that the model judged it unnecessary.

## 9. Common Mistakes

- Giving the model open-ended judgment on whether to retrieve.
- Treating unnecessary retrieval and missed retrieval as comparable costs.
- Skipping retrieval on follow-ups because context might already have it.
- Deciding in the model what could be decided in code.
- Not logging the retrieval decision for audit.

## 10. What to Remember

- **The risk is asymmetric** — bias hard toward retrieving.
- **Closed allowlist for skipping**, never open judgment.
- **Decide in code where mechanical** — deterministic and testable.
- **Retrieve on follow-ups too**; the saving isn't worth the grounding risk.
- **Log the decision and its reason** for audit.
