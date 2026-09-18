# Inference

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 14**

## 1. Definition

Running a **trained** model on new inputs to produce predictions. Parameters are frozen — no learning happens. This is what actually runs in production, under a latency budget and a cost budget.

## 2. Simple Explanation

Training is studying; inference is answering the question on the day.

Training happens once (or periodically), offline, on expensive hardware, and nobody's waiting. Inference happens millions of times, online, with a user waiting and a bill accruing per call. Those are completely different engineering problems, which is why they have different constraints and often different hardware.

## 3. How It Works

1. **Receive input** and apply **exactly the same preprocessing used at training** — this is where skew bugs live.
2. **Forward pass only** — no gradients, no backward pass. In PyTorch: `model.eval()` and `torch.no_grad()`.
3. **Post-process** — apply the threshold, map class indices to labels, format the response.
4. **Return**, and log the input, the output, and the model version for monitoring.

**Two serving modes:**

| | Batch inference | Online inference |
|---|---|---|
| **Trigger** | Scheduled | Per request |
| **Latency** | Minutes to hours | Milliseconds |
| **Throughput** | Very high | Moderate |
| **Use for** | Nightly risk scores, precomputed embeddings | Live chat, fraud checks at auth |

## 4. Practical Example

**LLM inference has two distinct phases**, and knowing this explains most latency behavior:

```
PREFILL   — process the whole prompt at once, in parallel
            compute-bound; cost scales with prompt length
            → this is your Time To First Token (TTFT)

DECODE    — generate one token at a time, each attending to all previous
            memory-bandwidth-bound; cost scales with output length
            → this is your inter-token latency
```

Consequences you can act on:
- **Long prompts hurt TTFT; long outputs hurt total time.** Cutting retrieved context from 8 chunks to 4 improves first-token latency directly.
- **KV caching** stores attention keys/values so decode doesn't recompute the whole prefix each token — without it, generation would be quadratic.
- **Prompt caching** reuses the prefill for a repeated prefix (a long system prompt), cutting both latency and cost on every subsequent call.
- **Streaming** doesn't reduce total time but makes TTFT the perceived latency, which is usually what users judge.

## 5. Why It Matters

- **Inference cost dominates total cost at scale.** Training is a one-time bill; inference is charged per request forever.
- **It's where the latency SLA lives.** A model that's 2 points more accurate and 200ms slower may be unshippable.
- **The training/serving boundary is the top source of silent bugs** — a feature transform that differs between the two makes offline metrics meaningless.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Training/serving skew** | Preprocessing differs between pipelines | Share the exact transform code; log served features and re-score offline to compare |
| **Unseen categories** | A category absent from training arrives in production | `handle_unknown="ignore"`, or an explicit fallback path |
| **Latency blown by model size** | Bigger model, tighter SLA | Quantization, distillation, caching, or cascade cheap→expensive |
| **Cost blown at volume** | Per-call pricing × millions of calls | Cache, batch, distill to a smaller model, or shorten prompts |
| **Silent degradation** | Accuracy decays with no error thrown | Monitor input distributions and output score distributions, not just errors |
| **No model version in logs** | Can't attribute a regression to a deploy | Log model version with every prediction |

**Optimization levers, roughly in order of payoff:** caching (semantic or exact), batching, quantization (INT8/FP8 — big speedup, small quality cost), distillation to a smaller model, and cascading so the expensive model only sees hard cases.

## 7. Interview Answer

> "Inference is running a trained model on new inputs with the parameters frozen — forward pass only, no learning. It's a completely different engineering problem from training. Training is offline, batch, expensive hardware, nobody waiting. Inference is online, per-request, with a latency budget and a bill per call.
>
> For LLMs specifically it splits into two phases, and that explains most of the latency behavior. Prefill processes the whole prompt in parallel and is compute-bound — that's time to first token, and it scales with prompt length. Decode generates one token at a time and is memory-bandwidth-bound — that scales with output length. So trimming retrieved context from eight chunks to four improves first-token latency directly, and KV caching is what stops decode from being quadratic.
>
> The optimization levers I'd reach for in order are caching, batching, quantization, distillation, and cascading — cheap model first, escalate only ambiguous cases.
>
> The failure mode I'd watch hardest is training/serving skew. If the feature transform at serving differs from training, the offline metrics don't describe the deployed system at all. I'd log served feature vectors and re-score them offline; any discrepancy is a bug, not a modeling issue."

## 8. Likely Follow-ups

**Q: Batch vs. online inference?**
Batch runs on a schedule, tolerates minutes of latency, and maximizes throughput — good for nightly risk scores or precomputing embeddings. Online runs per request under a millisecond-to-second budget. Batch is cheaper per prediction; online is necessary when the input only exists at request time. Many systems do both — precompute what you can, serve the rest live.

**Q: How do you reduce LLM inference cost?**
Shorten prompts, especially retrieved context — fewer, better chunks beats more chunks. Use prompt caching for a long stable system prefix. Cache responses, exactly or semantically, for repeated questions. Route easy queries to a smaller model and escalate only hard ones. And cap `max_output_tokens`, since decode time scales directly with output length.

**Q: What is KV caching?**
During decode, each new token attends to all previous tokens. Without caching you'd recompute keys and values for the entire prefix on every token, which is quadratic. KV caching stores them so each step only computes the new token's. It's what makes generation linear rather than quadratic — at the cost of memory that grows with sequence length, which is often the real constraint on batch size.

**Q: How do you detect that a deployed model has degraded?**
Layered, because ground-truth labels arrive late or never. Track input feature distributions and alert on divergence — that fires before any label exists. Track the output score distribution, since a fraud model whose mean score halves overnight is telling you something. Use proxies like override rate or click-through. Then backfill true accuracy when labels arrive. And treat a drift alert as a trigger to investigate, not proof of failure.

**Q: Why is quantization worth it?**
It reduces weight precision from FP16 to INT8 or FP8, which cuts memory footprint and increases throughput substantially, usually with small quality loss. Since decode is memory-bandwidth-bound, less memory traffic translates fairly directly into speed. The right check is to run your own eval set before and after rather than trusting a generic quality claim.

## 9. Common Mistakes

- Assuming the serving preprocessing matches training without verifying it.
- Forgetting `model.eval()` / `no_grad()` — leaves dropout active and wastes memory.
- Optimizing accuracy while ignoring the latency and cost budget.
- Not logging the model version with predictions.
- Treating LLM latency as one number instead of TTFT plus inter-token latency.
- Monitoring only for errors, when the real failure mode is silent decay.

## 10. What to Remember

- **Frozen parameters, forward pass only.** Different engineering problem from training.
- **Inference cost dominates at scale** — training is one bill, inference is forever.
- **LLM latency = prefill (prompt length → TTFT) + decode (output length → total).**
- **Optimization order:** cache → batch → quantize → distill → cascade.
- **Training/serving skew** is the top silent bug. Log served features and re-score offline.
