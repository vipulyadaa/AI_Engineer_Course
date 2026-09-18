# Regression

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 09**

## 1. Definition

Supervised learning where the label is a **continuous number** rather than a category. The model outputs a real value, and error is measured by how far that value is from the truth.

## 2. Simple Explanation

"How much?" instead of "which one?" Predict a house price, a delivery time, a customer's lifetime value.

The key difference from classification: error has **magnitude and direction**. Being wrong by $500 on a house price is different from being wrong by $500,000, and your choice of loss function is really a statement about how much worse the big error is.

## 3. How It Works

1. **Model outputs a single unbounded value** — linear output layer, no activation.
2. **Loss measures distance** from the true value.
3. **Optimize** with gradient descent as usual.
4. **Evaluate in the units of the target** — RMSE and MAE are in dollars or minutes, which makes them interpretable to stakeholders.
5. **Check residuals**, not just the aggregate error — where the model is wrong usually matters more than how much.

**The loss choice is the main design decision:**

| Loss | Formula | Behavior |
|---|---|---|
| **MSE** | `(ŷ - y)²` | Penalizes large errors quadratically. Outliers dominate |
| **MAE** | `\|ŷ - y\|` | Linear penalty. Robust to outliers, but a non-smooth gradient |
| **Huber** | Quadratic near 0, linear beyond δ | The practical compromise |
| **Quantile / pinball** | Asymmetric | Use when over- and under-prediction cost differently |

**MSE says one 10-unit error is as bad as a hundred 1-unit errors (100 vs. 100). MAE says the big one is only ten times worse.** That's a product decision wearing a math costume.

## 4. Practical Example

**Predicting LLM API cost per request**, so you can budget and set rate limits:

```
Features:  prompt_tokens, retrieved_chunks, max_output_tokens, model_tier
Target:    actual_cost_usd

RMSE = $0.014   ← penalized by a few very long generations
MAE  = $0.003   ← the typical error

RMSE >> MAE means the error distribution has a heavy tail.
```

When RMSE is much larger than MAE, a small number of large errors dominate. That gap is a diagnostic, not a nuisance — it tells you to go look at the tail cases.

**The skewed-target trap:** cost, revenue, and lifetime value are all right-skewed. Fitting MSE on the raw target lets a handful of whales dominate the loss. Predict `log(target)` instead, then exponentiate — but remember that gives you a median-ish estimate, not a mean, so sums won't reconcile.

## 5. Why It Matters

- **Predicting a score and thresholding it is usually better than classifying directly.** You keep the ranking information and can move the cut point without retraining.
- **Regression metrics are stakeholder-legible.** "Average error of 4 minutes" lands where "AUC 0.83" doesn't.
- **Most cost, latency, and capacity forecasting in an AI system is regression** — token cost per request, expected queue depth, p95 latency.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Skewed target** | Whales dominate MSE | Log-transform the target, or use MAE/Huber |
| **Extrapolation** | Tree models can't predict outside the training range at all; linear models extrapolate confidently and wrongly | Know your model's behavior; flag out-of-range inputs |
| **R² misread** | It's relative to a mean-predictor baseline, not an absolute quality score | Report RMSE/MAE in real units alongside it |
| **MAPE on near-zero values** | Percentage error explodes as the true value approaches 0 | Use MAE, or MAPE with a floor |
| **Heteroscedasticity** | Error variance grows with the target value | Plot residuals vs. predicted; log-transform or model the variance |
| **Point estimate treated as certainty** | A single number hides how unsure the model is | Quantile regression or prediction intervals |

## 7. Interview Answer

> "Regression is supervised learning where the target is continuous rather than categorical. The model outputs a real number and the loss measures distance from the truth.
>
> The main design decision is the loss function, and it's really a business statement. MSE penalizes large errors quadratically, so one big miss counts as much as a hundred small ones — that's right when large errors are disproportionately costly, and wrong when your data has outliers you don't want dominating. MAE treats error linearly and is robust. Huber is the compromise.
>
> On evaluation I'd report RMSE and MAE together, because the gap between them is diagnostic — if RMSE is much larger than MAE, a few large errors are dominating and I should go look at the tail rather than the average. And I'd give numbers in the target's units, since 'average error of four minutes' means something to a stakeholder and R² doesn't.
>
> The trap I'd watch for is skewed targets. Cost, revenue, and lifetime value are all right-skewed, and fitting MSE on the raw value lets a handful of extreme cases dominate the whole model. I'd predict the log instead — with the caveat that exponentiating back gives a median-like estimate, so sums won't reconcile cleanly."

## 8. Likely Follow-ups

**Q: MSE or MAE?**
MSE when large errors are genuinely disproportionately costly and your data is clean — and it's smooth, which optimizers like. MAE when the data has outliers you don't want steering the model, or when the business cost of error is roughly linear. Huber gives you MSE's smooth gradient near zero and MAE's robustness in the tail, which is why it's a good default when you're unsure.

**Q: What does R² actually tell you?**
The fraction of variance explained relative to a baseline that always predicts the mean. R² = 0 means you're no better than that baseline; negative means worse. It's useful for comparing models on the same dataset but it's not an absolute quality measure and it isn't comparable across datasets with different variance. I'd always pair it with RMSE in real units.

**Q: When would you convert a regression problem to classification?**
When the decision is genuinely discrete and only the bucket matters — but I'd be reluctant, because bucketing throws away all the within-bucket information. The better pattern is the reverse: predict the continuous score, then threshold it for the decision. That keeps the ranking and lets the threshold move as business costs change.

**Q: How do you handle a heavily skewed target?**
Log-transform it, so multiplicative errors become additive and the whales stop dominating. Or use MAE or Huber, which don't square the error. Or model it in two stages — classify whether it's a high-value case, then regress conditioned on that. The caveat with log transforms is that exponentiating the prediction back gives roughly a median, not a mean, so aggregate sums won't reconcile.

**Q: Your model has RMSE $2,000 on house prices. Is that good?**
I can't tell without context. I'd need the baseline — what does predicting the mean give? — and the scale, since $2,000 on a $30,000 house is very different from $2,000 on a $3M house. I'd also want the residual distribution, because a uniform $2,000 error and an error that's tiny on most houses but $50,000 on a few are completely different products.

## 9. Common Mistakes

- Reporting R² without RMSE or MAE in real units.
- Using MSE on a heavily skewed target without transforming it.
- Ignoring the RMSE/MAE gap, which tells you about the error distribution.
- Assuming tree-based models can extrapolate beyond the training range — they can't.
- Treating a point prediction as certain when the decision needs a range.
- Using MAPE when the target can approach zero.

## 10. What to Remember

- **Continuous target; error has magnitude and direction.**
- **The loss choice is a business decision.** MSE for disproportionate large-error cost, MAE for robustness, Huber as the default compromise.
- **Report RMSE and MAE together** — the gap tells you about the tail.
- **Skewed targets need a log transform** or a robust loss.
- **Predict the score, threshold separately** — better than classifying directly.
