# Cross-Validation

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 40**

## 1. Definition

Splitting data into k folds, training k times with a different fold held out each round, and averaging the results. It gives a more reliable performance estimate than a single split — plus a **variance** estimate, which a single split can't provide.

## 2. Simple Explanation

A single train/validation split gives you one number, and that number depends on which rows happened to land where. On small data that luck can swing results by several points.

Cross-validation runs the experiment k times so every example is used for both training and validation, and reports the mean plus the spread. The spread is the part people forget and the part that tells you whether the model is stable.

## 3. How It Works

```
5-fold cross-validation:

Fold 1:  [VAL][TRN][TRN][TRN][TRN]  → score₁
Fold 2:  [TRN][VAL][TRN][TRN][TRN]  → score₂
Fold 3:  [TRN][TRN][VAL][TRN][TRN]  → score₃
Fold 4:  [TRN][TRN][TRN][VAL][TRN]  → score₄
Fold 5:  [TRN][TRN][TRN][TRN][VAL]  → score₅

Report:  mean ± std
```

**Choosing the right variant is the whole skill:**

| Variant | Use when |
|---|---|
| **KFold** | Independent rows, balanced classes |
| **StratifiedKFold** | Classification — preserves class balance in each fold. Usually the default |
| **GroupKFold** | Multiple rows per entity — all of one entity's rows stay in one fold |
| **TimeSeriesSplit** | Temporal data — train on past, validate on future, never the reverse |
| **StratifiedGroupKFold** | Both grouped and imbalanced |
| **Leave-One-Out** | Very small data; high variance and expensive |

## 4. Practical Example

**The standard deviation is what makes it worth doing:**

```
Model A   0.84, 0.86, 0.85, 0.83, 0.86   →  0.848 ± 0.012
Model B   0.91, 0.72, 0.88, 0.69, 0.85   →  0.810 ± 0.093

Model B has the best single fold and is clearly worse.
Its ±0.093 says performance depends heavily on which rows it saw —
that instability follows it into production.
```

**TimeSeriesSplit is different and worth picturing**, because a standard KFold on temporal data lets the model train on the future:

```
Fold 1:  [TRN][VAL][   ][   ][   ]
Fold 2:  [TRN][TRN][VAL][   ][   ]
Fold 3:  [TRN][TRN][TRN][VAL][   ]
         Training set grows; validation always comes after.
```

**Preprocessing must live inside the pipeline**, or every fold leaks:

```python
# ❌ scaler sees all folds' data
X_scaled = StandardScaler().fit_transform(X)
cross_val_score(model, X_scaled, y, cv=5)

# ✅ scaler refit inside each fold
pipe = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression())])
cross_val_score(pipe, X, y, cv=StratifiedKFold(5))
```

## 5. Why It Matters

- **It gives a variance estimate**, which is a shipping criterion — an unstable model has unpredictable production behavior.
- **It uses all the data** for both training and validation, which matters most when data is scarce.
- **Choosing the wrong variant is a leakage bug** that inflates results and survives every normal check.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Preprocessing outside the pipeline** | Scaler or encoder statistics leak across folds |
| **KFold on time-series** | The model trains on the future; offline numbers become fiction |
| **KFold with repeated entities** | Same customer in train and validation — credit for memorization |
| **Reporting only the mean** | Hides instability; the variance is half the information |
| **k×model_cost compute** | k times the training cost; can be prohibitive for large models |
| **Still overfittable** | Hundreds of configurations scored against the same folds selects for their quirks |

**On choosing k:** 5 or 10 are the conventions. Higher k means less bias (more training data per fold) and more compute. For most problems 5 is a fine default; go to 10 when data is scarce and training is cheap.

## 7. Interview Answer

> "Cross-validation splits the data into k folds and trains k times, holding out a different fold each round. The main reason I use it isn't just a better point estimate — it's that it gives me a variance estimate, which a single split can't.
>
> That variance is genuinely decision-relevant. If model A scores 0.848 plus or minus 0.012 and model B scores 0.810 plus or minus 0.093, B has the better single fold and is clearly the worse choice. That spread says its performance depends heavily on which rows it happened to see, and that instability carries into production.
>
> The skill is picking the right variant. StratifiedKFold is my default for classification, so class balance is preserved in every fold. GroupKFold when there are multiple rows per entity, otherwise the same customer lands in train and validation and I'm rewarding memorization. TimeSeriesSplit for anything temporal, because standard KFold lets the model train on the future.
>
> And all preprocessing has to live inside the pipeline so the scaler or encoder is refit within each fold. Fitting it on the full dataset first leaks statistics across every fold, and that's an easy bug to write and a hard one to notice.
>
> The limitation worth naming: cross-validation still doesn't protect against overfitting the selection process. If I score two hundred configurations against the same folds, the winner is partly lucky — which is exactly what the separate test set is for."

## 8. Likely Follow-ups

**Q: How do you choose k?**
5 or 10 by convention. Higher k means each model trains on more data so the estimate is less biased, at the cost of more compute and higher variance in the individual fold scores. I'd use 5 as a default and 10 when data is scarce and training is cheap. Leave-one-out is the extreme case — nearly unbiased but expensive and high-variance.

**Q: When would you *not* use cross-validation?**
When training is expensive — you don't cross-validate an LLM fine-tune. When you have plenty of data, since a single large validation split is already stable and k times cheaper. And when the data is strictly temporal and you specifically want to evaluate on the most recent period, where a single forward-chaining holdout is more directly meaningful.

**Q: Why does preprocessing have to go inside the pipeline?**
Because a scaler fit on the full dataset has seen the validation fold's statistics, so information leaks into training in every fold. The leak is small per fold but systematic, and it inflates the estimate in a way that survives every sanity check. Putting the transform in a Pipeline means sklearn refits it on just the training portion of each fold.

**Q: What's nested cross-validation?**
An inner loop for hyperparameter selection and an outer loop for performance estimation. It's the statistically correct way to get an unbiased estimate when you're also tuning, because the outer fold's data never influences the hyperparameter choice. It costs k_outer × k_inner training runs, which is why most teams use a simpler train/validation/test split instead and accept the approximation.

**Q: Does cross-validation prevent overfitting?**
No — it detects it and it gives a more reliable estimate, but it doesn't prevent it. It's a diagnostic, not a cure. And it's itself overfittable: scoring many configurations against the same folds selects for those folds' quirks. That residual optimism is exactly what the held-out test set measures.

## 9. Common Mistakes

- Fitting preprocessing outside the pipeline.
- Using plain KFold on time-series or grouped data.
- Reporting only the mean, without the standard deviation.
- Picking the model with the best single fold.
- Assuming cross-validation catches data leakage — the leak is in every fold.

## 10. What to Remember

- **k folds, k trainings, mean ± std.** The std is half the value.
- **Pick the right variant:** Stratified for classification, Group for repeated entities, TimeSeriesSplit for temporal.
- **Preprocessing inside the Pipeline**, always.
- **High fold variance = unstable model**, regardless of the mean.
- **It doesn't prevent overfitting** and it doesn't catch leakage.
