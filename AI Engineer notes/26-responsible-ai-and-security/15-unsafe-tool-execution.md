# Unsafe Tool Execution

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 15**

## 1. Definition

An agent executing a tool it shouldn't — wrong arguments, wrong authority, an action nobody authorized, or a capability that shouldn't have existed. It's where a model's mistake stops being a bad answer and becomes a real-world consequence.

## 2. Simple Explanation

A chatbot that gets something wrong produces bad text. An agent that gets something wrong calls a function.

So the design question isn't whether the model will make a mistake — it will — but what the worst thing is that a mistake can cause.

## 3. How It Works

```
FAILURE MODES

WRONG TOOL          plausible but incorrect selection
WRONG ARGUMENTS     hallucinated or out-of-scope identifiers
WRONG AUTHORITY     executing as the service account
UNAUTHORIZED ACTION something the user never asked for
DESTRUCTIVE ACTION  irreversible, taken autonomously
CASCADING           one wrong action triggering others
```

**Controls, in order of strength:**

```
1. THE TOOL DOESN'T EXIST      absolute
2. READ-ONLY BY DEFAULT        no write capability to misuse
3. ARGUMENT VALIDATION         scope and provenance
4. USER-SCOPED AUTHORIZATION   bounded by the user's rights
5. HUMAN APPROVAL              irreversible actions
6. IDEMPOTENCY                 retries don't duplicate
```

## 4. Practical Example

**The dangerous sequence, and where it breaks:**

```
Customer: "Refund the fee on my last international transfer."

Agent: refund(transaction_id="TXN-48821906", amount=45.00)

The agent never looked up the transaction. It produced a
plausible ID and a plausible amount.

BROKEN BY:
  · provenance check — that ID never appeared in a prior
    tool result, so the call is rejected with a message
    telling the agent to look it up first
  · human approval — a person sees the proposed refund with
    its evidence before it executes
  · read-only default — if refund isn't in the agent's tool
    set at all, the question doesn't arise

The provenance rule is the cheap one and it's the one most
systems lack: no write operation acts on an identifier that
didn't come from a prior tool result or directly from the
user.
```

**Reversibility as the design axis:**

```
REVERSIBLE, LOW VALUE      autonomous
REVERSIBLE, HIGH VALUE     autonomous + audit + notify
IRREVERSIBLE               human approval, always
MOVES MONEY                human approval, always

Classifying every tool on this axis before building is
what makes the approval design principled rather than
arbitrary — and it's a short exercise that prevents a long
argument later.
```

**Idempotency, which retries make routine:**

```
A tool that writes a record and times out waiting for the
response will write a second one on retry. Resume from a
checkpoint does the same.

So side-effecting tools need idempotency keys derived from
the run and the operation — otherwise duplicate refunds,
duplicate emails, duplicate audit entries.

Retries make this likely, not occasional, which is why it
belongs in the design rather than as a hardening step.
```

## 5. Why It Matters

- **It's where a model mistake becomes a real-world consequence.**
- **Provenance on write operations** is the cheap control most systems lack.
- **Classifying tools by reversibility** makes approval design principled.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Write tools available by default** | Expands what any mistake can do |
| **No provenance check** | Writes act on fabricated identifiers |
| **Service-account authority** | Any user reaches anything it can |
| **No approval on irreversible actions** | Autonomous consequences |
| **Non-idempotent tools** | Retries and resumes duplicate |
| **No audit of executions** | Can't reconstruct what happened |

**On cascading actions:** one wrong tool call feeding another compounds the problem — a wrong account lookup leading to a wrong transfer. Validating each call against state independently, rather than trusting the previous result, is what limits the cascade. And a step budget bounds how far it can go before something stops it.

**On the honest framing:** the question isn't whether the model will make a mistake. It will. The design question is what the worst outcome of a mistake is, and the answer should be something recoverable. If a single model error can move money irreversibly, the architecture is wrong regardless of how reliable the model is.

## 7. Interview Answer

> "A chatbot that gets something wrong produces bad text; an agent that gets something wrong calls a function. So the design question isn't whether the model will make a mistake — it will — but what the worst thing a mistake can cause is.
>
> The failure modes are wrong tool selection, wrong arguments including hallucinated identifiers, wrong authority, an action nobody asked for, an irreversible action taken autonomously, and cascading actions where one wrong call feeds another.
>
> The controls in order of strength: the tool not existing, which is absolute; read-only by default so there's no write capability to misuse; argument validation for scope and provenance; user-scoped authorization; human approval on irreversible actions; and idempotency so retries don't duplicate.
>
> The concrete case I'd give: a customer says 'refund the fee on my last international transfer' and the agent calls refund with a transaction ID and an amount it never looked up — a plausible ID and a plausible figure. That's real money moving on a number the model produced.
>
> The provenance rule breaks it, and it's the cheap control most systems lack: no write operation acts on an identifier that didn't come from a prior tool result or directly from the user. The call gets rejected with a message telling the agent to look it up first — which is also just the correct behaviour. Human approval breaks it too, and read-only default means the question never arises.
>
> The framework I'd use for approval design is reversibility. Reversible and low value: autonomous. Reversible and high value: autonomous with audit and notification. Irreversible: human approval, always. Moves money: human approval, always. Classifying every tool on that axis before building is a short exercise that makes the approval design principled rather than arbitrary, and it prevents a long argument later about which actions need a person.
>
> On idempotency — retries make it routine rather than occasional. A tool that writes a record and times out waiting for the response writes a second one on retry, and resuming from a checkpoint does the same. So side-effecting tools need idempotency keys derived from the run and the operation, otherwise you get duplicate refunds and duplicate emails. That belongs in the design, not as a hardening step.
>
> And the honest framing I'd close on: if a single model error can move money irreversibly, the architecture is wrong regardless of how reliable the model is. The worst outcome of a mistake should always be something recoverable."

## 8. Likely Follow-ups

**Q: What's the strongest control?**
The tool not existing. An agent without a refund capability can't issue a wrong refund however it's confused or manipulated. Every other control depends on something working correctly; absence of the capability doesn't.

**Q: What's the provenance rule?**
No write operation acts on an identifier that didn't come from a prior tool result or directly from the user. It catches the case where the model produces a well-formed but fabricated transaction ID — which passes schema and format validation and is exactly what you don't want a refund executing against.

**Q: How do you decide what needs approval?**
By reversibility. Reversible and low value is autonomous; reversible and high value is autonomous with audit and notification; irreversible and anything moving money requires human approval. Classifying tools on that axis before building makes the design principled rather than arbitrary.

**Q: Why does idempotency matter more with agents?**
Because retries and checkpoint resumes both re-run tools. A tool that writes a record and times out will write a second one on retry, so duplication moves from occasional to routine. Idempotency keys derived from the run and operation are the fix.

**Q: What's the right framing overall?**
That the model will make mistakes, so the question is what the worst consequence of one is. If a single model error can move money irreversibly, the architecture is wrong regardless of model reliability — the worst outcome should always be recoverable.

## 9. Common Mistakes

- Write tools available when the agent only needs to read.
- No provenance check before write operations.
- Tools executing with service-account authority.
- Autonomous irreversible actions.
- Side-effecting tools without idempotency keys.

## 10. What to Remember

- **The tool not existing** is the only absolute control.
- **No writes on identifiers without provenance** — the cheap missing control.
- **Classify tools by reversibility** to design approval principled.
- **Retries make idempotency routine**, not occasional.
- **The worst outcome of a mistake must be recoverable**, or the architecture is wrong.
