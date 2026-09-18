# Design: AI Customer Support Agent

> **Phase 28 · AI SYSTEM DESIGN · Topic 03**

## 1. Definition

An assistant that answers questions *and takes actions* on a customer's behalf — the point at which a RAG system becomes an agent, and the point at which mistakes stop being bad text.

## 2. Simple Explanation

A FAQ assistant tells you the fee. A support agent can look up your transaction, check your tier, and — if permitted — issue a refund.

Adding actions changes the risk profile entirely. The design question becomes: what's the worst thing a mistake can cause, and is that recoverable?

## 3. How It Works

```
AUTHENTICATE ─ identity immutable in session state
  ▼
CLASSIFY ───── informational | account-specific | action
  ├── informational ──▶ deterministic RAG pipeline
  ├── account query ──▶ agent, READ-ONLY tools
  └── action ─────────▶ agent + human approval gate
  ▼
before_tool ── scope, provenance, authorization, budget, audit
  ▼
VERIFY ─────── grounding + output checks
  ▼
answer │ propose action → approval → execute │ abstain → handoff
```

**The three-way classification is the design.** Informational questions never touch an agent; account queries get read-only tools; actions get approval.

## 4. Practical Example

**Tool design by reversibility:**

```
READ-ONLY (autonomous)
  get_account_tier, get_transactions, get_fee_schedule,
  count_waivers_mtd

REVERSIBLE WRITE (autonomous + audit + notify)
  update_communication_preference
  set_travel_notification

IRREVERSIBLE / MONEY (human approval, always)
  issue_refund, close_account, initiate_transfer,
  cancel_standing_order

Classifying every tool on this axis before building is a
short exercise that makes the approval design principled
rather than argued about later.
```

**The provenance rule, which is the cheap missing control:**

```
"Refund the fee on my last international transfer."

An agent can produce refund(transaction_id="TXN-48821906",
amount=45.00) without ever looking the transaction up —
a plausible ID and a plausible amount.

RULE: no write operation acts on an identifier that didn't
come from a prior tool result or directly from the user.

The call gets rejected with "look it up first with
get_transactions" — which is also just the correct
behaviour. A few lines, and it prevents real money moving
on a number the model invented.
```

**What the human approver must see:**

```
Action:      refund $45.00 to account ****3391
Because:     charged retail rate; customer is Premier
Evidence:    fee schedule v4.2 §3.1 — Premier: $25.00
             TXN-88213 charged $45.00 on 2026-03-03
             waivers used this month: 2 of 2
Verified:    tier confirmed via core banking API (not inferred)
If wrong:    incorrect refund, reversible within 30 days

The "verified vs inferred" line is what most changes the
reviewer's judgment — it tells them which facts to
scrutinize rather than checking everything equally.
```

**Reliability compounds:** at 95% per step, a six-step investigation is about 74% end-to-end. That's the argument for keeping the agent path short, routing most traffic away from it, and gating consequential actions on a human.

## 5. Why It Matters

- **Adding actions changes the risk profile** from bad text to real consequences.
- **The provenance rule** prevents acting on invented identifiers, and it's cheap.
- **Classifying tools by reversibility** makes the approval design principled.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Write tools available by default** | Expands what any mistake can do |
| **No provenance check** | Writes on fabricated identifiers |
| **Service-account tool authority** | Privilege escalation |
| **Approval without evidence** | Rubber-stamping |
| **Long agent paths** | Reliability compounds down |
| **Non-idempotent actions** | Retries duplicate refunds |

**On idempotency:** a refund tool that times out waiting for confirmation will be retried, and without an idempotency key derived from the run and the transaction, the customer gets refunded twice. Retries and checkpoint resumes make this routine rather than exceptional, so it belongs in the design.

**On the honest position:** if a single model error can move money irreversibly, the architecture is wrong regardless of how reliable the model is. The worst outcome of a mistake should always be recoverable — that's the sentence that should shape every tool decision.

