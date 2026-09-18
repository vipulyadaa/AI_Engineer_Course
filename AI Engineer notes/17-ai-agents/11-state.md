# State

> **Phase 17 · AI AGENTS · Topic 11**

## 1. Definition

The structured data an agent system tracks explicitly — separate from the conversation the model sees. It's where facts, progress, and control variables live in a form code can read and validate.

## 2. Simple Explanation

Memory is what the model sees. State is what your code knows.

If the customer's account tier only exists as a sentence in the conversation, the model might restate it wrongly and nothing catches it. If it's a field in a state object, code can validate it, log it, and enforce rules on it.

## 3. How It Works

```python
@dataclass
class AgentState:
    # identity — set once, never model-written
    user_id: str
    session_id: str

    # task
    original_request: str
    plan: list[str] | None

    # verified facts — written by TOOLS, not by the model
    account_tier: str | None = None
    transaction: dict | None = None

    # control
    step: int = 0
    tokens_used: int = 0
    tools_called: list[str] = field(default_factory=list)

    # output
    answer: str | None = None
    citations: list[str] = field(default_factory=list)
```

**The critical rule: verified facts are written by tool results, not parsed from model output.** If `get_account_tier()` returns "Premier", that value goes into state directly. The model's restatement of it is not the source of truth.

## 4. Practical Example

**What explicit state buys you:**

```
1. VALIDATION
   Code can check invariants: tier must be one of a known
   set; a transaction must belong to this user.

2. RESUMABILITY
   Serialize state; resume after a crash or a human handoff
   without replaying the whole conversation.

3. AUDIT
   A structured record of what the system knew and when —
   far better evidence than a conversation transcript.

4. CONTROL
   Step counts, token budgets, and tools-called live here,
   so limits are enforced by code rather than hoped for.

5. HUMAN HANDOFF
   An agent transferring to a human passes a state object,
   not a chat log the human must read.
```

**The failure that motivates all of this:**

```
Without explicit state, the model says at step 6:

  "Since the customer is a Standard tier customer..."

when step 2's tool returned "Premier". Nothing catches it.
The wrong fact propagates through every subsequent step and
into the answer.

With state, the tier is a field. Code can re-inject the
correct value, or detect the contradiction, or simply not
depend on the model's recollection at all.
```

**State vs memory, stated plainly:**

```
MEMORY  what the model sees      unstructured   model-written
STATE   what the code knows      structured     tool-written

They serve different purposes and both are needed. Conflating
them is how agents end up with no verifiable facts anywhere.
```

## 5. Why It Matters

- **It's where verifiable facts live**, as opposed to the model's recollection.
- **It enables resumability, audit, and human handoff** — all production requirements.
- **Control variables in state** mean limits are enforced rather than hoped for.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No explicit state** | Facts exist only as model text; nothing is verifiable |
| **Model-written state** | Defeats the purpose — hallucinations become "facts" |
| **State and context diverging** | The model acts on stale information |
| **Over-modelling** | A schema so rigid it can't represent real cases |
| **Unversioned state** | Schema changes break in-flight sessions |

**On keeping state and context consistent:** state is authoritative, but the model acts on context. So verified facts should be re-injected into the context — a compact "known facts" block refreshed each iteration — rather than assumed to persist correctly across many turns. That's cheap and it eliminates a whole class of drift.

**On model-written state:** letting the model populate state fields directly reintroduces exactly the problem state exists to solve. Facts enter state from tool results and validated inputs; the model's role is deciding what to do, not asserting what's true.

## 7. Interview Answer

> "Memory is what the model sees; state is what my code knows. State is the structured data the system tracks explicitly — identity, the original request, verified facts, control variables like step count and token usage, and the output.
>
> The critical rule is that verified facts are written by tool results, not parsed from model output. If a tool returns 'Premier' for the account tier, that value goes into state directly. The model's later restatement of it isn't the source of truth.
>
> The failure that motivates this: without explicit state, at step six the model says 'since the customer is Standard tier' when step two's tool returned Premier — and nothing catches it. The wrong fact propagates through every subsequent step into the answer. With state, the tier is a field, so code can detect the contradiction, re-inject the correct value, or simply not depend on the model's recollection.
>
> What it buys beyond that is mostly production requirements. Validation, because code can check invariants like a transaction belonging to this user. Resumability, because you can serialize state and continue after a crash or a handoff without replaying the conversation. Audit, because a structured record of what the system knew and when is far better evidence than a transcript. Control, because step counts and token budgets live there and are enforced by code. And human handoff — an agent escalating to a person passes a state object rather than a chat log someone has to read.
>
> Two design rules I'd hold to. First, the model doesn't write state. Letting it populate fields reintroduces exactly the problem state solves; its role is deciding what to do, not asserting what's true. Second, state is authoritative but the model acts on context — so I'd re-inject verified facts as a compact 'known facts' block each iteration rather than assume they survive correctly across many turns. That's cheap and it removes a whole class of drift."

## 8. Likely Follow-ups

**Q: What's the difference between state and memory?**
Memory is unstructured text the model sees; state is structured data code reads and validates. Memory is written by the model, state by tool results. Both are needed — conflating them leaves the system with no verifiable facts anywhere.

**Q: Who writes to state?**
Tool results and validated inputs, not the model. If the model populates state fields directly, hallucinations become recorded facts and state stops being trustworthy — which defeats its purpose. The model decides what to do; it doesn't assert what's true.

**Q: What does explicit state enable?**
Validation of invariants, resumability after a crash or handoff, an auditable record of what the system knew and when, enforceable control limits like step and token budgets, and clean escalation to a human who receives structured facts rather than a transcript.

**Q: How do you keep state and context consistent?**
Re-inject verified facts into the context as a compact known-facts block each iteration, rather than trusting them to persist correctly across many turns. State stays authoritative, but since the model acts on context, the facts need refreshing there — and it's cheap enough to do unconditionally.

**Q: What goes wrong without it?**
Facts exist only as model text, so a misstatement at step six contradicting a tool result from step two goes undetected and propagates into the answer. There's also nothing to serialize for resumption, nothing structured to audit, and no reliable place to enforce budgets.

## 9. Common Mistakes

- Having no state object at all, with facts living only in conversation.
- Letting the model write state fields directly.
- Assuming verified facts persist correctly in context across many turns.
- Handing a human a chat transcript rather than structured state.
- Not versioning the state schema, breaking in-flight sessions on deploy.

## 10. What to Remember

- **Memory is what the model sees; state is what the code knows.**
- **Tool results write state** — never the model.
- **State enables validation, resumability, audit, control, and handoff.**
- **Re-inject verified facts into context** each iteration to prevent drift.
- **Without state, a misstated fact propagates silently** into the answer.
