# F1 Score

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 34**

## 1. Definition

The **harmonic mean** of precision and recall: `F1 = 2PR / (P + R)`. It collapses the two into one number, and the harmonic mean means a model must do reasonably well on both — a low score on either drags F1 down.

## 2. Simple Explanation

You need one number to compare models, and reporting precision and recall separately makes ranking awkward. F1 combines them.

The reason it's the *harmonic* mean rather than the arithmetic mean is the important part:

```
Precision 1.0, Recall 0.0   (flags exactly one thing, correctly)

Arithmetic mean = 0.50   ← looks acceptable. Wrong.
Harmonic mean   = 0.00   ← correctly says this model is useless
```

The harmonic mean punishes imbalance. You can't compensate for terrible recall with perfect precision.

## 3. How It Works

```
F1 = 2 · (Precision × Recall) / (Precision + Recall)

Precision 0.9, Recall 0.9  →  F1 = 0.90
Precision 0.9, Recall 0.3  →  F1 = 0.45   ← pulled toward the lower value
Precision 0.5, Recall 0.5  →  F1 = 0.50
```

1. It ignores true negatives entirely, which is why it's more informative than accuracy under imbalance.
2. It weights precision and recall **equally** — which is an assumption, and often a wrong one.
3. It's computed at a specific threshold, so it's threshold-dependent.

**Fβ generalizes it when the weighting shouldn't be equal:**
- **F2** weights recall higher — use when misses are costlier (fraud, medical screening).
- **F0.5** weights precision higher — use when false positives are costlier (alert queues).

## 4. Practical Example

**Macro vs. micro F1 in multi-class** — the choice matters a lot under imbalance:

```
Class              n       F1
balance_inquiry  4,200    0.97
card_lost        1,100    0.91
complaint          180    0.51   ← rare and important

Micro-F1 = 0.93   ← dominated by the big classes
Macro-F1 = 0.80   ← treats each class equally, exposes the problem
```

**Macro-F1 is usually what you want** when rare classes matter, because micro-F1 lets the majority classes hide the failure.

**In RAG evaluation**, F1 shows up as a token-overlap metric between the generated answer and a reference answer. It's cheap and weak — it rewards vocabulary overlap, not correctness, and penalizes a correct answer phrased differently. Use it as a fast regression check, not as your quality metric; semantic similarity or an LLM judge on a held-out set is far more meaningful.

## 5. Why It Matters

- **It's the standard single-number metric for imbalanced classification.**
- **It ignores true negatives**, which is exactly why it beats accuracy when the negative class dominates.
- **The equal weighting is a hidden assumption** — noticing that and reaching for Fβ when costs differ is a good signal.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Assumes equal error costs** | Rarely true. In fraud, a miss costs far more than a false alarm — use F2 |
| **Threshold-dependent** | Comparing models by F1 at 0.5 compares them at an arbitrary operating point |
| **Hides the trade-off** | F1 = 0.70 could be P=0.9/R=0.57 or P=0.57/R=0.9 — very different systems |
| **Micro-F1 under imbalance** | Majority classes dominate; use macro when rare classes matter |
| **Ignores true negatives** | Usually a feature, but it means F1 says nothing about specificity |

**The practical advice:** use F1 to *rank* candidate models quickly, then report precision and recall separately for the model you choose, and tune the threshold against actual business cost.

## 7. Interview Answer

> "F1 is the harmonic mean of precision and recall — two times precision times recall over their sum. It's the standard single number for imbalanced classification because, unlike accuracy, it ignores true negatives, so the majority class can't inflate it.
>
> The harmonic mean matters specifically. If precision is one and recall is zero — a model that flags exactly one thing correctly — the arithmetic mean is 0.5, which looks acceptable and is wrong. The harmonic mean is zero, which is right. You can't compensate for terrible recall with perfect precision.
>
> Two things I'd watch. F1 weights precision and recall equally, which is an assumption and usually a wrong one. In fraud a miss costs far more than a false alarm, so I'd use F2, which weights recall higher. And F1 hides the trade-off — 0.70 could be precision 0.9 with recall 0.57, or the reverse, and those are very different systems.
>
> In multi-class I'd default to macro-F1 when rare classes matter, because micro-F1 is dominated by the big classes and will hide a rare high-stakes class performing badly.
>
> How I'd actually use it: F1 to rank candidate models quickly, then report precision and recall separately for the one I pick, and tune the threshold against real business cost rather than leaving it at 0.5."

## 8. Likely Follow-ups

**Q: Why harmonic mean instead of arithmetic?**
Because the harmonic mean is dominated by the smaller value, so it punishes imbalance between precision and recall. Precision 1.0 with recall 0.0 gives an arithmetic mean of 0.5 — which suggests a mediocre model rather than a useless one. The harmonic mean gives 0, which correctly reflects that a model catching nothing is worthless regardless of how precise it is on that nothing.

**Q: Macro vs. micro F1?**
Macro computes F1 per class and averages, weighting each class equally regardless of size. Micro pools all predictions and computes globally, weighting each example equally, so common classes dominate. Under imbalance with important rare classes, macro is the honest choice. Weighted-F1 sits between them, weighting by class support.

**Q: When would you use F2 instead of F1?**
When recall is more important than precision — fraud detection, disease screening, safety-critical detection, compliance monitoring. F2 weights recall roughly twice as heavily. F0.5 goes the other way for when false positives are expensive, like an alert queue with limited analyst capacity.

**Q: F1 vs. PR-AUC?**
F1 is computed at one threshold; PR-AUC summarizes performance across all thresholds. PR-AUC is better for comparing models because it's threshold-independent — it tells you about the ranking quality. F1 is better for reporting a chosen operating point. I'd use PR-AUC to select a model and F1 or explicit precision/recall to describe how it will actually run.

**Q: Is F1 useful for RAG evaluation?**
Weakly. Token-overlap F1 between a generated answer and a reference rewards vocabulary overlap rather than correctness, and penalizes a correct answer that's phrased differently. It's cheap enough to use as a fast regression check, but for actual quality I'd use semantic similarity, an LLM judge on a held-out set, or targeted metrics like groundedness and recall@k that measure the specific stages.

## 9. Common Mistakes

- Reporting F1 alone without the underlying precision and recall.
- Using micro-F1 on imbalanced multi-class when rare classes matter.
- Not questioning the equal weighting when error costs are clearly asymmetric.
- Comparing models by F1 at threshold 0.5 without tuning.
- Treating token-overlap F1 as a meaningful RAG quality metric.

## 10. What to Remember

- **`F1 = 2PR / (P + R)`** — harmonic mean, so it's dominated by the weaker of the two.
- **Ignores true negatives**, which is why it beats accuracy under imbalance.
- **Equal weighting is an assumption.** F2 for recall-critical, F0.5 for precision-critical.
- **Macro-F1 when rare classes matter;** micro hides them.
- **Use it to rank models, then report precision and recall separately** for the one you ship.
