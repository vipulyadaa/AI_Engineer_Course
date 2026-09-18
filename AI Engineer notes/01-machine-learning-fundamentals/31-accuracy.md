# Accuracy

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 31**

## 1. Definition

The fraction of predictions that are correct: `(TP + TN) / total`. It's the most intuitive classification metric and the most misleading one, because it weights every error equally and ignores class balance.

## 2. Simple Explanation

"How often is the model right?"

The problem: on a dataset where 99% of examples are negative, a model that always predicts negative scores 99% accuracy while being completely useless. Accuracy can be high for reasons that have nothing to do with the model working.

**The rule:** accuracy is only informative when classes are roughly balanced *and* both error types cost about the same. That's rare.

## 3. How It Works

```
                PREDICTED
              Pos      Neg
ACTUAL  Pos   TP       FN
        Neg   FP       TN

Accuracy = (TP + TN) / (TP + TN + FP + FN)
```

1. It counts all correct predictions over all predictions.
2. It's computed at a specific **threshold** — usually 0.5, usually untuned.
3. It gives false positives and false negatives identical weight.
4. Majority-class performance dominates whenever classes are imbalanced.

**Always report accuracy alongside the class balance and threshold**, or the number means nothing.

## 4. Practical Example

```
Fraud detection, 10,000 transactions, 1% fraud (100 cases)

Model A: predicts "not fraud" always
  Accuracy = 9,900 / 10,000 = 99.0%
  Fraud caught: 0
  Business value: zero

Model B: catches 70 of 100 frauds, 200 false alarms
  Accuracy = (70 + 9,700) / 10,000 = 97.7%   ← LOWER accuracy
  Fraud caught: 70
  Business value: substantial
```

Model B is worse by accuracy and obviously the right model. This is the canonical example and worth being able to produce from memory.

**Balanced accuracy** fixes part of this — it averages recall across classes, so the trivial majority predictor scores 50% rather than 99%.

## 5. Why It Matters

- **It's what stakeholders ask for**, so you need to be able to explain quickly why it's the wrong question.
- **It's the standard interview trap.** "Your model is 99% accurate, are you happy?" is testing whether you ask about class balance.
- **It's fine when classes are balanced and errors cost the same** — multi-class intent classification with even distribution, for example.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Use instead |
|---|---|---|
| **Class imbalance** | Majority class dominates the number | Precision, recall, PR-AUC, balanced accuracy |
| **Asymmetric error costs** | A missed fraud isn't a false alarm | Cost-weighted evaluation; tune the threshold |
| **Threshold dependence** | Accuracy at 0.5 says nothing about ranking quality | ROC-AUC or PR-AUC for threshold-free comparison |
| **Aggregate hides slices** | 91% overall can be 58% on a critical segment | Per-class and per-segment breakdowns |
| **No baseline** | 85% sounds good until the majority class is 84% | Always state the majority-class baseline |

## 7. Interview Answer

> "Accuracy is the fraction of predictions that are correct — true positives plus true negatives over the total. It's the most intuitive metric and usually the wrong one.
>
> The problem is that it weights every error equally and ignores class balance. On a fraud dataset that's one percent positive, a model predicting 'not fraud' every time scores ninety-nine percent accuracy and catches zero fraud. A real model that catches seventy percent of fraud with some false alarms might score ninety-seven point seven — lower accuracy, obviously the better model.
>
> So when someone tells me a model is ninety-nine percent accurate, my first question is the class balance, and my second is what the majority-class baseline scores. If the majority class is ninety-eight percent, the model has added almost nothing.
>
> What I'd report instead depends on the problem. For imbalanced data, per-class precision and recall plus PR-AUC. If I want a threshold-free comparison, ROC-AUC or PR-AUC. And I'd always slice by class and segment, because a ninety-one percent aggregate can hide fifty-eight percent recall on the rare high-stakes class — which is usually the one the business actually cares about.
>
> Accuracy is genuinely fine when classes are balanced and both error types cost about the same. That's just not most production problems."

## 8. Likely Follow-ups

**Q: When is accuracy the right metric?**
When classes are roughly balanced and false positives and false negatives cost about the same. A multi-class intent classifier with evenly distributed intents is a reasonable case. It's also fine as a secondary, stakeholder-friendly number alongside the metrics you actually optimized.

**Q: What's balanced accuracy?**
The average of recall across all classes, which gives each class equal weight regardless of its frequency. On the 1%-fraud example, the trivial majority predictor gets 50% instead of 99%. It's a useful quick fix when someone insists on a single accuracy-like number for imbalanced data.

**Q: How do you explain to a stakeholder that 99% accuracy is bad?**
With the baseline. "A model that always says 'no fraud' also gets 99%, and it catches zero fraud. What we actually care about is how many of the hundred frauds we catch and how many legitimate customers we inconvenience doing it." Reframing to those two counts usually lands immediately, because they're the numbers the business already thinks in.

**Q: Accuracy vs. F1?**
Accuracy counts all correct predictions including true negatives, which is why the majority class dominates it. F1 is the harmonic mean of precision and recall for the positive class and ignores true negatives entirely, which is what makes it more informative under imbalance. Neither reflects asymmetric error costs, which is why I'd tune a threshold against explicit costs when those differ.

**Q: Is accuracy threshold-dependent?**
Yes — it's computed at a specific cut point, usually 0.5 by default. Two models with identical ranking quality can have very different accuracy if one's scores are shifted. That's why ROC-AUC or PR-AUC is better for comparing models, and why the threshold should be tuned separately once you've picked one.

## 9. Common Mistakes

- Reporting accuracy without the class balance.
- Not stating the majority-class baseline.
- Using accuracy as the optimization target on imbalanced data.
- Reporting only the aggregate with no per-class or per-segment slices.
- Forgetting accuracy is measured at an arbitrary threshold.

## 10. What to Remember

- **`(TP + TN) / total`.** Intuitive, and usually misleading.
- **The trap:** 99% accuracy on 1% fraud by predicting "never."
- **Always report class balance, threshold, and the majority-class baseline.**
- **Under imbalance use** per-class precision/recall, PR-AUC, or balanced accuracy.
- **It's fine when classes are balanced and error costs are symmetric** — and that's rare.
