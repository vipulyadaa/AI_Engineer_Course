# Observability

> **Phase 20 · VERTEX AI · Topic 20**

## 1. Definition

Understanding what a Vertex AI system is doing in production — through Cloud Logging, Cloud Monitoring, Cloud Trace, and application-emitted metrics — with the generative-specific signals being ones you instrument yourself.

## 2. Simple Explanation

The platform gives you request counts, errors, and latency. It doesn't tell you whether the answers were any good.

So observability for a RAG system is mostly custom metrics you emit into Cloud Monitoring, with the platform providing the infrastructure to hold and alert on them.

## 3. How It Works

```
PLATFORM PROVIDES
  Cloud Logging      request logs, errors
  Cloud Monitoring   request count, latency, error rate,
                     quota usage
  Cloud Trace        distributed traces across services
  Error Reporting    grouped exceptions

YOU EMIT
  retrieval score distribution
  chunks above threshold per query
  abstention rate
  escalation rate
  tokens and cost per request, by query type
  groundedness verification outcomes
  prompt and model version per request
```

**The second list is where quality lives**, and none of it appears without instrumentation.

## 4. Practical Example

**A minimal instrumentation set that pays for itself:**

```python
log_struct({
  "trace_id":        trace_id,
  "user_hash":       hash(user_id),      # not raw
  "query_type":      classified_type,
  "retrieval": {"n_above_threshold": n, "top_score": s},
  "prompt_version":  "answer-v7",
  "model":           "gemini-2.0-flash-001",
  "tokens":          {"in": ti, "out": to},
  "cost_usd":        c,
  "outcome":         "answered" | "abstained" | "escalated"
                     | "failed",
  "latency_ms":      {"retrieval": r, "generation": g, "total": t},
})
```

**The `outcome` field is the highest-value single item.** It partitions everything immediately — an abstention rate rising is retrieval degrading, an escalation rate rising is quality degrading, a failure rate rising is infrastructure. One field, three different investigations avoided.

**The dashboard that matters:**

```
· abstention rate over time          quality trend
· top-1 retrieval score distribution drift detection
· p50 / p95 / p99 latency            experience
· cost per query by type             where spend goes
· outcome breakdown                  overall health
· groundedness verification failures safety

Five or six panels answering "is the system healthy" at a
glance beats forty panels nobody reads.
```

**Alerting on rates, not events:**

```
Alert on abstention rate above a threshold over a rolling
window, median retrieval score dropping week over week,
p95 latency exceeding target, cost per query rising, or a
safety-invariant violation.

Alerting per request is noise, and noisy alerts get muted —
which is worse than having none, because muting is silent.
```

**PII in logs:** prompts and responses contain customer data, so I'd hash user identifiers, avoid logging full prompts unconditionally — sample, or log on failure only — and treat the log store as a customer data store with retention and deletion.

## 5. Why It Matters

- **The platform gives infrastructure signals**; quality signals are yours to emit.
- **The `outcome` field** partitions investigations immediately for almost no cost.
- **Logs contain customer data** and need the corresponding controls.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Only platform metrics** | No visibility into answer quality |
| **No outcome field** | Can't distinguish failure types |
| **Logging full prompts always** | Volume and PII exposure |
| **Alerting per request** | Noise; alerts get muted |
| **Dashboards nobody reads** | Forty panels, no answers |
| **Logs outside retention policy** | Compliance gap |

**On log volume and cost:** logging every full prompt and response at scale generates substantial Cloud Logging spend. Structured summary fields on every request, with full payloads sampled or captured only on failure, keeps cost bounded while preserving the diagnostic value where it's needed.

**On trace correlation:** a single trace ID flowing through retrieval, reranking, generation, and verification is what makes a slow request diagnosable. Without it you have separate latency numbers per service and no way to connect them to the request the customer complained about.

## 7. Interview Answer

> "The platform provides request counts, errors, latency, quota usage, and distributed traces. What it doesn't tell you is whether the answers were any good — so generative observability is mostly custom metrics I emit into Cloud Monitoring, with the platform providing the infrastructure to hold and alert on them.
>
> The instrumentation I'd emit per request: a trace ID, a hashed user identifier, the classified query type, retrieval statistics — how many chunks were above threshold and the top score — the prompt version and model version, tokens and cost, latency broken down by stage, and an outcome field.
>
> That outcome field is the highest-value single item. Answered, abstained, escalated, or failed partitions everything immediately. A rising abstention rate is retrieval degrading, a rising escalation rate is quality degrading, a rising failure rate is infrastructure. One field, three different investigations distinguished before you look at anything else — and most systems don't capture it.
>
> For dashboards I'd have five or six panels: abstention rate over time, the top-1 retrieval score distribution, latency percentiles, cost per query by type, the outcome breakdown, and groundedness verification failures. Five panels answering 'is the system healthy' at a glance beats forty that nobody reads.
>
> Alerting on rates over windows rather than individual events — abstention rate above a threshold, median retrieval score dropping week over week, p95 latency exceeding target, cost per query rising, or a safety invariant violated. Alerting per request is noise, and noisy alerts get muted, which is worse than having none because muting is silent.
>
> Two practical points. Log volume: logging every full prompt and response at scale is substantial Cloud Logging spend. Structured summary fields on every request with full payloads sampled or captured only on failure keeps cost bounded while preserving diagnostic value where it's needed.
>
> And PII. Prompts and responses contain customer data, so I'd hash user identifiers, avoid logging full prompts unconditionally, and treat the log store as a customer data store with retention and a deletion path — not as ordinary application logs. That's a gap that's easy to create because logging feels harmless."

## 8. Likely Follow-ups

**Q: What does the platform not give you?**
Quality signals. It gives request counts, errors, latency, and quota usage — all infrastructure. Whether the answers were grounded, whether retrieval found anything relevant, and whether the system abstained appropriately are all custom metrics you have to emit.

**Q: What's the single most valuable field to log?**
The outcome — answered, abstained, escalated, or failed. It partitions your investigations immediately: abstention rising is retrieval, escalation rising is quality, failure rising is infrastructure. One field, three distinct causes separated before any deeper analysis.

**Q: How should alerts be designed?**
On rates over rolling windows rather than individual requests — abstention rate above a threshold, median retrieval score dropping week over week, p95 latency exceeding target. Per-request alerting is noise, and noisy alerts get muted silently, which leaves you worse off than no alerting.

**Q: How do you control logging cost?**
Structured summary fields on every request, with full prompts and responses sampled or captured only on failure. Logging everything at full fidelity generates substantial Cloud Logging spend, and the informative cases are the failures, which are a small fraction of traffic.

**Q: Any data protection concerns?**
Yes. Prompts and responses contain customer data, so user identifiers should be hashed, full prompts shouldn't be logged unconditionally, and the log store needs retention policy and a deletion path like any other customer data store. Treating it as ordinary application logging is a real gap.

## 9. Common Mistakes

- Relying on platform metrics for quality visibility.
- Not logging an outcome field.
- Alerting on individual requests rather than rates.
- Logging full prompts and responses on every request.
- Excluding logs from retention and erasure policies.

## 10. What to Remember

- **The platform gives infrastructure signals; quality is instrumented by you.**
- **The `outcome` field** partitions failures immediately — highest value per byte.
- **Five or six dashboard panels** beat forty nobody reads.
- **Alert on rates over windows**, not events.
- **Logs are customer data** — hash identifiers, sample payloads, apply retention.
