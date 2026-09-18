# A/B Testing

> **Phase 12 · RAG EVALUATION · Topic 15**

## 1. Definition

Randomly assigning users or sessions to a control and a treatment configuration, then comparing outcome metrics. It's the rigorous way to establish that a change actually caused an improvement.

## 2. Simple Explanation

Offline metrics tell you the system scores better. A/B testing tells you users are better off.

Random assignment is what makes the comparison causal — without it, a metric change could be seasonality, a different user mix, or anything else that shifted at the same time.

## 3. How It Works

1. **Define the primary metric before running** — one metric, chosen in advance.
2. **Define guardrails** — latency, cost, escalation rate, abstention rate.
3. **Randomize assignment**, stable per user so the experience is consistent.
4. **Run for a pre-decided duration** — long enough to cover weekly cycles.
5. **Analyze once**, at the end, at the pre-declared significance level.

**Choosing the randomization unit:**

| Unit | Use when |
|---|---|
| **Session** | Effects are within-session; more statistical power |
| **User** | Users would notice inconsistency across sessions |
| **Tenant / account** | Enterprise contexts where consistency within an organization matters |

**Primary metric candidates for a RAG assistant:**

```
escalation rate to human agent   ← usually the best single proxy
task completion rate
follow-up rephrase rate
thumbs-down rate
```

Escalation rate tends to be the strongest, because it's abundant, unambiguous, and tied to a real business cost.

## 4. Practical Example

**A realistic result:**

```
Change: added cross-encoder reranking

                        control    treatment    Δ
escalation rate          8.2%        7.1%     -1.1pp  ✅ primary
thumbs-down rate         3.4%        3.1%     -0.3pp
follow-up rephrase      14.1%       12.8%     -1.3pp
─────────────────── guardrails ──────────────────────
p95 latency            1,840ms     2,110ms    +270ms  ⚠️ within budget
cost per query         $0.0031     $0.0038    +23%    ⚠️ acceptable
abstention rate         15.8%       15.2%     -0.6pp  ✅ stable

Decision: ship. Primary metric improved, guardrails within tolerance.
```

**The mistakes that invalidate results:**

```
❌ Peeking and stopping when significant
   → inflates false positive rate substantially. Decide the
     duration in advance and analyze once.

❌ Running until the metric looks good
   → same problem, more honestly named.

❌ Testing 12 metrics and reporting the one that moved
   → multiple comparisons. Declare the primary metric first.

❌ Running for 2 days
   → misses weekly cycles; weekday and weekend traffic differ.
```

**On sample size:** small effects need a lot of traffic. Detecting a 1pp change on an 8% base rate requires meaningfully more sessions than detecting a 5pp change. Estimate required sample size before starting, or you'll run an underpowered test and conclude "no effect" from noise.

## 5. Why It Matters

- **It's the only way to establish causation** rather than correlation.
- **It measures what actually matters** — user outcomes, not proxy scores.
- **It catches regressions offline evaluation misses**, like latency degrading the experience even as quality improves.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Peeking** | Stopping when significant inflates false positives |
| **Underpowered** | Insufficient traffic to detect the real effect size |
| **Multiple comparisons** | Testing many metrics and reporting the winner |
| **Too short** | Missing weekly cycles and novelty effects |
| **Inconsistent assignment** | A user flipping between variants pollutes both arms |
| **No guardrails** | Shipping a quality win that doubled latency |
| **Not feasible at low traffic** | Many enterprise assistants don't have the volume |

**The low-traffic problem is real and worth raising.** An internal banking assistant with a few thousand queries a day may not generate enough sessions to detect a modest effect in a reasonable time. Alternatives: switchback testing that alternates configurations over time periods, interleaving where both systems' results are merged and you measure which gets clicked, or accepting offline evaluation plus careful monitoring as the practical substitute.

## 7. Interview Answer

> "A/B testing randomly assigns users or sessions to control and treatment configurations and compares outcome metrics. Random assignment is what makes the comparison causal — without it, a metric shift could be seasonality or a different user mix.
>
> The discipline matters more than the mechanics. I'd declare the primary metric and the duration before starting, and analyze once at the end. Peeking and stopping when the result looks significant substantially inflates the false positive rate — it's the most common way A/B tests produce wrong conclusions. Same for testing twelve metrics and reporting the one that moved.
>
> For a RAG assistant, escalation rate to a human agent is usually the best primary metric — it's abundant, unambiguous, and tied to a real business cost. Thumbs-down is more direct but far sparser.
>
> Guardrails are as important as the primary metric. A reranking change might reduce escalation by a point while adding two hundred and seventy milliseconds of latency and twenty-three percent to cost. Whether that's a good trade is a product decision, but you can't make it without measuring both.
>
> The thing I'd raise honestly is feasibility. An internal banking assistant with a few thousand queries a day may not have enough traffic to detect a modest effect in a reasonable timeframe. I'd estimate the required sample size before starting rather than running an underpowered test and concluding 'no effect' from noise. If the traffic isn't there, switchback testing over time periods or interleaving are alternatives, and sometimes offline evaluation plus careful monitoring is the practical answer."

## 8. Likely Follow-ups

**Q: What's the primary metric for a RAG system?**
Escalation rate to a human agent is usually best — abundant, unambiguous, and tied to a real cost. Task completion is stronger if your product has a measurable task. Thumbs-down is direct but sparse and biased. I'd pick one and declare it before running, rather than deciding afterwards which number to report.

**Q: How long should you run it?**
Long enough to cover at least one full weekly cycle, since weekday and weekend traffic differ, and long enough to reach the sample size your power calculation requires for the effect you care about. Decide both in advance. Running until the result looks good is the most common way to generate a false positive.

**Q: What if you don't have enough traffic?**
Common in enterprise contexts. Options: switchback testing, alternating configurations across time periods and comparing — it handles low traffic but is vulnerable to temporal confounds. Interleaving, where both systems' results are merged and you measure which gets engaged with, which is far more sample-efficient for retrieval comparisons. Or accept offline evaluation plus careful production monitoring as the practical substitute, and be explicit that it's weaker evidence.

**Q: What guardrails would you set?**
Latency at p95, cost per query, escalation rate, and abstention rate. Any of those degrading materially should block the ship regardless of the primary metric. Abstention in particular — a change that halves abstention will look good on most quality proxies while being a real safety regression.

**Q: Why is peeking a problem?**
Because each look is another chance to cross the significance threshold by chance, so repeated peeking inflates the false positive rate well above the nominal level. If you must monitor mid-flight, use a sequential testing method designed for it, which adjusts the threshold accordingly. Otherwise decide the duration in advance and analyze once.

## 9. Common Mistakes

- Peeking and stopping when the result becomes significant.
- Not declaring the primary metric in advance.
- Running too short to cover weekly cycles.
- No guardrail metrics, shipping a quality win that degraded latency.
- Running an underpowered test and concluding "no effect."

## 10. What to Remember

- **Random assignment is what makes it causal.**
- **Declare the primary metric and duration in advance; analyze once.**
- **Escalation rate is usually the best primary metric** for an assistant.
- **Guardrails — latency, cost, abstention — can block a ship** regardless of the primary.
- **Low traffic is common in enterprise.** Switchback or interleaving are the alternatives.
