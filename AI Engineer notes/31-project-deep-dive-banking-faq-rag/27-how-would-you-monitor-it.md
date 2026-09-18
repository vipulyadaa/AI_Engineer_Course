# "How Would You Monitor It?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 27**

## 1. Definition

A design question about observability for a system whose worst failures don't raise errors. Standard monitoring catches outages; RAG's real failures are silent quality degradation.

## 2. Simple Explanation

A RAG system that has started giving wrong answers looks exactly like one giving right answers — same latency, same 200 responses, same error rate.

So monitoring has to watch quality signals, not just health signals.

## 3. How It Works

```
FOUR LAYERS

1. HEALTH        latency p50/p95/p99, error rate, quota
                 usage, cache hit rate
                 → catches outages, catches nothing else

2. RETRIEVAL     top-score distribution, abstention rate,
                 zero-result rate, filter rejection rate
                 → the earliest quality signal available

3. GENERATION    groundedness sample, citation validity,
                 answer length distribution, refusal rate
                 → catches model-side drift

4. USER          thumbs-down rate, escalation to human,
                 repeat-question rate, session abandonment
                 → the ground truth, and the slowest
```

**The retrieval-score distribution is the most valuable and least-used signal.** It moves before users notice.

## 4. Practical Example

**Why the score distribution is the leading indicator:**

```
Normal: mean top-1 score 0.82, tight spread

After an ingestion bug drops a third of the corpus:
  mean top-1 score 0.61, wider spread

Nothing errors. Latency improves slightly — fewer
vectors. Error rate is zero. Users get plausible answers
from the wrong chunks.

The score distribution moved on the day of the deploy.
Thumbs-down data would take a week to show it, if the
feedback rate is even high enough to be significant.

Alert on a distribution shift, not on a threshold — the
absolute value means nothing across models, but a shift
means something changed.
```

**The counts that reveal pipeline breakage:**

```
CORPUS SIZE       chunk count per document source.
                  A drop is an ingestion failure; a spike
                  is a chunking regression. This single
                  metric catches most ingestion bugs.

INDEX FRESHNESS   time since last successful ingestion
                  run, per source. Silence is the failure
                  mode — a job that stopped running
                  produces no errors at all.

FILTER REJECTION  how many results were dropped by
                  permission filters. A sudden change
                  means entitlements or restricts shifted.
```

**Logging, given the constraints:**

```
LOG PER REQUEST
  query hash (not the raw query if it may contain PII)
  retrieved chunk IDs and their scores
  the model and prompt version
  entitlement set used
  token counts, latency per stage
  the answer's citation IDs

RETAIN the full text only where the audit requirement
demands it, with the retention period the compliance
policy specifies — and with the understanding that these
logs are now a data store containing customer questions
and policy content, subject to the same access control
as everything else.

That last point is the one people miss: the observability
system becomes a copy of the sensitive data.
```

**Alerting that's actually actionable:**

```
PAGE      error rate, p99 latency, quota exhaustion,
          ingestion job failure
TICKET    score distribution shift, abstention rate
          outside range, citation validity drop
REVIEW    thumbs-down clusters, queries with no good
          match

Paging on a quality metric is usually wrong — nobody can
fix retrieval quality at 3am, and the alert gets muted.
```

## 5. Why It Matters

- **Quality failures are silent** — no errors, normal latency.
- **The retrieval score distribution** is the earliest available signal.
- **Logs become a sensitive data store** and need the same controls.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Only health metrics | Degradation runs for weeks |
| Relying on user feedback | Slow, sparse, and biased |
| Alerting on absolute score thresholds | Meaningless across model versions |
| No corpus-size metric | Ingestion failures invisible |
| Logging raw queries without controls | A new PII store |
| Paging on quality metrics | Alerts get muted |

**On feedback bias:** thumbs-down is collected from a small, self-selecting minority, skewed toward people who were badly wrong-footed rather than mildly misled. It's real signal and it isn't a measurement. Escalation-to-human rate is often a better proxy, because it's behavioural rather than volunteered.

**On query clustering:** embedding incoming queries and clustering the ones with low retrieval scores surfaces topics the corpus doesn't cover. It's the most directly actionable output of the whole monitoring stack, because the fix is writing a document rather than tuning a parameter.

