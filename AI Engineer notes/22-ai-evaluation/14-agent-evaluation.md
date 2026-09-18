# Agent Evaluation

> **Phase 22 · AI EVALUATION · Topic 14**

## 1. Definition

Measuring an agent's behaviour across four dimensions — outcome, process, efficiency, and safety — where the execution path varies between runs and correctness can't be asserted as a fixed sequence.

> Agent-specific mechanics are in [17-ai-agents/20](../17-ai-agents/20-agent-evaluation.md). This topic is the evaluation methodology.

## 2. Simple Explanation

You can't test an agent by asserting an expected sequence of steps, because several sequences can be correct.

So you assert invariants — properties that must hold on any valid path — and measure outcomes statistically across repeated runs.

## 3. How It Works

```
FOUR DIMENSIONS, measured separately

OUTCOME     did it reach a correct answer?
PROCESS     right tools, sensible order, no wasted steps
EFFICIENCY  steps, tokens, latency, cost per task
SAFETY      stayed in scope, in budget, within permissions

Collapsing these into one number hides which is failing —
and a correct outcome with a safety violation is
unshippable regardless of the score.
```

**The four are independent.** A high outcome score with poor efficiency is a cost problem; a good process with a wrong outcome is a tool or data problem.

## 4. Practical Example

**Invariants rather than trajectories:**

```
DON'T assert:
  step 1 = get_transaction
  step 2 = get_customer_tier
  step 3 = get_fee_schedule

The agent could legitimately fetch tier before transaction.
Both are correct. The assertion fails one of them, the test
becomes brittle, and brittle tests get disabled.

DO assert invariants:
  · get_customer_tier was called before answering about a
    tier-dependent fee
  · no write tool on a read-only request
  · no tool called with an account outside the session
  · tool call count within budget
  · abstained when facts couldn't be established

Stable across any valid path, and they're the failures with
consequences.
```

**Component evaluation, which localizes the failure:**

```
TOOL SELECTION      labelled queries → correct tool chosen?
ARGUMENT ACCURACY   given the right tool, right arguments?
TERMINATION         stopped at the right time — not early,
                    not looping?
END-TO-END          correct final answer?

If end-to-end is 70%, the component scores say where the
30% went. A single number says only that something is wrong.

Tool selection is usually the largest contributor, and
it's usually a docstring problem rather than a model one.
```

**Non-determinism, handled properly:**

```
Run each case 3-5 times. Report a PASS RATE.

A case passing 3 of 5 is a reliability finding, not a flaky
test. Re-running until green is how unreliable agents ship.

And for safety invariants specifically, take the WORST
result rather than the average — one permission violation
in five runs is a failure, not an 80% pass.
```

## 5. Why It Matters

- **Invariants are stable across valid paths**; trajectory assertions aren't.
- **Component evaluation localizes** what an end-to-end score only detects.
- **Worst-case aggregation for safety**, pass-rate for quality — different rules.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Exact trajectory assertions** | Brittle; tests get disabled |
| **One combined score** | Hides which dimension failed |
| **Single run per case** | Non-determinism unmeasured |
| **Averaging safety results** | One violation in five isn't 80% |
| **No efficiency metrics** | Correct but unaffordable |
| **Eval set from imagination** | Doesn't match real task distribution |

**On efficiency as a dimension:** an agent that reaches the right answer in twelve steps when three would do is a correct system nobody can afford. Steps, tokens, latency, and cost per task belong in the evaluation alongside correctness, because a change that improves accuracy while tripling cost is not obviously an improvement and the metric should say so.

**On what invariants to choose:** the ones worth asserting are safety properties rather than preferences — required lookups before consequential answers, no writes on read-only requests, no out-of-session accounts, budgets held, abstention when appropriate. Asserting stylistic preferences as invariants recreates the brittleness that trajectory assertions had.

## 7. Interview Answer

> "Agent evaluation differs from single-call evaluation because the execution path varies and several sequences can be correct. So I'd measure four dimensions separately — outcome, process, efficiency, and safety — because collapsing them hides which is failing, and a correct outcome with a safety violation is unshippable regardless of the score.
>
> On process, the methodological point is asserting invariants rather than trajectories. Don't assert that step one is get_transaction and step two is get_customer_tier — the agent could legitimately fetch tier first, both are correct, and the assertion fails one of them. Brittle tests get disabled, which leaves you worse off than having none.
>
> Instead assert properties that hold on any valid path: the tier lookup happened before answering a tier-dependent fee question, no write tool on a read-only request, no tool called with an account outside the session, tool count within budget, and abstention when facts couldn't be established. Those are stable across valid paths and they're the failures with actual consequences. And I'd choose safety properties rather than stylistic preferences — asserting preferences as invariants just recreates the brittleness.
>
> For localizing failures, I'd evaluate components separately: tool selection against labelled queries, argument accuracy given the right tool, termination behaviour, then end-to-end. If end-to-end is seventy percent, the component scores say where the thirty went. Tool selection is usually the largest contributor, and it's usually a docstring problem rather than a model one — which you'd never learn from an end-to-end number.
>
> On non-determinism, run each case three to five times and report a pass rate. A case passing three of five is a reliability finding, not a flaky test — re-running until green is how unreliable agents ship.
>
> But the aggregation differs by dimension, and this is worth being precise about. For quality, a pass rate is meaningful. For safety invariants, take the worst result — one permission violation in five runs is a failure, not an eighty percent pass. Averaging a safety result is how a real violation gets reported as a good score.
>
> And I'd include efficiency as a first-class dimension. An agent reaching the right answer in twelve steps when three would do is a correct system nobody can afford. Steps, tokens, latency, and cost per task belong alongside correctness, because a change improving accuracy while tripling cost isn't obviously an improvement and the metric should say so."

## 8. Likely Follow-ups

**Q: Why not assert the tool sequence?**
Because several orderings can be correct — fetching tier before or after the transaction are both valid. An exact assertion fails legitimate behaviour, the tests become brittle, and brittle tests get disabled, which leaves you with no coverage at all.

**Q: What should you assert instead?**
Invariants that hold on any valid path, and specifically safety properties: a required lookup before a consequential answer, no writes on read-only requests, no out-of-session accounts, budgets held, abstention when facts couldn't be established. Not stylistic preferences, which reintroduce brittleness.

**Q: How do you localize a failure?**
Component evaluation — tool selection, argument accuracy, termination, then end-to-end. An end-to-end score detects a problem; component scores say which stage lost the accuracy. Tool selection is usually the largest contributor and usually a docstring issue.

**Q: How do you aggregate across repeated runs?**
Differently by dimension. Quality gets a pass rate across three to five runs. Safety invariants take the worst result — one permission violation in five runs is a failure, not an eighty percent pass. Averaging a safety result reports a real violation as a good score.

**Q: Why include efficiency?**
Because an agent reaching the right answer in twelve steps when three would do is correct and unaffordable. A change that improves accuracy while tripling cost isn't obviously an improvement, and without efficiency in the evaluation the metric can't say that.

## 9. Common Mistakes

- Asserting exact tool sequences as a correctness gate.
- Reporting a single combined score across dimensions.
- Averaging safety results across runs.
- Omitting cost and latency from the evaluation.
- Asserting stylistic preferences as invariants.

## 10. What to Remember

- **Four dimensions measured separately:** outcome, process, efficiency, safety.
- **Invariants, not trajectories** — and safety properties, not preferences.
- **Component evaluation localizes** what end-to-end only detects.
- **Pass rate for quality; worst case for safety.**
- **Efficiency is a dimension** — correct and unaffordable is still a failure.
