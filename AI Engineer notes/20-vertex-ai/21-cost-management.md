# Cost Management

> **Phase 20 · VERTEX AI · Topic 21**

## 1. Definition

Controlling and attributing Vertex AI spend — model inference, vector search, endpoints, pipelines, and storage — through labelling, budgets, quotas, and architectural decisions.

## 2. Simple Explanation

Vertex AI spend comes from several places, and they have different shapes: per-token for model calls, per-uptime for endpoints, per-run for pipelines, and per-hour for the vector index.

Most cost surprises come from the per-uptime items, because they bill whether anything uses them or not.

## 3. How It Works

```
PER TOKEN        Gemini and embedding calls
                 → scales with traffic

PER UPTIME       deployed endpoints (rerankers, tuned models,
                 open models)
                 → bills whether used or not  ← the surprise

PER HOUR         Vector Search index serving
                 → scales with index size and replicas

PER RUN          pipeline steps, on provisioned machines
                 → scales with frequency and machine size

STORAGE          GCS, BigQuery, logs, traces, checkpoints
                 → grows continuously unless managed
```

## 4. Practical Example

**Where the money actually goes in a RAG system:**

```
Typical ordering:

1. Gemini inference        — scales with traffic
2. Vector Search serving   — continuous, scales with index size
3. Embedding (ingestion)   — large one-time, then incremental
4. Deployed endpoints      — continuous, easily forgotten
5. Logging and traces      — grows silently
6. Pipeline runs           — modest unless frequent

Items 2, 4, and 5 bill continuously regardless of traffic,
which makes them the ones that surprise people — a
low-traffic system can still have a substantial monthly bill.
```

**The architectural levers, which dominate everything else:**

```
1. ROUTING — most traffic on a deterministic path rather
   than an agent: typically ~70% off inference spend
2. MODEL TIER — Flash-class versus Pro-class where the
   golden set shows no quality difference
3. CONTEXT CACHING — for large repeated prefixes
4. FEWER, BETTER CHUNKS — less input, usually better answers
5. EMBEDDING CACHE by content hash — re-ingestion only
   re-embeds what changed

Prompt micro-optimization is nowhere on this list, and
that's where teams often start.
```

**Attribution, which is what makes any of it actionable:**

```
Label every resource: team, environment, workload, cost
centre. Without labels, the bill is one number and nobody
can act on it.

Then track cost per request tagged by query type. A small
number of query types almost always dominate, and those are
addressable specifically — usually by routing them
differently.
```

**Budgets and quotas:** Cloud Billing budgets alert on spend thresholds, and quotas cap consumption. A budget alert tells you after the fact; a quota prevents it. For a runaway-loop scenario the quota is the control that matters.

## 5. Why It Matters

- **Per-uptime items bill regardless of traffic** — the usual surprise.
- **Routing and model tier dominate** every other lever.
- **Labels and per-query-type tracking** are what make optimization actionable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Idle endpoints** | Continuous billing for nothing |
| **Unlabelled resources** | Cost can't be attributed |
| **Budget alerts without quotas** | Notification after the spend |
| **Log and trace growth** | Silent, continuous accumulation |
| **Micro-optimizing prompts first** | Smallest lever, most effort |
| **Oversized pipeline machines** | Waste multiplied by run frequency |

**On logging cost specifically:** full prompt and response logging at scale can become a meaningful line item in its own right, and it grows with traffic while providing diminishing value. Structured summaries always, full payloads sampled, and a retention policy on the log bucket keeps it bounded.

**On the honest ordering of cost work:** measure first, then address the largest item. Teams frequently optimize the thing they understand best rather than the thing that costs most — and without per-query-type attribution there's no way to know which is which.

## 7. Interview Answer

> "Vertex AI spend comes from several places with different shapes. Per-token for model and embedding calls. Per-uptime for deployed endpoints. Per-hour for Vector Search index serving. Per-run for pipelines. And storage for GCS, BigQuery, logs, traces, and checkpoints.
>
> The surprises come from the per-uptime items, because they bill whether anything uses them or not. A low-traffic system can still have a substantial monthly bill from a running index, a forgotten reranker endpoint, and accumulating logs.
>
> In a typical RAG system the ordering is Gemini inference first, then Vector Search serving, then embedding as a large one-time ingestion cost, then deployed endpoints, then logging and traces, then pipeline runs.
>
> The levers that actually matter are architectural. Routing — sending most traffic through a deterministic path rather than an agent, which is typically around seventy percent off inference spend. Model tier — Flash-class versus Pro-class where the golden set shows no quality difference. Context caching for large repeated prefixes. Fewer, better-reranked chunks, which reduces input tokens and usually improves answers. And an embedding cache keyed on content hash so re-ingestion only re-embeds what changed.
>
> Prompt micro-optimization is nowhere on that list, and it's where teams often start — shortening a system prompt by a few hundred tokens while running the flagship model on every request.
>
> To make any of this actionable I'd label every resource with team, environment, workload, and cost centre, and track cost per request tagged by query type. Without labels the bill is one number nobody can act on. With per-query-type tracking you usually find a small number of types dominating, and those are addressable specifically — normally by routing them differently.
>
> On controls, I'd use both budgets and quotas. A budget alert tells you after the spend happened; a quota prevents it. For a runaway agent loop, the quota is the control that matters — the alert arrives too late to help.
>
> One item that grows silently: full prompt and response logging at scale becomes a meaningful line item in its own right, growing with traffic while providing diminishing value. Structured summaries always, full payloads sampled, and a retention policy on the log bucket.
>
> And the honest ordering of the work is measure first, then address the largest item. Teams optimize what they understand best rather than what costs most, and without attribution there's no way to tell the difference."

## 8. Likely Follow-ups

**Q: Where does the cost usually go?**
Gemini inference first, then Vector Search index serving, then one-time embedding, then deployed endpoints, logging, and pipelines. The index, endpoints, and logs bill continuously regardless of traffic, which is why a low-traffic system can still have a large bill.

**Q: What are the biggest levers?**
Routing most traffic to a deterministic path rather than an agent — typically around seventy percent off inference — and model tier selection. Both architectural. Context caching, fewer chunks, and an embedding cache follow. Prompt micro-optimization isn't on the list.

**Q: How do you attribute cost?**
Labels on every resource for team, environment, workload, and cost centre, plus per-request cost tracking tagged by query type. Without that the bill is a single number nobody can act on, and you end up optimizing whatever is most familiar rather than most expensive.

**Q: Budgets or quotas?**
Both, for different purposes. A budget alerts you after the spend occurred; a quota prevents it happening. For a runaway agent loop the quota is the control that matters, because the budget alert arrives well after the money is gone.

**Q: What grows silently?**
Logs, traces, and checkpoints. Full prompt and response logging at scale becomes a meaningful line item that grows with traffic while providing diminishing value. Structured summaries always, full payloads sampled, and a retention policy on the bucket bounds it.

## 9. Common Mistakes

- Leaving idle endpoints running.
- Unlabelled resources, making attribution impossible.
- Budget alerts with no quota to prevent overrun.
- Optimizing prompts before checking model tier and routing.
- No retention policy on logs, traces, and checkpoints.

## 10. What to Remember

- **Per-uptime items bill regardless of traffic** — index, endpoints, storage.
- **Routing and model tier dominate** every other lever.
- **Label everything; track cost per query type.**
- **Quotas prevent; budgets notify.** Use both.
- **Measure before optimizing** — familiarity isn't the same as expense.
