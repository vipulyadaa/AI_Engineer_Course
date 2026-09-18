# Self-Correction

> **Phase 17 · AI AGENTS · Topic 15**

## 1. Definition

An agent detecting that something went wrong and adjusting — retrying with different arguments, choosing another tool, or revising an answer. It works well when there's an external signal of failure, and poorly when there isn't.

## 2. Simple Explanation

A tool returns an error, so the agent tries something else. That's self-correction, and it's genuinely reliable.

The harder case is the agent deciding its own reasoning was wrong with no external signal. That's much less reliable, because the model's judgment about its output is the same judgment that produced it.

## 3. How It Works

**The distinction that determines whether it works:**

| Signal | Reliability |
|---|---|
| **Tool error returned** | High — unambiguous |
| **Validation failure** | High — an external rule caught it |
| **Empty or contradictory results** | Medium — requires interpretation |
| **Model's own doubt** | Low — same judgment that erred |

```
RELIABLE
  get_transaction("TXN-99") → "Not found"
  → agent retries with a corrected ID, or asks the user

UNRELIABLE
  agent asks itself "was my reasoning sound?"
  → often says yes when it wasn't
```

**So the design principle is: create external signals.** Don't rely on the model noticing its own errors — build checks that produce unambiguous failures it can react to.

## 4. Practical Example

**Building the signals that make correction work:**

```
1. TOOL ERRORS AS RESULTS
   Return "Error: account not found" to the model rather than
   raising. Now it can adapt.

2. VALIDATION AS A TOOL
   A check_answer_grounded(answer, context) tool that returns
   which claims lack support. An external, mechanical signal.

3. CONSISTENCY CHECKS IN CODE
   If step 2 said tier=Premier and the answer says Standard,
   code detects it and injects a correction. Deterministic.

4. EXPLICIT ABSTENTION PATH
   "If you cannot establish X, say so" — correction includes
   correctly giving up, not only trying again.
```

**Point 3 is the strongest**, because it's code detecting the contradiction rather than the model being asked to notice it. That's what having explicit state buys you.

**Where correction becomes harmful:**

```
· RETRY LOOPS — the same failing call with cosmetic argument
  changes, consuming the whole budget
· OVER-CORRECTION — revising a correct answer into a worse
  one because the critique found something to say
· MASKING — correcting around a broken tool instead of
  surfacing that it's broken

The third matters operationally: an agent that silently works
around a failing service means nobody finds out the service
is failing. Correction should be logged and alerted on, not
just handled.
```

## 5. Why It Matters

- **It's what makes agents robust** to the ordinary failures of real systems.
- **External signals work; self-doubt doesn't** — the core distinction.
- **Silent correction hides infrastructure failures**, which is a real operational cost.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Retry loops** | Budget consumed on a persistently failing call |
| **Over-correction** | A good answer revised into a worse one |
| **Unreliable self-assessment** | The model often can't detect its own errors |
| **Masking failures** | Working around broken infrastructure silently |
| **No abstention path** | Correction becomes endless retrying |

**On retry caps:** a per-tool retry limit — two or three — with the agent then required to try a different approach or report failure, prevents the most common budget blowout. Without it, an agent can spend ten steps calling the same broken endpoint with slightly different arguments.

**On abstention as correction:** the most valuable correction is often deciding the task can't be completed and saying so. In banking, an agent that says "I couldn't verify your account tier, let me transfer you" is behaving correctly. One that keeps trying until the budget runs out and then produces a guess is not. That path has to be explicitly available and explicitly encouraged, or the model will keep trying.

## 7. Interview Answer

> "Self-correction is an agent detecting something went wrong and adjusting. The distinction that determines whether it works is whether there's an external signal.
>
> When a tool returns an error — 'transaction not found' — correction is reliable. The signal is unambiguous and the agent can retry with a corrected identifier, try another tool, or ask the user. When the agent is asked to judge whether its own reasoning was sound, it's unreliable, because that's the same judgment that produced the reasoning.
>
> So the design principle is to create external signals rather than relying on the model noticing its own errors. Four things I'd build. Return tool errors to the model as results instead of raising, so it can adapt. Provide validation as a tool — a grounding check that returns which claims lack support, which is a mechanical external signal. Run consistency checks in code, so if step two established the tier was Premier and the answer says Standard, code detects the contradiction and injects a correction. And provide an explicit abstention path.
>
> The consistency check in code is the strongest, because it's deterministic detection rather than asking the model to notice. That's exactly what maintaining explicit state buys you.
>
> On abstention — the most valuable correction is often deciding the task can't be completed and saying so. An agent that says 'I couldn't verify your account tier, let me transfer you' is behaving correctly; one that keeps trying until the budget runs out and then guesses is not. That path has to be explicitly available and explicitly encouraged, or the model keeps trying.
>
> Two failure modes. Retry loops — I'd cap retries per tool at two or three, after which the agent must try a different approach or report failure, because otherwise an agent spends ten steps calling the same broken endpoint with cosmetically different arguments.
>
> And masking, which is the operationally important one: an agent that silently works around a failing service means nobody finds out the service is failing. Correction should be logged and alerted on, not just handled."

## 8. Likely Follow-ups

**Q: When does self-correction work well?**
When there's an external signal — a tool error, a validation failure, a code-level consistency check. Those are unambiguous and the agent can react appropriately. It works poorly when the agent is asked to assess its own reasoning, since that's the same judgment that produced the error.

**Q: How do you make correction more reliable?**
Create external signals rather than relying on introspection. Return tool errors to the model as results, expose validation as a tool it can call, run consistency checks in code against explicit state, and provide an explicit abstention path. Deterministic detection beats asking the model to notice.

**Q: What's the risk of retry loops?**
An agent spending its whole budget calling the same failing endpoint with cosmetically different arguments. A per-tool retry cap of two or three, after which it must change approach or report failure, prevents the most common budget blowout.

**Q: Is abstention a form of correction?**
Yes, and often the most valuable one. An agent saying it couldn't verify something and offering a handoff is behaving correctly; one that keeps trying and then guesses is not. That path needs to be explicitly available and encouraged, otherwise the model defaults to persisting.

**Q: What's the operational risk of self-correction?**
Masking. An agent that silently routes around a failing service means nobody learns the service is broken — the symptom is absorbed rather than surfaced. Corrections should be logged and alerted on, not just handled, so the underlying failure still reaches someone.

## 9. Common Mistakes

- Relying on the model to detect its own reasoning errors.
- No per-tool retry cap, allowing budget-consuming loops.
- Raising tool errors instead of returning them to the model.
- Not providing or encouraging an abstention path.
- Handling corrections silently, hiding infrastructure failures.

## 10. What to Remember

- **External signals make correction reliable; self-doubt doesn't.**
- **Return tool errors to the model** so it can adapt.
- **Consistency checks in code** beat asking the model to notice.
- **Abstention is correction** — and often the right one.
- **Log and alert on corrections**, or they mask broken infrastructure.
