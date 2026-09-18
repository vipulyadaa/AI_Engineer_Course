# Hallucinated Tool Calls

> **Phase 17 · AI AGENTS · Topic 27**

## 1. Definition

The model producing tool calls that are structurally valid but semantically wrong — invented identifiers, non-existent tools, or plausible arguments that don't correspond to anything real.

## 2. Simple Explanation

Schema-constrained decoding guarantees the *shape* of a tool call. It guarantees nothing about whether the values mean anything.

`{"transaction_id": "TXN-48821906"}` is perfectly well-formed. It may also be a number the model made up because it looked like the right format.

## 3. How It Works

**Three kinds:**

```
1. HALLUCINATED ARGUMENTS
   Invented IDs, dates, amounts, account numbers.
   Well-formed, non-existent.          ← the common one

2. HALLUCINATED TOOLS
   Calling a tool that doesn't exist. Rare with constrained
   decoding, still seen with prompt-based tool use.

3. HALLUCINATED CAPABILITIES
   Assuming a tool does something it doesn't — calling
   get_balance expecting transaction history.
```

**Why it happens:** the model is completing a pattern. A tool signature expecting an ID creates strong pressure to produce something ID-shaped, whether or not one is actually known.

## 4. Practical Example

**The defence, in layers:**

```
1. DON'T REQUIRE WHAT THE MODEL MUST INVENT
   get_own_recent_transactions()  →  no ID parameter at all
   The strongest fix: remove the opportunity.

2. VALIDATE EXISTENCE, NOT JUST FORMAT
   Look up the ID; return "not found" as a result the model
   can react to.

3. VALIDATE AGAINST STATE
   If the ID wasn't returned by a previous tool call, it was
   invented. That's a strong, cheap signal.

4. HARD RULE ON WRITES
   Never allow a write operation on an identifier that didn't
   come from a prior tool result in this session.
```

**Layer 3 is underused and very effective:**

```python
if args.get("transaction_id") not in state.seen_transaction_ids:
    return ("That transaction ID did not appear in any previous "
            "result. Use get_transactions to list the customer's "
            "actual transactions first.")
```

**The dangerous pattern:**

```
User:   "Refund the fee on my last international transfer."
Agent:  refund(transaction_id="TXN-48821906", amount=45.00)

The agent never looked up the transaction. It produced a
plausible ID and a plausible amount.

With layer 4, this is blocked outright: the ID didn't come
from a tool result, so no write is permitted. The agent is
forced to look it up first — which is also just the correct
behaviour.
```

**Also worth doing:** instruct explicitly in the system prompt — "never invent identifiers; if you need one, retrieve it first; if you cannot, say so." That reduces frequency. It doesn't remove the need for the code-level checks.

## 5. Why It Matters

- **Schema validity is not semantic validity** — the core misunderstanding.
- **Identifiers must trace to a tool result**, which is a cheap and strong check.
- **On write operations this is a correctness and money issue**, not a quality one.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Trusting schema validation** | Structure checked, meaning not |
| **Format-only validation** | Well-formed invented IDs pass |
| **Writes on unverified identifiers** | Actions taken on nothing real |
| **Plausible amounts and dates** | Harder to detect than IDs |
| **Overly strict checks** | Blocking legitimate user-supplied values |

**On user-supplied values:** a customer can legitimately give a transaction ID, which then didn't come from a tool result. The rule needs to allow identifiers traceable to *either* a tool result or the user's own message — and user-supplied ones still need existence and ownership validation before any write.

**On amounts and dates:** these are harder than IDs because there's no lookup that proves a number is wrong. The defence is requiring that any amount in a write operation be derived from a tool result and echoed back for confirmation — "refunding $45.00, the fee charged on TXN-88213 on 3 March" — so a human or the user can catch it.

## 7. Interview Answer

> "Hallucinated tool calls are structurally valid and semantically wrong. Schema-constrained decoding guarantees the shape of the call and nothing about whether the values mean anything — a transaction ID can be perfectly well-formed and completely invented, because the model is pattern-completing and a signature expecting an ID creates strong pressure to produce something ID-shaped.
>
> The defence is layered. Strongest first: don't require what the model has to invent. A tool like get_own_recent_transactions with no ID parameter removes the opportunity entirely rather than defending against it. Then validate existence rather than just format, returning 'not found' as a result the model can react to.
>
> Third, and this one is underused and very effective: validate against state. If an identifier didn't appear in any previous tool result in this session, it was invented. That's a cheap, strong signal, and the response should tell the agent to look it up properly first.
>
> Fourth, the hard rule: never allow a write operation on an identifier that didn't come from a prior tool result. Concretely — if a user says 'refund the fee on my last international transfer' and the agent calls refund with a transaction ID it never looked up and an amount it never verified, that's real money moving on a number the model produced. That rule blocks it outright and forces a lookup first, which is also simply the correct behaviour.
>
> I'd also instruct explicitly in the system prompt — never invent identifiers, retrieve them first, say so if you can't. That reduces frequency but doesn't remove the need for code-level checks.
>
> Two refinements. Users can legitimately supply an identifier, so the rule should allow ones traceable to either a tool result or the user's own message — with existence and ownership still validated before any write. And amounts and dates are harder than IDs, because no lookup proves a number wrong. There I'd require any amount in a write to be derived from a tool result and echoed back for confirmation — 'refunding forty-five dollars, the fee charged on this transaction on this date' — so a person can catch it."

## 8. Likely Follow-ups

**Q: Doesn't schema validation prevent this?**
No — it guarantees structure, not meaning. A well-formed identifier can be entirely invented, and the schema has no way to know. Existence checks and provenance checks are what catch it, and they're the application's responsibility.

**Q: What's the strongest defence?**
Removing the parameter. A tool that acts on the session's own account, with no identifier argument, can't be given an invented one. That eliminates the failure rather than detecting it, which is always preferable when the tool design allows it.

**Q: How do you check provenance?**
Track identifiers that appeared in previous tool results for the session, and reject any argument using one that didn't — with a message telling the agent to look it up first. It's a few lines and it catches invented IDs that pass every format check.

**Q: What's the rule for write operations?**
Never act on an identifier that didn't come from a prior tool result or directly from the user, and validate ownership and existence even then. Writes are where a hallucinated identifier stops being a quality problem and becomes money moving on a number the model made up.

**Q: What about hallucinated amounts?**
Harder, because no lookup proves a number wrong. The defence is requiring any amount in a write to be derived from a tool result, and echoing it back with its provenance for confirmation — so a human or the customer can catch a figure that doesn't match reality.

## 9. Common Mistakes

- Assuming schema-valid means semantically correct.
- Validating identifier format without checking existence.
- Allowing writes on identifiers with no provenance.
- Relying only on prompt instructions to prevent invention.
- Blocking user-supplied identifiers by applying the provenance rule too rigidly.

## 10. What to Remember

- **Schema validity ≠ semantic validity.** Well-formed IDs can be invented.
- **Remove the parameter** where possible — the strongest defence.
- **Check provenance:** identifiers must trace to a tool result or the user.
- **Never write on an unverified identifier.**
- **Echo amounts with their source** for confirmation before acting.
