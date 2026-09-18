# Data Drift

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 29**

## 1. Definition

A change in the **input distribution** `P(X)` while the relationship between inputs and outputs `P(Y|X)` stays the same. You're seeing different data, but the same input still means the same thing. Also called covariate shift.

## 2. Simple Explanation

Your model was trained on one population and is now being asked about a different one.

A fraud model trained mostly on domestic transactions starts receiving international ones. The rule "unusual merchant category plus high amount equals risk" hasn't changed — you're just seeing inputs from a region of the feature space that was thinly represented in training, so the model is less reliable there.

## 3. How It Works

**Common causes:**
1. **New population** — expansion to a new market, segment, or channel.
2. **Seasonality** — December spending doesn't look like March spending.
3. **Product change** — a UI redesign changes which fields users fill in.
4. **Upstream pipeline change** — a schema change, a unit change, a new default value. This one is a bug, not a real shift, and it's more common than people expect.
5. **Gradual population evolution** — the customer base slowly ages or shifts.

**Detection metrics:**

| Metric | Use |
|---|---|
| **PSI** (Population Stability Index) | The industry standard in banking. Rough convention: <0.1 stable, 0.1–0.25 moderate, >0.25 significant |
| **KL / JS divergence** | General-purpose distribution distance |
| **Kolmogorov–Smirnov test** | Continuous features; note it flags trivial differences at large n |
| **Chi-square** | Categorical features |
| **Adversarial validation** | One AUC for overall divergence, plus feature importances telling you *which* features moved |

## 4. Practical Example

**A drift report that leads to a decision:**

```
Feature                  PSI    read
transaction_amount      0.04    stable
merchant_category       0.31    SIGNIFICANT — investigate
customer_age            0.08    stable
channel                 0.52    SIGNIFICANT — investigate
device_type             0.11    moderate

Investigation:
  channel          → mobile share went 40% → 72% after the app launch.
                     Genuine population change. Retrain.
  merchant_category→ a new code appeared upstream that maps to
                     "unknown" in our encoder. PIPELINE BUG.
                     Retraining would bake in the bug. Fix the mapping.
```

**That contrast is the whole point of investigating before retraining.** Two significant alerts, two completely different responses.

**In RAG:** query drift is data drift. Cluster production queries monthly and compare against the previous period — new clusters are new topics, and if they retrieve poorly, that's a content gap rather than a model problem.

## 5. Why It Matters

- **It's detectable without labels**, which makes it the earliest warning signal available.
- **It's often the first symptom of an upstream bug**, not a population change — and those need opposite responses.
- **It doesn't always mean quality degraded.** If the shift is into a region the model handles well, accuracy may be unaffected.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Alerting on everything** | With enough features and enough data, something always drifts. Alert fatigue kills the system |
| **Statistical tests at large n** | KS and chi-square flag trivially small differences when n is large. Use effect-size measures like PSI |
| **Assuming drift = degradation** | Inputs can shift into regions the model handles fine |
| **Retraining without diagnosing** | If the cause is a pipeline bug, you train on corrupted data |
| **No reference window** | You need a fixed training-period baseline to compare against, not just last week vs. this week |
| **Ignoring seasonality** | December drift versus a November baseline may be entirely expected |

## 7. Interview Answer

> "Data drift is when the input distribution changes but the relationship between inputs and outputs stays the same. The model is being asked about a population it saw less of during training.
>
> The main reason it matters operationally is that it's detectable without labels — which makes it the earliest warning I have, since ground-truth labels arrive late or never. I'd monitor per-feature distributions against a fixed training reference window, using PSI as the primary measure because it's an effect size rather than a significance test. Statistical tests like KS flag trivially small differences once n is large enough.
>
> Adversarial validation is the trick I'd add: train a classifier to distinguish training data from production data. Better than chance AUC means the distributions differ, and the feature importances tell me which features moved.
>
> The judgment I'd emphasize is that a drift alert means investigate, not retrain. I've seen two alerts on the same report where one was a genuine population change — mobile share jumped after an app launch, so retrain — and the other was a new upstream category code mapping to 'unknown' in our encoder. That second one is a pipeline bug, and retraining would have baked it in. Same alert, opposite correct response.
>
> And drift doesn't necessarily mean accuracy dropped. Inputs can shift into a region the model handles perfectly well."

## 8. Likely Follow-ups

**Q: What is PSI and what are the thresholds?**
Population Stability Index measures the difference between two distributions by binning a feature and summing `(actual% − expected%) × ln(actual%/expected%)` across bins. The convention in banking is under 0.1 stable, 0.1 to 0.25 moderate, above 0.25 significant. It's popular because it's an effect size, so it doesn't produce spurious alerts at large sample sizes the way significance tests do.

**Q: Why not just use a KS test?**
Because with production-scale data, KS will reject the null for differences too small to matter — statistical significance stops tracking practical significance once n is large. PSI or a similar effect-size measure gives you a magnitude you can set a meaningful threshold on.

**Q: Data drift vs. concept drift?**
Data drift is `P(X)` changing while `P(Y|X)` holds — different inputs, same meaning. Concept drift is `P(Y|X)` changing — the same inputs now imply different outcomes. Data drift is detectable without labels and often fixed by retraining on recent data. Concept drift needs new labels to even confirm, which is why it's the harder problem.

**Q: How do you set up drift monitoring?**
Fix a reference window from the training period. Compute per-feature PSI on a rolling production window — daily or weekly depending on volume. Alert on magnitude thresholds rather than significance, and route alerts to a dashboard with a human triage step rather than to automatic retraining. I'd also monitor the prediction score distribution, since that aggregates across all features.

**Q: Does data drift always require retraining?**
No. First diagnose the cause, since a pipeline bug needs fixing rather than retraining. Then check whether quality actually degraded using proxy metrics or delayed labels. If it's a genuine population change and performance has dropped in that segment, retrain on data including the new population. If performance holds, note it and keep monitoring.

## 9. Common Mistakes

- Using significance tests instead of effect sizes at production data volumes.
- Alerting on every feature and creating fatigue.
- Retraining automatically without diagnosing the cause.
- Assuming drift means accuracy dropped.
- Comparing against last week rather than a fixed training-period baseline.
- Not accounting for known seasonality.

## 10. What to Remember

- **`P(X)` changes, `P(Y|X)` holds.** Different inputs, same meaning.
- **Detectable without labels** — the earliest warning available.
- **Use PSI (effect size), not KS (significance)** at production scale.
- **Adversarial validation** gives divergence *and* per-feature attribution.
- **Investigate before retraining** — pipeline bugs and population changes look identical on the dashboard.
