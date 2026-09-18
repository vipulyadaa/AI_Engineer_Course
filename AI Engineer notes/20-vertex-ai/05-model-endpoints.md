# Model Endpoints

> **Phase 20 · VERTEX AI · Topic 05**

## 1. Definition

The serving surface for a model on Vertex AI. Foundation models like Gemini are called through shared publisher endpoints; your own or tuned models are served from dedicated endpoints you provision and pay for.

## 2. Simple Explanation

There are two very different things called an endpoint.

Calling Gemini uses a shared endpoint Google operates — you pay per token and provision nothing. Deploying your own model means a dedicated endpoint with machines you choose, running whether or not anyone calls it.

Confusing the two leads to surprising bills.

## 3. How It Works

```
PUBLISHER ENDPOINT (Gemini, Model Garden foundation models)
  · no provisioning
  · pay per token
  · scales automatically
  · shared capacity

DEDICATED ENDPOINT (your model, a tuned model, an open model)
  · you choose machine type and accelerator
  · pay for uptime, not per request
  · min and max replica count
  · traffic splitting across model versions
```

**The cost model is the key difference.** A dedicated endpoint with one always-on GPU replica costs the same whether it serves a million requests or none.

## 4. Practical Example

**When a dedicated endpoint is worth it:**

```
· a fine-tuned model that must be served
· an open model (Gemma, a reranker) you want in-project
· a cross-encoder reranker — a small model, high QPS,
  where per-token pricing doesn't apply
· strict latency requirements needing dedicated capacity
· residency requirements the shared endpoint doesn't meet
```

**A reranker is the realistic case in a RAG system:**

```
A cross-encoder reranker is small, called on every query,
and latency-sensitive. Deploying it to a dedicated endpoint
with a modest machine type and autoscaling gives predictable
latency at a known cost.

That's a concrete example of when you'd provision rather
than call a shared endpoint — and it's the one most likely
to come up in a RAG architecture discussion.
```

**The configuration that matters:**

```
min_replica_count = 0   → scales to zero, but cold starts
                          are slow (model load), so this is
                          for batch or dev, not interactive
min_replica_count = 1   → always warm, always billed
                          → the interactive default
max_replica_count       → the cost ceiling under load

Traffic splitting lets you send 10% to a new version and
compare before full cutover — which is how you deploy a
model change safely.
```

**The always-on cost is the trap:** a GPU endpoint left running after an experiment bills continuously. Endpoint inventory with owners and expiry is a genuine operational control, not bureaucracy.

## 5. Why It Matters

- **Two endpoint types with opposite cost models** — per-token versus per-uptime.
- **A reranker is the realistic dedicated-endpoint case** in a RAG system.
- **Traffic splitting** is how a model change gets deployed safely.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Idle dedicated endpoints** | Billed continuously for nothing |
| **Scale-to-zero on interactive paths** | Cold starts are slow |
| **No max replica cap** | Unbounded cost under load |
| **Undersized machine type** | Latency and queueing |
| **No traffic splitting on deploy** | All-or-nothing model changes |
| **No endpoint inventory** | Forgotten resources accumulating cost |

**On cold starts:** scaling a dedicated endpoint to zero saves money and means the first request after idle waits for the model to load — which can be tens of seconds for a large model. That's fine for batch and unacceptable for an interactive path, so the choice follows the workload rather than the budget.

**On traffic splitting:** deploying a new model version to the same endpoint with a small traffic percentage lets you compare quality and latency on real traffic before committing. Rolling back is a percentage change rather than a redeploy, which makes it the safe default for any model change.

## 7. Interview Answer

> "There are two things called an endpoint and they have opposite cost models. Foundation models like Gemini are called through shared publisher endpoints — no provisioning, pay per token, scales automatically. Your own or tuned models go to dedicated endpoints where you choose machine type and accelerator and pay for uptime rather than per request.
>
> That difference is the one to be clear about, because a dedicated endpoint with one always-on GPU replica costs the same whether it serves a million requests or none. Idle endpoints left running after an experiment are a real and common source of spend, which is why endpoint inventory with owners and expiry is an operational control rather than bureaucracy.
>
> The realistic case for a dedicated endpoint in a RAG system is a cross-encoder reranker. It's a small model, called on every query, and latency-sensitive — so deploying it with a modest machine type and autoscaling gives predictable latency at a known cost, where per-token pricing doesn't apply. Other cases are a fine-tuned model, an open model like Gemma you want in-project, or a residency requirement the shared endpoint doesn't meet.
>
> On configuration, minimum replica count is the decision that matters. Zero scales down and saves money, but the first request after idle waits for the model to load, which can be tens of seconds. That's fine for batch and unacceptable for an interactive path — so it follows the workload rather than the budget. And a maximum replica count is the cost ceiling under load, which needs setting deliberately.
>
> The feature I'd use on every model change is traffic splitting. Deploying the new version to the same endpoint with ten percent of traffic lets me compare quality and latency on real requests before committing, and rolling back is a percentage change rather than a redeploy. That makes it the safe default rather than something reserved for risky changes."

## 8. Likely Follow-ups

**Q: What's the difference between endpoint types?**
Publisher endpoints serve foundation models with no provisioning and per-token pricing. Dedicated endpoints serve your own or tuned models on machines you choose, billed for uptime. The cost models are opposite, which is what makes confusing them expensive.

**Q: When would you provision a dedicated endpoint?**
For a fine-tuned model, an open model you want in-project, a cross-encoder reranker, strict latency requirements needing dedicated capacity, or residency the shared endpoint doesn't meet. The reranker is the most likely case in a RAG architecture.

**Q: Should endpoints scale to zero?**
Only for batch or development. The first request after idle waits for the model to load, which can be tens of seconds — unacceptable on an interactive path. So the minimum replica count follows the workload's latency requirement rather than the budget.

**Q: How do you deploy a model change safely?**
Traffic splitting — deploy the new version to the same endpoint with a small percentage of traffic, compare quality and latency on real requests, then increase. Rollback is a percentage change rather than a redeploy, which makes it the safe default for any change.

**Q: What's the common cost mistake?**
Idle dedicated endpoints. A GPU replica left running after an experiment bills continuously whether or not anything calls it. Maintaining an endpoint inventory with owners and expiry dates is a genuine control, and it catches spend nobody is watching.

## 9. Common Mistakes

- Leaving experimental endpoints running.
- Scaling interactive endpoints to zero.
- No maximum replica count, leaving cost unbounded.
- Deploying model changes without traffic splitting.
- Assuming all Vertex AI endpoints are billed per request.

## 10. What to Remember

- **Publisher endpoints: per token. Dedicated: per uptime.** Opposite models.
- **A cross-encoder reranker** is the realistic dedicated-endpoint case in RAG.
- **Min replicas follow the latency requirement**, not the budget.
- **Traffic splitting** for every model change; rollback is a percentage.
- **Keep an endpoint inventory** — idle GPUs bill continuously.
