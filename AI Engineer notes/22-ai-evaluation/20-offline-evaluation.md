# Offline Evaluation

> **Phase 22 · AI EVALUATION · Topic 20**

## 1. Definition

Measuring quality against a fixed dataset before deployment. It's the gate that prevents regressions reaching customers, and its value depends entirely on whether the dataset represents production.

## 2. Simple Explanation

Offline evaluation runs the golden set and compares against a baseline. It's fast, repeatable, and controllable — you can run it a hundred times on a hundred configurations.

What it can't do is tell you about cases the golden set doesn't contain, which is why it needs online evaluation feeding it.

## 3. How It Works

```
1. RUN the golden set against the candidate configuration
2. MEASURE per question type, not aggregate
3. COMPARE against the baseline, with a threshold set from
   measured variance
4. GATE the deploy on the result

TIERED, to control cost:
  every commit     deterministic property tests (seconds)
  every PR         a 30-case smoke set
  release candidate the full set, all metrics
  scheduled        the fixed core, to detect external change
```

**The tiering is what makes it practical.** A full judge-based run on every commit is too slow and too expensive; deterministic-only misses quality drift.

## 4. Practical Example

**What offline evaluation is uniquely good at:**

```
COMPARING CONFIGURATIONS
  the same fixed input across five chunking strategies,
  three model tiers, two prompts — impossible online,
  where you can't run five variants on the same customer

REPRODUCIBILITY
  the same dataset, the same measurement, comparable over
  months

SPEED
  a result in minutes instead of waiting for traffic

SAFETY
  adversarial and harmful-case testing without exposing
  customers
```

**That last one is the strongest argument** — safety cases can only be tested offline. You cannot run an injection attempt against real customers to see whether it works.

**What it's structurally blind to:**

```
· question types absent from the set
· real phrasing variety and colloquialism
· the actual production question mix
· emergent failures from conversation context
· whether customers found the answer useful

Offline evaluation measures the cases you thought of. That's
its scope, and stating it is more useful than implying
broader coverage.
```

**The relationship between the two:**

```
OFFLINE  gates releases, compares configurations, tests
         safety, gives reproducible numbers
ONLINE   discovers unknown failure modes and measures real
         usefulness

ONLINE FEEDS OFFLINE — production failures become golden
set cases, so the gate covers them next time.

Neither is sufficient. The loop between them is the system.
```

## 5. Why It Matters

- **It's the only place safety cases can be tested** without exposing customers.
- **Configuration comparison is impossible online** — offline is where choices get made.
- **It measures the cases you thought of** — online supplies the ones you didn't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Set unrepresentative of production** | Numbers don't survive deployment |
| **Full run on every commit** | Too slow and expensive |
| **Aggregate reporting** | Per-type regressions hidden |
| **No variance-based threshold** | Chasing noise or missing regressions |
| **No refresh from production** | Becomes a launch-day snapshot |
| **Treated as sufficient** | Unknown failure modes never found |

**On overfitting to the golden set:** iterating against the same fixed set eventually optimizes for it rather than for production. The set improves, production doesn't. Holding out a portion never used for tuning — only for final validation — is the standard guard, and it matters more the longer a set is used.

**On what "passing offline" means:** a release passing the gate means it didn't regress on the cases in the set. It doesn't mean it's good, and it doesn't mean it's better. Being precise about that keeps the gate honest — it's a floor, not a certification.

## 7. Interview Answer

> "Offline evaluation runs the golden set against a candidate configuration and compares to a baseline. It's fast, repeatable, and controllable — which makes it the gate that prevents regressions reaching customers.
>
> I'd tier it to control cost. Deterministic property tests on every commit, in seconds. A thirty-case smoke set on every PR. The full set with all metrics on release candidates. And the fixed core on a schedule, to detect external change like a model update. A full judge-based run on every commit is too slow and expensive; deterministic-only misses quality drift.
>
> What offline evaluation is uniquely good at: comparing configurations, because you can run the same fixed input across five chunking strategies or three model tiers — which is impossible online, where you can't run five variants on the same customer. Reproducibility over months. Speed. And safety testing.
>
> That last one is the strongest argument. Safety cases can only be tested offline — you cannot run an injection attempt against real customers to see whether it works, or test whether the system gives financial advice by waiting for someone to ask. Adversarial testing has no online equivalent.
>
> What it's structurally blind to: question types absent from the set, real phrasing variety, the actual production question mix, emergent failures from conversation context, and whether customers found answers useful. It measures the cases you thought of — and stating that scope is more useful than implying broader coverage.
>
> So the relationship with online evaluation is a loop. Offline gates releases, compares configurations, and tests safety. Online discovers unknown failure modes and measures real usefulness. And online feeds offline — production failures become golden set cases, so the gate covers them next time. Neither is sufficient; the loop between them is the system.
>
> Two things I'd guard against. Overfitting: iterating against the same fixed set eventually optimizes for the set rather than production — the set improves and production doesn't. So I'd hold out a portion never used for tuning, only for final validation, and that matters more the longer the set has been in use.
>
> And I'd be precise about what passing means. A release passing the gate means it didn't regress on the cases in the set. It doesn't mean it's good and it doesn't mean it's better. Keeping that distinction clear is what stops the gate being treated as a certification."

## 8. Likely Follow-ups

**Q: What's offline evaluation uniquely good for?**
Comparing configurations on identical input, reproducibility over time, speed, and safety testing. That last one has no online equivalent — you can't run injection attempts or advice-elicitation against real customers to see whether the system fails.

**Q: How do you control the cost?**
Tiering. Deterministic property tests on every commit, a small smoke set per PR, the full set on release candidates, and the fixed core on a schedule for external-change detection. A full judge-based run per commit is too slow and expensive to sustain.

**Q: What can't it tell you?**
Anything about cases absent from the set — question types you didn't anticipate, real phrasing variety, the production question mix, emergent conversational failures, and whether customers found answers useful. It measures what you thought of, which is its scope.

**Q: What's the risk of iterating against a fixed set?**
Overfitting — optimizing for the set rather than for production, so the score improves while real quality doesn't. Holding out a portion used only for final validation, never for tuning, is the standard guard, and it matters more the longer the set has been used.

**Q: What does passing the gate mean?**
That the release didn't regress on the cases in the set. Not that it's good, and not that it's better. Keeping that precise is what stops a floor being treated as a certification, which is how teams end up over-confident about a system the evaluation never really covered.

## 9. Common Mistakes

- A golden set that doesn't match production question distribution.
- Running the full evaluation on every commit.
- Reporting aggregate scores without per-type breakdown.
- Never refreshing the set from production failures.
- Treating a passing gate as evidence the system is good.

## 10. What to Remember

- **Tier it:** deterministic per commit, smoke per PR, full per release candidate.
- **Safety testing has no online equivalent** — the strongest argument for offline.
- **It measures the cases you thought of** — online supplies the rest.
- **Hold out a portion** never used for tuning, to catch overfitting.
- **Passing means no regression**, not that the system is good.
