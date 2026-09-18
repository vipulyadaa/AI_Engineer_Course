# Supervised Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 03**

## 1. Definition

Learning a function from **labeled input–output pairs** `(x, y)`. You're given inputs and their correct answers, and you learn a mapping that works on inputs you've never seen. It splits into classification (label is a category) and regression (label is a number).

## 2. Simple Explanation

You study with a textbook that has worked solutions (training set with labels), take practice tests to decide what to study next (validation set), then sit the real exam on unseen questions (test set).

The whole thing fails the same ways supervised learning does: memorize the solutions without understanding → overfitting. The textbook has errors → label noise. You saw the exam paper while studying → data leakage.

## 3. How It Works

1. **Collect labeled pairs** `D = {(x₁,y₁), ..., (xₙ,yₙ)}`.
2. **Split the data** — and this is where real bugs live (see below).
3. **Minimize empirical risk** on the training split: average loss + regularization.
4. **Tune on validation** — hyperparameters, architecture, when to stop, and the decision threshold.
5. **Report on test once** — this is your unbiased estimate of generalization.
6. **Monitor in production** — labels usually arrive late or never, so watch input distributions too.

**Splitting correctly matters more than model choice:**

| Data shape | Correct split | Why random fails |
|---|---|---|
| Independent rows | Random + stratified | Random is fine |
| **Anything temporal** | **Temporal** (past → future) | Random lets the model see the future |
| **Repeated entities** (multiple loans per customer) | **GroupKFold** on entity ID | Same customer in train and test = leakage |
| Heavy imbalance | Stratified | Test split may contain almost no positives |

## 4. Practical Example

**Loan default prediction.** Task stated precisely: *given features available at application time, predict `P(90+ days delinquent within 24 months)`.*

Each clause does work — "available at application time" rules out leakage; "90+ days" is auditable; "24 months" fixes the label window.

Then the threshold decision, which matters more than the model:

```
Default rate 4%, 10,000 test loans. Cost: FN = $8,000, FP = $400

τ = 0.50 →  FN=210, FP=260   →  $1,784,000
τ = 0.30 →  FN=120, FP=690   →  $1,236,000
τ = 0.20 →  FN=70,  FP=1,410 →  $1,124,000  ← best
τ = 0.15 →  FN=55,  FP=2,100 →  $1,280,000
```

**The threshold moved $660,000.** The model never changed. This is the most-skipped step in applied supervised learning.

**In your RAG work:** a RAG eval set is a supervised dataset — `x` = user question, `y` = correct answer or expected source document. Every rule here applies to it.

## 5. Why It Matters

- **It dominates production ML** because it's the only paradigm where you can directly measure correctness — hold out labeled data, predict, compare. That measurability is what gets a launch approved.
- **Labels are the real constraint, not algorithms.** Where they come from, how delayed they are, how noisy they are, and whether the label you can get is the quantity you actually care about.
- **It's the whole alignment stack.** Instruction tuning is literally supervised fine-tuning on human-written response pairs, and the RLHF reward model is a supervised preference classifier.

## 6. Trade-offs / Failure Modes

| Failure | Why it happens | Fix |
|---|---|---|
| **Temporal leakage** | Random split on time-ordered data | Split by time; audit every feature for availability at decision time |
| **Group leakage** | Same entity in train and test | `GroupKFold` on the entity ID |
| **Label latency** | Outcome takes 24 months to mature | Shorter-horizon proxy label, validated against the real one |
| **Label noise** | Vague annotation guidelines | Check inter-annotator agreement (kappa > 0.6) before blaming the model |
| **Wrong target variable** | The available label ≠ what you care about | Write both sentences side by side. "Who we hired" ≠ "who would succeed" |
| **Selection bias** | You only observe outcomes for decisions you made | Rejected applicants have no label, ever. Consider a small randomized-approval holdout |

**The deepest one:** the target variable is a modeling choice. Amazon's scrapped recruiting model (Reuters, 2018) faithfully learned a label encoding a decade of biased hiring. The model wasn't broken — the label was.

## 7. Interview Answer

> "Supervised learning is learning a function from labeled input–output pairs, where the goal isn't reproducing the training answers — a lookup table does that — but generalizing to inputs I've never seen. It splits into classification when the label is a category and regression when it's a number.
>
> It dominates production because it's the only paradigm where I can directly measure whether the system is right: hold out labeled examples, predict, compare.
>
> But the parts that actually bite are all around the model, not in it. First, splitting — anything with a time dimension needs a temporal split, because at serving time the model only ever has the past. A random split lets it see the future and the offline number becomes fiction. Second, labels — where they come from, how delayed, how noisy. Label noise sets a hard ceiling: if annotators disagree 15% of the time, no model beats 85%, and I should be fixing the guidelines, not the architecture.
>
> The one I'd flag hardest is that the target variable is a modeling choice. The label I can get is a proxy for what I care about, and every bias in the labeling process becomes a bias the model applies at scale."

## 8. Likely Follow-ups

**Q: Classification or regression for customer lifetime value?**
Regression, since CLV is continuous — but the distribution is heavily skewed, so I'd use MAE or a log-transformed target rather than raw MSE, otherwise a handful of whales dominate the loss. A hybrid (classify "will be high-value", then regress) is often more stable.

**Q: How much labeled data do you need?**
No universal number. I'd plot a learning curve — train on 10%, 25%, 50%, 100% and see whether validation performance is still climbing. Still rising steeply means more labels are the highest-ROI investment. Flat means improve features, model, or label quality instead.

**Q: You have 100 labeled examples and need a production classifier.**
That's a cold-start problem, not a training-set problem. Start with a pretrained model — embeddings plus a simple classifier genuinely works at a few hundred examples. Use an LLM zero-shot as the initial system with those 100 as the *eval* set. Then have the LLM pre-label a few thousand more, human-review the low-confidence ones, and train the small model on that.

**Q: Offline AUC improved but the A/B test shows no lift. Why?**
Four candidates, in cost order: the metric isn't the outcome (AUC ranks all pairs, production only shows top-3); the threshold never moved so almost no decisions flipped; training/serving skew where the feature transform differs between pipelines; or offline leakage meaning the number was never real. I'd log served feature vectors and re-score offline — a discrepancy proves skew.

**Q: How do you handle only observing labels for decisions you made?**
That's selection bias and it's structural in lending and hiring. Three options: reject inference (impute outcomes, but relies on unverifiable assumptions), a randomized holdout where you approve a small slice you'd have rejected and accept the losses, or a bandit framing with logged propensities. I'd push for the randomized holdout — without it the blind spot compounds every retraining cycle.

## 9. Common Mistakes

- Random split on time-series data.
- Fitting the scaler or imputer on all data instead of inside a Pipeline on train folds only.
- Accepting threshold 0.5 — that's a default, not a decision.
- Reporting accuracy on imbalanced data.
- Treating the label as ground truth instead of as a proxy with its own biases.
- Having no baseline — a number with nothing to compare to isn't a result.

## 10. What to Remember

- **Learn `f: X → Y` from labeled pairs. Goal is generalization, not reproduction.**
- **Splitting is where real bugs live:** temporal for time data, GroupKFold for repeated entities, stratify for imbalance.
- **Labels are the hard part:** source, latency, noise, and *is it the thing you actually care about?*
- **Tune the threshold on validation against business cost** — it often moves more money than the model does.
- **Structural limits:** label latency, selection bias, feedback loops, non-stationary relationships.
