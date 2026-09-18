# Classification

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 08**

## 1. Definition

Supervised learning where the label is a **discrete category**. The model outputs a probability per class, and a threshold or argmax converts that into a decision.

## 2. Simple Explanation

"Which bucket does this go in?" Spam or not spam. Which of five intents. Which disease.

The key thing most people miss: a classifier doesn't really output a class — it outputs a **score**, and *you* choose where to cut. That cut point is a business decision, not a model property, and moving it changes everything about how the system behaves.

## 3. How It Works

1. **Model produces logits** — raw unbounded scores, one per class.
2. **Convert to probabilities** — sigmoid for binary, softmax for multi-class (forces the outputs to sum to 1).
3. **Train with cross-entropy loss** — heavily penalizes confident wrong predictions.
4. **Choose a decision rule** — threshold for binary, argmax for multi-class.
5. **Evaluate with a confusion matrix** and the metrics that match your error costs.

**The three types:**

| Type | Output | Activation | Example |
|---|---|---|---|
| **Binary** | One probability | Sigmoid | Spam / not spam |
| **Multi-class** | One class from N, mutually exclusive | Softmax | Route to 1 of 5 intents |
| **Multi-label** | Any number of N tags | Sigmoid per label | Tag a document with topics |

Multi-class vs. multi-label is a common confusion: softmax forces a single winner, so using it for multi-label problems is a modeling error.

## 4. Practical Example

**Banking intent classification** — 5 classes, and the metric that matters is per-class, not overall:

```
Overall accuracy: 91%   ← looks fine

Per class:
  balance_inquiry     precision 0.96  recall 0.98   n=4,200
  card_lost           precision 0.93  recall 0.89   n=1,100
  loan_application    precision 0.88  recall 0.91   n=  800
  complaint           precision 0.61  recall 0.42   n=  180  ← the problem
  other               precision 0.55  recall 0.71   n=  320
```

The 91% is carried by the easy majority classes. `complaint` — arguably the highest-stakes class, since a missed complaint becomes a regulatory issue — is being caught less than half the time. **Always slice by class.**

**In RAG:** query routing is classification. Deciding whether a question needs retrieval, needs a tool, or can be answered directly is a classifier, and the same per-class analysis applies.

## 5. Why It Matters

- **Most production ML decisions are classification.** Fraud/not-fraud, route/escalate, approve/decline.
- **The threshold is a free lever.** You can change system behavior dramatically without retraining, by moving where you cut.
- **Aggregate accuracy hides the failures that matter.** The rare class is usually the one with business consequences.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Accuracy on imbalanced data** | 99% by always predicting the majority class | Report per-class precision/recall and PR-AUC |
| **Accepting threshold 0.5** | It's a library default, not a decision | Tune on validation against the cost of FP vs. FN |
| **Poor calibration** | A "0.9" that's only right 60% of the time | Check a calibration curve; apply Platt scaling or isotonic regression |
| **Softmax for multi-label** | Forces one winner when multiple labels are valid | Sigmoid per label with independent thresholds |
| **No "none of the above" class** | Model must pick from N even for out-of-scope inputs | Add an explicit `other` class or a confidence floor |

**Calibration matters more than people think.** If you route based on "confidence > 0.8", you need that 0.8 to mean something. Neural networks are typically overconfident out of the box.

## 7. Interview Answer

> "Classification is supervised learning where the label is a discrete category. The model outputs logits, sigmoid or softmax turns those into probabilities, and cross-entropy is the training loss.
>
> The thing I'd emphasize is that a classifier doesn't really output a class — it outputs a score, and I choose where to cut. That threshold is a business decision, not a model property, and on a real problem moving it can change the outcome more than swapping models does. I'd tune it on validation against the actual cost of a false positive versus a false negative, not accept 0.5 because it's the default.
>
> On evaluation, aggregate accuracy is almost always misleading. I'd look at the confusion matrix and per-class precision and recall, because a 91% overall number is usually carried by easy majority classes while the rare high-stakes class — a complaint, a fraud case — is being missed half the time.
>
> I'd also check calibration if anything downstream consumes the probability. If I'm routing on 'confidence above 0.8', that number needs to mean something, and neural nets are typically overconfident out of the box."

## 8. Likely Follow-ups

**Q: Binary vs. multi-class vs. multi-label?**
Binary is one probability with a threshold. Multi-class picks one of N mutually exclusive classes using softmax. Multi-label assigns any number of N tags using an independent sigmoid per label. The common error is using softmax for a multi-label problem, which forces a single winner when several labels are legitimately true.

**Q: Why cross-entropy instead of accuracy as the loss?**
Accuracy isn't differentiable — it's a step function, so there's no gradient to follow. Cross-entropy is smooth and it penalizes confident wrong answers much more heavily than uncertain ones, which is the behavior you want. Accuracy is an evaluation metric; cross-entropy is a training objective.

**Q: How do you handle a "none of the above" input?**
Either an explicit `other` class trained on out-of-scope examples, or a confidence floor where predictions below a threshold get routed to fallback. The explicit class usually works better if you can collect the examples. In a RAG system this matters a lot — answering an out-of-scope question with the nearest irrelevant chunk is worse than saying "I don't cover that."

**Q: What is calibration and how do you check it?**
A calibrated model's confidence matches its accuracy — among predictions at 0.8 confidence, roughly 80% should be correct. Check it by binning predictions by confidence and plotting predicted vs. actual accuracy. Fix with Platt scaling or isotonic regression fit on validation data. It matters whenever anything downstream consumes the probability rather than just the argmax.

**Q: Your classifier is 95% accurate but the business is unhappy. Why?**
Most likely the 5% of errors is concentrated in a class that matters. I'd break accuracy down per class and look at the confusion matrix — which class is being confused with which. It could also be a threshold issue, or that the offline distribution doesn't match production traffic.

## 9. Common Mistakes

- Reporting accuracy alone on imbalanced data.
- Treating 0.5 as a principled threshold.
- Using softmax for multi-label problems.
- Assuming the output probability is calibrated.
- Not slicing metrics by class — aggregate numbers hide the failures that matter.
- Forgetting the out-of-scope case entirely.

## 10. What to Remember

- **Output a score, then choose the cut.** The threshold is a business lever, tuned on validation against error costs.
- **Binary → sigmoid. Multi-class → softmax. Multi-label → sigmoid per label.**
- **Cross-entropy trains; accuracy evaluates** — and accuracy is a bad evaluator under imbalance.
- **Always slice per class.** The rare class is usually the expensive one.
- **Check calibration** if anything downstream consumes the probability.
