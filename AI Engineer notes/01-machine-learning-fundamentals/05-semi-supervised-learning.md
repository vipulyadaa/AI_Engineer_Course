# Semi-Supervised Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 05**

## 1. Definition

Training on a **small labeled set plus a large unlabeled set**. You use the structure visible in the unlabeled data to improve a model that only a few labels could otherwise support.

## 2. Simple Explanation

You have 500 labeled medical scans and 50,000 unlabeled ones. Labeling the rest costs a radiologist's time you can't buy.

Semi-supervised learning says: the unlabeled scans still tell you something — where the data is dense, which images resemble each other, what the natural boundaries look like. Use that shape to place a decision boundary more sensibly than 500 points alone would allow.

## 3. How It Works

The main techniques:

1. **Self-training (pseudo-labeling)** — train on the labeled set, predict on unlabeled data, add the high-confidence predictions as labels, retrain. Repeat.
2. **Consistency regularization** — a small perturbation of an input shouldn't change the prediction. Penalize the model when it does, using unlabeled data for free.
3. **Label propagation** — build a graph of similar examples and spread labels from labeled nodes to their neighbors.
4. **Pretrain-then-finetune** — learn representations from unlabeled data ([self-supervised](06-self-supervised-learning.md)), then fine-tune on the small labeled set. **This is the dominant modern form.**

**The load-bearing assumption:** the *cluster assumption* — points in the same dense region share a label, and decision boundaries fall in low-density regions. If that's false for your data, semi-supervised learning actively hurts.

## 4. Practical Example

**Intent classification for a banking assistant.** You have 300 labeled messages and 80,000 unlabeled production logs.

```
1. Train a classifier on the 300 labeled examples        → ~72% accuracy
2. Predict on the 80,000 unlabeled messages
3. Keep only predictions with confidence > 0.95          → ~9,000 pseudo-labels
4. Retrain on 300 real + 9,000 pseudo-labels             → ~84% accuracy
5. Spot-check a sample of pseudo-labels by hand          ← do not skip this
```

**The modern version you'd actually reach for:** use a strong LLM to pre-label the 80,000, have a human review the low-confidence subset, and train a small fast classifier on the result. That's semi-supervised learning where the "unlabeled structure" comes from a foundation model's pretraining rather than from your own corpus — and it's cheaper and better than classic self-training for text.

## 5. Why It Matters

- **Labeling is usually the binding constraint**, not compute or algorithms. This is the direct answer to "we have data but no labels."
- **It's the shape of modern NLP.** Pretrain on unlabeled text, fine-tune on a few hundred labeled examples. Your 500-example text classifier works *only* because someone else already paid the representation cost.
- **It defines a realistic labeling strategy** — combined with active learning (label the examples the model is least confident about), you get far more accuracy per labeling hour than random sampling.

## 6. Trade-offs / Failure Modes

| Failure | Why it happens | Fix |
|---|---|---|
| **Confirmation bias / error amplification** | Self-training reinforces its own mistakes — a wrong pseudo-label becomes training data | High confidence threshold; cap pseudo-labels per class; spot-check by hand |
| **Cluster assumption violated** | Classes genuinely overlap in feature space | Verify that unlabeled data actually helps on a held-out set; be willing to abandon it |
| **Class imbalance amplification** | The model is confident on the majority class, so pseudo-labels skew further | Balance pseudo-labels per class, not globally |
| **Distribution mismatch** | Unlabeled data comes from a different source than labeled data | Check that both sets look alike before combining |

**The essential guardrail:** always keep a **fully labeled held-out set** that contains zero pseudo-labels. Otherwise you measure the model's agreement with itself.

## 7. Interview Answer

> "Semi-supervised learning uses a small labeled set plus a large unlabeled set, on the premise that unlabeled data still tells you about the shape of the distribution even without answers.
>
> The classic technique is self-training — train on what you have, predict on the unlabeled pool, add the high-confidence predictions as pseudo-labels, retrain. The risk there is confirmation bias: a wrong pseudo-label becomes training data and the model gets more confident in its own mistake. So I'd use a high confidence threshold, balance pseudo-labels per class, and always hold out a set with zero pseudo-labels in it.
>
> But the dominant modern form is pretrain-then-finetune. A model learns representations from massive unlabeled data, then I fine-tune on a few hundred labeled examples. That's why a 500-example text classifier works at all today — someone else already paid the representation cost.
>
> In practice, for a text problem now I'd use an LLM to pre-label a large batch, have humans review only the low-confidence cases, then train a small fast model on the result. Same idea, better economics — I get the LLM's quality at a fraction of the serving cost."

## 8. Likely Follow-ups

**Q: When does semi-supervised learning hurt?**
When the cluster assumption fails — if classes genuinely overlap in feature space, propagating labels through dense regions spreads errors. Also when the unlabeled data comes from a different distribution than the labeled data. I'd always verify against a clean held-out set rather than assuming more data helps.

**Q: What confidence threshold for pseudo-labeling?**
There's no universal number, but high — 0.95 or above is typical, and I'd tune it on validation. The trade-off is direct: lower threshold gives more pseudo-labels with more noise. I'd also cap per class, because the model is systematically more confident on the majority class and unconstrained pseudo-labeling makes imbalance worse.

**Q: How is this different from active learning?**
Opposite strategies for the same problem. Semi-supervised learning uses unlabeled data *without* labeling it. Active learning chooses *which* examples to send to a human, prioritizing the ones the model is least confident about. They compose well — pseudo-label the confident cases, send the uncertain ones to a human.

**Q: Is RAG semi-supervised?**
No. RAG doesn't learn from your documents at all — it retrieves them at inference time and puts them in the prompt. No parameters update. The confusion is worth correcting explicitly: retrieval changes what the model *knows at that moment*, training changes what it *has learned*.

## 9. Common Mistakes

- Evaluating on data that contains pseudo-labels — you're measuring the model's agreement with itself.
- Using a low confidence threshold and amplifying errors.
- Assuming unlabeled data always helps; verify it on a clean held-out set.
- Calling RAG or few-shot prompting "semi-supervised" — neither updates parameters.
- Ignoring the class-balance skew that pseudo-labeling introduces.

## 10. What to Remember

- **Small labeled + large unlabeled.** Directly addresses the labeling bottleneck.
- **Self-training's risk is confirmation bias** — high threshold, per-class caps, hand spot-checks.
- **The cluster assumption must hold**: same dense region → same label. Verify it.
- **Pretrain-then-finetune is the modern dominant form** — and it's why small-data text classification works today.
- **Always keep a held-out set with zero pseudo-labels.**
