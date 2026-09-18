# Precision vs. Recall

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 38**

## 1. Definition

The fundamental trade-off in classification. [Precision](32-precision.md) is how many of your positives are correct; [recall](33-recall.md) is how many of the real positives you caught. With a fixed model, raising one lowers the other — and the threshold is the dial.

## 2. Simple Explanation

You're deciding how aggressively to flag things.

**Flag aggressively** → you catch more real cases (high recall) and also more false alarms (low precision).
**Flag conservatively** → the things you flag are almost certainly right (high precision) but you miss a lot (low recall).

There's no setting that maximizes both with a fixed model. Improving *both* requires a better model, better features, or a second-stage filter — not a different threshold.

## 3. How It Works

```
threshold   flagged   precision   recall
   0.1       2,400       22%        94%    ← aggressive
   0.3         850       36%        78%
   0.5         420       57%        60%    ← default (arbitrary)
   0.7         180       80%        36%
   0.9          45       93%        11%    ← conservative
```

**How to actually choose:**
1. Assign a cost to a false positive and a false negative.
2. Sweep the threshold on validation, computing `cost = FN×C_fn + FP×C_fp`.
3. Pick the minimum-cost threshold.
4. Sanity-check against operational capacity — if it produces 5,000 alerts and the team reviews 200, the math is right and the system is unusable.
5. Freeze it, then evaluate on test.

## 4. Practical Example

**Which to favour, by domain:**

| System | Favour | Why |
|---|---|---|
| Cancer screening | **Recall** | A missed cancer is catastrophic; a false positive means a follow-up test |
| Spam filter | **Precision** | A legitimate email in spam is worse than spam in the inbox |
| Fraud blocking (auto-block) | **Precision** | Blocking a real customer mid-purchase is very costly |
| Fraud review queue | **Recall**, capped by analyst capacity | A human filters the false positives |
| RAG retrieval | **Recall** first | If the chunk isn't in top-k, nothing downstream recovers it |
| RAG generation | **Precision** (groundedness) | A confident unsupported claim is worse than "I don't know" |

**The fraud pair is the most instructive:** the same underlying detection problem needs opposite optimizations depending on whether the action is automatic or human-reviewed. That's the point — the trade-off is decided by the *action*, not by the model.

**The way out of the trade-off is a two-stage system.** In RAG: retrieve 20 chunks for recall, then rerank down to 4 for precision. In fraud: cast a wide net, then have humans or a second model filter. You get both, because each stage optimizes one.

## 5. Why It Matters

- **It's the most common "how would you decide?" question in ML interviews**, and it tests product judgment more than technical knowledge.
- **The threshold is free.** You can shift system behavior substantially without retraining.
- **The right answer depends on the action taken**, not the model — auto-block versus human-review flips it.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Leaving the threshold at 0.5** | It's a library default, not a decision. Usually the single biggest missed improvement |
| **Optimizing one in isolation** | Either is trivially maximizable and meaningless alone |
| **Ignoring operational capacity** | High recall is worthless if the alert volume exceeds review capacity |
| **Choosing the threshold on test** | Makes the reported number optimistic |
| **Assuming one threshold fits all segments** | Different customer tiers or regions may warrant different cut points |

## 7. Interview Answer

> "Precision and recall trade off against each other through the decision threshold. Flag aggressively and you catch more real cases but generate more false alarms. Flag conservatively and what you flag is almost certainly right, but you miss a lot. With a fixed model you can't maximize both.
>
> Which one I favour depends on the cost of each error type — and specifically on what *action* follows the prediction. The clearest illustration is fraud: if the system auto-blocks transactions, I want precision, because blocking a real customer mid-purchase is very costly. If it feeds a human review queue, I want recall, because a human filters the false positives and a miss is unrecoverable. Same detection problem, opposite optimization, decided by the action.
>
> How I'd actually choose: assign a dollar cost to a false positive and a false negative, sweep the threshold on validation, compute total cost at each point, and take the minimum. Then sanity-check against capacity — if the optimal threshold produces five thousand alerts and the team reviews two hundred, the math is right and the system is unusable, so capacity is the real constraint.
>
> And the way out of the trade-off is a two-stage system. In my RAG work that's retrieve wide for recall, then rerank down for precision — twenty candidates from cheap vector search, four after a cross-encoder. Each stage optimizes one side, so I get both."

## 8. Likely Follow-ups

**Q: How do you choose the threshold?**
Assign costs to false positives and false negatives, sweep the threshold on validation, and minimize expected cost. If costs are genuinely unknown, I'd elicit them by asking how many false alarms the business would accept to catch one more real case — that ratio is the information I need even if nobody can name dollar figures. Then freeze the threshold before touching test.

**Q: Can you improve both at once?**
Not by moving the threshold — that only slides along the curve. You improve both by moving the curve itself: better features, more training data, a better model, or a two-stage architecture where one stage optimizes recall and the next restores precision. That last one is the most practical and it's the standard design in both retrieval and fraud systems.

**Q: What's the precision–recall curve?**
Precision plotted against recall as the threshold sweeps. It shows the full set of achievable operating points for a fixed model, which is what lets you choose one deliberately. The area under it is PR-AUC, and a model whose curve is entirely above another's is better at every operating point.

**Q: Which matters more for a RAG system?**
Different answers at different stages, which is worth saying explicitly. Retrieval is recall-first — if the correct chunk isn't in the top-k, no prompt engineering recovers it, so recall@k upper-bounds answer quality. Generation is precision-first — groundedness, meaning the fraction of claims actually supported by the retrieved context. A confident unsupported claim is worse than admitting ignorance.

**Q: How do you explain this trade-off to a product manager?**
In their units, not mine. "If we tighten the filter, we'll block 40 fraudulent transactions a day and wrongly block 12 real customers. If we loosen it, we'll block 70 fraudulent ones and wrongly block 90 real customers. Which of those do you want?" That converts a metrics conversation into a business decision, which is what it actually is.

## 9. Common Mistakes

- Leaving the threshold at 0.5 without justification.
- Reporting one metric without the other.
- Choosing the threshold on the test set.
- Ignoring whether the resulting alert volume is operationally reviewable.
- Treating it as a model-quality question when it's a business-cost question.

## 10. What to Remember

- **The threshold is the dial.** Raising one lowers the other with a fixed model.
- **The action decides which to favour** — auto-block wants precision, human review wants recall.
- **Choose by cost:** sweep on validation, minimize `FN×C_fn + FP×C_fp`, then check capacity.
- **Two-stage systems escape the trade-off** — retrieve wide, rerank narrow.
- **In RAG: recall for retrieval, precision for generation.**
