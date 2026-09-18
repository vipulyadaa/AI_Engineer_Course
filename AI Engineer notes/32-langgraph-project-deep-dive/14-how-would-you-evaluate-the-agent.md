# "How Would You Evaluate the Agent?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 14**

## 1. Definition

A design question about evaluating a system with a non-enumerable path space. The key distinction is between evaluating the *outcome* and evaluating the *trajectory* — and both are needed for different reasons.

## 2. Simple Explanation

For a fixed workflow you can test every path. For an agent you can't, because the model chooses the path.

So evaluation shifts to: did it reach the right outcome, and did it get there sensibly? An agent that produces the right answer after eleven wasteful steps is a problem that outcome-only evaluation will never report.

## 3. How It Works

```
FOUR LAYERS

1. OUTCOME       did it produce the right final answer
                 the primary metric; everything else is
                 diagnosis

2. TRAJECTORY    did it take a sensible path
                 step count, tool selection, redundant
                 calls, loops

3. STEP          was each individual tool call correct
                 arguments valid, right tool for the
                 sub-goal

4. COST          tokens and steps per successful outcome
                 ← the metric that catches a degradation
                   outcome scores won't show
```

**Outcome alone is insufficient**, because an agent can be right and wasteful, and waste is how agent systems degrade before they fail.

## 4. Practical Example

**Why trajectory evaluation is not optional:**

```
Two runs, same correct answer:

  RUN A  retrieve → answer                  2 steps
  RUN B  retrieve → retrieve same thing →
         retrieve unrelated topic →
         retrieve original again → answer   5 steps

Outcome evaluation scores both 1.0.

But B costs 2.5× as much, takes 2.5× as long, and is one
bad model day away from not terminating.

Trajectory metrics — step count distribution, repeated
calls with identical arguments, tools invoked per run —
are what make B visible. And a rising step-count mean is
usually the first sign of a regression, before outcome
scores move at all.
```

**Building the scenario set:**

```
Not a golden set of question-and-answer pairs — a set of
SCENARIOS with expected outcomes and acceptable
trajectories.

  SIMPLE       single retrieval, expect ≤2 steps
  MULTI-PART   two topics, expect 2 retrievals, one
               synthesis
  COMPARISON   per-tier retrieval then comparison
  AMBIGUOUS    expect a clarifying question, NOT an
               answer
  UNANSWERABLE expect abstention, and expect it EARLY —
               an agent that takes eight steps to
               conclude it can't answer is failing
               expensively
  ADVERSARIAL  injected instructions in retrieved
               content; expect the tool sequence to be
               unchanged

The last two are the ones that distinguish a real
evaluation design. Most people only test the happy path.
```

**Assertions that work on a non-deterministic path:**

```
You can't assert an exact sequence. You CAN assert
properties:

  · never called a tool outside the allowlist
  · never exceeded N steps
  · no two identical consecutive calls
  · terminated (didn't hit the step limit)
  · for unanswerable inputs, abstained within N steps
  · for adversarial inputs, the tool sequence matched
    the clean-input baseline

Those are deterministic assertions about a
non-deterministic system, and they're the backbone of
the suite.
```

**On run-to-run variance:** an agent is more variable than a fixed workflow, because path choice varies as well as wording. So the same scenario must be run several times and evaluated as a distribution — success rate across N runs, not pass/fail on one. A scenario that succeeds four times out of five is materially different from one that always succeeds, and single-run evaluation cannot tell them apart.

## 5. Why It Matters

- **Outcome alone hides waste** — right answer, five steps, 2.5× cost.
- **Step-count drift is the early regression signal.**
- **Assert properties**, not sequences — deterministic checks on a variable system.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Outcome-only evaluation | Wasteful and near-looping runs score perfectly |
| Asserting an exact tool sequence | Fails constantly; gets disabled |
| Running each scenario once | Can't distinguish 100% from 80% success |
| No unanswerable scenarios | Expensive late abstention goes unmeasured |
| No adversarial scenarios | Injection resistance is untested |
| No cost-per-success metric | Degradation is invisible until the invoice |

**On cost per successful outcome:** it's the single most informative agent metric, because it combines correctness and efficiency. A change that raises success from 88% to 90% while doubling steps per run is usually a bad trade, and only this metric shows both halves at once.

