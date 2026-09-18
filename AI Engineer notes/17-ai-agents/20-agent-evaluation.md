# Agent Evaluation

> **Phase 17 · AI AGENTS · Topic 20**

## 1. Definition

Measuring whether an agent does the right thing, at acceptable cost, reliably. Harder than evaluating a single LLM call because the execution path varies and correctness has several independent dimensions.

## 2. Simple Explanation

You can't test an agent by comparing output to an expected string, because it can reach a correct answer by several different routes.

So evaluation has to measure outcomes and behaviour separately: did it get the right answer, did it take a sensible path, did it stay in budget, did it stay within its permissions.

## 3. How It Works

**Four dimensions, measured independently:**

| Dimension | Metric |
|---|---|
| **Outcome** | Did it reach a correct answer? |
| **Process** | Right tools, sensible order, no wasted steps |
| **Efficiency** | Steps, tokens, latency, cost per task |
| **Safety** | Stayed in scope, in budget, within permissions |

```
A high outcome score with poor efficiency is a cost problem.
A good process with a wrong outcome is a tool or data problem.
A good outcome with a safety violation is unshippable.

Collapsing these into one number hides which is which.
```

## 4. Practical Example

**Evaluating components separately is what makes debugging tractable:**

```
1. TOOL SELECTION      labelled queries → correct tool?
                       Isolates the most common failure.
2. ARGUMENT ACCURACY   given the right tool, right arguments?
3. TERMINATION         did it stop at the right time —
                       neither early nor looping?
4. END-TO-END          correct final answer?

If end-to-end is 70%, component scores tell you WHERE the
30% is going. A single end-to-end number tells you only
that something is wrong.
```

**Trajectory evaluation, done sensibly:**

```
DON'T assert an exact tool sequence — there are several valid
paths and the test becomes brittle immediately.

DO assert INVARIANTS:
  · get_customer_tier was called before answering about fees
  · no write tool was called on a read-only request
  · no tool was called with another customer's ID
  · step count stayed under the budget
  · the agent abstained when facts couldn't be established

Invariants are stable across valid paths and catch the
failures that actually matter.
```

**Non-determinism in evaluation:**

```
The same input can take different paths, so a single run is
weak evidence.

  · run each case N times (3-5)
  · report pass rate, not pass/fail
  · a case passing 3 of 5 times is a RELIABILITY finding,
    not a flaky test to be re-run until green

Treating variance as noise is how unreliable agents ship.
```

## 5. Why It Matters

- **Agents fail in more ways** than single calls, so evaluation needs more dimensions.
- **Component evaluation localizes failures** that end-to-end scores only detect.
- **Variance is a finding, not noise** — pass rates over repeated runs are the honest metric.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Asserting exact trajectories** | Brittle; many valid paths exist |
| **Single end-to-end number** | Detects problems, doesn't locate them |
| **One run per case** | Non-determinism unmeasured |
| **No cost or latency metrics** | Correct but unaffordable |
| **No safety assertions** | Permission violations undetected |
| **Test set from imagination** | Doesn't match real query distribution |

**On the eval set:** build it from real queries where possible — sampled production traffic, historical support tickets, actual customer questions. An imagined test set systematically misses the phrasings, ambiguities, and edge cases that occur in practice, and it tends to be easier than reality in ways that flatter the system.

**On LLM-as-judge for outcomes:** for open-ended answers, a judge model scoring against a rubric with the retrieved context available is workable, but it needs calibrating against human labels on a sample before being trusted. An uncalibrated judge produces confident numbers that may not track quality at all.

## 7. Interview Answer

> "Agent evaluation is harder than evaluating a single call because the path varies and correctness has several independent dimensions. I'd measure four separately: outcome, whether it reached a correct answer; process, whether it used the right tools in a sensible order; efficiency, steps and tokens and latency and cost; and safety, whether it stayed in scope, in budget, and within permissions. Collapsing those into one number hides which is failing — a good outcome with a safety violation is unshippable regardless of the score.
>
> The thing that makes debugging tractable is evaluating components separately. Tool selection against labelled queries, argument accuracy given the right tool, termination behaviour, then end-to-end. If end-to-end is seventy percent, the component scores tell you where the thirty is going; a single end-to-end number only tells you something is wrong.
>
> On trajectories, I would not assert an exact tool sequence — there are several valid paths and the test becomes brittle immediately. I'd assert invariants instead: the tier lookup happened before answering about fees, no write tool was called on a read-only request, no tool was called with another customer's ID, the step budget held, the agent abstained when facts couldn't be established. Invariants are stable across valid paths and catch the failures that actually matter.
>
> Non-determinism is the part people handle badly. The same input can take different paths, so one run is weak evidence. I'd run each case three to five times and report a pass rate rather than pass or fail. A case passing three times out of five is a reliability finding, not a flaky test to re-run until it goes green — treating variance as noise is how unreliable agents ship.
>
> On the eval set, I'd build it from real queries — sampled production traffic or historical support tickets — because an imagined test set misses the phrasings and ambiguities that actually occur, and it's usually easier than reality in ways that flatter the system.
>
> And if I used an LLM judge for open-ended outcomes, I'd calibrate it against human labels on a sample first. An uncalibrated judge produces confident numbers that may not track quality at all."

## 8. Likely Follow-ups

**Q: What dimensions do you measure?**
Outcome, process, efficiency, and safety — separately. A correct answer reached expensively is a cost problem; a good process with a wrong answer is a tool or data problem; a correct answer with a permission violation is unshippable. One combined number obscures all of that.

**Q: How do you evaluate the execution path?**
With invariants rather than exact sequences. Assert that a required lookup happened before the answer, that no write tool was used on a read-only request, that no other customer's identifier appeared, that budgets held. Those are stable across the several valid paths an agent might take.

**Q: How do you handle non-determinism?**
Run each case several times and report a pass rate rather than a binary result. A case passing three of five runs is a reliability finding worth acting on, not a flaky test. Re-running until green is how genuinely unreliable behaviour reaches production.

**Q: Why evaluate components separately?**
Because it localizes failure. An end-to-end score tells you something is wrong; tool selection, argument accuracy, and termination scores tell you which stage is losing the accuracy. Selection in particular is the most common failure, and it's cheap to measure in isolation.

**Q: Where does the eval set come from?**
Real queries — sampled production traffic, historical support tickets, actual customer questions. Imagined test sets miss the phrasings and ambiguities that occur in practice and tend to be systematically easier than reality, which produces reassuring numbers that don't hold up.

## 9. Common Mistakes

- Asserting exact tool-call sequences in tests.
- Reporting a single end-to-end score with no component breakdown.
- Running each case once and treating variance as flakiness.
- Omitting cost and latency from evaluation entirely.
- Using an uncalibrated LLM judge as ground truth.

## 10. What to Remember

- **Four dimensions:** outcome, process, efficiency, safety — measured separately.
- **Assert invariants, not exact trajectories.**
- **Run each case N times; report pass rates.** Variance is a finding.
- **Evaluate components separately** to localize failures.
- **Build the eval set from real queries**, and calibrate any LLM judge.
