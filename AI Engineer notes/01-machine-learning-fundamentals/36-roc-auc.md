# ROC-AUC

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 36**

## 1. Definition

The area under the curve of true positive rate versus false positive rate, swept across all thresholds. It measures **ranking quality**: the probability that a randomly chosen positive is scored higher than a randomly chosen negative.

## 2. Simple Explanation

ROC-AUC asks: *if I pick one fraud case and one legitimate case at random, how often does the model score the fraud higher?*

That's it. It's threshold-free — it doesn't care where you cut, only whether the model orders things correctly.

```
AUC = 1.0   perfect ranking
AUC = 0.5   random — the model has no information
AUC < 0.5   worse than random (usually a sign of flipped labels)
```

## 3. How It Works

1. Sort all examples by predicted score, descending.
2. Sweep the threshold from high to low.
3. At each point plot **TPR** (recall) against **FPR** (`FP / (FP + TN)`).
4. The area under that curve is ROC-AUC.

```
TPR │        ┌────────── perfect (1.0)
1.0 │      ╱─
    │   ╱─      good (~0.85)
    │ ╱     ╱─
    │╱  ╱─        ╱ random (0.5)
    │╱─      ╱──
0.0 └──────────────── FPR
   0.0            1.0
```

**The key property:** because both axes are ratios within their own class, ROC-AUC is **insensitive to class balance**. Change the fraud rate from 1% to 10% and ROC-AUC stays roughly the same. That's a feature for comparing across datasets — and a serious problem in one specific case.

## 4. Practical Example

**Where ROC-AUC misleads — severe imbalance:**

```
10,000 transactions, 0.5% fraud (50 cases)

Model flags 1,000 transactions, catching 45 of 50 frauds.

TPR = 45/50    = 0.90
FPR = 955/9950 = 0.096   ← looks tiny!

ROC-AUC ≈ 0.95   ← looks excellent

But precision = 45/1000 = 4.5%.
The analyst reviewing that queue finds fraud in 1 of every 22 alerts.
```

The FPR denominator is 9,950 negatives, so 955 false positives barely register as a rate. ROC-AUC is technically correct and operationally misleading. **Under severe imbalance, use [PR-AUC](37-pr-auc.md)**, whose denominator is the model's own positive predictions.

**Rough interpretation guide (domain-dependent):**

| AUC | Read |
|---|---|
| 0.5 | No information |
| 0.6–0.7 | Weak but possibly useful |
| 0.7–0.8 | Acceptable for many business problems |
| 0.8–0.9 | Good |
| >0.95 | **Check for leakage before celebrating** |

## 5. Why It Matters

- **It's threshold-free**, so it compares models on ranking quality without committing to an operating point.
- **It's stable across class balance**, which makes it comparable across datasets and time periods.
- **It's the standard reporting metric** in credit risk and many regulated domains, so you'll encounter it constantly.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Misleading under severe imbalance** | FPR's large denominator hides a large absolute number of false positives. Use PR-AUC |
| **Weights all thresholds equally** | You only operate at one. A model with better AUC can be worse at your actual threshold |
| **Says nothing about calibration** | Scores can be perfectly ranked and badly calibrated |
| **Doesn't reflect asymmetric costs** | It treats FP and FN symmetrically |
| **>0.95 is a leakage smell** | Investigate before celebrating |

**Partial AUC** exists for when you only care about a region — e.g. the low-FPR portion, because that's the only part you can operate in. Worth mentioning if the discussion goes deep.

## 7. Interview Answer

> "ROC-AUC is the area under the true-positive-rate versus false-positive-rate curve, swept across all thresholds. The clean interpretation is: the probability that a randomly chosen positive scores higher than a randomly chosen negative. So it measures ranking quality, not performance at any particular cut point.
>
> Its main strengths are that it's threshold-free, so I can compare models without committing to an operating point, and it's insensitive to class balance, so it's comparable across datasets and time periods.
>
> But that class-balance insensitivity is exactly the problem under severe imbalance. If I have half a percent fraud and the model produces 955 false positives out of 9,950 negatives, the FPR is under ten percent and ROC-AUC looks excellent — around 0.95. But precision is four and a half percent, so an analyst finds fraud in one of every twenty-two alerts. Technically correct, operationally misleading. In that regime I'd report PR-AUC instead, because its denominator is the model's own positive predictions.
>
> Two other cautions. It weights all thresholds equally when I only ever operate at one, so a better AUC doesn't guarantee better performance where I actually run. And anything above 0.95 makes me suspect leakage before I celebrate."

## 8. Likely Follow-ups

**Q: ROC-AUC vs. PR-AUC?**
ROC-AUC uses FPR, whose denominator is all negatives — large under imbalance, so false positives barely move it. PR-AUC uses precision, whose denominator is the model's positive predictions, so false positives hurt it directly. Under balanced classes they tell similar stories; under severe imbalance PR-AUC is far more informative about whether the system is operationally usable.

**Q: What does 0.5 mean? What about below 0.5?**
0.5 is random — the model ranks positives and negatives no better than chance. Below 0.5 means it's systematically ranking them backwards, which in practice almost always means flipped labels or a sign error rather than a genuinely anti-predictive model. I'd check the label encoding before anything else.

**Q: Is a higher AUC always a better model for your use case?**
No. AUC averages over all thresholds, but you operate at one. A model with better overall AUC can be worse in the low-FPR region you're actually constrained to. If I can only review 200 alerts a day, what matters is precision in the top 200 scores, which is a partial-AUC or precision@k question, not a whole-curve question.

**Q: Does ROC-AUC tell you about calibration?**
No. It depends only on the ordering of scores, so applying any monotonic transformation to the predictions leaves AUC unchanged while completely changing the probabilities. If anything downstream consumes the probability — routing on "confidence above 0.8", or computing expected cost — I'd check calibration separately with a reliability curve.

**Q: Why is AUC insensitive to class balance?**
Because both axes are ratios computed within a single class — TPR divides by all actual positives, FPR by all actual negatives. Changing the proportion of positives rescales both denominators consistently, so the curve barely moves. That's genuinely useful for cross-dataset comparison and genuinely dangerous when you need to know the absolute false-positive volume.

## 9. Common Mistakes

- Using ROC-AUC as the primary metric on severely imbalanced data.
- Celebrating AUC above 0.95 without checking for leakage.
- Assuming higher AUC means better performance at your operating threshold.
- Treating AUC as evidence the probabilities are well-calibrated.
- Not reporting the operating point's precision and recall alongside it.

## 10. What to Remember

- **P(random positive scores higher than random negative).** Ranking quality, threshold-free.
- **0.5 = random; below 0.5 usually means flipped labels.**
- **Insensitive to class balance** — useful for comparison, dangerous under severe imbalance.
- **Under imbalance use PR-AUC**, whose denominator is the model's own predictions.
- **>0.95 → check for leakage.** Says nothing about calibration.
