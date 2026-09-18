# What Is Machine Learning?

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 01**

## 1. Definition

Machine learning builds systems whose behavior is learned from data instead of written as explicit rules. You supply examples plus a measure of "wrong", and an optimizer finds parameters that minimize it. The goal is not to fit the examples — it's to work on data never seen before.

## 2. Simple Explanation

Normally you write rules, feed in data, and get answers out. ML flips this: you feed in data **and** answers, and what comes out is the rules.

You use it when you can *recognize* the right answer but can't *write* the rule. You know a cat photo when you see one, but you can't write the `if` statements. ML turns "I can label it" into "I can compute it."

## 3. How It Works

1. **Choose a hypothesis space** — pick a model family (linear, tree, neural net). This is a bet that a good enough function lives inside it.
2. **Define a loss function** — a number saying how wrong a prediction is. MSE for regression, cross-entropy for classification.
3. **Optimize** — gradient descent adjusts parameters to reduce loss: `θ ← θ - η·∇J(θ)`.
4. **Hold out data** — split into train / validation / test. Fit on train, tune on validation, report on test **once**.
5. **Evaluate on unseen data** — training performance proves memorization; held-out performance proves generalization.
6. **Monitor after deployment** — accuracy decays silently as the world shifts.

## 4. Practical Example

Spam classification with one feature (count of the word "free"):

| Email | "free" count | Spam? |
|---|---|---|
| A | 0 | No |
| B | 1 | No |
| C | 3 | Yes |
| D | 5 | Yes |

Start at `w = 0` (every prediction 0.5). Gradient descent pushes `w` positive because higher counts correlate with spam. It converges near `w ≈ 2.2, b ≈ -2.6` → decision boundary at ~1.2 occurrences.

Note the limitation: it's defeated by "FREE" or "complimentary". The feature *was* the model. That's exactly why the field moved to learned features — and why [embeddings](../06-embeddings/README.md) matter for your RAG work.

## 5. Why It Matters

- **It's the foundation under LLMs.** Pretraining is [self-supervised learning](06-self-supervised-learning.md) — a special case of this loop where the label comes from the data itself.
- **The evaluation discipline transfers directly.** Your RAG eval set is a held-out labeled dataset, and tuning prompts against it is training on test.
- **It sets expectations for cost.** Rules ship once; an ML system is a permanent obligation — pipelines, retraining, drift monitoring, rollback.

## 6. Trade-offs / Failure Modes

| Failure | Cause | Fix |
|---|---|---|
| **Overfitting** | Model memorizes noise instead of pattern | Regularization, more data, early stopping |
| **Distribution shift** | Production data stops resembling training data | Monitor input distributions; retrain |
| **Data leakage** | A feature encodes the answer, or preprocessing saw test data | Split first; audit feature availability at decision time |
| **Wrong metric** | Accuracy on imbalanced data hides everything | Match the metric to the cost of each error type |

**The load-bearing assumption:** production data resembles training data. Nearly every production ML failure is a version of that breaking.

## 7. Interview Answer

> "Machine learning is how you build a system when you can recognize the right answer but can't write the rule that produces it. Instead of coding logic, you supply examples plus a loss function that scores how wrong a prediction is, and an optimizer searches for parameters that minimize that loss.
>
> There are really four pieces: a model family, a loss function, an optimizer, and — the part that separates working systems from demos — an evaluation protocol where you score on held-out data. Training performance tells you it memorized; held-out performance tells you it generalized.
>
> The thing I'd flag as an engineer is that the whole approach rests on one assumption: that production data looks like training data. Most production failures are that assumption quietly breaking, and the model doesn't throw an exception when it does — it just gets worse.
>
> In my own work this shows up in RAG systems. The pretraining behind those models is self-supervised learning, and the part I actually control and measure — retrieval quality — is straight precision and recall on a held-out eval set."

## 8. Likely Follow-ups

**Q: When would you *not* use ML?**
When a deterministic rule already exists and works — it's exact, free, and auditable. When errors are catastrophic and unbounded. When you have very little data. When you legally need to explain every decision. And when a simple heuristic already gets you 90% — ship that first, and let the remaining 15% justify the ML project's permanent operational cost.

**Q: Why do you need a validation set if you have a test set?**
Because you make decisions with the validation set — architecture, hyperparameters, when to stop. Every decision fits information from that set into your model, so its score becomes optimistic. The test set is the one you haven't optimized against, which is the only reason its number means anything.

**Q: Your model gets 99% accuracy. Are you happy?**
Not until I know the class balance. If 99% of examples are negative, predicting "no" every time scores 99% and is worthless. I'd look at the confusion matrix and report precision and recall for the class I actually care about.

**Q: What's the difference between training and inference?**
Training adjusts parameters using labeled data and is done in batch, offline, expensively. Inference applies the frozen parameters to new inputs and is what runs in production under a latency budget.

## 9. Common Mistakes

- Saying "the computer learns like a human" — anthropomorphism with no mechanism.
- Defining ML by listing algorithms instead of framing the decision it supports.
- Reporting accuracy without the class balance or threshold.
- Confusing training loss with generalization — always name which split a number came from.
- Saying "more data always helps" — more *representative* data helps; more of the same skew doesn't.
- Claiming production ML training experience you don't have. Say "I understand this; my hands-on work is RAG and LLM applications."

## 10. What to Remember

- **ML in one line:** learn `f: X → Y` from examples by minimizing a loss, and prove it generalizes on data you never trained on.
- **Four objects:** hypothesis space, loss function, optimizer, evaluation protocol.
- **The assumption:** production data ~ training data. Every failure traces back here.
- **Test set is a budget, not a dashboard** — touch it once.
- **Don't use ML** when a rule is known, data is tiny, or errors are catastrophic.
