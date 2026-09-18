# Regression Testing

> **Phase 22 · AI EVALUATION · Topic 16**

## 1. Definition

Detecting that a change made things worse. For a generative system a regression is a score dropping by more than the measured run-to-run variance — not a test flipping from pass to fail.

## 2. Simple Explanation

In ordinary software, a regression is a test that used to pass and now fails. That's a binary you can trust.

Here, the same configuration scores differently on repeated runs. So you need to know the noise floor before you can say anything moved.

## 3. How It Works

```
1. MEASURE VARIANCE
   Run the unchanged configuration 5 times. Record the
   spread. That's the noise floor.

2. SET THE THRESHOLD
   A regression is a drop larger than that spread —
   typically 2× the standard deviation.

3. GATE
   CI fails if a metric drops past the threshold.

4. SPLIT THE SIGNAL
   Deterministic property tests → pass/fail
   Statistical metrics          → threshold on a distribution
```

**Step 1 is the one that's skipped.** Without it, every threshold is a guess, and teams either chase noise or miss real regressions.

## 4. Practical Example

**The two kinds of test, and why both are needed:**

```
DETERMINISTIC — ordinary pass/fail, fast, run on every commit
  · every factual claim has a citation
  · cited chunk IDs exist in the retrieved set
  · no PII without provenance in the output
  · no advice or guarantee phrasing
  · permission filter applied on both retrieval branches
  · response within length and latency bounds

STATISTICAL — threshold on a distribution, slower, run on
release candidates
  · groundedness ≥ baseline − threshold
  · answer correctness ≥ baseline − threshold
  · retrieval recall@5 ≥ baseline − threshold
  · abstention rate within a band

The deterministic set catches the failures with the worst
consequences and runs in seconds. The statistical set
catches quality drift and costs real money.
```

**That split is what makes the gate practical** — a full statistical run on every commit is too slow and too expensive, and a deterministic-only gate misses quality drift entirely.

**What changes need gating:**

```
· prompt changes          ← the most common, least gated
· model version changes
· retrieval config — k, thresholds, filters
· chunking strategy
· embedding model
· tool descriptions       ← changes selection as much as
                            a model swap

Tool descriptions and prompts are the ones deployed as
"just a config edit" while having model-scale behavioural
effects.
```

**Abstention rate as a two-sided check:** a rise means retrieval degraded; a sharp fall means a threshold or filter change let weak context through. Gating on a band rather than a floor catches both, and the second direction is the one nobody watches because answering more looks like improvement.

## 5. Why It Matters

- **Measure variance first** — without a noise floor, every threshold is a guess.
- **Two test kinds** — deterministic on every commit, statistical on release candidates.
- **Prompt and tool-description changes** have model-scale effects and are least gated.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No variance baseline** | Chasing noise or missing regressions |
| **Full statistical run per commit** | Too slow and expensive |
| **Deterministic tests only** | Quality drift undetected |
| **Prompts not gated** | The most common change is ungated |
| **Abstention gated one-way** | A sharp fall reads as improvement |
| **Baseline drifting silently** | Gradual degradation passes every gate |

**On baseline drift:** if the baseline is "last release," a system can degrade by two points per release indefinitely and never trigger a gate. Holding a fixed reference baseline — the version that was independently validated — alongside the rolling one catches the gradual slide that a relative gate structurally cannot.

**On flaky-looking failures:** a statistical gate that fails once and passes on re-run is usually reporting real variance rather than flakiness. Re-running until green is the behaviour to avoid — the correct response is either widening the threshold based on measured variance, or accepting that the change genuinely moved the metric.

## 7. Interview Answer

> "In ordinary software a regression is a test that used to pass and now fails — a binary you can trust. Here the same configuration scores differently on repeated runs, so a regression is a score dropping by more than the run-to-run variance.
>
> Which means the first step is measuring that variance: run the unchanged configuration five times and record the spread. That's the noise floor, and the threshold is set relative to it — typically about twice the standard deviation. That step is the one that gets skipped, and without it every threshold is a guess, so teams either chase noise or miss real regressions.
>
> I'd split the tests into two kinds. Deterministic property tests — every claim has a citation, cited chunk IDs exist in the retrieved set, no PII without provenance, no advice phrasing, the permission filter applied on both retrieval branches, responses within length and latency bounds. Those are ordinary pass/fail, run in seconds, on every commit, and they catch the failures with the worst consequences.
>
> Then statistical metrics — groundedness, answer correctness, retrieval recall, abstention rate — gated against a baseline with a threshold, run on release candidates because a full judge-based run costs real money. That split is what makes the gate practical: running everything on every commit is too slow, and deterministic-only misses quality drift entirely.
>
> On what to gate: prompt changes, model versions, retrieval config, chunking, embedding model, and tool descriptions. The last two on that list are the interesting ones — prompts and tool descriptions get deployed as 'just a config edit' while having model-scale behavioural effects. A rewritten tool docstring changes selection as much as swapping the model would.
>
> Two things I'd get right. Abstention rate needs gating as a band, not a floor. A rise means retrieval degraded; a sharp fall means a threshold or filter change let weak context through. The second direction is the one nobody watches, because answering more looks like improvement.
>
> And baseline drift. If the baseline is 'last release', the system can degrade two points per release indefinitely and never trigger a gate. So I'd hold a fixed reference baseline — the version that was independently validated — alongside the rolling one, because a relative gate structurally cannot catch a gradual slide.
>
> One behaviour to avoid: a statistical gate that fails once and passes on re-run is usually reporting real variance, not flakiness. Re-running until green is how a genuine regression ships. The correct response is either widening the threshold based on measured variance, or accepting the change moved the metric."

## 8. Likely Follow-ups

**Q: What counts as a regression here?**
A score dropping by more than the measured run-to-run variance, not a test flipping from pass to fail. That means you have to measure the variance first — run the unchanged configuration several times — or the threshold is a guess.

**Q: What runs on every commit?**
Deterministic property tests — citations present, cited chunks exist, no unprovenanced PII, no advice phrasing, filters applied on both retrieval branches, responses within bounds. They run in seconds and catch the highest-consequence failures. Statistical metrics run on release candidates.

**Q: Which changes need gating?**
Prompts, model versions, retrieval config, chunking, embedding model, and tool descriptions. Prompts and tool descriptions are the least gated and have the largest effect relative to how they're deployed — a docstring rewrite changes selection as much as a model swap.

**Q: How should abstention be gated?**
As a band rather than a floor. A rise means retrieval degraded; a sharp fall means a threshold or filter change let weak context through. The falling direction is the one nobody watches, because the system answering more questions reads as an improvement.

**Q: What's baseline drift?**
Gating against "last release" lets a system degrade a couple of points per release indefinitely without ever failing. Holding a fixed reference baseline — the independently validated version — alongside the rolling one is what catches the gradual slide a relative gate can't.

## 9. Common Mistakes

- Setting thresholds without measuring run-to-run variance.
- Running full statistical evaluation on every commit.
- Gating only on deterministic tests.
- Deploying prompt and tool-description changes without a gate.
- Re-running a failing statistical gate until it passes.

## 10. What to Remember

- **A regression is a drop beyond variance** — measure the noise floor first.
- **Two kinds:** deterministic per commit, statistical per release candidate.
- **Gate prompts and tool descriptions** — model-scale effects, config-scale deployment.
- **Abstention is a band**, not a floor — the fall direction is unwatched.
- **Hold a fixed baseline** alongside the rolling one to catch gradual drift.
