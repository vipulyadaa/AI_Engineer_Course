# Recall

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 33**

## 1. Definition

Of everything that actually was positive, what fraction the model caught: `TP / (TP + FN)`. It answers *"of all the real cases, how many did we find?"* Also called sensitivity or true positive rate.

## 2. Simple Explanation

Recall is about **not missing things**.

If there were 100 fraud cases last month and your model caught 60, recall is 60% — forty went through undetected. Nobody sees those. They don't appear in any alert queue. That invisibility is exactly why recall is the metric that gets neglected and the one that causes the expensive failures.

**The denominator is what actually exists**, not what the model predicted. That's the distinction from [precision](32-precision.md).

## 3. How It Works

```
                PREDICTED
              Pos      Neg
ACTUAL  Pos   TP       FN  ←  Recall = TP / (TP + FN)
        Neg   FP       TN     └─ the actual-positive ROW
```

1. Count everything that was genuinely positive.
2. Of those, count how many the model caught.
3. Recall rises as you **lower** the threshold — flag more things, catch more real ones.
4. Lowering the threshold lowers precision. That's the trade-off.

**Optimize recall when misses are expensive** — medical screening, fraud, safety, compliance.

## 4. Practical Example

**Recall is the retrieval metric in RAG, and it's the one to get right first:**

```
recall@k = fraction of questions where the correct chunk
           appears anywhere in the top-k retrieved

k=3    recall 0.71
k=5    recall 0.84
k=10   recall 0.92
k=20   recall 0.96
```

**Why this ordering matters:** if the right chunk isn't in the top-k at all, no prompt engineering can recover it. The information simply isn't in the context. So retrieval recall is an upper bound on end-to-end answer quality.

The standard architecture follows directly: **retrieve wide for recall, then rerank for precision.** Pull 20 candidates with cheap vector search to get recall@20 = 0.96, then a cross-encoder reranker picks the best 4. You get high recall from the first stage and high precision from the second, without paying to run the expensive model over everything.

**When a RAG answer is wrong, the first diagnostic is always: was the right chunk retrieved at all?** That's a recall measurement, and it splits "retrieval problem" from "generation problem" immediately.

## 5. Why It Matters

- **Misses are invisible.** False positives show up in a queue; false negatives show up as a lawsuit, a chargeback, or a missed diagnosis.
- **It's the primary retrieval metric in RAG** and an upper bound on answer quality.
- **It's stable across base rates**, unlike precision — which makes it more comparable across datasets.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Trivially maximized** | Predict positive for everything and recall is 100% with useless precision |
| **Meaningless alone** | Always report with precision |
| **Requires knowing all the positives** | You often can't measure it — you don't know about the fraud nobody reported |
| **High recall raises review load** | Catching more means flagging more, and someone has to handle that volume |
| **Selection bias** | In lending or hiring, you have no outcomes for what you rejected, so true recall is unknowable |

**The measurement problem is real and worth raising.** You can't compute true recall when negatives include undetected positives. In fraud, the denominator is "fraud that happened," and you only know about the fraud someone noticed. Reported recall is an upper bound on true recall — that's a genuinely senior observation.

## 7. Interview Answer

> "Recall is true positives over actual positives — of everything that genuinely was positive, what fraction the model caught. The denominator is what exists in reality, which is the distinction from precision, where the denominator is what the model predicted.
>
> I'd optimize for recall when misses are expensive — fraud, medical screening, safety, compliance. The reason it gets neglected is that misses are invisible. A false positive lands in someone's queue and generates a complaint. A false negative generates nothing at all until it becomes a chargeback or a lawsuit.
>
> It's the metric I care most about in retrieval. Recall@k is the fraction of questions where the correct chunk appears anywhere in the top-k, and it's an upper bound on end-to-end answer quality — if the right chunk isn't in the context, no prompt engineering recovers it. That's why the standard architecture is retrieve wide for recall then rerank for precision: pull twenty candidates cheaply, let a cross-encoder pick the best four.
>
> The caveat I'd raise is that you often can't actually measure recall. In fraud, the denominator is 'fraud that happened', and you only know about the fraud someone reported. So reported recall is an upper bound on true recall, and in lending you have no outcomes for applications you rejected at all."

## 8. Likely Follow-ups

**Q: How do you increase recall?**
Lower the decision threshold, which is immediate and free but costs precision. Improve features so the classes separate better. In retrieval, increase k, or use hybrid search combining BM25 with vector similarity so lexical and semantic matches both contribute — that's usually the biggest recall gain available in a RAG system.

**Q: Why is recall the priority in RAG retrieval?**
Because it's an upper bound on everything downstream. If the correct chunk isn't in the top-k, the LLM cannot produce a grounded answer — the information isn't there. Precision problems are recoverable with a reranker or a better prompt; recall problems aren't recoverable at all.

**Q: Can you always measure recall?**
No, and this matters. It requires knowing every true positive, which you often don't — you only know about the fraud someone reported, the disease someone was eventually diagnosed with. Reported recall is an upper bound on true recall. In lending it's worse: you have no outcomes at all for applications you rejected, so recall in that population is structurally unknowable without a randomized approval holdout.

**Q: Recall vs. sensitivity vs. true positive rate?**
Same thing, three names from different fields — ML, medicine, and signal detection respectively. Worth knowing all three since interviewers switch vocabulary. Specificity is the complementary one: true negatives over actual negatives, which is recall for the negative class.

**Q: What's the cost of high recall?**
Review volume and precision. Catching 95% instead of 70% typically means flagging several times as many cases, and someone has to handle them. If your team can review 200 alerts a day, a recall target that produces 2,000 alerts isn't a better system — it's an unusable one. The binding constraint is often operational capacity, not model quality.

## 9. Common Mistakes

- Reporting recall without precision.
- Not recognizing that recall can be trivially maximized by flagging everything.
- Assuming measured recall equals true recall when undetected positives exist.
- Optimizing recall without checking whether the resulting alert volume is reviewable.
- In RAG, debugging the prompt when the right chunk was never retrieved.

## 10. What to Remember

- **`TP / (TP + FN)`.** Denominator is what *actually exists*.
- **"Of all the real cases, how many did we find?"**
- **Optimize it when misses are expensive** — and remember misses are invisible.
- **It's the retrieval metric in RAG** and an upper bound on answer quality.
- **Retrieve wide for recall, rerank for precision.** That's the standard architecture and it comes straight from this trade-off.
