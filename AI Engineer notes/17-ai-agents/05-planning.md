# Planning

> **Phase 17 · AI AGENTS · Topic 05**

## 1. Definition

Having the agent produce an explicit sequence of steps before acting, rather than deciding one action at a time. It trades an upfront LLM call for better structure on multi-step tasks.

## 2. Simple Explanation

Without planning, an agent picks the next action based on what it sees now. That works for short tasks and drifts on long ones.

With planning, it first writes down what it intends to do, then works through that list. The plan keeps the original goal visible as the context fills up with intermediate results.

## 3. How It Works

```
PLAN-THEN-EXECUTE
  1. LLM produces a numbered plan
  2. Execute each step in order
  3. Optionally re-plan if a step fails or surprises

REACT (interleaved)
  Think → Act → Observe → Think → ...
  No separate plan; reasoning happens per step

PLAN-AND-SOLVE
  Plan, execute, then re-plan with what was learned
  — a middle ground
```

| | Plan-then-execute | ReAct |
|---|---|---|
| Structure | High | Low |
| Adapts to surprises | Poorly | Well |
| Token cost | Lower per step | Higher per step |
| Goal drift | Low | Higher |

## 4. Practical Example

**A plan for a real task:**

```
"Why was this customer charged $45 on their international
 transfer?"

PLAN
  1. Get the customer's account tier
  2. Get the transaction details and fee charged
  3. Get the fee schedule for that tier
  4. Count prior waived transfers this calendar month
  5. Compare expected vs actual; report the discrepancy

Steps 1-4 are INDEPENDENT — they can run in parallel.
Step 5 depends on all of them.

That's a real benefit of explicit planning: dependency
structure becomes visible, so independent steps can be
executed concurrently. A one-step-at-a-time agent runs them
sequentially because it never sees them together.
```

**The parallelism point is the strongest practical argument for planning**, and it's often missed — the usual arguments are about goal drift, but the latency win is concrete and measurable.

**Where plans fail:**

```
· The plan is made with INCOMPLETE information — step 3
  might be unnecessary once step 1's result is known
· Rigid execution continues down a plan invalidated at step 2
· Plans for unfamiliar tasks are often wrong, and a confident
  wrong plan is worse than no plan

Mitigation: re-plan when a step's result contradicts the
plan's assumptions, with a cap on re-planning cycles.
```

## 5. Why It Matters

- **Planning exposes dependency structure**, which enables parallel execution.
- **It reduces goal drift** on long tasks where context fills with intermediate noise.
- **A confident wrong plan is worse than no plan**, which is the real risk.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Upfront cost** | An extra LLM call before any work happens |
| **Plans made without information** | Steps that turn out unnecessary or wrong |
| **Rigid execution** | Following an invalidated plan |
| **Re-planning loops** | Re-planning repeatedly without progress |
| **Over-planning simple tasks** | Two calls to answer a one-call question |

**On when planning isn't worth it:** for tasks under about three steps, planning costs more than it saves. The agent would have gotten there anyway, and the plan call is pure overhead. Planning pays off on longer tasks where drift and sequencing matter — which means it's reasonable to plan conditionally, based on a quick assessment of task complexity.

**On plan quality:** the plan is only as good as the model's understanding of the available tools. A plan that references a capability you don't have is worse than useless, so the tool descriptions in the planning prompt matter as much as the planning prompt itself.

## 7. Interview Answer

> "Planning means having the agent produce an explicit sequence of steps before acting, rather than deciding one action at a time. The alternative is ReAct-style interleaving — think, act, observe, repeat — where reasoning happens per step with no separate plan.
>
> Planning's usual justification is reducing goal drift: on a long task, context fills with intermediate results and the model can lose sight of what it was asked. An explicit plan keeps the goal visible.
>
> But the strongest practical argument is parallelism, and it's often missed. If the agent plans 'get the customer's tier, get the transaction, get the fee schedule, count prior waivers, then compare' — the first four steps are independent and can run concurrently. A one-step-at-a-time agent runs them sequentially because it never sees them together. That's a concrete, measurable latency win rather than a soft benefit.
>
> The real risk is that a confident wrong plan is worse than no plan. Plans get made with incomplete information — step three might be unnecessary once step one's result is known — and rigid execution keeps going down a plan that was invalidated at step two. The mitigation is re-planning when a result contradicts the plan's assumptions, with a cap on re-planning cycles so it doesn't loop.
>
> On when not to plan: for tasks under about three steps it costs more than it saves. The agent would have got there anyway and the planning call is pure overhead. So planning conditionally — a quick assessment of complexity first — is often better than always planning or never planning.
>
> One thing that determines plan quality more than the planning prompt itself: the tool descriptions. A plan that references a capability you don't have is worse than useless, so the descriptions the model sees when planning matter enormously."

## 8. Likely Follow-ups

**Q: Planning or ReAct?**
Planning for longer, structured tasks where goal drift and sequencing matter, and where independent steps can be parallelized. ReAct for shorter or more exploratory tasks where each step's result genuinely determines the next. Plan-and-solve — plan, execute, re-plan with what was learned — is the middle ground.

**Q: What's the biggest benefit of explicit planning?**
Usually cited as reduced goal drift, but the concrete one is parallelism. A plan makes dependency structure visible, so independent steps can run concurrently instead of sequentially. That's a measurable latency reduction rather than a qualitative improvement.

**Q: What's the risk?**
A confident wrong plan. Plans are made with incomplete information, so a step may be unnecessary or wrong once earlier results arrive, and rigid execution follows an invalidated plan to the end. Re-planning on contradiction — with a cycle cap — is the mitigation.

**Q: When shouldn't you plan?**
On tasks of about three steps or fewer, where the planning call costs more than it saves and the agent would have reached the same place anyway. Assessing complexity first and planning conditionally is usually better than a fixed policy either way.

**Q: What determines plan quality?**
The tool descriptions more than the planning prompt. The model can only plan around capabilities it knows about and understands, so vague or inaccurate tool descriptions produce plans referencing things the system can't do — which is worse than not planning at all.

## 9. Common Mistakes

- Planning every task regardless of complexity.
- Executing a plan rigidly after its assumptions are contradicted.
- Not exploiting the parallelism that a plan exposes.
- Re-planning without a cycle cap.
- Blaming the planning prompt when tool descriptions are the problem.

## 10. What to Remember

- **Plan-then-execute vs ReAct** — structure versus adaptability.
- **Plans expose dependencies**, enabling parallel execution — the concrete win.
- **A confident wrong plan is worse than none**; re-plan on contradiction.
- **Don't plan tasks under ~3 steps** — the call is pure overhead.
- **Tool descriptions determine plan quality** more than the planning prompt.
