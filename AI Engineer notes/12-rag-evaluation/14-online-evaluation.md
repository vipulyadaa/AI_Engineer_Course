# Online Evaluation

> **Phase 12 · RAG EVALUATION · Topic 14**

## 1. Definition

Measuring system quality on live production traffic using real user interactions — explicit feedback, behavioral signals, and sampled automated judging. It's the only measurement of whether the system actually works for users.

## 2. Simple Explanation

Offline evaluation tells you the system got better on your eval set. Online evaluation tells you whether users noticed.

Those diverge more often than expected, which is why both are needed. Offline gates changes cheaply; online validates that the change mattered.

## 3. How It Works

**Signal types, weakest to strongest:**

| Signal | Availability | Reliability |
|---|---|---|
| Explicit thumbs up/down | Sparse — low response rate, biased to extremes | Direct but noisy |
| Follow-up question rate | Every session | Rephrasing suggests the first answer failed |
| Escalation to human | Every session | Strong negative signal |
| Session abandonment | Every session | Ambiguous — satisfied or gave up? |
| Copy / click on citation | Frequent | Suggests the answer was used |
| Task completion | Depends on product | Strongest, hardest to attribute |
| Sampled LLM judging | Configurable | Reproducible; a proxy |

**The instrumentation that makes this work:**

```python
log({
  "trace_id": ..., "query": ..., "rewritten_query": ...,
  "retrieved_chunk_ids": [...], "top_scores": [...],
  "abstained": False, "answer": ..., "citations": [...],
  "latency_ms": ..., "input_tokens": ..., "output_tokens": ...,
  "model_version": ..., "config_version": ...,
  # then, joined later:
  "user_feedback": ..., "followed_up": ..., "escalated": ...,
})
```

**`config_version` is the field that makes attribution possible** — without it you can't tell which change caused a metric shift.

## 4. Practical Example

**Online metrics worth tracking:**

```
Quality proxies:
  escalation rate            8.2%  ← users giving up on the assistant
  follow-up rephrase rate   14.1%  ← first answer missed
  citation click rate       31.0%  ← users checking sources
  thumbs-down rate           3.4%

Operational:
  abstention rate           15.8%  ← watch BOTH directions
  p95 latency              2,140ms
  cost per query           $0.0031

Coverage:
  queries retrieving nothing above threshold   6.2%  ← content gaps
```

**The abstention rate deserves the same attention as accuracy.** A sudden drop means the system started answering things it shouldn't — which looks like improvement on every other metric.

**Clustering failures into an action list:**

```
Monthly: cluster the queries that escalated or got thumbs-down.

  cluster "crypto policy"        41 queries  → no such document. Write it.
  cluster "joint account closure" 19 queries → document exists, not
                                                ingested. Bug.
  cluster "expedited timing"      28 queries → document exists, retrieval
                                                fails. Chunking issue.

That's a prioritized backlog derived entirely from production.
```

## 5. Why It Matters

- **It's the only measurement of real user impact.** Offline metrics are proxies.
- **It catches drift** — query distribution, corpus staleness, provider model changes.
- **Production failures cluster into a prioritized backlog**, which is genuinely valuable output.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Explicit feedback is sparse and biased** | Low response rate, skewed to extremes |
| **Behavioral signals are ambiguous** | Abandonment could be satisfaction or giving up |
| **No ground truth** | You don't know the correct answer for a production query |
| **Attribution is hard** | Many things change at once; you need `config_version` logged |
| **Slow feedback** | Statistical significance on a real effect takes days or weeks |
| **Privacy constraints** | Logging queries and answers in banking has real restrictions |

**The privacy constraint is significant in a regulated context.** Query logs may contain PII, and answers may contain account details. Redaction at logging time, short retention windows, and access controls on the log store are usually required — and they limit how much manual review is possible.

**Guardrail metrics matter alongside the target:** when optimizing quality, watch latency, cost, escalation rate, and abstention rate too. An improvement that doubles latency or halves abstention is not an improvement.

## 7. Interview Answer

> "Online evaluation measures quality on live traffic using real user interactions. It's the only measurement of whether the system actually works for users — offline metrics are proxies, and they can improve with no user-visible effect.
>
> The signals available range from weak to strong. Explicit thumbs up and down are direct but sparse and biased toward extremes. Behavioral signals are more abundant — escalation to a human agent is a strong negative, a follow-up rephrase suggests the first answer missed, a citation click suggests the answer was used. And sampled LLM judging on production traffic gives reproducible quality metrics without needing ground truth.
>
> The metric I'd watch that people neglect is the abstention rate, in both directions. A sudden drop means the system started answering things it shouldn't, and that looks like improvement on every other metric while being a real safety regression.
>
> For this to be actionable, the logging has to include a config version, so I can attribute a metric shift to a specific change. Without that, many things change at once and nothing is diagnosable.
>
> The highest-value output is clustering production failures. Monthly, cluster the queries that escalated or got negative feedback — you get a prioritized backlog. Some clusters are missing documentation, some are ingestion bugs where the document exists but wasn't indexed, some are retrieval failures. Three different fixes, all derived from production.
>
> One constraint in banking: query logs contain PII and answers contain account details, so redaction at logging time, short retention, and access controls on the log store are usually required — and that limits how much manual review is feasible."

## 8. Likely Follow-ups

**Q: What signals can you actually use?**
Explicit feedback where you get it, but expect a low response rate skewed to extremes. More usefully, behavioral signals available on every session: escalation to a human, follow-up rephrasing, citation clicks, session length. Plus sampled LLM judging, which gives reproducible quality metrics without ground truth.

**Q: How do you attribute a metric change to a specific system change?**
Log a config version with every request and join it to outcomes. Without that, several things ship in a week and you can't tell which caused a shift. For a controlled measurement, an A/B test with random assignment is the rigorous version, but config-version logging catches most of the value for far less setup.

**Q: What do you do when online and offline disagree?**
Investigate rather than assume either is wrong. Common causes: the eval set doesn't match the production distribution, the offline metric improved in a region where no decision changes, or there's training/serving skew — the production pipeline differs from the evaluation pipeline. I'd start by running the eval set through the actual production path and comparing.

**Q: How do you handle privacy constraints on logging?**
Redact PII at logging time rather than after, keep short retention windows, and restrict access to the log store. That limits manual review, so I'd lean more on automated sampled judging that runs inside the secure boundary. For human review, work with redacted samples or a synthetic-but-representative set.

**Q: What guardrail metrics would you watch?**
Latency, cost per query, escalation rate, and abstention rate — alongside whatever quality metric is the target. An improvement that doubles p95 latency or halves the abstention rate isn't an improvement. Guardrails are what stop optimization from producing a worse product that scores better.

## 9. Common Mistakes

- Relying on explicit feedback alone, which is sparse and biased.
- Not logging a config version, making attribution impossible.
- Treating abandonment as unambiguously negative.
- Watching only the target metric without guardrails.
- Ignoring the abstention rate dropping, which looks like improvement.

## 10. What to Remember

- **Real traffic, real users.** The only measure of actual impact.
- **Behavioral signals beat explicit feedback** — escalation, rephrase, citation clicks.
- **Log `config_version`** or you can't attribute anything.
- **Watch abstention rate in both directions** — a drop looks like improvement and isn't.
- **Cluster production failures monthly** into a prioritized backlog.
