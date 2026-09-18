# PR-AUC (Precision–Recall AUC)

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 37**

## 1. Definition

The area under the precision–recall curve across all thresholds. It's the right threshold-free metric for **imbalanced classification**, because both axes focus on the positive class and ignore the large true-negative mass.

## 2. Simple Explanation

[ROC-AUC](36-roc-auc.md) can look excellent on rare-event problems because its false-positive-rate denominator is enormous. PR-AUC doesn't have that escape hatch — its denominator is what the model *predicted*, so every false positive hurts directly.

If you're detecting something rare — fraud, defects, a rare intent — PR-AUC is the number that reflects whether the system is actually usable.

## 3. How It Works

1. Sort predictions by score, descending.
2. Sweep the threshold, computing precision and recall at each point.
3. Plot precision (y) against recall (x).
4. The area under that curve is PR-AUC. **Average Precision (AP)** is the standard way to compute it.

```
Precision │───╲
      1.0 │    ╲___              good
          │        ╲___
          │            ╲___
          │  ──────────────────  baseline = positive class rate
          └──────────────────── Recall
         0.0                1.0
```

**The critical difference from ROC-AUC: the baseline is not 0.5.** A random model's PR-AUC equals the positive class rate. So on a 1%-positive problem, random scores 0.01, and a PR-AUC of 0.34 is a 34× improvement — which sounds unimpressive until you state the baseline.

**Always report PR-AUC with its baseline.**

## 4. Practical Example

**The two metrics disagreeing, on the same model:**

```
10,000 transactions, 0.5% fraud (50 cases)
Model flags 1,000, catches 45.

ROC-AUC  ≈ 0.95   ← "excellent"
  because FPR = 955/9,950 = 0.096, a tiny-looking rate

PR-AUC   ≈ 0.18   ← honest
  baseline (random) = 0.005, so 0.18 is a 36× lift
  but precision at that operating point is 4.5%

Operational reality: the analyst finds fraud in 1 of every 22 alerts.
PR-AUC is the metric that reflects that.
```

**In RAG**, PR-AUC's logic applies to retrieval evaluation: relevant chunks are a tiny fraction of the corpus, so the equivalent framing — precision@k and recall@k, or MAP/NDCG — focuses on the retrieved set rather than the enormous irrelevant remainder. Same principle: don't let a huge true-negative mass flatter the number.

## 5. Why It Matters

- **It's the correct threshold-free metric for rare-event detection**, which covers fraud, defects, safety, and most alerting.
- **It penalizes false positives realistically**, which matters when humans have to review them.
- **Knowing when to use PR-AUC over ROC-AUC is a standard senior-level discriminator** in interviews.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Baseline is the positive rate, not 0.5** | 0.30 might be excellent or poor depending on the base rate. Always report the baseline |
| **Not comparable across datasets** | Different positive rates mean different baselines, unlike ROC-AUC |
| **Sensitive to class balance** | A change in the base rate changes PR-AUC even with an identical model |
| **Interpolation is non-trivial** | Linear interpolation between PR points is incorrect; use Average Precision |
| **Still averages over thresholds** | You operate at one. Report precision and recall at your chosen point too |

**Choosing between them:**

| Use ROC-AUC when | Use PR-AUC when |
|---|---|
| Classes roughly balanced | Severe imbalance (< ~10% positive) |
| Both classes matter equally | You care mainly about the positive class |
| Comparing across datasets with different base rates | Comparing models on one dataset |
| True negatives are meaningful | True negatives are a large, uninteresting mass |

## 7. Interview Answer

> "PR-AUC is the area under the precision–recall curve across thresholds, and it's the right threshold-free metric for imbalanced problems.
>
> The reason comes down to the denominators. ROC-AUC uses false positive rate, whose denominator is all negatives — so on a half-percent-fraud problem, nearly a thousand false positives out of ten thousand negatives is a small-looking rate and ROC-AUC reads around 0.95. PR-AUC uses precision, whose denominator is the model's own positive predictions, so those false positives hit it directly. It comes out around 0.18, which correctly reflects that an analyst finds fraud in one of every twenty-two alerts.
>
> The thing I'd be careful about is the baseline. Unlike ROC-AUC where random is always 0.5, a random model's PR-AUC equals the positive class rate. So 0.18 on a half-percent problem is a thirty-six-fold lift over random, which sounds very different from '0.18' stated bare. I'd always report the baseline alongside it.
>
> The flip side is that PR-AUC isn't comparable across datasets with different base rates, and it moves when the base rate moves even with an identical model. So for tracking a model over time as the fraud rate changes, I'd watch both, and I'd report precision and recall at my actual operating threshold regardless, since both metrics average over thresholds I'll never use."

## 8. Likely Follow-ups

**Q: When exactly do you switch from ROC-AUC to PR-AUC?**
Roughly when the positive class drops below ten percent, and definitely below one percent. The real test is whether the true-negative count is so large that it swamps the false-positive rate — at that point ROC-AUC stops reflecting operational reality. I'd typically compute both and report PR-AUC as primary when they disagree.

**Q: What's the baseline for PR-AUC?**
The positive class rate. A random classifier on a 5%-positive dataset gets PR-AUC ≈ 0.05. That's why the raw number is uninterpretable without the base rate — a 0.30 on a 1% problem is a 30× lift, and the same 0.30 on a 40% problem is worse than random.

**Q: What's Average Precision?**
The standard computation of PR-AUC: a weighted mean of precisions at each threshold, weighted by the increase in recall from the previous threshold. It's preferred over trapezoidal integration because linear interpolation between points on a PR curve is mathematically incorrect — precision doesn't vary linearly between operating points. `average_precision_score` in sklearn is what you want.

**Q: Can PR-AUC and ROC-AUC rank two models differently?**
Yes, and this is the practically important case. A model that does better in the high-recall, low-precision region can win on ROC-AUC while losing on PR-AUC, because PR-AUC weights the high-precision region — which is where you actually operate when review capacity is limited. When they disagree under imbalance, I'd trust PR-AUC.

**Q: How does this apply to RAG retrieval evaluation?**
The same principle: relevant chunks are a tiny fraction of the corpus, so any metric with a denominator of "all irrelevant chunks" is flattered. The ranking metrics used in IR — precision@k, recall@k, MAP, NDCG — all focus on the retrieved set for exactly that reason. I'd measure recall@k first since it upper-bounds answer quality, then precision@k or NDCG for ordering quality.

## 9. Common Mistakes

- Reporting PR-AUC without its baseline.
- Comparing PR-AUC across datasets with different positive rates.
- Using ROC-AUC as the primary metric on rare-event problems.
- Using trapezoidal interpolation instead of Average Precision.
- Reporting only the AUC without precision and recall at the actual operating point.

## 10. What to Remember

- **Area under the precision–recall curve.** The right metric under imbalance.
- **Baseline = positive class rate,** not 0.5. Always state it.
- **Use it below ~10% positive**; ROC-AUC is flattered by the huge true-negative mass.
- **Not comparable across datasets** with different base rates — that's ROC-AUC's advantage.
- **Average Precision is the correct computation.**
