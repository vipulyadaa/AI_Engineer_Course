# Class Imbalance

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 39**

## 1. Definition

When one class vastly outnumbers another — fraud at 0.1%, defects at 2%, rare intents at 1%. The model can achieve high accuracy by ignoring the minority class entirely, which is usually the class you actually care about.

## 2. Simple Explanation

If 99.9% of transactions are legitimate, a model that says "legitimate" every time is 99.9% accurate and completely useless.

Imbalance causes two separate problems, and they need different fixes:
1. **Evaluation problem** — standard metrics become uninformative. Fixed by choosing the right metrics.
2. **Learning problem** — the loss is dominated by the majority class, so the model underweights the minority. Fixed by class weights or resampling.

Most of the time the evaluation problem is the bigger one, and it's the cheaper to fix.

## 3. How It Works

**Fix the evaluation first:**
- Use PR-AUC, per-class precision and recall, not accuracy.
- Stratify all splits so each contains a representative share of positives.
- Report the majority-class baseline so the model's lift is visible.

**Then, if needed, fix the learning:**

| Technique | How | Note |
|---|---|---|
| **Class weights** | Weight the minority class higher in the loss | First choice — no data manipulation, `class_weight="balanced"` |
| **Threshold tuning** | Lower the decision threshold | Often sufficient on its own; free |
| **Random undersampling** | Drop majority examples | Fast; throws away information |
| **Random oversampling** | Duplicate minority examples | Risks overfitting to the duplicates |
| **SMOTE** | Synthesize interpolated minority examples | Popular; questionable on high-dimensional or categorical data |
| **Collect more minority data** | Targeted collection | Best if feasible |

**The order that works:** get the metrics right → tune the threshold → add class weights → only then consider resampling.

## 4. Practical Example

```
10,000 transactions, 1% fraud (100 cases)

Baseline (predict "never fraud"):
  Accuracy  99.0%
  Recall     0%
  PR-AUC     0.01  ← equals the positive rate; this is the honest floor

Trained model:
  Accuracy  97.7%   ← LOWER, and much better
  Recall     70%
  Precision  26%
  PR-AUC     0.34   ← 34× the baseline
```

Accuracy went down and the model got dramatically better. That's the whole lesson.

**Critical splitting detail:** stratify every split. With 1% positives and a random 10% validation split, you might get 3 positives — and any recall estimate from 3 examples is noise. `stratify=y` in `train_test_split` and `StratifiedKFold` for cross-validation.

**Resample only the training fold, never validation or test.** Evaluating on resampled data measures performance on a distribution that doesn't exist.

**In RAG:** rare-but-critical query types — complaints, fraud reports, regulatory questions — are your minority class. Average answer quality hides poor performance on them, so slice your eval set by query type.

## 5. Why It Matters

- **Almost every high-value ML problem is imbalanced** — fraud, defects, churn, disease, safety.
- **The minority class is usually the expensive one.** Metrics that hide it hide exactly what matters.
- **Knowing that threshold tuning often suffices** — before reaching for SMOTE — is a practical signal.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Optimizing accuracy** | Rewards ignoring the minority class |
| **Resampling before splitting** | Synthetic or duplicated points land in both train and test — leakage |
| **Evaluating on resampled data** | You measure a distribution that doesn't exist in production |
| **SMOTE on categorical/high-dim data** | Interpolating between categories produces meaningless points |
| **Unstratified splits** | Validation may contain too few positives for a stable estimate |
| **Miscalibrated probabilities after resampling** | Resampling changes the base rate, so output probabilities no longer reflect real risk |

**That last one matters if anything downstream consumes the probability.** Resampling or heavy class weighting distorts the predicted probabilities; you'd need to recalibrate against the true base rate.

## 7. Interview Answer

> "Class imbalance is when one class vastly outnumbers another — fraud at a tenth of a percent, defects at two percent. The core issue is that a model can score extremely well on accuracy by ignoring the minority class entirely, which is usually the class we actually care about.
>
> I'd separate it into two problems, because they need different fixes. The evaluation problem — standard metrics become uninformative — is fixed by using PR-AUC and per-class precision and recall instead of accuracy, and by reporting the majority-class baseline so the lift is visible. The learning problem — the loss being dominated by the majority class — is fixed by class weights or resampling.
>
> My order is: fix the metrics first, then tune the threshold, then add class weights, and only then consider resampling. Threshold tuning is free and often sufficient on its own, and people skip straight to SMOTE without trying it.
>
> Two things I'd be careful about. Stratify every split — with one percent positives and a random ten percent validation split, you might get three positives, and recall estimated from three examples is noise. And resample only the training fold, never validation or test, because evaluating on resampled data measures a distribution that doesn't exist in production.
>
> One subtlety: resampling distorts the output probabilities, since you've changed the base rate. If anything downstream consumes the probability rather than the argmax, I'd recalibrate against the true rate."

## 8. Likely Follow-ups

**Q: SMOTE or class weights?**
Class weights first — no data manipulation, no leakage risk, one parameter, and it works with most libraries out of the box. SMOTE synthesizes minority examples by interpolating between neighbours, which is reasonable for continuous features and questionable for categorical or high-dimensional data where the interpolated points may not be plausible. I'd try class weights and threshold tuning before adding synthetic data.

**Q: How imbalanced is too imbalanced?**
There's no threshold, but the practical concern is the absolute count of minority examples, not the ratio. A thousand positives out of a million is workable; fifty positives out of five thousand is hard regardless of the similar-sounding ratio. Below a few hundred positives I'd think about it as a small-data or anomaly-detection problem rather than standard classification.

**Q: Why not just always use accuracy with a balanced dataset you created?**
Because you've changed the problem. Balancing by undersampling throws away most of the majority data and the resulting model's probabilities no longer reflect real risk. And you still have to deploy against the true distribution, so the evaluation needs to happen on it. Balance the training signal if it helps learning; evaluate on reality.

**Q: Where does resampling go in the pipeline?**
Inside cross-validation, applied only to the training fold of each split. If you resample before splitting, synthetic or duplicated points end up in both train and test and you've leaked. `imbalanced-learn`'s Pipeline handles this correctly; sklearn's standard Pipeline does not, which is a common source of silently inflated results.

**Q: How does this apply to RAG?**
Rare query types are the minority class — complaints, regulatory questions, edge-case policies. An average answer-quality score across an eval set is dominated by common questions and will hide poor performance on exactly the queries with the highest stakes. So I'd stratify the eval set by query type and report per-type scores, which is the same discipline as per-class metrics.

## 9. Common Mistakes

- Using accuracy as the primary metric.
- Resampling before splitting, which leaks.
- Evaluating on resampled data.
- Reaching for SMOTE before trying threshold tuning and class weights.
- Not stratifying splits.
- Forgetting that resampling distorts the output probabilities.

## 10. What to Remember

- **Two separate problems:** evaluation (wrong metrics) and learning (loss dominated by the majority).
- **Fix order:** right metrics → threshold tuning → class weights → resampling last.
- **Stratify every split.** A handful of positives in validation gives noise, not an estimate.
- **Resample the training fold only** — never validation or test.
- **The minority class is usually the expensive one.** Always report it separately.
