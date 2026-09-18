# Variance

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 22**

## 1. Definition

How much a model's learned function changes when you train it on a different sample of data. High variance means the model is fitting the particular quirks of its training set rather than the stable underlying pattern.

## 2. Simple Explanation

Statistical [bias](21-bias.md) is aiming at the wrong spot consistently. Variance is aiming at the right spot but with a shaky hand — the shots scatter.

Practically: if you retrain on a different 80% sample and get a substantially different model, you have high variance. The model is responding to noise that won't recur.

## 3. How It Works

1. **Model capacity is high** relative to the amount of data.
2. **The model fits sample-specific noise**, not just signal.
3. **A different sample has different noise**, so the fitted function changes.
4. **Predictions on the same new input vary** depending on which sample you happened to train on.
5. **Symptom:** large train/validation gap, and high variance across cross-validation folds.

**High variance is the mechanism behind [overfitting](19-overfitting.md).** Overfitting is the observed behavior; variance is the statistical property causing it.

## 4. Practical Example

**Cross-validation fold variance is the direct measurement:**

```
Model A   fold scores: 0.84, 0.86, 0.85, 0.83, 0.86   → 0.848 ± 0.012
Model B   fold scores: 0.91, 0.72, 0.88, 0.69, 0.85   → 0.810 ± 0.093

Model B has the higher single best fold — and is far worse.
Its ±0.093 says the learned function depends heavily on which
rows it happened to see. That instability follows it to production.
```

**This is why you report the standard deviation across folds, not just the mean.** A model whose performance swings 20 points depending on the sample is not a model you can commit to an SLA on.

## 5. Why It Matters

- **It determines the right fix.** High variance → more data, regularization, simpler model, or ensembling. High bias → a more capable model. Applying the wrong one makes things worse.
- **Ensembling exists specifically to reduce it.** Random Forest averages many high-variance trees; the individual trees stay high-variance and the average is stable. That's the whole idea behind bagging.
- **Fold variance is a shipping criterion.** Unstable performance across samples means unpredictable production behavior.

## 6. Trade-offs / Failure Modes

**Reducing variance:**

| Method | How |
|---|---|
| **More training data** | Noise averages out; most effective |
| **Regularization** | Constrains the function space the model can reach |
| **Simpler model** | Less capacity to fit noise |
| **Ensembling (bagging)** | Averaging many high-variance models cancels their independent errors |
| **Early stopping** | Stops before the model starts chasing noise |
| **Feature selection** | Fewer dimensions to overfit through |

**The trade-off is real:** every one of these increases bias. Regularize harder and the model becomes more stable and less able to capture genuine complexity. That tension is the [bias–variance tradeoff](23-bias-variance-tradeoff.md).

**Other sources of variance worth knowing:** random initialization, data shuffling order, and dropout masks all contribute run-to-run variation independent of the data sample. If two model configurations differ by less than the seed-to-seed variation, you haven't measured a difference.

## 7. Interview Answer

> "Variance is how much the learned model changes when you train it on a different sample of the data. High variance means the model is fitting sample-specific noise rather than the stable pattern — so retrain on a different eighty percent and you get a meaningfully different model.
>
> I measure it directly with cross-validation fold variance. If one model scores 0.85 plus or minus 0.01 across folds and another scores 0.81 plus or minus 0.09, the second one is unstable even though it has the higher single best fold. That instability follows it into production, so I'd report the standard deviation, not just the mean.
>
> To reduce it: more data first, then regularization, a simpler model, or ensembling. Bagging is the cleanest illustration — Random Forest keeps the individual trees high-variance and averages them, and the averaging is what cancels their independent errors.
>
> The thing to be careful about is that every variance-reduction method increases bias. Regularizing harder makes the model more stable and less able to capture real complexity. That's the bias–variance tradeoff, and there's no setting that eliminates both.
>
> One practical note: if two configurations differ by less than the seed-to-seed variation, I haven't actually measured a difference — I'd run multiple seeds before claiming an improvement."

## 8. Likely Follow-ups

**Q: How do you measure variance in practice?**
Cross-validation fold standard deviation is the main tool — high spread across folds means the model depends heavily on which rows it saw. I'd also retrain with several random seeds and compare, which isolates initialization and shuffling variance from data-sample variance.

**Q: Why does bagging reduce variance?**
Because averaging independent errors cancels them. Each tree is trained on a bootstrap sample and overfits it differently, so their errors are largely uncorrelated; the average is far more stable than any individual tree. Random Forest adds feature subsampling to make the trees even less correlated, which improves the cancellation.

**Q: Does more data always reduce variance?**
More *diverse, representative* data does — noise averages out and the sample better represents the distribution. More near-duplicate records doesn't, because it doesn't add independent information. And more data from a different distribution can hurt, since you're now fitting a mixture of two things.

**Q: Bagging vs. boosting?**
Bagging trains models in parallel on bootstrap samples and averages them — it targets variance, and works best with high-variance base learners like deep trees. Boosting trains models sequentially, each correcting the previous one's errors — it targets bias, and works with weak learners like shallow trees. That's why Random Forest uses deep trees and gradient boosting uses shallow ones.

**Q: How do you know an improvement is real and not noise?**
Run multiple seeds and compare the distributions rather than single numbers. If the improvement is smaller than the seed-to-seed spread, it isn't established. With cross-validation, compare fold-level results rather than just the means — a paired comparison across folds is far more informative than two averages.

## 9. Common Mistakes

- Reporting only the mean cross-validation score without the standard deviation.
- Picking the model with the best single fold.
- Confusing variance with bias, and applying the opposite fix.
- Claiming an improvement that's smaller than seed-to-seed variation.
- Forgetting that every variance reduction increases bias.

## 10. What to Remember

- **Sensitivity to the training sample.** Different sample → different model.
- **High variance is the mechanism behind overfitting.**
- **Measure it with cross-validation fold standard deviation** — and report it.
- **Reduce it with:** more data, regularization, simpler model, ensembling, early stopping.
- **Bagging reduces variance; boosting reduces bias.** That's why RF uses deep trees and GBDT uses shallow ones.
