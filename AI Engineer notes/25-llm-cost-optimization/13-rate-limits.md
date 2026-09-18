# Rate Limits

> **Phase 25 · LLM COST OPTIMIZATION · Topic 13**

## 1. Definition

Provider-imposed ceilings on requests and tokens per unit time. They're a capacity constraint rather than a cost one — but they shape architecture, and hitting them in production is an availability incident.

## 2. Simple Explanation

Rate limits don't cost money; they cost availability. When you hit one, requests fail.

The relevant design question is what happens then — because "retry until it works" is a strategy that makes an overload worse.

## 3. How It Works

```
TYPICAL LIMITS
  requests per minute
  tokens per minute — input and output counted together
  concurrent requests
  per region, per model, per project

WHERE THEY BITE
  ingestion jobs        thousands of embedding calls
  traffic spikes        a marketing campaign, an outage
                        elsewhere driving support volume
  agent workloads       one request = many model calls
  evaluation runs       hundreds of calls in parallel
```

**Agents multiply request volume** — one user request becoming eight model calls means a rate limit on requests per minute is hit at one-eighth the user traffic you'd expect.

## 4. Practical Example

**Handling limits correctly:**

```
EXPONENTIAL BACKOFF WITH JITTER
  Retrying immediately makes an overload worse. Backing off
  without jitter means every client retries in lockstep,
  producing a thundering herd on recovery.
  Jitter is the part people omit.

QUEUE, DON'T DROP — for non-interactive work
  Ingestion and evaluation can wait. Queue them behind a
  rate limiter you control rather than discovering the
  provider's.

SHED LOAD — for interactive work
  When the limit is genuinely reached, a clear message and
  a route to a human beats a retry loop that times out.

SEPARATE QUOTA PATHS
  Ingestion and evaluation competing with production traffic
  for the same quota means a re-index can degrade the
  customer-facing service. Different projects or reserved
  capacity keeps them apart.
```

**That last point is the design decision worth making** — it's why a scheduled re-index can take down a customer-facing assistant, and it's entirely avoidable.

**Requesting quota ahead of launch:**

```
Quota is per region and per model, and increases take lead
time. Discovering a ceiling during launch is entirely
predictable and entirely avoidable.

Estimate from: expected requests/day × model calls per
request (agents multiply this) × tokens per call, with
headroom for spikes.

The agent multiplier is the term people forget.
```

**Rate limits as a cost control:** they also cap runaway spend. A budget alert tells you after the money is gone; a quota prevents it. For an agent with a loop bug, the quota is the control that actually stops it.

## 5. Why It Matters

- **Agents multiply request volume** by the step count — quota estimates must account for it.
- **Separate quota paths** stop ingestion degrading production.
- **Quotas cap runaway spend** where budget alerts only report it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Retry without backoff** | Makes an overload worse |
| **Backoff without jitter** | Thundering herd on recovery |
| **Shared quota across workloads** | Re-indexing degrades production |
| **Quota not requested ahead** | Launch blocked |
| **Agent multiplier ignored in estimates** | Limits hit at a fraction of expected traffic |
| **Retry loops on interactive paths** | Timeout instead of a graceful message |

**On graceful degradation:** when the limit is reached on an interactive path, the right behaviour is a clear message and a route to a human — not a retry loop the customer waits through until it times out. A system that fails fast and hands off is better than one that appears to hang.

**On monitoring:** rate limit errors should be tracked as a rate and alerted on before the limit is saturated. By the time requests are failing consistently it's already an incident, whereas a rising 429 rate is a signal with time to act on it.

## 7. Interview Answer

> "Rate limits don't cost money, they cost availability — when you hit one, requests fail. So the relevant design question is what happens then, because 'retry until it works' makes an overload worse.
>
> The handling is exponential backoff with jitter. Retrying immediately adds load to something already struggling, and backing off without jitter means every client retries in lockstep, producing a thundering herd the moment capacity returns. Jitter is the part people omit.
>
> Beyond that I'd differentiate by workload. Non-interactive work — ingestion, evaluation — should queue behind a rate limiter I control rather than discovering the provider's. Interactive work should shed load: when the limit is genuinely reached, a clear message and a route to a human beats a retry loop the customer waits through until it times out. Failing fast and handing off is better than appearing to hang.
>
> The design decision I'd make explicitly is separate quota paths. If ingestion and evaluation compete with production traffic for the same quota, a scheduled re-index can degrade the customer-facing service — which is entirely avoidable with different projects or reserved capacity, and it's the kind of thing that only becomes obvious during the incident.
>
> On estimating quota ahead of launch, the term people forget is the agent multiplier. One user request becoming eight model calls means a requests-per-minute limit is hit at one-eighth the user traffic you'd expect. So the estimate is expected requests per day times model calls per request times tokens per call, with headroom for spikes — and quota increases have lead time, so discovering a ceiling during launch is predictable and avoidable.
>
> One thing worth noting is that rate limits are also a cost control. A budget alert tells you after the money is gone; a quota prevents it. For an agent with a loop bug, the quota is the control that actually stops it — which is an argument for setting quotas deliberately rather than requesting the maximum available.
>
> And I'd monitor 429 rates as a signal rather than waiting for consistent failures. By the time requests are failing reliably it's already an incident, whereas a rising rate limit error rate gives you time to act."

## 8. Likely Follow-ups

**Q: How should you handle a rate limit?**
Exponential backoff with jitter. Retrying immediately worsens the overload, and backing off without jitter means every client retries in lockstep, producing a thundering herd on recovery. Jitter is the commonly omitted part.

**Q: Should interactive and batch work behave the same?**
No. Batch work queues behind a rate limiter you control. Interactive work sheds load — a clear message and a handoff beats a retry loop the customer waits through until it times out. Failing fast is better than appearing to hang.

**Q: What's the design decision people miss?**
Separate quota paths. Ingestion and evaluation competing with production traffic for the same quota means a scheduled re-index can degrade the customer-facing service — avoidable with different projects or reserved capacity, and usually discovered during the incident.

**Q: How do you estimate quota?**
Expected requests per day times model calls per request times tokens per call, with spike headroom. The term people forget is the agent multiplier — one user request becoming eight model calls means limits are hit at one-eighth the expected user traffic.

**Q: Are rate limits a cost control?**
Yes. A budget alert reports spend after it happened; a quota prevents it. For an agent with a loop bug the quota is what actually stops the runaway, which is an argument for setting quotas deliberately rather than requesting the maximum.

## 9. Common Mistakes

- Retrying without backoff, or backing off without jitter.
- Shared quota between ingestion and production traffic.
- Ignoring the agent multiplier when estimating quota.
- Retry loops on interactive paths instead of graceful degradation.
- Waiting for consistent failures rather than alerting on 429 rates.

## 10. What to Remember

- **They cost availability, not money** — the question is what happens on failure.
- **Backoff with jitter** — lockstep retries produce a thundering herd.
- **Separate quota paths** so ingestion can't degrade production.
- **Agents multiply request volume** by step count in quota estimates.
- **Quotas prevent runaway spend** where budget alerts only report it.
