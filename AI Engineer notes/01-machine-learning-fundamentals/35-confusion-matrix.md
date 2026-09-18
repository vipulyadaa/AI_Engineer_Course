# Confusion Matrix

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 35**

## 1. Definition

A table of predicted versus actual classes. Every classification metric is derived from its four cells, and it's the first thing to look at when diagnosing a classifier — because it shows *which* errors are happening, not just how many.

## 2. Simple Explanation

Four numbers that tell you everything a single metric can't:

```
                  PREDICTED
                Pos        Neg
ACTUAL   Pos    TP         FN   ← missed cases (invisible in production)
         Neg    FP         TN   ← false alarms (someone complains)
```

- **TP** — caught it, correctly
- **FN** — missed it. The dangerous cell, because nobody sees these
- **FP** — false alarm. Costs trust and review time
- **TN** — correctly left alone

Every metric is a ratio of these: precision is the right column, recall is the top row.

## 3. How It Works

```
Precision   = TP / (TP + FP)        the predicted-positive column
Recall      = TP / (TP + FN)        the actual-positive row
Specificity = TN / (TN + FP)        the actual-negative row
FPR         = FP / (FP + TN)        = 1 - specificity
Accuracy    = (TP + TN) / total
```

1. **Moving the threshold moves counts between cells** — raise it and FP→TN, TP→FN.
2. **The totals per row are fixed** by the data; only the column split changes.
3. **In multi-class it becomes N×N**, and the off-diagonal cells tell you *which* classes get confused with which.

**Attaching a cost to each cell converts it from a diagnostic into a decision tool.**

## 4. Practical Example

**Fraud detection, 10,000 transactions, 4% fraud:**

```
                    PREDICTED
                Fraud      Legit
ACTUAL Fraud     190        210     ← catching less than half
       Legit     260      9,340

Precision = 190/450  = 42%
Recall    = 190/400  = 48%
Accuracy  = 9,530/10,000 = 95%   ← misleadingly reassuring

With cost:  FN = $8,000,  FP = $400
Total cost = 210×8,000 + 260×400 = $1,784,000

Sweep the threshold, recompute the matrix, minimize cost:
  τ = 0.20 → FN=70, FP=1,410 → $1,124,000   ← $660k better
```

**The multi-class version tells you what to fix:**

```
                    PREDICTED
            balance  card  loan  complaint  other
ACTUAL
balance      4,120     18    12       9      41
card            22  1,005    11      14      48
complaint       11      8     6      76      79   ← 79 complaints → "other"
```

That single cell — 79 complaints misrouted to `other` — is more actionable than any aggregate score. It says the model can't distinguish complaints from generic messages, which points directly at training data for that class.

## 5. Why It Matters

- **It's the first diagnostic**, before any metric. It shows the shape of the errors.
- **It converts model performance into money** once you attach costs to cells.
- **In multi-class, the off-diagonal cells name the specific fix** — which class pairs are being confused.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Row/column convention varies** | sklearn is `(actual, predicted)`; some texts are the reverse. Always check the axis labels |
| **Threshold-specific** | It describes one operating point, not the model's ranking quality |
| **Raw counts mislead under imbalance** | Normalize by row to see per-class recall directly |
| **Hard to read at high class counts** | With 50 classes, use a heatmap and focus on the top confusions |
| **Says nothing about calibration** | It uses hard predictions; the probability quality is invisible |

## 7. Interview Answer

> "A confusion matrix is predicted versus actual classes, and every classification metric is derived from its cells. Precision is the predicted-positive column, recall is the actual-positive row.
>
> It's the first thing I look at, before any single metric, because it shows *which* errors are happening. A ninety-five percent accurate fraud model can have a matrix showing it catches less than half of actual fraud — the accuracy is carried entirely by correctly leaving legitimate transactions alone.
>
> What makes it a decision tool rather than just a diagnostic is attaching costs to the cells. If a missed fraud costs eight thousand dollars and a false alarm costs four hundred, I can compute total cost at each threshold and pick the one that minimizes it. On a real book that threshold choice has moved more money than the model choice did.
>
> In multi-class the off-diagonal cells are the actionable part. If seventy-nine complaints are being routed to 'other', that's a specific finding — the model can't distinguish complaints from generic messages — and it points straight at training data for that class. No aggregate F1 tells me that.
>
> The one thing it doesn't tell me is calibration, since it's built from hard predictions. If anything downstream consumes the probability, I'd check a calibration curve separately."

## 8. Likely Follow-ups

**Q: Which cell matters most?**
Depends on the costs, and that's the answer I'd give rather than picking one. False negatives in fraud, medical screening, or safety — a missed case is expensive and invisible. False positives when acting is costly — blocking a customer, wasting analyst time. The useful move is to assign a dollar figure to each cell and let that drive the threshold rather than debating it qualitatively.

**Q: How do you use it to pick a threshold?**
Sweep the threshold on validation, recompute the matrix at each point, multiply FN and FP counts by their respective costs, and pick the minimum-cost threshold. Then freeze it and evaluate on test. It's mechanical and it routinely finds substantial savings over the default 0.5.

**Q: How do you read a multi-class confusion matrix?**
Normalize by row so each row shows the distribution of predictions for that true class — that gives you per-class recall on the diagonal. Then look at the largest off-diagonal cells, because those name specific confusable pairs. Two classes confusing heavily usually means either overlapping definitions in the annotation guidelines or insufficient training data for the rarer one.

**Q: What can't a confusion matrix tell you?**
Anything about ranking quality or calibration, because it's built from thresholded hard predictions. Two models with identical matrices can have very different probability distributions, and one might be far better after threshold tuning. For that I'd look at ROC-AUC or PR-AUC and a calibration curve.

**Q: What's specificity and when do you care?**
True negatives over actual negatives — recall for the negative class. It matters when correctly identifying negatives has its own value, which is common in medical testing where you want to avoid alarming healthy patients. It's also the complement of the false positive rate, which is the x-axis of the ROC curve.

## 9. Common Mistakes

- Not checking the axis convention before reading the numbers.
- Reading raw counts under imbalance instead of normalizing by row.
- Treating it as the final answer when it describes one arbitrary threshold.
- Skipping it and going straight to a single aggregate metric.
- Assuming it says anything about probability calibration.

## 10. What to Remember

- **Four cells; every metric derives from them.** Precision = column, recall = row.
- **Look at it first**, before any single number.
- **Attach costs to cells** and it becomes a threshold-selection tool.
- **Off-diagonal cells in multi-class name the specific fix.**
- **It's threshold-specific** and says nothing about ranking or calibration.
