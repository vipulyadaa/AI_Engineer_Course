# Agent Observability

> **Phase 17 · AI AGENTS · Topic 22**

## 1. Definition

Capturing enough of an agent's execution to understand what it did and why, after the fact. Without it, agent failures are not debuggable — the path varies per request and can't be reproduced by re-running.

## 2. Simple Explanation

When a deterministic function misbehaves, you re-run it with the same input and watch. An agent can take a different path on the same input, so that doesn't work.

The only way to understand a failure is to have recorded what the model saw and decided at each step, at the time.

## 3. How It Works

**What to capture per step:**

```
trace_id, session_id, user_id, step_number
model + version + temperature
prompt tokens / completion tokens / cost
the model's reasoning
tool name + arguments
tool result (truncated, with full result stored by reference)
tool latency, step latency
errors
state snapshot (or a diff)
```

**And per run:** total steps, total tokens and cost, end-to-end latency, termination reason, final answer, whether it abstained or escalated.

**Termination reason is the highest-value single field.** "Completed" versus "step limit" versus "budget exceeded" versus "tool failure" partitions your failures immediately, and most systems don't record it.

## 4. Practical Example

**A debugging session, concretely:**

```
COMPLAINT  "It told me my fee would be $45 but I'm Premier."

WITH observability:
  step 1  get_customer_tier → "Premier"          ✓
  step 2  reasoning: "Premier customers... let me check the
          standard schedule"
          get_fee_schedule(tier="standard")      ← the bug
  step 3  answered $45 from the standard schedule

ROOT CAUSE  the agent passed tier="standard" despite having
            retrieved "Premier" — an argument construction
            failure, not retrieval and not the model's
            knowledge.

FIX  parameter description clarifying the tier must come from
     the lookup, plus a code-level check that the tier
     argument matches state.

Without step-level capture, all you have is a wrong answer
and a guess.
```

**What makes this tractable operationally:**

```
1. TRACE ID everywhere — one ID linking every step, tool
   call, and downstream service call for a run
2. SAMPLING — full capture on all failures and abstentions,
   sampled on successes, because full capture on everything
   is expensive at volume
3. STRUCTURED, not prose logs — you need to query
   "all runs where step > 8" or "all runs calling tool X
   with a mismatched tier"
4. PII HANDLING — traces contain customer data, so they
   need the same retention, access control, and deletion
   as any other customer data store
```

**Point 4 is the one that gets missed.** A trace store holding conversation content and account details is a customer data store, and treating it as "just logs" is a compliance gap.

## 5. Why It Matters

- **Agent failures aren't reproducible** by re-running, so recording is the only option.
- **Termination reason** partitions failures immediately and is usually absent.
- **Traces are customer data** and need the corresponding controls.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Logging only the final answer** | Failures undiagnosable |
| **Prose logs** | Can't be queried or aggregated |
| **No trace ID** | Steps can't be correlated |
| **Full capture at volume** | Expensive; needs sampling |
| **PII in traces unmanaged** | A compliance gap |
| **No termination reason** | Failure classes indistinguishable |

**On what to alert on:** rising step counts per task, a rising rate of step-limit terminations, a rising abstention rate, cost per task drifting up, and any safety-invariant violation. Those are leading indicators — they move before user complaints do, which is the point of having them.

**On cost attribution:** recording tokens and cost per step makes it possible to say which tools and which query types are expensive. That's what turns cost optimization from guesswork into targeting, and it's nearly free to capture at the point you're already logging.

## 7. Interview Answer

> "With a deterministic function you debug by re-running it with the same input. An agent can take a different path on the same input, so that doesn't work — the only way to understand a failure is to have recorded what the model saw and decided at each step, at the time.
>
> Per step I'd capture the trace and session and user IDs, step number, model and version, tokens and cost, the model's reasoning, the tool name and arguments, a truncated result with the full one stored by reference, latencies, errors, and a state snapshot. Per run: total steps, total cost, end-to-end latency, the final answer, and the termination reason.
>
> Termination reason is the highest-value single field and most systems don't record it. 'Completed' versus 'step limit' versus 'budget exceeded' versus 'tool failure' partitions your failures immediately, before you look at anything else.
>
> Concretely, if a customer complains the system quoted forty-five dollars when they're Premier: with step-level capture I can see step one retrieved 'Premier' correctly, and step two called the fee schedule with tier equals standard anyway. That's an argument construction failure — not retrieval, not the model's knowledge. The fix is a clearer parameter description plus a code-level check that the tier argument matches state. Without step-level capture I'd have a wrong answer and a guess.
>
> Operationally, four things. A trace ID linking every step and downstream service call. Sampling — full capture on all failures and abstentions, sampled on successes, because full capture at volume is expensive. Structured logs rather than prose, so I can query 'all runs exceeding eight steps' or 'all runs where the tier argument didn't match state'. And PII handling.
>
> That last one gets missed. A trace store holding conversation content and account details is a customer data store — it needs the same retention policy, access control, and deletion path as any other. Treating it as 'just logs' is a compliance gap.
>
> For alerting I'd watch leading indicators: rising step counts per task, rising step-limit terminations, rising abstention rate, cost per task drifting up, and any safety-invariant violation. Those move before user complaints do."

## 8. Likely Follow-ups

**Q: Why can't you debug agents by re-running?**
Because the path varies on the same input, so a re-run may not reproduce the failure at all. The execution has to be recorded as it happens — what the model saw, what it reasoned, which tool it chose with what arguments, and what came back.

**Q: What's the most valuable thing to log?**
The termination reason. Distinguishing completed, step limit, budget exceeded, and tool failure partitions your failures immediately. It's one field, it's cheap, and most systems don't capture it — so they can't tell a runaway loop from a broken dependency without reading traces.

**Q: How do you keep observability affordable?**
Sampling. Full capture on every failure and abstention, sampled capture on successes, and store large tool results by reference rather than inline. That keeps the expensive cases fully visible while bounding the cost of the common path.

**Q: What would you alert on?**
Leading indicators — rising average step count per task, rising step-limit terminations, rising abstention rate, cost per task drifting upward, and any safety-invariant violation. Those move before users complain, which is the whole point of monitoring them.

**Q: What's the compliance consideration?**
Traces contain conversation content and customer data, so the trace store is a customer data store. It needs the same retention limits, access controls, and deletion path as any other — treating it as ordinary application logs is a real compliance gap.

## 9. Common Mistakes

- Logging only the final answer.
- Writing prose logs that can't be queried or aggregated.
- Not recording the termination reason.
- Capturing everything at full fidelity and then disabling it for cost.
- Exempting traces from data retention and deletion policies.

## 10. What to Remember

- **Agent failures aren't reproducible** — capture at execution time or lose them.
- **Log per step:** reasoning, tool, arguments, result, tokens, latency, state.
- **Termination reason** is the single highest-value field.
- **Sample successes, capture all failures**; store big results by reference.
- **Traces are customer data** — retention, access control, deletion apply.
