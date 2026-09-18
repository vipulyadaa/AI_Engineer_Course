# Validation

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 12**

## 1. Definition

Evaluating a model on held-out data **during development** to make decisions — which hyperparameters, which architecture, when to stop, which threshold. It's the set you're allowed to look at repeatedly.

## 2. Simple Explanation

Practice tests. You take them, see what you got wrong, adjust what you study, and take another.

That works — but it means your practice scores stop being an honest estimate of exam performance, because you've been optimizing against them. That's exactly why a separate [test set](13-testing.md) exists and why you touch it once.

## 3. How It Works

1. **Split** the data into train / validation / test (typically 60-20-20 or 80-10-10).
2. **Fit on train** only.
3. **Score on validation** after each epoch or each configuration.
4. **Make decisions** — pick hyperparameters, choose when to stop, set the decision threshold.
5. **Re-fit** on train (or train + validation) with the chosen settings.
6. **Report on test once** — that's the number you put in a launch document.

**Validation vs. test, stated plainly:**

| | Validation | Test |
|---|---|---|
| **Purpose** | Make decisions | Estimate generalization |
| **How often looked at** | Constantly | Once, at the end |
| **Is the score honest?** | No — you optimized against it | Yes, if you kept discipline |

## 4. Practical Example

**Choosing a decision threshold** — the most common legitimate use of validation:

```
Validation set, cost: FN = $8,000, FP = $400

τ = 0.50 →  $1,784,000
τ = 0.30 →  $1,236,000
τ = 0.20 →  $1,124,000  ← pick this
τ = 0.15 →  $1,280,000

Freeze τ = 0.20, then evaluate on test.
```

Choosing τ on the test set would make the reported test cost optimistic — you'd have selected the threshold that happened to look best on the very data you're using to prove the system works.

**In RAG:** your eval set is doing validation work. If you iterate prompts and chunking against it, it's a validation set, not a test set. Keep a separate untouched slice for the final number — very few teams do this, and it's a strong thing to raise.

## 5. Why It Matters

- **Every decision you make with a set contaminates it.** Validation exists so you can iterate freely without burning the test set.
- **It's how you detect overfitting in real time** — the train/validation gap is the signal.
- **With small data, a single validation split is noisy**, which is when you switch to [cross-validation](40-cross-validation.md).

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Overfitting the validation set** | 200 experiments against one split means you've selected for its quirks | Cross-validation; refresh the split; keep test untouched |
| **Validation set too small** | Scores bounce around and you chase noise | Cross-validation; report variance across folds |
| **Wrong split strategy** | Random split on time-series or grouped data | Temporal split; `GroupKFold` on the entity ID |
| **Preprocessing fit on all data** | Scaler statistics leak from validation into training | Put preprocessing inside a Pipeline |
| **Distribution mismatch** | Validation doesn't resemble production traffic | Sample validation data from production logs |

**The subtle one:** validation overfitting is real and invisible. If you run hundreds of configurations, the best validation score is partly luck. That gap is exactly what the test set measures.

## 7. Interview Answer

> "Validation is the held-out data I use during development to make decisions — hyperparameters, architecture, when to stop training, and the decision threshold. It's the set I'm allowed to look at repeatedly.
>
> The reason it's separate from test is that every decision I make using a set contaminates it. If I try two hundred configurations and pick the best validation score, part of that score is luck specific to that split. The test set is the one I haven't optimized against, which is the only reason its number means anything.
>
> Practically, the two things I use validation for most are early stopping — tracking validation loss each epoch and restoring the best checkpoint — and choosing the decision threshold against business cost rather than accepting 0.5.
>
> With small data a single validation split is noisy, so I'd use k-fold cross-validation and report the variance across folds, not just the mean. And the split has to match the data shape — temporal for anything time-ordered, GroupKFold when there are multiple rows per entity, otherwise I'm measuring leakage rather than generalization.
>
> This applies directly to RAG work: if I'm iterating prompts against my eval set, that set is doing validation duty, and I need a separate untouched slice for the honest number."

## 8. Likely Follow-ups

**Q: Why not just use the test set for everything?**
Because the moment you make a decision based on a set, its score becomes optimistic. You'd have no unbiased estimate of how the system performs on genuinely new data, and the number you report to stakeholders would systematically overstate what they'll see in production.

**Q: How big should the validation set be?**
Big enough that the metric is stable — which depends on the metric and the class balance more than on a percentage. For a rare positive class, a 10% split might contain only a handful of positives, making recall estimates meaningless. I'd check the confidence interval on the metric rather than picking 20% by convention, and switch to cross-validation when the data is small.

**Q: What is validation overfitting?**
Selecting for the quirks of one particular split by running many experiments against it. The best configuration on validation is partly the one that got lucky. It's detectable as a gap between validation and test performance, and mitigated by cross-validation, by running fewer configurations, or by refreshing the split.

**Q: Train/validation/test or cross-validation?**
A fixed three-way split when data is plentiful and training is expensive — it's simple and fast. Cross-validation when data is limited, since it uses every example for both training and validation and gives you a variance estimate. The common pattern is cross-validation on the train portion for model selection, with a single held-out test set for the final number.

**Q: Should you retrain on train + validation after selecting hyperparameters?**
Usually yes — more data generally helps, and the hyperparameters are already chosen. The exception is when you used validation for early stopping, since you no longer have a signal for when to stop; there you'd typically train for the number of epochs that was optimal on validation.

## 9. Common Mistakes

- Using the test set to make decisions, then reporting that score as unbiased.
- Reporting the best-ever validation score rather than the test score.
- Random splits on time-series or grouped data.
- Fitting scalers or imputers outside the Pipeline.
- Ignoring fold variance and reporting only the mean.
- Not realizing your RAG eval set has become a validation set through repeated iteration.

## 10. What to Remember

- **Validation = make decisions. Test = report the number, once.**
- **Every look contaminates.** That's the entire reason for two sets.
- **Main uses:** early stopping and threshold selection.
- **Match the split to the data shape** — temporal, grouped, or stratified.
- **Small data → cross-validation,** and report the variance, not just the mean.
