# Concept Drift

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 30**

## 1. Definition

A change in the **relationship** between inputs and outputs — `P(Y|X)` shifts. The same input now implies a different outcome. This is the harder drift to handle because detecting and fixing it both require new labels.

## 2. Simple Explanation

[Data drift](29-data-drift.md) is seeing different questions. Concept drift is the *answers changing* for questions you already knew.

A fraud model learns that a particular transaction pattern signals fraud. Fraudsters read the same signals, adapt, and now that pattern is mostly legitimate while a new pattern is fraudulent. Your inputs may look completely unchanged — that's what makes it insidious.

## 3. How It Works

**The four patterns:**

| Pattern | Shape | Example |
|---|---|---|
| **Sudden** | Overnight change | A regulation takes effect; a competitor exits |
| **Gradual** | Old and new coexist, new grows | Slow change in customer preferences |
| **Incremental** | Steady directional movement | Inflation shifting what "high value" means |
| **Recurring** | Cyclical return | Seasonal purchasing behavior |

**Why it's hard:**
1. Inputs can look identical, so input-distribution monitoring won't fire.
2. Detection requires comparing predictions to *outcomes* — which means labels.
3. Labels arrive with latency (chargebacks at 60 days, defaults at 24 months).
4. So by the time you can confirm it, you've been wrong for a while.

**You are structurally behind.** That's the defining property, and stating it is the mark of someone who's thought about it.

## 4. Practical Example

**Adversarial concept drift** is the sharpest case — fraud, spam, abuse. The drift isn't environmental, it's *caused by your model*. Deploy a detector, adversaries probe it, find what gets through, and shift. The better your model, the stronger the pressure to change.

```
Week 1   model catches 78% of fraud
Week 6   catches 71%  — inputs look unchanged; PSI all < 0.05
Week 12  catches 54%  — chargeback data confirms: the pattern moved

Input monitoring never fired. Only delayed labels revealed it.
```

**Mitigations for adversarial settings:** retrain frequently on the freshest labels, use ensembles so there's no single boundary to probe, keep unpredictable rule-based checks alongside the model, and don't expose confidence scores externally.

**In RAG:** concept drift is when the *correct answer* to a question changes — a fee schedule updates, a policy is revised. The question is identical; the right answer isn't. This is exactly the failure RAG is designed to prevent, provided your index is fresh. A stale chunk means confidently serving last year's policy. Re-indexing cadence is a concept-drift control.

## 5. Why It Matters

- **It's the drift input monitoring can't catch**, so a system watching only PSI has a blind spot.
- **In adversarial domains it's guaranteed and continuous**, not an occasional event.
- **It's the strongest argument for RAG over fine-tuning facts into a model** — retrieval updates instantly, weights don't.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Mitigation |
|---|---|---|
| **Undetectable without labels** | Inputs unchanged, so PSI stays quiet | Proxy metrics: override rate, human-reversal rate, complaint volume |
| **Label latency** | You're wrong for weeks before confirming | Shorter-horizon proxy labels, validated against the real ones |
| **Adversarial acceleration** | Your model causes the drift | Frequent retraining, ensembles, unpredictable rules alongside |
| **Retraining on a stale window** | A long training window dilutes the new concept | Weight recent data more, or use a sliding window |
| **Confusing it with data drift** | Wrong diagnosis, wrong fix | Data drift needs recent data; concept drift needs recent *labels* |

## 7. Interview Answer

> "Concept drift is when the relationship between inputs and outputs changes — the same input now implies a different outcome. That's distinct from data drift, where the inputs change but their meaning doesn't.
>
> It's the harder one for a specific structural reason: the inputs can look completely unchanged, so input-distribution monitoring never fires. Detecting it requires comparing predictions to actual outcomes, which requires labels, and labels arrive late — chargebacks at sixty days, defaults at twenty-four months. So by the time you can confirm concept drift, you've been degrading for a while. You're structurally behind, and that's the defining property.
>
> The sharpest version is adversarial. In fraud or spam, the drift isn't environmental — it's *caused by* your model. You deploy a detector, adversaries probe it, find what gets through, and shift. The better your model, the stronger the pressure. So there I'd retrain frequently on the freshest labels, use ensembles so there's no single boundary to probe, and keep some unpredictable rule-based checks alongside.
>
> Since I can't rely on labels arriving in time, I'd lean on proxy metrics — override rate, how often a human reverses the decision, complaint volume. Those move in days rather than months.
>
> In RAG this is exactly the failure retrieval is meant to prevent: when a fee schedule changes, the question is identical and the correct answer isn't. Re-indexing cadence is genuinely a concept-drift control."

## 8. Likely Follow-ups

**Q: How do you detect concept drift without waiting for labels?**
Proxy metrics that move faster than ground truth — how often a human overrides the model, how often a decision is reversed downstream, complaint or appeal volume, and any downstream behavioral signal. I'd also monitor the model's confidence distribution, since increasing uncertainty on inputs that used to be easy is suggestive. None of these is conclusive, but they buy weeks over waiting for labels.

**Q: Concept drift vs. data drift — the practical difference?**
Data drift changes `P(X)`, is detectable without labels, and is usually fixed by retraining on recent data. Concept drift changes `P(Y|X)`, is only detectable with labels, and requires recent *labeled* data — which is the constraint. Getting the diagnosis wrong means retraining on plenty of recent data that's labeled under the old concept, which doesn't help.

**Q: How do you handle adversarial concept drift?**
Accept it's continuous rather than occasional. Retrain frequently on the freshest labels available. Use ensembles so there isn't one boundary to probe. Keep rule-based checks alongside the model, changed unpredictably, so adversaries can't fully characterize the system. And don't expose confidence scores externally, since those let an adversary optimize against you directly.

**Q: Should you use a sliding window or all historical data?**
Depends on the drift pattern. Under steady incremental drift, a sliding window or recency weighting keeps the model current. Under recurring seasonal drift, you want the full history so the model has seen previous cycles. Under sudden drift, you want to discard pre-change data entirely. I'd validate window size empirically against recent holdouts rather than assuming.

**Q: Why does this argue for RAG over fine-tuning?**
Because facts change and weights are expensive to update. If a fee schedule changes, RAG serves the new answer as soon as the index is refreshed — minutes. Fine-tuning that fact into the model means a retraining cycle, and the old fact is still in there competing. Fine-tune for *behavior*, retrieve for *knowledge*. Concept drift on facts is exactly the case retrieval handles well.

## 9. Common Mistakes

- Assuming input monitoring catches all drift — it never catches concept drift.
- Confusing it with data drift and retraining on recent-but-stale-labeled data.
- Not planning for label latency when designing the monitoring strategy.
- Treating adversarial drift as an occasional event rather than continuous pressure.
- Forgetting that a stale RAG index causes exactly this failure.

## 10. What to Remember

- **`P(Y|X)` changes.** Same input, different correct answer.
- **Inputs can look unchanged** — PSI monitoring will not catch it.
- **Detection needs labels, and labels are late.** You're structurally behind.
- **Use proxy metrics** — override rate, reversal rate, complaints — to move faster than ground truth.
- **Adversarial domains have continuous drift caused by your own model.**
