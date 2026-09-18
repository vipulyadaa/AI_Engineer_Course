# Precision

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 32**

## 1. Definition

Of everything the model flagged as positive, what fraction actually was: `TP / (TP + FP)`. It answers *"when the model says yes, how often is it right?"*

## 2. Simple Explanation

Precision is about **trust in the alerts**.

If your fraud system flags 100 transactions and 30 are actually fraud, precision is 30%. The analysts reviewing that queue are wasting 70% of their time — and once they learn that, they start dismissing alerts reflexively, which destroys the system regardless of how good the model is.

**The denominator is what the model predicted.** That's the distinction from [recall](33-recall.md), whose denominator is what actually exists.

## 3. How It Works

```
                PREDICTED
              Pos      Neg
ACTUAL  Pos   TP       FN
        Neg   FP  ←    TN
              ↑
   Precision = TP / (TP + FP)
               └─ the predicted-positive column
```

1. Count the model's positive predictions.
2. Of those, count how many were correct.
3. Precision rises as you raise the threshold — you flag fewer things, and the ones you flag are the ones you're most sure about.
4. Raising precision almost always lowers recall. That's the core trade-off.

**Optimize precision when false positives are expensive.**

## 4. Practical Example

**The threshold controls it directly:**

```
τ      flagged   correct   precision   recall
0.3      850       310       36%        78%
0.5      420       240       57%        60%
0.7      180       144       80%        36%
0.9       45        42       93%        11%

Higher threshold → fewer, better alerts → higher precision, lower recall.
```

**In RAG, precision is the metric for the generation side.** Of the claims in the generated answer, how many are actually supported by the retrieved context? That's groundedness / faithfulness, and it's a precision measurement. A citation-checking step is a precision control.

Retrieval, by contrast, is usually optimized for recall first — you want the right chunk to be *in* the top-k — and then a reranker restores precision by reordering.

## 5. Why It Matters

- **It determines whether humans trust the system.** Low precision produces alert fatigue, and an ignored alert queue is worthless regardless of model quality.
- **It's the right primary metric when action is expensive** — blocking a customer, escalating to a human, sending a notification.
- **In RAG it's the groundedness question** — the fraction of generated claims actually supported by retrieved evidence.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Undefined at zero predictions** | If the model flags nothing, precision is 0/0. Libraries usually return 0 with a warning |
| **Trivially maximized** | Flag only the single most confident case and precision approaches 100% with near-zero recall |
| **Meaningless alone** | Always report alongside recall — precision by itself can be gamed by the threshold |
| **Depends on class balance** | Unlike recall, precision changes when the base rate changes, even with a fixed model |
| **Per-class in multi-class** | Macro-average weights classes equally; micro-average weights examples equally |

**The base-rate dependency is worth knowing:** the same model at the same threshold has lower precision when the positive class is rarer, because there are more negatives available to become false positives. That's why precision measured in a test set with a different base rate than production doesn't transfer.

## 7. Interview Answer

> "Precision is true positives over predicted positives — of everything the model flagged, what fraction was actually correct. It answers 'when the model says yes, how often is it right?'
>
> The denominator is what the model predicted, which is the clean distinction from recall, where the denominator is what actually exists.
>
> I'd optimize for precision when acting on a positive is expensive — blocking a customer, escalating to a human analyst, sending a notification. The practical reason is trust: if a fraud queue is thirty percent precise, analysts learn to dismiss alerts reflexively, and then the system delivers nothing no matter how good the model is.
>
> Two things I'd flag. Precision alone is gameable — flag only the single most confident case and it approaches a hundred percent with essentially zero recall. So I'd always report it with recall. And precision depends on the base rate in a way recall doesn't: the same model at the same threshold gets lower precision when positives are rarer, because there are more negatives available to become false positives. That means precision measured on a test set with a different base rate than production doesn't transfer.
>
> In my RAG work, precision is the groundedness question — of the claims in the generated answer, how many are actually supported by the retrieved context."

## 8. Likely Follow-ups

**Q: Precision or recall — which matters more?**
Depends entirely on error costs. Precision when false positives are expensive — blocking a legitimate customer, wasting analyst time, sending a wrong notification. Recall when false negatives are expensive — missing a fraud case, missing a cancer diagnosis, missing a compliance breach. Most real systems need both above some floor, which is what the threshold sweep against business cost is for.

**Q: How do you increase precision?**
Raise the decision threshold, which is free and immediate. Add features that separate the classes better. Add a second-stage filter — a reranker or a verification step — that reviews the model's positives. In RAG that second stage is exactly what a reranker or a citation-check does.

**Q: Why is precision undefined sometimes?**
When the model predicts no positives at all, the denominator is zero. Most libraries return 0 with a warning. It's worth knowing because it happens with a very high threshold or a severely imbalanced training set where the model learned to never predict the positive class.

**Q: Macro vs. micro precision in multi-class?**
Macro averages precision across classes, weighting each class equally — so a rare class counts as much as a common one, which is what you want when the rare class matters. Micro pools all predictions and computes precision globally, which weights each *example* equally and is dominated by common classes. For imbalanced multi-class problems I'd report macro, and often both.

**Q: What does precision mean in a RAG evaluation?**
Two different things at two stages, so I'd be specific. On retrieval, precision@k is the fraction of retrieved chunks that are actually relevant — low precision means the LLM is distracted by irrelevant context. On generation, it's groundedness: the fraction of claims in the answer supported by the retrieved context. They fail differently and I'd measure them separately.

## 9. Common Mistakes

- Reporting precision without recall.
- Not realizing precision can be trivially maximized by a high threshold.
- Assuming precision transfers across datasets with different base rates.
- Using micro-average on imbalanced multi-class when the rare class is what matters.
- Conflating retrieval precision with generation groundedness in RAG.

## 10. What to Remember

- **`TP / (TP + FP)`.** Denominator is what the model *predicted*.
- **"When it says yes, how often is it right?"**
- **Optimize it when acting is expensive** — and because low precision destroys human trust.
- **Gameable alone** — always pair with recall.
- **Base-rate dependent** — it doesn't transfer across datasets with different positive rates.
