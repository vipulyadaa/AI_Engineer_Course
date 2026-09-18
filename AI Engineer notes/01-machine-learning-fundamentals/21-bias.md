# Bias

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 21**

## 1. Definition

**Two different meanings — always clarify which one is being asked about.**

- **Statistical bias:** error from wrong assumptions in the model. A model too simple to represent the true relationship is systematically off, no matter how much data you give it.
- **Societal/fairness bias:** systematic unfairness toward a group, usually inherited from the training data or the choice of target variable.

## 2. Simple Explanation

**Statistical bias** is aiming at the wrong spot. Every shot lands in the same place, consistently — just not where the target is. More shots don't help, because the aim itself is off.

**Fairness bias** is a model that works well on average but systematically worse for one group, because the data or the label encoded that inequity.

Interviewers use the word without specifying. Ask which one, or briefly address both — that alone is a good signal.

## 3. How It Works

**Statistical bias:**
1. You choose a model family — that's a hypothesis space.
2. If the true relationship lives outside that space, there's an error floor you can never cross.
3. A linear model on a quadratic relationship is biased: it's wrong in the same direction on the same regions every time.
4. More data doesn't help. Only a richer model, or better features, does.

**Fairness bias enters at four points:**
- **Historical bias** — the world the data recorded was already unequal.
- **Representation bias** — some groups are under-sampled.
- **Label bias** — the target variable encodes a biased human decision (*"who did we hire"* ≠ *"who would succeed"*).
- **Deployment bias** — the model is used on a population unlike its training data.

## 4. Practical Example

**Statistical bias:**
```
True relationship:  y = x²
Model:              y = wx + b   (linear)

Predictions are systematically too high in the middle,
too low at the extremes. Every retrain with more data
reproduces the same shape. That's bias, not variance.
```

**Fairness bias:** Amazon's scrapped experimental recruiting model (Reuters, 2018) penalized résumés containing "women's". The model was working correctly — it learned the label it was given, which recorded a decade of hiring decisions. The bias was in the target variable, upstream of any algorithm.

**Detecting fairness bias requires slicing:**
```
Overall accuracy 0.91

  group A    precision 0.93   recall 0.90   n=8,200
  group B    precision 0.71   recall 0.58   n=  640   ← invisible in the aggregate
```

## 5. Why It Matters

- **Statistical bias tells you which fix to apply.** High bias means a more capable model or better features. High variance means more data or regularization. Opposite remedies.
- **Fairness bias is a launch blocker in regulated domains** — banking, hiring, healthcare, insurance.
- **The model scales the bias.** A biased human decision affects the cases that person handles; a biased model applies the same bias to every case, consistently and at volume.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Aggregate metrics hide group disparities** | Always slice by sensitive group; a 91% overall can be 58% recall for one segment |
| **Removing the protected attribute doesn't remove the bias** | Postcode, name, and purchase patterns all proxy for demographics |
| **Fairness definitions conflict mathematically** | Demographic parity, equal opportunity, and calibration cannot generally all hold at once (Kleinberg et al., 2016) |
| **Bias–variance is a genuine trade-off** | Reducing one typically increases the other |
| **Fixing the model when the label is the problem** | If the target variable encodes an unfair decision, no algorithmic fix repairs it |

## 7. Interview Answer

> "Bias has two meanings and I'd clarify which one is being asked about.
>
> Statistically, bias is error from wrong assumptions — a model too simple to represent the true relationship. A linear model on a quadratic pattern is systematically off in the same way everywhere, and more data won't help because the aim itself is wrong. That's why the diagnosis matters: high bias means I need a more capable model or better features, while high variance means more data or regularization. Opposite fixes.
>
> The fairness sense is systematic unfairness toward a group, and it usually enters through the data or the target variable rather than the algorithm. Amazon's recruiting model is the clearest case — it learned to penalize résumés mentioning 'women's' because it was trained on a decade of hiring decisions. The model worked correctly; the label encoded the bias.
>
> Two practical points. Aggregate metrics hide this completely — I'd slice by group, because 91% overall can be 58% recall for one segment. And removing the protected attribute doesn't remove the bias, since postcode and purchase patterns proxy for it. I'd also flag that fairness definitions conflict mathematically — you generally can't satisfy demographic parity, equal opportunity, and calibration simultaneously, so it has to be an explicit decision rather than a box to tick."

## 8. Likely Follow-ups

**Q: How is statistical bias different from variance?**
Bias is error from wrong assumptions — consistently off in the same direction, and more data doesn't help. Variance is sensitivity to the particular training sample — the model changes a lot if you resample, so it's inconsistent rather than consistently wrong. High bias underfits; high variance overfits.

**Q: How do you detect fairness bias?**
Slice every metric by the relevant groups — precision, recall, false positive rate, and calibration per group. Then check proxies, because a model without the protected attribute can still discriminate through postcode or purchase history. And audit the label itself: if it records a human decision rather than an outcome, the bias likely lives there.

**Q: If you remove race and gender from features, is the model fair?**
No. This is "fairness through unawareness" and it doesn't work — other features proxy for those attributes, so the model reconstructs them implicitly. It also removes your ability to *measure* disparity, which makes things worse. The standard approach is to keep the attributes for auditing, exclude them from the decision function where required, and measure outcomes per group.

**Q: Can you satisfy all fairness definitions at once?**
Generally no — that's a formal impossibility result (Kleinberg, Mullainathan & Raghavan, 2016). Demographic parity, equalized odds, and calibration can't all hold simultaneously except in degenerate cases. So fairness has to be an explicit choice about which definition matches the harm you're trying to prevent, made with legal and domain input rather than by a data scientist alone.

**Q: What's the bias term in a neural network?**
Completely unrelated — that's the additive constant `b` in `wx + b`, which lets the activation shift away from the origin. Same word, different concept. Worth disambiguating quickly if the question is ambiguous, because conflating them is a noticeable error.

## 9. Common Mistakes

- Not clarifying which meaning of "bias" is being asked about.
- Confusing statistical bias with the bias term `b` in a linear layer.
- Claiming a model is fair because you removed protected attributes.
- Reporting only aggregate metrics.
- Treating fairness as a purely technical fix when the target variable is the problem.
- Implying all fairness definitions can be satisfied together.

## 10. What to Remember

- **Two meanings.** Statistical: error from wrong assumptions. Fairness: systematic group harm. Clarify which.
- **High bias → more capable model or better features.** More data won't help.
- **Fairness bias enters through data and labels**, not usually through the algorithm.
- **Removing protected attributes doesn't remove bias** — proxies remain, and you lose the ability to measure.
- **Always slice metrics by group.** Aggregates hide exactly the failures that matter.
