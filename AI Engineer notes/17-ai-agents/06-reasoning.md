# Reasoning

> **Phase 17 · AI AGENTS · Topic 06**

## 1. Definition

The model generating intermediate thinking before choosing an action. In an agent it's what connects observations to decisions — and it's also the most readable artifact for debugging why an agent did something.

## 2. Simple Explanation

Before calling a tool, the agent writes out what it's thinking: what it knows, what's missing, what to do about it.

That text isn't decoration. Generating it gives the model tokens to work through the problem, which measurably improves the decision — and it gives you a record of the reasoning to inspect afterwards.

## 3. How It Works

```
Observation:  fee_charged = $45, tier = Premier
Thought:      Premier should be $25. Either the tier was
              applied wrongly, or a waiver was consumed.
              I should check the waiver count this month.
Action:       count_waived_transfers(customer, month)
```

**Why generating reasoning helps:** the model produces one token at a time, conditioned on everything before it. Reasoning tokens give it intermediate results to condition on — effectively more computation applied to the problem. A decision made after working through the situation is better than one made immediately.

**Reasoning models** (Gemini's thinking modes, o-series) do this internally with training specifically for it, rather than relying on prompting.

## 4. Practical Example

**Reasoning is the debugging artifact:**

```
Agent calls the wrong tool. Without visible reasoning you see:

  step 3: called get_account_balance(...)

With reasoning:

  step 3: "The customer mentioned a fee, so I should check
           their balance to see if it was deducted."
          → called get_account_balance(...)

Now the failure is DIAGNOSABLE: the model misunderstood what
the question needed. That's a prompt or tool-description
problem, not a model-capability problem — and those have
completely different fixes.

Debugging an agent without stored reasoning is guesswork.
```

**The caveat that matters:**

```
The stated reasoning is not guaranteed to be the actual cause
of the action. Models can produce plausible reasoning that
doesn't reflect what drove the output.

So reasoning is a strong DEBUGGING signal and a weak
JUSTIFICATION.

If an auditor asks why the system did something, "the model
said it was because X" is not the same as "the system did it
because X". In a regulated context that distinction matters,
and overclaiming it is a real risk.
```

**That honesty is the strongest thing to say here** — it's a genuine limitation that's often glossed over.

## 5. Why It Matters

- **It improves decision quality** by giving the model computation before committing.
- **It's the primary debugging artifact** for agent behaviour.
- **It's not a reliable justification**, which matters in regulated contexts.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Token cost** | Reasoning can exceed the action itself |
| **Latency** | More tokens generated before anything happens |
| **Post-hoc rationalization** | Stated reasoning may not be the real cause |
| **Reasoning accumulating in context** | Each step's thinking stays in history |
| **Exposing it to users** | Reveals internals and confuses more than helps |

**On context accumulation:** the agent's reasoning from every previous step stays in the conversation. By step eight there can be more reasoning than results. Summarizing or dropping older reasoning while keeping tool results is usually the right trade — results are facts, reasoning is process, and the process matters less once it's complete.

**On exposing reasoning to users:** internal reasoning shouldn't be shown to a banking customer. It exposes tool names and internal structure, it can be wrong in ways the final answer isn't, and it reads as uncertainty. Log it, don't display it.

## 7. Interview Answer

> "Reasoning is the model generating intermediate thinking before choosing an action — what it knows, what's missing, what to do about it.
>
> It genuinely helps rather than being decoration. The model produces one token at a time conditioned on everything before it, so reasoning tokens give it intermediate results to condition on — effectively more computation applied to the problem. A decision made after working through the situation is measurably better than one made immediately. Reasoning models like Gemini's thinking modes do this internally, trained for it rather than prompted into it.
>
> For an engineer the bigger value is debugging. If an agent calls the wrong tool, without stored reasoning all you see is 'step three called get_account_balance'. With reasoning you see it thought the customer mentioned a fee so it should check whether the balance was deducted — and now the failure is diagnosable. That's a prompt or tool-description problem, not a model-capability problem, and those have completely different fixes. Debugging an agent without stored reasoning is guesswork.
>
> The caveat I'd be honest about: stated reasoning isn't guaranteed to be the actual cause of the action. Models can produce plausible reasoning that doesn't reflect what drove the output. So it's a strong debugging signal and a weak justification. If an auditor asks why the system did something, 'the model said it was because X' isn't the same as 'the system did it because X'. In a regulated context that distinction matters and overclaiming it is a real risk.
>
> Two practical points. Reasoning accumulates — every step's thinking stays in the conversation, so by step eight there can be more reasoning than results. I'd summarize or drop older reasoning while keeping tool results, because results are facts and reasoning is process.
>
> And I wouldn't expose it to end users. It reveals tool names and internal structure, it can be wrong in ways the final answer isn't, and it reads as uncertainty to a customer. Log it, don't display it."

## 8. Likely Follow-ups

**Q: Why does generating reasoning improve results?**
Because the model conditions each token on everything before it, so reasoning tokens give it intermediate results to build on — effectively more computation applied to the problem before committing to an action. It's why chain-of-thought works, and reasoning models train for it rather than relying on prompting.

**Q: How does reasoning help debugging?**
It turns an opaque wrong action into a diagnosable one. Seeing that the model called a balance lookup because it thought the fee might have been deducted tells you it misunderstood the question — a prompt or tool-description issue. Without it you only know the wrong tool was called.

**Q: Can you trust the stated reasoning?**
As a debugging signal, largely yes. As a justification, no — models can produce plausible reasoning that doesn't reflect what actually drove the output. "The model said it was because X" isn't "the system did it because X," and in a regulated context that distinction matters.

**Q: Should reasoning be shown to users?**
No, for a customer-facing banking system. It exposes tool names and internal structure, it can be wrong in ways the final answer isn't, and it reads as uncertainty. It should be logged for debugging and audit, not displayed.

**Q: What do you do about reasoning accumulating in context?**
Summarize or drop older reasoning while keeping tool results in full. Results are facts the agent may still need; reasoning is process that matters less once the step is complete. That keeps context focused on what's actually load-bearing for the remaining decisions.

## 9. Common Mistakes

- Treating stated reasoning as a reliable causal explanation.
- Not logging reasoning, making agent failures undiagnosable.
- Showing internal reasoning to end users.
- Letting reasoning accumulate unbounded in context.
- Assuming a wrong action is a model limitation without reading the reasoning.

## 10. What to Remember

- **Reasoning tokens give the model computation** before it commits to an action.
- **It's the primary debugging artifact** — a wrong action becomes diagnosable.
- **Strong debugging signal, weak justification** — it may be post-hoc.
- **Drop old reasoning, keep tool results** — facts outlive process.
- **Log it, don't display it** to end users.
