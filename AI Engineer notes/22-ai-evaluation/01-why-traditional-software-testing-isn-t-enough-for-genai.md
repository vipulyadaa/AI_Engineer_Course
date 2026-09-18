# Why Traditional Software Testing Isn't Enough for GenAI

> **Phase 22 · AI EVALUATION · Topic 01**

## 1. Definition

Traditional testing asserts that a known input produces a known output. Generative systems produce varying, open-ended outputs with no single correct answer, so assertions on exact output don't work and quality has to be measured statistically instead.

## 2. Simple Explanation

A unit test says "given this input, the output must equal this string." For a model, the output varies between runs and several different answers can all be correct.

So evaluation replaces assertion with measurement: not "is this right" but "what proportion are right, and is that better than last week."

## 3. How It Works

| | Traditional testing | GenAI evaluation |
|---|---|---|
| Output | Deterministic | Varies run to run |
| Correctness | One right answer | Many acceptable answers |
| Result | Pass / fail | A score over a distribution |
| Granularity | Per test | Per dataset |
| Failure | Reproducible | Often not |
| Coverage | Code paths | Query distribution |

**The last row is the real shift.** Code coverage tells you which branches ran; it tells you nothing about whether the system answers the questions users actually ask.

## 4. Practical Example

**Why exact assertions fail:**

```
assert answer == "The international transfer fee is $45."

Fails on:
  "International transfers cost $45.00."
  "The fee is $45 for standard accounts."
  "You'll be charged $45 per transfer."

All correct. All fail the assertion.

And it PASSES on a stale correct-looking string even when
the fee has changed — the assertion is checking the wrong
thing entirely.
```

**What replaces it:**

```
PROPERTY-BASED ASSERTIONS  — still deterministic, still useful
  · every factual claim carries a citation
  · cited chunk IDs exist in the retrieved set
  · no PII in the response
  · no financial advice language
  · latency and token budgets respected
  · the system abstained when retrieval found nothing

STATISTICAL MEASUREMENT    — over a dataset
  · groundedness, answer correctness, recall@k
  · reported as a score, compared against a baseline
```

**That split is the key insight:** traditional testing doesn't disappear — it moves from asserting content to asserting *properties*. Those are deterministic, fast, and belong in CI exactly as ordinary tests do.

**What still works unchanged:**

```
Everything around the model is ordinary software: retrieval
filters, chunking, parsing, authorization, budget
enforcement, API contracts.

Those have deterministic behaviour and deserve ordinary unit
tests. The temptation is to treat the whole system as
"AI, therefore untestable" — which is wrong, and it's how
a permission filter bug reaches production.
```

## 5. Why It Matters

- **Assertions move from content to properties**, and property tests stay deterministic.
- **Coverage changes meaning** — query distribution, not code paths.
- **Most of the system is ordinary software** and still needs ordinary tests.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Asserting exact output** | Fails on correct variations |
| **Treating the whole system as untestable** | Permission and filter bugs slip through |
| **One run per case** | Non-determinism unmeasured |
| **Aggregate score only** | Hides which question types fail |
| **Evaluation without a baseline** | Nothing to compare against |
| **Code coverage as a quality signal** | Says nothing about answer quality |

**On non-determinism:** running a case once and treating the result as the answer is the most common methodological error. Each case should run several times with a pass rate reported, and the run-to-run variance measured first — because it's the floor below which any difference between configurations is meaningless.

**On what "regression" means:** in traditional testing a regression is a test that flipped from pass to fail. Here it's a score that dropped by more than the measured variance. That's a different kind of signal and it needs a different kind of gate — a threshold on a distribution rather than a binary.

## 7. Interview Answer

> "Traditional testing asserts that a known input produces a known output. With a generative system the output varies between runs and several different answers can be correct — so asserting on exact output fails on correct variations, and it also passes on a stale correct-looking string after the underlying fact has changed. It's checking the wrong thing entirely.
>
> What replaces it is two things, and I'd stress that only one of them is statistical.
>
> Property-based assertions are still deterministic and belong in CI as ordinary tests: every factual claim carries a citation, the cited chunk IDs exist in the retrieved set, no PII in the response, no financial advice language, latency and token budgets respected, and the system abstained when retrieval found nothing. Those are pass/fail and they catch the failures with the worst consequences.
>
> Then statistical measurement over a dataset — groundedness, answer correctness, recall at k — reported as a score and compared against a baseline rather than a fixed expectation.
>
> The shift I'd highlight is what coverage means. Code coverage tells you which branches ran and says nothing about whether the system answers the questions users actually ask. Coverage here is over the query distribution, which is why the golden set has to come from real traffic in production proportions.
>
> And the mistake I'd push back on hardest is treating the whole system as 'AI, therefore untestable'. Most of it is ordinary software — retrieval filters, chunking, parsing, authorization, budget enforcement, API contracts — all deterministic and all deserving ordinary unit tests. That framing is how a permission filter bug reaches production, because nobody wrote the test that would have caught it.
>
> Two methodological points. Non-determinism means running a case once and treating that as the answer is wrong — each case should run several times with a pass rate reported, and run-to-run variance measured first, because it's the floor below which any difference is meaningless.
>
> And regression means something different. In traditional testing it's a test flipping from pass to fail. Here it's a score dropping by more than the measured variance — a threshold on a distribution rather than a binary, which needs a different kind of CI gate."

## 8. Likely Follow-ups

**Q: Why can't you assert on the output?**
Because several phrasings can all be correct, so an exact assertion fails valid answers. Worse, it passes on a stale correct-looking string after the underlying fact changed — so it gives false confidence while checking something that isn't correctness.

**Q: What can you still assert deterministically?**
Properties: every claim carries a citation, cited chunks exist in the retrieved set, no PII in the output, no advice language, budgets respected, abstention when retrieval found nothing. Those are pass/fail, fast, and catch the highest-consequence failures.

**Q: Is any of the system testable normally?**
Most of it. Retrieval filters, chunking, parsing, authorization, and budget enforcement are ordinary deterministic software deserving ordinary unit tests. Treating the whole system as untestable because it contains a model is how a permission filter bug reaches production.

**Q: What does coverage mean here?**
Coverage over the query distribution rather than code paths. Knowing every branch ran says nothing about whether the system answers the questions users ask, which is why the golden set has to come from real traffic in realistic proportions.

**Q: What counts as a regression?**
A score dropping by more than the measured run-to-run variance, rather than a test flipping from pass to fail. That means the CI gate is a threshold on a distribution, and it also means you have to measure the variance first to know what a meaningful drop looks like.

## 9. Common Mistakes

- Asserting on exact model output.
- Concluding the system is untestable because it contains a model.
- Running each case once.
- Reporting a single aggregate score with no breakdown.
- Using code coverage as a quality signal.

## 10. What to Remember

- **Assert properties, measure content** — property tests stay deterministic.
- **Coverage means query distribution**, not code paths.
- **Most of the system is ordinary software** and still needs unit tests.
- **Run each case several times**; measure variance before comparing.
- **A regression is a score drop beyond variance**, not a flipped assertion.
