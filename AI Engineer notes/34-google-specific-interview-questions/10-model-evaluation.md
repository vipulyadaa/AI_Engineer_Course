# Interview Questions: Model Evaluation

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 10**

## 1. Definition

How you'd measure whether a Google Cloud AI system is good and whether a change improved it. Interview questions here test methodology more than tooling — the Gen AI Evaluation Service is the easy half.

## 2. Simple Explanation

Naming the service is the short answer. The real question is what you'd measure, where the golden set comes from, and how you'd know a difference was real.

Those are methodology questions, and they're where most answers are thin.

## 3. How It Works

```
THE TOOL
  Vertex AI Gen AI Evaluation Service — groundedness,
  question answering quality, safety, custom rubric
  metrics, pointwise or pairwise, running IN-PROJECT

THE METHODOLOGY (the actual question)
  what to measure
  where the golden set comes from
  how to know a difference is real
  what to gate on
```

**In-project execution is worth naming** — evaluation datasets contain real queries and retrieved document content, so running them through a third-party service moves production data out of the environment.

## 4. Practical Example

**The metrics, with the insight that distinguishes:**

```
groundedness         claims supported by retrieved context
answer correctness   versus a labelled expectation
retrieval recall@k   was the right chunk retrieved
abstention accuracy  both directions
citation accuracy    do citations resolve and support

THE INSIGHT
  Groundedness alone passes an answer that states the
  general rule to a specific question — "waivers apply to
  Premier accounts opened before 2020" when the customer
  asked whether THEY qualify.

  True, relevant, correctly cited, and not an answer.

  So groundedness needs pairing with answer correctness,
  and multi-hop questions need a metric scoring the
  general rule as ZERO rather than partial credit.
```

**That's the strongest thing to say here**, because it identifies a failure that every standard metric passes.

**Where the golden set comes from:**

```
Real queries — production traffic and support tickets — in
production proportions, with question types labelled, and
including unanswerable cases where abstention is correct
plus adversarial cases.

An invented set is systematically easier than reality and
produces numbers that don't survive deployment.

And a fixed core that never changes, so drift stays
attributable — if recall drops and nothing changed on my
side, the cause is external.
```

**Knowing a difference is real:**

```
Measure run-to-run variance first — run the unchanged
configuration five times and record the spread. That's the
noise floor, and a regression is a drop beyond it.

Without that step every threshold is a guess, and teams
either chase noise or miss real regressions.
```

**Gating:** deterministic property tests on every commit, a smoke set per PR, the full set on release candidates, and the fixed core on a schedule. Tiering is what keeps the gate in use rather than skipped as too slow.

## 5. Why It Matters

- **Methodology is the real question**; naming the service is the easy half.
- **Groundedness alone passes the general-rule failure** — the key insight.
- **Measuring variance first** is the step that makes thresholds principled.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Naming the service and stopping | The easy half |
| Groundedness as the only metric | Passes the most common serious failure |
| Invented golden set | Systematically easier than reality |
| No variance measurement | Every threshold is a guess |
| Aggregate scores only | Per-question-type regressions hidden |
| Judge used without calibration | Confident numbers that may track nothing |

**On judge calibration:** an LLM judge produces a number whether or not it correlates with human judgment. Scoring thirty cases by hand and checking agreement before trusting it is the step that makes the metric meaningful — and an uncalibrated judge is worse than no metric, because it directs effort confidently in a possibly wrong direction.

**On separating retrieval from generation:** an end-to-end score says something is wrong; retrieval recall says whether the right chunk was even retrieved. Without that split you can spend weeks tuning generation when retrieval never surfaced the answer — and that's the most common misdirection in RAG work.

## 7. Interview Answer

> "The tool is the Vertex AI Gen AI Evaluation Service — groundedness, question-answering quality, safety, and custom rubric metrics, pointwise or pairwise, running in-project. That last point matters because evaluation datasets contain real queries and retrieved document content, so running them through a third-party service would move production data out of the environment.
>
> But naming the service is the easy half. The real question is methodology.
>
> On metrics: groundedness, answer correctness against a labelled expectation, retrieval recall at k, abstention accuracy in both directions, and citation accuracy. And I'd separate retrieval from generation deliberately, because an end-to-end score says something is wrong while retrieval recall says whether the right chunk was even retrieved. Without that split you can spend weeks tuning generation when retrieval never surfaced the answer — which is the most common misdirection in RAG work.
>
> The insight I'd lead with is that groundedness alone is insufficient. If someone asks 'do I qualify for the fee waiver' and the system answers with the general waiver policy, that's true, relevant, and correctly cited — groundedness passes. And it doesn't answer the question. So groundedness needs pairing with answer correctness, and multi-hop questions need a metric that scores the general rule as zero rather than partial credit. Partial credit rewards exactly the failure the metric exists to catch.
>
> On the golden set: real queries from production traffic and support tickets, in production proportions, with question types labelled, including unanswerable cases where abstention is correct and adversarial cases for safety. An invented set is systematically easier than reality and produces numbers that don't survive deployment. And a fixed core that never changes, so drift stays attributable — if recall drops and nothing changed on my side, the cause is external.
>
> On knowing a difference is real: measure run-to-run variance first. Run the unchanged configuration five times and record the spread — that's the noise floor, and a regression is a drop beyond it. Without that step every threshold is a guess, and teams either chase noise or miss real regressions. It's the step that gets skipped.
>
> On gating: deterministic property tests every commit, a smoke set per PR, the full set on release candidates, and the fixed core on a schedule. Tiering is what keeps the gate actually in use rather than being skipped as too slow.
>
> And if I'm using an LLM judge, I'd calibrate it — score thirty cases by hand and check agreement before trusting the numbers. An uncalibrated judge produces confident scores that may not track quality at all, which is worse than no metric because it directs effort in the wrong direction."

## 8. Likely Follow-ups

**Q: Is groundedness enough?**
No. It passes an answer that states the general rule to a specific question — true, cited, and not an answer. It needs pairing with answer correctness, and multi-hop cases need a metric scoring the general rule as zero rather than partial credit.

**Q: Where does the golden set come from?**
Real queries — production traffic and support tickets — in production proportions, with question types labelled, including unanswerable and adversarial cases. Invented sets are systematically easier than reality and produce numbers that don't survive deployment.

**Q: How do you know a difference is real?**
Measure run-to-run variance first by running the unchanged configuration several times. That's the noise floor, and a regression is a drop beyond it. Without it every threshold is a guess and teams chase noise or miss real regressions.

**Q: Why separate retrieval and generation metrics?**
Because they have different fixes. An end-to-end score detects a problem; retrieval recall tells you whether the right chunk was even retrieved. Without the split, weeks get spent tuning generation when retrieval never surfaced the answer.

**Q: How do you trust an LLM judge?**
Calibrate it against human labels on a sample — around thirty cases scored by hand, checking agreement. An uncalibrated judge produces confident numbers that may not correlate with quality, which actively misdirects effort and is worse than having no metric.

## 9. Common Mistakes

- Naming the service without methodology.
- Groundedness as the only quality metric.
- Building the golden set from imagination.
- Setting thresholds without measuring variance.
- Using an LLM judge without calibration.

## 10. What to Remember

- **Methodology is the question**; the service is the easy half.
- **Groundedness passes the general-rule failure** — pair it with correctness.
- **Real queries, production proportions, fixed core.**
- **Measure variance first** — otherwise thresholds are guesses.
- **Calibrate the judge**; tier the gate so it stays in use.
