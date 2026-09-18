# Offline Evaluation

> **Phase 12 · RAG EVALUATION · Topic 13**

## 1. Definition

Measuring system quality against a fixed golden dataset, before deployment. It's fast, cheap, reproducible, and comparable across changes — and it measures a proxy for production performance rather than production performance itself.

## 2. Simple Explanation

Run your eval set, get numbers, compare to the last run.

That's what lets you iterate quickly — change chunk size, re-run, see whether it helped, all in minutes. The limitation is that you're measuring against questions you chose, which may not match what users actually ask.

## 3. How It Works

```
golden dataset → run the pipeline → compute metrics → compare to baseline
```

**What offline evaluation measures well:**

| Metric | Why it works offline |
|---|---|
| recall@k, MRR, NDCG | Deterministic against known correct chunks |
| Groundedness | Judge-based, reproducible with a pinned judge |
| Answer relevance | Same |
| Latency, token cost | Measurable directly |
| Regression vs. baseline | The whole point |

**What it cannot measure:**

- Whether users are satisfied
- Whether the answer led to the right action
- How the system behaves on query types not in the eval set
- Business outcomes — deflection rate, escalation rate, revenue

## 4. Practical Example

**A comparison run:**

```
Change: chunk size 800 → 512, added cross-encoder reranker

                    baseline    new      Δ
recall@5              0.88      0.91   +0.03
groundedness          0.91      0.93   +0.02
answer_relevance      0.89      0.89    0.00
abstention_rate       0.16      0.15   -0.01
p95 latency (ms)     1,840     2,110   +270    ← the cost
context tokens        3,000     2,048   -952    ← the saving

Decision: ship it. Quality up, cost down, latency within budget.
```

**The gap that offline evaluation can't see:**

```
Offline recall@5 improved 0.88 → 0.91.
Online A/B test showed no change in user satisfaction.

Possible reasons:
  · The improvement was on query types users rarely ask
  · The eval set doesn't match the production distribution
  · Users were already getting acceptable answers at 0.88
  · The metric improved in a region where no decision changes

That's why offline is necessary and not sufficient.
```

## 5. Why It Matters

- **It's what makes fast iteration possible** — minutes per experiment rather than days per A/B test.
- **It's reproducible**, so you can attribute a change to a specific cause.
- **It's the gate before anything reaches users**, catching regressions cheaply.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Eval set doesn't match production** | You optimize for questions nobody asks |
| **Overfitting to the eval set** | Many iterations select for its quirks; hold out a test portion |
| **Offline/online metric mismatch** | recall@k improves, user satisfaction doesn't |
| **Static set, drifting reality** | Query distribution and corpus change; the set doesn't |
| **Missing rare categories** | Failures concentrate where the set has few examples |
| **Judge drift** | A judge model update shifts scores with no system change |

**The offline/online gap is the central limitation**, and it's the same problem as offline AUC improving with no A/B lift in classical ML. The causes are analogous: the metric isn't the outcome, the improvement lands where no decision changes, or the eval distribution differs from production.

**The mitigation is to keep the eval set fed from production** — continuously add sampled real queries, especially failures and abstentions, so the set tracks reality rather than freezing at launch-day assumptions.

## 7. Interview Answer

> "Offline evaluation is measuring against a fixed golden dataset before deployment. It's fast, cheap, reproducible, and comparable across changes — which is what makes iteration possible. I can change chunk size, re-run, and see whether it helped in minutes rather than waiting days for an A/B test.
>
> It measures retrieval metrics like recall@k well, because they're deterministic against known correct chunks, and judge-based metrics like groundedness reproducibly if the judge version is pinned. It also measures latency and token cost directly.
>
> What it can't measure is whether users are satisfied, whether the answer led to the right action, or any business outcome. And that gap is real — I've seen offline recall improve three points with no change in an A/B test. The reasons are the same as offline AUC improving without A/B lift in classical ML: the metric isn't the outcome, the improvement landed where no decision changes, or the eval distribution doesn't match production.
>
> Two risks I'd manage. Overfitting to the eval set — running many experiments against it selects for its quirks, so I'd hold out a test portion I don't iterate against, exactly like train/test discipline. And drift — a static eval set stops representing production as the query mix and corpus change.
>
> The mitigation for both is keeping the eval set fed from production: continuously add sampled real queries, especially failures and abstentions. That way it tracks reality rather than freezing at launch-day assumptions.
>
> So offline evaluation is necessary and not sufficient. It gates every change; online evaluation validates that the change actually mattered."

## 8. Likely Follow-ups

**Q: What's the main limitation?**
That it measures a proxy. Offline metrics can improve with no effect on users, because the eval set may not match the production query distribution, or the improvement may land in a region where no actual decision changes. It's the same offline/online gap as in classical ML.

**Q: How do you keep the eval set representative?**
Feed it from production continuously — sample real queries, and preferentially add ones the system failed on or abstained from. That makes the set track the actual distribution and concentrate on where the system struggles, rather than staying frozen at whatever the team imagined at launch.

**Q: Can you overfit to an offline eval set?**
Yes, the same way you overfit a validation set in supervised learning. Running many configurations and picking the best selects partly for that set's quirks. The defense is the same: hold out a test portion you touch once per release, and expect a gap between dev and test performance.

**Q: How does it relate to online evaluation?**
Complementary and sequential. Offline gates every change cheaply and fast, catching regressions before anything ships. Online validates that changes passing the gate actually improve user outcomes. Neither substitutes for the other — offline without online means optimizing an unvalidated proxy; online without offline means every experiment costs days.

**Q: What would make you distrust an offline improvement?**
If it's concentrated in a query category that's rare in production, if it's smaller than the run-to-run variance of the judge, if the abstention rate moved in a way nobody intended, or if latency or cost regressed meaningfully. I'd also be suspicious of an improvement that appears after many iterations against the same set without a test-set check.

## 9. Common Mistakes

- Treating offline metrics as proof of user impact.
- Iterating against the whole eval set with no held-out portion.
- Letting the eval set go stale as production drifts.
- Not tracking latency and cost alongside quality.
- Ignoring judge version drift when comparing runs over time.

## 10. What to Remember

- **Fixed golden dataset, before deployment.** Fast, cheap, reproducible.
- **It's what makes iteration possible** — minutes per experiment.
- **It measures a proxy.** Offline gains don't guarantee user impact.
- **Hold out a test portion** — offline eval sets are overfittable.
- **Feed the set from production** so it tracks reality.
