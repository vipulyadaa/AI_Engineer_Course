# Testing

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 13**

## 1. Definition

Evaluating the final model on data that was **never used for any decision** — not for fitting, not for hyperparameter selection, not for threshold tuning. It's your unbiased estimate of production performance.

## 2. Simple Explanation

The real exam. You get one attempt, and the score only means something because you didn't see the questions while studying.

The moment you look at the test set and change something in response, it stops being a test set and becomes another validation set. There's no way to undo that.

## 3. How It Works

1. **Hold it out before anything else** — split first, ideally before you've even looked at the data.
2. **Never fit on it** — not the model, not the scaler, not the imputer, not the threshold.
3. **Evaluate once**, with everything frozen: model weights, preprocessing, threshold.
4. **Report the number** with its context — class balance, threshold used, split strategy, and the baseline it beats.
5. **If you must reuse it**, treat the reported number as optimistic and say so.

**The three sets, in one line each:**

| Set | Used for | Looked at |
|---|---|---|
| Train | Fitting parameters | Constantly |
| Validation | Choosing hyperparameters, threshold, stopping point | Repeatedly |
| **Test** | **Estimating generalization** | **Once** |

## 4. Practical Example

**A test report that's actually useful** — the number alone isn't:

```
Model:        LightGBM, 47 features
Split:        temporal — train ≤2022-12, val 2023 H1, test 2023 H2
Test size:    18,400 loans,  4.1% positive
Threshold:    0.20  (chosen on validation against $8,000/$400 error costs)

Baseline (current rule: score < 640):  PR-AUC 0.19   cost $1.92M
Model:                                 PR-AUC 0.34   cost $1.12M

Slices:
  first-time borrowers    PR-AUC 0.21   ← notably weaker
  repeat customers        PR-AUC 0.39
```

The slice breakdown is what turns a number into a decision. A model that works well overall but poorly on first-time borrowers may be unshippable depending on who that segment is.

**In RAG:** a final test set means questions you never used while iterating on prompts, chunking, or retrieval settings. Sampled from production logs, ideally, and locked.

## 5. Why It Matters

- **It's the only honest number.** Everything else has been optimized against.
- **Slices matter more than the aggregate.** A model can clear the bar overall and fail badly on a segment that matters.
- **It's what a launch review actually needs** — with the baseline it beats, not in isolation.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Test set reuse** | Every look makes the number more optimistic. It degrades silently and irreversibly |
| **Test contamination** | Duplicate or near-duplicate records appearing in both train and test — very common with scraped or deduplicated-badly corpora |
| **Wrong split strategy** | Random split on temporal or grouped data makes the test score fiction |
| **Test set doesn't match production** | You measured a distribution nobody actually sends you |
| **Aggregate only** | The failure concentrated in one slice is invisible |
| **No baseline** | A number with nothing to compare against isn't a result |

**The one worth naming for LLMs: benchmark contamination.** Public benchmark data is often present in pretraining corpora, so strong benchmark scores may partly reflect memorization. It's a live concern when you're comparing models, and it's a good reason to build your own held-out eval set on your own data.

## 7. Interview Answer

> "The test set is data that was never used for any decision — not for fitting, not for hyperparameter selection, not for threshold tuning. It's the only unbiased estimate of how the system performs on new data.
>
> The discipline is that you touch it once. The moment you look at it and change something in response, it's become another validation set, and there's no undoing that. In practice I'd hold it out before I even explore the data, freeze everything — weights, preprocessing, threshold — and then evaluate.
>
> When I report it, the number alone isn't useful. I'd give the class balance, the threshold, the split strategy, the baseline it beats, and a slice breakdown. A model that's strong overall but weak on first-time borrowers or on a rare high-stakes class might not be shippable, and that's invisible in an aggregate score.
>
> The failure I'd watch for is contamination — near-duplicate records appearing in both train and test, which inflates the score in a way that survives every normal sanity check. For LLM work the same issue shows up as benchmark contamination, which is one reason I'd trust a held-out eval set built on our own data over a public benchmark number."

## 8. Likely Follow-ups

**Q: What if you need to test multiple times?**
Then be honest that the number is optimistic and report how many times you looked. Better options: hold out multiple test sets from the start and burn them one at a time, or collect fresh data for the final evaluation. The worst outcome is quietly reusing it and presenting the score as unbiased.

**Q: How do you detect test contamination?**
Check for exact and near-duplicate records across splits — hashing for exact, embedding similarity for near-duplicates. For grouped data, verify no entity ID appears in both splits. A test score that's suspiciously close to or better than training performance is a red flag worth chasing.

**Q: Your test performance is much worse than validation. What happened?**
Most likely validation overfitting — many configurations tried against one split, and the winner was partly lucky. Or the splits differ systematically, which happens with temporal splits when something changed in the test period. Or the validation set was too small for a stable estimate. I'd check fold variance and compare the two splits' distributions.

**Q: Should the test set match production or the training distribution?**
Production. The test set's job is to predict deployed performance, so it should look like the traffic you'll actually receive. If it matches training but not production, you're measuring the wrong thing — and that gap is itself a finding worth reporting.

**Q: How do you build a test set for a RAG system?**
Sample questions from real production logs rather than inventing them, since invented questions aren't the distribution users send. Label the expected answer or expected source document. Keep it locked and separate from whatever you iterate prompts against. Slice it by query type so rare-but-important categories are visible.

## 9. Common Mistakes

- Reusing the test set and presenting the score as unbiased.
- Tuning the threshold on test.
- Reporting an aggregate number with no slices and no baseline.
- Random splits on temporal or grouped data.
- Not checking for duplicates across splits.
- Trusting public benchmark scores without considering contamination.

## 10. What to Remember

- **Touch it once.** Every look makes it less honest, permanently.
- **Freeze everything first** — weights, preprocessing, threshold.
- **Report with context:** class balance, threshold, split strategy, baseline, slices.
- **Slices beat aggregates** — the failure is usually concentrated somewhere.
- **Contamination inflates scores silently.** Check for near-duplicates across splits.