## 7. Interview Answer

> "The thing that shapes this is that a RAG system giving wrong answers looks identical to one giving right answers. Same latency, same two-hundreds, zero errors. So standard monitoring catches outages and catches essentially none of the failures that matter.
>
> I'd run four layers. Health — latency percentiles, error rate, quota usage, cache hit rate. Necessary and not sufficient.
>
> Then retrieval quality, and this is the layer I'd emphasize. The most valuable signal is the distribution of top retrieval scores, and it's the one people don't have. Suppose an ingestion bug drops a third of the corpus. Nothing errors. Latency actually improves, because there are fewer vectors. Users get plausible answers from the wrong chunks. But the mean top-one score moved from around 0.82 to 0.61 on the day of the deploy, and the spread widened.
>
> That signal is available immediately. Thumbs-down data would take a week to show the same thing, if the feedback rate is even high enough to be significant. And I'd alert on a distribution shift rather than an absolute threshold, because the absolute value is meaningless across embedding models — but a shift means something changed.
>
> Alongside that: chunk count per document source, which catches most ingestion bugs on its own — a drop is a failure, a spike is a chunking regression. And time since last successful ingestion per source, because silence is the failure mode there. A job that stopped running produces no errors at all.
>
> Third layer is generation: a sampled groundedness check, citation validity — every cited chunk ID actually in the retrieved set — answer length distribution, and refusal rate. Refusal rate is a two-sided metric, because a rise means retrieval regressed and a fall means the abstention threshold stopped protecting anything.
>
> Fourth is user signals: thumbs-down, escalation to a human, repeat questions, abandonment. That's ground truth and it's the slowest. I'd treat thumbs-down carefully — it's a small self-selecting sample skewed toward people who were badly wrong-footed. Escalation rate is often a better proxy because it's behavioural rather than volunteered.
>
> On logging: per request, the query hash rather than raw text if it may contain PII, the retrieved chunk IDs and scores, model and prompt version, the entitlement set used, token counts, per-stage latency, and the citation IDs in the answer. Full text retained only where the audit requirement demands it.
>
> And the point I'd make about logging is that the observability system becomes a copy of the sensitive data. Customer questions and policy content in a trace store are subject to the same access control, retention, and residency rules as the primary system — which is routinely forgotten, because logs don't feel like a database.
>
> On alerting, I'd page on error rate, p99, quota exhaustion, and ingestion failures. Quality metrics go to a ticket, not a page — nobody can fix retrieval quality at three in the morning, and a paging quality alert gets muted, which loses the signal entirely.
>
> And the single most actionable thing in the stack: cluster the incoming queries that got low retrieval scores. That surfaces topics the corpus doesn't cover, and the fix is writing a document rather than tuning a parameter."

## 8. Likely Follow-ups

**Q: What's the earliest signal of quality degradation?**
The retrieval score distribution. It shifts the day a problem is introduced, whereas user feedback takes a week and may never be statistically meaningful at low feedback rates.

**Q: Why not alert on an absolute score threshold?**
Because the absolute value depends on the embedding model and corpus and means nothing on its own. A distribution shift means something changed, which is the actual signal.

**Q: Why is refusal rate two-sided?**
A rise means retrieval regressed; a fall means the abstention threshold stopped protecting anything. Both are real problems, and both are silent without the metric.

**Q: What's the problem with logs here?**
They become a copy of the sensitive data — customer questions and retrieved policy content — so they need the same access control, retention, and residency treatment as the primary store. It gets missed because logs don't feel like a database.

**Q: What would you not page on?**
Quality metrics. Nobody can fix retrieval quality at 3am, and a quality alert that pages gets muted — which loses the signal entirely. Those belong in a ticket queue with a daily review.

## 9. Common Mistakes

- Only monitoring health metrics.
- Depending on user feedback as the primary signal.
- Alerting on absolute retrieval scores.
- No corpus-size or ingestion-freshness metric.
- Treating logs as exempt from data controls.

## 10. What to Remember

- **Quality failures are silent** — health metrics won't see them.
- **Score distribution shift** is the earliest signal.
- **Chunk count per source** catches most ingestion bugs.
- **Logs are a sensitive data store** with the same obligations.
- **Cluster low-score queries** — it finds content gaps.
