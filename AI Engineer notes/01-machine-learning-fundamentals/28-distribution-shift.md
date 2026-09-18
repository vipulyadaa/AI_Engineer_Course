# Distribution Shift

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 28**

## 1. Definition

When the data a model sees in production differs from the data it was trained on. It's the umbrella term covering [data drift](29-data-drift.md) (inputs change) and [concept drift](30-concept-drift.md) (the input→output relationship changes).

## 2. Simple Explanation

ML rests on one assumption: production data looks like training data. Distribution shift is that assumption breaking.

It's the reason models degrade *silently*. Nothing throws an exception. The model keeps returning confident predictions, and they're quietly getting worse.

## 3. How It Works

**The three types, and the reason the distinction matters:**

| Type | What changed | Example | Fixable by retraining? |
|---|---|---|---|
| **Covariate shift** | `P(X)` changes, `P(Y\|X)` stays | New customer segment with different income profile | Yes — retrain on recent data |
| **Label shift** | `P(Y)` changes, `P(X\|Y)` stays | Fraud rate rises from 0.1% to 0.4% | Often just recalibrate the threshold |
| **Concept drift** | `P(Y\|X)` changes | Fraudsters adapt; the same features now mean something different | Yes, but you need *new labels*, which take time |

**Concept drift is the dangerous one** because the fix requires fresh labels, and label latency means those arrive late — so you're structurally behind.

## 4. Practical Example

**Detecting shift without labels** — essential, because labels arrive late or never:

| Layer | Signal | Fires |
|---|---|---|
| **Input** | PSI or KL divergence per feature vs. a training reference window | Immediately, no labels needed |
| **Output** | Predicted-score distribution — mean, percentiles | Immediately |
| **Proxy** | Override rate, click-through, human-reversal rate | Days |
| **Ground truth** | Actual accuracy backfilled when labels land | Weeks to months |

**Adversarial validation** is the single most useful trick: train a classifier to distinguish training data from production data. If it achieves meaningfully better than chance AUC, the distributions differ — and its feature importances tell you *exactly which features drifted*. One number plus a diagnosis.

**In RAG, shift is constant and expected:**
- User questions in month 6 aren't launch-week questions.
- Your document corpus changes — policies update, products launch.
- The embedding or LLM provider updates the model underneath you.

That last one is a distribution shift you don't control, which is why version-pinning and a golden eval set run on every provider update matter.

## 5. Why It Matters

- **Every model degrades.** The question is how fast and whether you notice.
- **Accuracy monitoring alone is too slow** — it depends on labels that arrive late.
- **Shift detection is different from quality degradation.** Inputs can shift while accuracy holds fine. A drift alarm is a trigger to investigate, not a verdict.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **No monitoring at all** | Silent decay for months | Input distribution monitoring from day one |
| **Alerting on every drift** | Alert fatigue; the team stops looking | Alert on magnitude thresholds and tie to a business metric |
| **Retraining on drifted data blindly** | If the shift is bad data or a pipeline bug, you bake the bug in | Investigate the cause before retraining |
| **Treating drift as proof of degradation** | Inputs shift while accuracy holds all the time | Confirm with proxies or delayed labels |
| **Retraining too often** | Churn, instability, no time to validate | Trigger on drift magnitude plus business impact, not a calendar |

**The judgment call:** a drift alert means "go look," not "retrain now." Investigate whether it's a genuine population change, a seasonal effect, or an upstream pipeline bug — those need three different responses.

## 7. Interview Answer

> "Distribution shift is when production data stops resembling training data. It's the umbrella over data drift, where the inputs change, and concept drift, where the relationship between inputs and outputs changes.
>
> The distinction matters because the fixes differ. Covariate shift — just the inputs moving — is usually fixed by retraining on recent data. Label shift, where the base rate changes, often only needs the threshold recalibrated. Concept drift is the hard one: the same features now mean something different, so I need *new labels* to retrain, and label latency means those arrive late. I'm structurally behind.
>
> On detection, I'd layer it, because labels arrive late or never. Input distributions with PSI or KL divergence fire immediately with no labels. Output score distributions also fire immediately — a fraud model whose mean score halves overnight is telling me something. Then proxies like override rate, and finally backfilled accuracy when labels land.
>
> The trick I'd reach for is adversarial validation — train a classifier to distinguish training data from production data. If it beats chance, the distributions differ, and the feature importances tell me exactly which features drifted. One number plus a diagnosis.
>
> And I'd be careful to treat a drift alert as a trigger to investigate, not proof of degradation. Inputs shift while accuracy holds all the time, and retraining blindly on drifted data bakes in whatever caused it — including pipeline bugs."

## 8. Likely Follow-ups

**Q: How do you detect drift without labels?**
Monitor input feature distributions against a training reference window using PSI or KL divergence, monitor the output score distribution, and use adversarial validation to get a single divergence measure plus per-feature attribution. All three work with zero labels, which is why they're the front line.

**Q: Data drift vs. concept drift?**
Data drift is `P(X)` changing — you're seeing different inputs, but the same input still means the same thing. Concept drift is `P(Y|X)` changing — the same input now implies a different outcome. Data drift is often fixed by retraining on recent data; concept drift requires new labels reflecting the new relationship, which is much slower.

**Q: How often should you retrain?**
Trigger-based rather than calendar-based, where possible: retrain when drift magnitude crosses a threshold or when a proxy metric degrades. Calendar retraining is simpler and sometimes the pragmatic choice, but it either wastes compute or responds too late. Either way, validate the new model against the old one on a recent holdout before promoting it.

**Q: A drift alert fires. What do you do?**
Investigate before acting. Is it a genuine population change — a new market, a new customer segment? A seasonal effect the training window didn't cover? Or an upstream pipeline bug, which is more common than people expect and is the case where retraining would bake the bug in. I'd check whether accuracy actually degraded using proxies before assuming the alert means a quality problem.

**Q: How does this apply to a RAG system?**
Three ways. User questions drift as the product and the user base change, so I'd cluster production queries periodically to see new topics emerging. The document corpus drifts as policies update, so stale chunks need re-indexing. And the provider can update the embedding or LLM model underneath me — that's a shift I don't control, so I'd version-pin and run a golden eval set on every provider update rather than discovering it through user complaints.

## 9. Common Mistakes

- Monitoring only accuracy, which depends on labels that arrive too late.
- Treating a drift alert as proof of degradation.
- Retraining automatically on drifted data without diagnosing the cause.
- Not distinguishing data drift from concept drift, and applying the wrong fix.
- Forgetting that a hosted model update is itself a distribution shift.

## 10. What to Remember

- **Production data stops resembling training data.** The assumption ML rests on, breaking.
- **Covariate shift → retrain. Label shift → recalibrate. Concept drift → need new labels.**
- **Monitor inputs and outputs, not just accuracy** — labels arrive too late to be the front line.
- **Adversarial validation** gives you a divergence measure *and* tells you which features drifted.
- **Drift is a trigger to investigate, not a verdict.**
