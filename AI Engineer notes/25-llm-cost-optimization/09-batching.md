# Batching

> **Phase 25 · LLM COST OPTIMIZATION · Topic 09**

## 1. Definition

Processing multiple items in one request or one job rather than individually. For hosted LLM APIs it's primarily an ingestion and offline-processing technique, not a way to reduce per-token cost on interactive traffic.

## 2. Simple Explanation

Batching helps where you control the timing: embedding a corpus, classifying a backlog, evaluating a golden set.

It doesn't help an interactive request, because the customer is waiting and you can't hold their query to group it with others.

## 3. How It Works

```
WHERE BATCHING APPLIES

EMBEDDING AT INGESTION    hundreds of chunks per API call
                          → fewer round trips, better
                            throughput, avoids rate limits

BATCH PREDICTION JOBS     offline processing at a reduced
                          rate on some platforms
                          → genuinely cheaper per token

EVALUATION RUNS           200 golden set cases in parallel
                          → wall-clock, not cost

INTERACTIVE REQUESTS      no — the user is waiting
```

**The distinction that matters:** batching reduces *overhead and wall-clock time* for self-hosted or offline work, and reduces *rate* only where a provider offers discounted batch processing.

## 4. Practical Example

**Embedding at ingestion, where it genuinely matters:**

```
10 million chunks, embedded one per request:
  · 10M HTTP round trips
  · rate limits hit constantly
  · a job that takes days

Batched at 250 per request:
  · 40,000 requests
  · throughput limited by the provider, not by round trips
  · hours instead of days

Plus: batch with backoff on rate limits, and checkpoint
completed chunk IDs so a failure resumes rather than
restarting. Embedding a large corpus is the main one-time
ingestion cost, and a job that restarts from zero fails
repeatedly and expensively.
```

**Batch prediction for offline work:**

```
Reclassifying a year of support tickets, or scoring a large
document set, has no latency requirement.

Where a platform offers batch prediction at a reduced rate,
that's a genuine per-token saving — and it applies to
exactly the workloads that don't need an answer now.

The engineering point: identify which of your workloads are
actually offline. Teams often run backfills through the
interactive path because that's the code that exists.
```

**Why it doesn't apply to interactive traffic:**

```
You could hold requests for 200ms to batch them. That adds
200ms to every request to save nothing on a hosted API,
where you're billed per token regardless of grouping.

For SELF-HOSTED inference, batching is different — it
improves GPU utilization substantially, and that's a real
throughput and cost argument. But it's a property of
serving your own model, not of calling an API.
```

**That distinction is the substantive point** — batching's benefit depends entirely on whether you own the inference.

## 5. Why It Matters

- **Batching helps ingestion and offline work**, not interactive requests.
- **Self-hosted inference is the case where batching genuinely reduces cost** per token.
- **Identifying which workloads are offline** is where the saving is found.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Batching interactive requests** | Latency added, nothing saved |
| **One chunk per embedding call** | Round trips and rate limits dominate |
| **No checkpointing on batch jobs** | Failures restart from zero |
| **Backfills through the interactive path** | Missing a cheaper offline route |
| **Batch size too large** | One failure loses the whole batch |
| **No backoff on rate limits** | The job dies partway |

**On batch size:** larger batches mean fewer round trips and a bigger loss when one fails. A few hundred items per call with per-batch checkpointing is a reasonable balance — the retry cost is bounded and the overhead is amortized. Getting this wrong in either direction is expensive on a multi-hour job.

**On self-hosted inference:** if you serve your own model, continuous batching is one of the largest throughput levers available, because it keeps the GPU busy across concurrent requests rather than idling between them. That's a genuinely different argument from API batching and it's worth distinguishing, since the same word covers both.

## 7. Interview Answer

> "Batching helps where you control the timing — embedding a corpus, classifying a backlog, running an evaluation set. It doesn't help an interactive request, because the customer is waiting and you can't hold their query to group it with others.
>
> Where it genuinely matters is embedding at ingestion. Ten million chunks embedded one per request is ten million HTTP round trips, constant rate limiting, and a job that takes days. Batched at a couple of hundred per request it's forty thousand calls, throughput limited by the provider rather than by round trips, and hours instead of days.
>
> And alongside batching there, I'd add backoff on rate limits and checkpointing of completed chunk IDs — because embedding a large corpus is the main one-time ingestion cost, and a job that restarts from zero on failure fails repeatedly and expensively.
>
> The second case is batch prediction for offline work. Reclassifying a year of support tickets or scoring a large document set has no latency requirement, and where a platform offers batch prediction at a reduced rate, that's a genuine per-token saving. The engineering point is identifying which of your workloads are actually offline — teams often run backfills through the interactive path simply because that's the code that already exists.
>
> Why it doesn't apply to interactive traffic: you could hold requests for two hundred milliseconds to group them, but that adds latency to every request and saves nothing on a hosted API, where you're billed per token regardless of how requests are grouped.
>
> The distinction I'd draw out is that batching's benefit depends entirely on whether you own the inference. For self-hosted serving, continuous batching is one of the largest throughput levers available, because it keeps the GPU busy across concurrent requests rather than idling between them. That's a genuinely different argument from API batching, and the same word covering both is why the topic gets muddled.
>
> One practical detail: batch size is a trade-off. Larger batches mean fewer round trips and a bigger loss when one fails. A few hundred items per call with per-batch checkpointing bounds the retry cost while amortizing the overhead — and getting that wrong in either direction is expensive on a multi-hour job."

## 8. Likely Follow-ups

**Q: Does batching reduce cost on a hosted API?**
Only where the provider offers discounted batch prediction for offline work. Otherwise you're billed per token regardless of grouping, so batching reduces round trips and wall-clock time rather than cost — which still matters for ingestion jobs.

**Q: Where does batching matter most?**
Embedding at ingestion. Ten million chunks one per call is ten million round trips and constant rate limiting; batched at a couple of hundred it's forty thousand calls and hours instead of days. That's the difference between a feasible job and an infeasible one.

**Q: Why not batch interactive requests?**
Because the customer is waiting. Holding requests to group them adds latency to every one and saves nothing on a hosted API. The only case where it helps is self-hosted inference, where it improves GPU utilization.

**Q: What's different about self-hosted?**
Continuous batching keeps the GPU busy across concurrent requests rather than idling between them, which is one of the largest throughput levers available. That's a genuinely different argument from API batching — the same word covering both is why the topic gets confused.

**Q: How do you choose batch size?**
A few hundred items with per-batch checkpointing. Larger batches amortize overhead better but lose more when one fails, so the balance bounds retry cost while keeping round trips low. Getting it wrong in either direction is expensive on a multi-hour job.

## 9. Common Mistakes

- Batching interactive requests on a hosted API.
- Embedding one chunk per call.
- No checkpointing, so batch failures restart from zero.
- Running offline backfills through the interactive path.
- Conflating API batching with self-hosted continuous batching.

## 10. What to Remember

- **Batching is for ingestion and offline work**, not interactive traffic.
- **Embedding at ingestion** is where it turns days into hours.
- **Checkpoint and back off** — a restart-from-zero job fails expensively.
- **Batch prediction** is a real rate saving for offline workloads.
- **Self-hosted continuous batching is a different argument** — GPU utilization.
