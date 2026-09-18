# Agent Evaluation (ADK)

> **Phase 21 · GOOGLE ADK · Topic 12**

## 1. Definition

ADK's evaluation support — test files defining expected tool trajectories and responses, runnable from the CLI or in CI — combined with Vertex AI's evaluation metrics for answer quality.

## 2. Simple Explanation

ADK lets you write test cases with an expected sequence of tool calls and an expected response, then run them.

That's useful and it's also where the biggest methodological trap lives: asserting an exact tool sequence makes tests brittle, because several paths can be correct.

## 3. How It Works

```json
{
  "query": "Why was I charged $45 on my international transfer?",
  "expected_tool_use": [
    {"tool_name": "get_transaction",   "tool_input": {...}},
    {"tool_name": "get_customer_tier", "tool_input": {...}},
    {"tool_name": "get_fee_schedule",  "tool_input": {...}}
  ],
  "reference": "You were charged the retail rate of $45.00, but as a
                Premier customer the rate is $25.00..."
}
```

**Run from the CLI or in CI**, producing a pass/fail per case with trajectory and response comparison.

## 4. Practical Example

**The brittleness problem, and how to handle it:**

```
The agent could legitimately fetch the tier before the
transaction. Both orders are correct. An exact-sequence
assertion fails one of them.

So I'd use expected_tool_use as a SIGNAL rather than a
hard gate, and assert invariants separately:

  · get_customer_tier WAS called before answering about
    tier-dependent fees
  · no write tool was called on a read-only request
  · no tool was called with an account outside the session
  · the tool call count stayed under budget
  · the agent abstained when facts couldn't be established

Invariants are stable across valid paths and catch the
failures that actually matter.
```

**That distinction is the substantive point** — trajectory tests are useful for detecting change, not for defining correctness.

**Combining with Vertex AI evaluation:**

```
ADK EVAL          did it use the right tools, roughly the
                  right path, and produce a reasonable response
VERTEX AI EVAL    groundedness, answer correctness, per-claim
                  citation support

Together: ADK covers process, Vertex AI covers output
quality. Neither alone is sufficient — a correct trajectory
can still produce an ungrounded answer.
```

**Non-determinism:**

```
The same input can take different paths, so one run is weak
evidence. Each case should run three to five times with a
pass rate reported.

A case passing three of five times is a reliability finding,
not a flaky test to re-run until green. Treating variance as
noise is how unreliable agents ship.
```

**Where the eval set comes from:** real queries — production traffic and support tickets — in production proportions, including cases where the correct behaviour is abstention. An invented set is systematically easier than reality.

## 5. Why It Matters

- **Exact trajectory assertions are brittle** — invariants are the stable alternative.
- **ADK eval covers process; Vertex AI eval covers output quality.** Both are needed.
- **Variance across runs is a finding**, not test flakiness.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Exact sequence assertions** | Fail on legitimate alternative paths |
| **Trajectory only** | A correct path can produce a bad answer |
| **One run per case** | Non-determinism unmeasured |
| **Invented eval set** | Easier than reality |
| **No abstention cases** | Over-answering undetected |
| **Not gating CI** | A report nobody acts on |

**On what invariants to assert:** the ones worth testing are safety properties, not preferences. Was the tier looked up before answering a tier-dependent question. Was a write tool never called on a read-only request. Was an account outside the session never touched. Did the agent abstain when it should. Those are the failures with consequences, and they're stable across any valid path.

**On CI gating:** the evaluation should block a deploy that regresses on the invariants or on groundedness. Running it as a report someone reads means regressions reach production and get found by customers instead.

## 7. Interview Answer

> "ADK supports evaluation through test files defining a query, an expected tool trajectory, and a reference response, runnable from the CLI or in CI.
>
> The methodological trap I'd flag immediately is asserting an exact tool sequence. The agent could legitimately fetch the customer's tier before the transaction, or after — both orders are correct, and an exact-sequence assertion fails one of them. So I'd use the expected tool use as a signal for detecting change, not as a hard gate defining correctness.
>
> What I'd assert instead are invariants: the tier lookup happened before answering a tier-dependent fee question, no write tool was called on a read-only request, no tool touched an account outside the session, the tool call count stayed under budget, and the agent abstained when facts couldn't be established. Those are stable across any valid path and they're the failures with actual consequences — safety properties rather than preferences.
>
> Then I'd combine ADK evaluation with Vertex AI's. ADK covers process — did it use the right tools and take a reasonable path. Vertex AI covers output quality — groundedness, answer correctness, per-claim citation support. Neither is sufficient alone, because a perfectly correct trajectory can still produce an ungrounded answer.
>
> On non-determinism: the same input can take different paths, so a single run is weak evidence. Each case should run three to five times with a pass rate reported. A case passing three of five times is a reliability finding, not a flaky test to re-run until it goes green — treating variance as noise is how genuinely unreliable agents reach production.
>
> The eval set comes from real queries — production traffic and support tickets — in production proportions, including cases where the correct behaviour is abstention. An invented set is systematically easier than reality and produces numbers that don't survive contact with it.
>
> And I'd gate CI on it. Blocking a deploy that regresses on the invariants or on groundedness turns evaluation from a report someone reads into a control that stops regressions reaching customers. Running it as a report means the regressions get found by customers instead."

## 8. Likely Follow-ups

**Q: Why not assert exact tool sequences?**
Because several orderings can be correct — fetching the tier before or after the transaction are both valid. An exact-sequence assertion fails legitimate behaviour, so the tests become brittle and get disabled, which is worse than having none.

**Q: What should you assert instead?**
Invariants that are stable across valid paths: a required lookup happened before the answer, no write tool on a read-only request, no access to accounts outside the session, budgets held, and abstention when facts couldn't be established. Those are the failures with consequences.

**Q: Is ADK evaluation enough on its own?**
No. It covers process — which tools were used and roughly what path. Vertex AI evaluation covers output quality — groundedness, answer correctness, citation support. A perfectly correct trajectory can still produce an ungrounded answer, so both are needed.

**Q: How do you handle non-determinism?**
Run each case three to five times and report a pass rate rather than a binary result. Three passes out of five is a reliability finding worth acting on, not a flaky test — and re-running until green is exactly how unreliable behaviour reaches production.

**Q: Where does the eval set come from?**
Real queries — production traffic and support tickets — in production proportions, including cases where abstention is the correct behaviour. Invented sets are systematically easier than reality, so the numbers they produce don't hold once the system is live.

## 9. Common Mistakes

- Asserting exact tool sequences as a correctness gate.
- Testing trajectory without testing answer quality.
- One run per case, treating variance as flakiness.
- No cases where abstention is the correct outcome.
- Running evaluation as a report rather than a CI gate.

## 10. What to Remember

- **Trajectory tests detect change; invariants define correctness.**
- **Assert safety properties** — required lookups, no writes on reads, budgets, abstention.
- **ADK eval covers process; Vertex AI eval covers output.** Both.
- **Run each case several times; report pass rates.**
- **Gate CI on regressions**, don't just produce a report.