**On what carries over from workflow evaluation:** the underlying quality metrics don't change — groundedness, completeness, citation validity still apply to the final answer. Agent evaluation adds trajectory on top; it doesn't replace the answer-quality layer, and forgetting that leaves a system with a well-behaved path producing badly grounded answers.

## 7. Interview Answer

> "The thing that changes is that the path space stops being enumerable. For a fixed workflow I can test every route; for an agent the model chooses the route, so evaluation shifts to outcomes and trajectories.
>
> I'd run four layers. Outcome — did it produce the right final answer, which is the primary metric. Trajectory — did it get there sensibly. Step-level — was each individual tool call correct. And cost per successful outcome.
>
> The layer I'd emphasize is trajectory, because outcome alone is insufficient in a way that matters. Take two runs that both produce the correct answer: one retrieves once and answers, the other retrieves the same thing twice, retrieves an unrelated topic, retrieves the original again, and then answers. Outcome evaluation scores both perfectly. But the second costs two and a half times as much, takes two and a half times as long, and is one bad model day away from not terminating.
>
> And a rising mean step count is usually the first sign of a regression — it moves before outcome scores do, which makes it the early warning.
>
> On the evaluation set: not question-and-answer pairs, but scenarios with an expected outcome and an acceptable trajectory. Simple questions expecting at most two steps. Multi-part questions expecting two retrievals and a synthesis. Comparisons. Ambiguous questions where the expected behaviour is a clarifying question rather than an answer.
>
> Then two categories that I think distinguish a real evaluation design. Unanswerable questions, where I'd expect abstention and expect it early — an agent that takes eight steps to conclude it can't answer is failing expensively, and outcome evaluation marks it correct. And adversarial scenarios with injected instructions in retrieved content, where the assertion is that the tool sequence is unchanged from the clean-input baseline. Most evaluation suites only cover the happy path.
>
> On how to assert against a non-deterministic path — you can't assert an exact sequence, but you can assert properties. Never called a tool outside the allowlist. Never exceeded N steps. No two identical consecutive calls. Terminated rather than hitting the step limit. Abstained within N steps on unanswerable input. Those are deterministic assertions about a non-deterministic system, and they're the backbone of the suite.
>
> One methodological point: an agent varies more than a fixed workflow, because the path varies as well as the wording. So each scenario runs several times and is scored as a success rate across runs rather than pass or fail on one. A scenario that succeeds four times in five is materially different from one that always succeeds, and single-run evaluation can't tell them apart.
>
> The metric I'd watch most closely is cost per successful outcome, because it combines both halves. A change that raises success from eighty-eight to ninety percent while doubling steps per run is usually a bad trade, and that's the only metric that shows it.
>
> And I'd keep the answer-quality layer — groundedness, completeness, citation validity still apply to the final answer. Trajectory evaluation sits on top of that rather than replacing it. Otherwise you end up with a well-behaved path producing badly grounded answers."

## 8. Likely Follow-ups

**Q: Why isn't outcome evaluation enough?**
Because an agent can be right and wasteful. Five redundant steps to a correct answer scores 1.0 on outcome while costing 2.5× and sitting close to not terminating. Trajectory metrics are what make that visible.

**Q: How do you assert on a non-deterministic path?**
By asserting properties rather than sequences: no tools outside the allowlist, no identical consecutive calls, bounded steps, terminated, abstained early on unanswerable input. Deterministic checks on a variable system.

**Q: What's the earliest regression signal?**
A rising mean step count. It moves before outcome scores do, because the agent starts taking longer routes to the same answers before it starts getting them wrong.

**Q: How many times do you run each scenario?**
Several, scored as a success rate. Path choice varies as well as wording, so a single run can't distinguish a scenario that always works from one that works four times in five.

**Q: What's the most informative single metric?**
Cost per successful outcome, because it combines correctness and efficiency. It catches the change that improves success slightly while doubling the work, which either metric alone would call a win.

## 9. Common Mistakes

- Evaluating outcomes only.
- Asserting exact tool sequences.
- Running each scenario once.
- No unanswerable or adversarial scenarios.
- Dropping answer-quality metrics once trajectory metrics exist.

## 10. What to Remember

- **Outcome plus trajectory** — right-but-wasteful is a failure.
- **Step-count drift is the early warning.**
- **Assert properties, not sequences.**
- **Run scenarios N times** and score the distribution.
- **Cost per successful outcome** is the metric that shows both halves.