## 7. Interview Answer

> "A FAQ assistant tells you the fee; a support agent can look up your transaction, check your tier, and issue a refund. Adding actions changes the risk profile entirely, so the design question becomes what's the worst thing a mistake can cause, and is that recoverable.
>
> The architecture is a three-way classification. Informational questions go through a deterministic RAG pipeline and never touch an agent. Account-specific questions go to an agent with read-only tools. Actions go to an agent plus a human approval gate. That classification is the design — it determines which requests can have consequences at all.
>
> Before building, I'd classify every tool by reversibility. Read-only is autonomous. Reversible writes like updating a communication preference are autonomous with audit and notification. Irreversible actions and anything moving money — refunds, transfers, account closure — require human approval, always. That's a short exercise that makes the approval design principled rather than something argued about later.
>
> The control I'd emphasize is provenance, because it's cheap and most systems lack it. If a customer says 'refund the fee on my last international transfer', the agent can produce a refund call with a transaction ID and an amount it never looked up — a plausible ID and a plausible figure. The rule is that no write operation acts on an identifier that didn't come from a prior tool result or directly from the user. The call gets rejected with 'look it up first', which is also just the correct behaviour. A few lines, and it prevents real money moving on a number the model invented.
>
> For the approval itself, the reviewer needs the action, the reasoning, the evidence with citations, which facts were verified versus inferred, and what happens if it's wrong. That verified-versus-inferred line is what most changes their judgment, because it tells them which facts to scrutinize rather than asking them to check everything equally. Without that, approval degrades to a click and provides no safety while creating a record implying oversight.
>
> Two more things. Idempotency: a refund tool that times out waiting for confirmation gets retried, and without an idempotency key derived from the run and the transaction, the customer is refunded twice. Retries and checkpoint resumes make that routine rather than exceptional.
>
> And reliability compounds. At ninety-five percent per step, a six-step investigation is about seventy-four percent end to end. That's the argument for keeping the agent path short, routing most traffic away from it, and gating consequential actions on a human.
>
> The sentence I'd close on: if a single model error can move money irreversibly, the architecture is wrong regardless of how reliable the model is. The worst outcome of a mistake should always be recoverable."

## 8. Likely Follow-ups

**Q: What changes when you add actions?**
The risk profile. A mistake stops being bad text and becomes a real consequence. So the design question becomes what the worst outcome of an error is, and the architecture has to make that recoverable — through tool limits, approval gates, and provenance checks.

**Q: How do you decide what needs approval?**
By reversibility. Read-only is autonomous, reversible writes are autonomous with audit and notification, and irreversible actions or anything moving money require human approval. Classifying every tool on that axis before building makes the design principled rather than negotiated later.

**Q: What's the provenance rule?**
No write operation acts on an identifier that didn't come from a prior tool result or directly from the user. It catches the agent producing a well-formed but fabricated transaction ID — which passes schema and format validation and is exactly what shouldn't reach a refund call.

**Q: What does the approver need to see?**
The action, the reasoning, the evidence with citations, which facts were verified versus inferred, and the consequence if wrong. Without that, approval becomes a click — no safety, but a record implying oversight happened, which is worse than no gate.

**Q: Why does idempotency matter here?**
Because a refund tool that times out waiting for confirmation gets retried, and without an idempotency key the customer is refunded twice. Retries and checkpoint resumes make duplication routine rather than exceptional, so it belongs in the design rather than as hardening.

## 9. Common Mistakes

- Write tools available when read-only would serve.
- No provenance check before write operations.
- Tools executing with service-account rather than user authority.
- Approval requests without supporting evidence.
- Side-effecting tools without idempotency keys.

## 10. What to Remember

- **Three-way classification:** informational, account query, action.
- **Classify tools by reversibility** before building.
- **No writes on identifiers without provenance** — cheap, and usually missing.
- **Show the approver the evidence**, including verified versus inferred.
- **The worst outcome of a mistake must be recoverable.**
