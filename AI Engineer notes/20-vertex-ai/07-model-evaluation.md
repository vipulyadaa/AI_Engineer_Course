# Model Evaluation

> **Phase 20 · VERTEX AI · Topic 07**

## 1. Definition

Vertex AI's evaluation surface — the Gen AI Evaluation Service for generative outputs and classical evaluation for predictive models — used to decide whether a change improved things and to gate deployments.

## 2. Simple Explanation

You need a number that says whether a change made things better. Without one, every prompt edit and model swap is a guess dressed as an improvement.

The Gen AI Evaluation Service runs in-project, which matters because evaluation data is production data.

## 3. How It Works

```
GEN AI EVALUATION SERVICE
  built-in metrics: groundedness, question answering
  quality, summarization quality, safety, fluency,
  coherence
  custom metrics: your own rubric, scored by a judge model
  modes: pointwise (score one) or pairwise (compare two)

CLASSICAL EVALUATION
  accuracy, precision, recall, AUC-ROC, confusion matrices
  for predictive models
```

**In-project execution matters:** evaluation datasets contain real queries and retrieved document content. Running evaluation through a third-party service would move that data out of the environment, with the same residency implications as hosted tracing.

## 4. Practical Example

**An evaluation set-up for a banking RAG system:**

```
GOLDEN SET
  · 100-200 cases from real queries — production traffic,
    support tickets
  · labelled with the expected answer and the expected
    source chunk
  · covering question types in production proportions
  · including unanswerable questions, to test abstention

METRICS
  groundedness           claims supported by context
  answer correctness     versus the labelled expectation
  retrieval recall@k     was the right chunk retrieved
  abstention accuracy    both false abstentions and false answers
  citation accuracy      do citations resolve and support

REPORTING
  per question type, not aggregate — an overall score hides
  that multi-hop questions fail while simple lookups pass
```

**Pairwise for comparisons:**

```
When comparing a prompt change or a model tier, pairwise
comparison is more reliable than scoring each independently.
Relative judgments are easier than absolute ones, and the
judge is more consistent at "which is better" than at
"rate this 1-5".

Use pointwise for the CI gate, where an absolute threshold
is needed, and pairwise for deciding between two options.
```

**Calibrating a judge:** an LLM judge produces a number whether or not it tracks quality. Before trusting it, score thirty cases by hand and check agreement. An uncalibrated judge is worse than no metric because it actively directs effort.

## 5. Why It Matters

- **In-project execution** keeps evaluation data — which is production data — in the environment.
- **Per-question-type reporting** is what makes results actionable.
- **Pairwise for choosing, pointwise for gating** — the right tool per purpose.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Aggregate scores only** | Hides which question types fail |
| **Uncalibrated judge** | Confident numbers that don't track quality |
| **Invented golden set** | Easier than reality; numbers don't hold |
| **No unanswerable cases** | Over-abstention undetected |
| **Groundedness alone** | Passes general-rule answers to specific questions |
| **Evaluation not gating CI** | A report nobody acts on |

**On the cost of evaluation:** a judge-based run over two hundred cases is two hundred LLM calls per metric per candidate. Running five metrics across three model tiers is three thousand calls. That's affordable but not free, so a smaller smoke-test set for every commit and the full set for release candidates is the practical split.

**On what evaluation can't tell you:** it measures the cases in the golden set. Failures on query types absent from it are invisible, which is why the set needs refreshing from production traffic — particularly from failures and abstentions, which is where the unrepresented cases live.

## 7. Interview Answer

> "The Gen AI Evaluation Service provides built-in metrics — groundedness, question-answering quality, summarization quality, safety — plus custom rubric metrics scored by a judge model, in pointwise or pairwise mode. It runs in-project, which matters because evaluation datasets contain real queries and retrieved document content, so running evaluation through a third-party service would move production data out of the environment.
>
> For a banking RAG system I'd build a golden set of a hundred to two hundred cases from real queries — production traffic and support tickets — labelled with the expected answer and the expected source chunk, covering question types in production proportions, and including unanswerable questions to test abstention.
>
> The metrics would be groundedness, answer correctness against the labelled expectation, retrieval recall at k, abstention accuracy in both directions, and citation accuracy. And I'd report per question type rather than in aggregate, because an overall score hides that multi-hop questions fail while simple lookups pass — which is precisely the information you need to act.
>
> On mode: pairwise comparison is more reliable when choosing between a prompt change or a model tier, because relative judgments are easier than absolute ones and the judge is more consistent at 'which is better' than at 'rate this one to five'. Pointwise is right for the CI gate, where you need an absolute threshold.
>
> If I'm using an LLM judge I'd calibrate it first — score thirty cases by hand and check agreement. An uncalibrated judge produces confident numbers that may not track quality at all, which is worse than no metric because it directs effort in the wrong direction.
>
> On cost: a judge-based run over two hundred cases is two hundred calls per metric per candidate, so five metrics across three tiers is three thousand calls. Affordable but not free, so I'd run a smaller smoke-test set on every commit and the full set for release candidates.
>
> And the limit I'd state: evaluation measures the cases in the golden set. Failures on query types absent from it are invisible. So the set needs refreshing from production traffic, especially from failures and abstentions — that's exactly where the unrepresented cases are."

## 8. Likely Follow-ups

**Q: Why does in-project evaluation matter?**
Because evaluation datasets contain real queries and retrieved document content — production data. Running evaluation through a third-party service moves that out of the environment, with the same residency and vendor-assessment implications as hosted tracing.

**Q: Pointwise or pairwise?**
Pairwise for choosing between options, since relative judgments are more reliable than absolute ones. Pointwise for the CI gate, where an absolute threshold is needed to pass or fail a build. They serve different purposes rather than one being better.

**Q: How do you trust a judge model?**
Calibrate it against human labels on a sample — thirty cases scored by hand, checking agreement. An uncalibrated judge produces confident numbers that may not correlate with quality, which is worse than having no metric because it actively directs effort in the wrong direction.

**Q: Why report per question type?**
Because an aggregate score hides the structure of the failures. Simple lookups passing while multi-hop questions fail averages to a decent number that tells you nothing about what to fix. Per-type reporting is what makes the result actionable.

**Q: What can't evaluation tell you?**
Anything about query types absent from the golden set. Those failures are invisible regardless of how good the metrics are. That's why the set needs continuous refreshing from production traffic, particularly from failures and abstentions where unrepresented cases concentrate.

## 9. Common Mistakes

- Reporting a single aggregate score.
- Using a judge model without calibrating it.
- Building the golden set from imagination.
- Omitting unanswerable cases, so over-abstention goes unmeasured.
- Running evaluation as a report rather than a CI gate.

## 10. What to Remember

- **Runs in-project** — evaluation data is production data.
- **Report per question type**, never only in aggregate.
- **Pairwise for choosing; pointwise for gating.**
- **Calibrate the judge** before trusting its numbers.
- **Refresh the golden set from production failures** — that's where the gaps are.
