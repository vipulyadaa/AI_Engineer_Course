# Hyperparameters

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 18**

## 1. Definition

Configuration values **you choose before training** that control how learning happens — learning rate, batch size, number of layers, regularization strength. They aren't learned from data; they're selected by searching and measuring on validation.

## 2. Simple Explanation

Hyperparameters are the settings on the machine; [parameters](17-parameters.md) are what the machine produces.

You set the oven temperature and timer (hyperparameters). The cake is the result (parameters). You find good settings by baking several cakes and tasting them — which is exactly what hyperparameter search is.

## 3. How It Works

1. **Define a search space** — ranges for each hyperparameter, using a log scale for things like learning rate that span orders of magnitude.
2. **Choose a search strategy** (below).
3. **Train a model per configuration.**
4. **Score each on validation** — never on test.
5. **Pick the best**, then optionally re-fit on train + validation.

**Search strategies:**

| Strategy | How | When |
|---|---|---|
| **Grid search** | Every combination | Few hyperparameters, small discrete ranges |
| **Random search** | Sample randomly from the space | **Better than grid in practice** — most hyperparameters don't matter, so random covers the important dimensions more efficiently |
| **Bayesian optimization** | Model the objective, sample where improvement is likely | Expensive training runs where each trial counts |
| **Successive halving / Hyperband** | Start many configs, kill the bad ones early | Large search space, cheap early signal |

**The hyperparameters that actually matter, in order:** learning rate (by a wide margin), then regularization strength, then model capacity, then batch size.

## 4. Practical Example

**A learning-rate range test** — the cheapest high-value thing you can run:

```
Increase LR exponentially over a few hundred steps, plot loss:

loss │●
     │ ●
     │  ●●
     │     ●●●●●          ← usable range
     │            ●
     │             ●●●    ← diverging
     └──────────────────── log(LR)
      1e-5   1e-3   1e-1

Pick roughly an order of magnitude below where it starts diverging.
```

**In LLM work your "hyperparameters" look different but the discipline is identical:**

| LLM-app hyperparameter | Effect |
|---|---|
| `temperature` | Randomness. Use 0 for extraction/classification, higher for generation |
| `top_k` retrieved chunks | Recall vs. prompt cost and distraction |
| chunk size / overlap | Retrieval granularity — often the highest-leverage knob in RAG |
| reranker on/off | Precision vs. latency |
| prompt template variant | Behavior |

These should be tuned on a held-out eval set with the same discipline, not changed by feel.

## 5. Why It Matters

- **Learning rate alone can be the difference between a working model and one that never converges.**
- **Defaults are starting points, not decisions** — especially the 0.5 classification threshold, which is a hyperparameter most people never tune.
- **Search cost is real.** Random search and early stopping of bad trials often find equivalent configurations for a fraction of grid-search compute.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Tuning on the test set** | Your reported number becomes optimistic | Tune on validation; touch test once |
| **Validation overfitting** | 200 trials against one split selects for its quirks | Cross-validation; fewer trials; expect a test gap |
| **Grid search on many dimensions** | Cost grows exponentially, most of it wasted | Random search or Bayesian optimization |
| **Linear-scale search for LR** | Misses the interesting orders of magnitude | Search on a log scale |
| **Tuning everything at once** | Can't attribute what helped | Tune learning rate first, then the rest |
| **Not recording configs** | Can't reproduce or explain a result | Experiment tracking with the full config |

## 7. Interview Answer

> "Hyperparameters are the settings I choose before training that control how learning happens — learning rate, batch size, regularization strength, model depth. The distinction from parameters is that parameters are found by the optimizer from data, and hyperparameters are found by me searching and measuring on validation.
>
> Learning rate is by far the most important, so I'd tune it first and separately. The cheapest high-value thing is a learning-rate range test — sweep it exponentially over a few hundred steps, plot the loss, and pick roughly an order of magnitude below where it starts diverging. And I'd search on a log scale, since linear search over learning rate misses the orders of magnitude that matter.
>
> On strategy, random search generally beats grid search, because most hyperparameters don't matter much and random sampling covers the important dimensions more efficiently for the same budget. For expensive runs I'd use Bayesian optimization or Hyperband to kill bad trials early.
>
> The discipline point is that all of this happens on validation, never on test — and I'd expect some validation overfitting if I run a lot of trials, which is exactly what the test set is there to reveal.
>
> In LLM work the same discipline applies to temperature, top-k chunks, chunk size, and whether to rerank. Those are hyperparameters and I'd tune them against a held-out eval set, not by feel."

## 8. Likely Follow-ups

**Q: Why is random search better than grid search?**
Because most hyperparameters have little effect, and grid search wastes its budget sampling many values of unimportant dimensions. With the same number of trials, random search samples more distinct values of whichever dimension actually matters. Bergstra and Bengio's 2012 result is the standard reference.

**Q: Which hyperparameter matters most?**
Learning rate, by a wide margin — it determines whether training converges at all. After that, regularization strength, then model capacity, then batch size. I'd tune learning rate first and in isolation, because tuning everything simultaneously makes it impossible to attribute what helped.

**Q: How do you avoid overfitting the validation set during search?**
Use cross-validation instead of a single split so the selection signal is less noisy. Limit the number of trials. Prefer simpler configurations when scores are within noise. And keep the test set untouched so the validation-to-test gap is visible — that gap is the measurement of how much you overfit.

**Q: Is the decision threshold a hyperparameter?**
Yes, and it's the one people most often leave at its default. 0.5 is a library convention, not a decision. I'd tune it on validation against the actual cost of a false positive versus a false negative, and on real problems that choice often moves more value than swapping model families does.

**Q: How do you tune a RAG system?**
Same discipline, different knobs: chunk size and overlap, number of retrieved chunks, whether to rerank, and the prompt template. I'd build a held-out eval set from production questions and measure retrieval recall@k separately from end-to-end answer quality, because those fail differently. And I'd change one thing at a time — the temptation to adjust the prompt and the chunking together is strong and it makes results uninterpretable.

## 9. Common Mistakes

- Tuning on the test set.
- Searching learning rate on a linear scale.
- Grid-searching a high-dimensional space.
- Reporting the best validation score as if it were unbiased.
- Leaving the classification threshold at 0.5.
- Changing several things at once in a RAG pipeline, then not knowing what helped.

## 10. What to Remember

- **You choose them; the optimizer doesn't.** That's the parameter/hyperparameter line.
- **Learning rate first, on a log scale.** A range test is cheap and high-value.
- **Random search > grid search** for the same budget.
- **Tune on validation, report on test once** — and expect a gap if you ran many trials.
- **The 0.5 threshold is an untuned hyperparameter** in most projects.
