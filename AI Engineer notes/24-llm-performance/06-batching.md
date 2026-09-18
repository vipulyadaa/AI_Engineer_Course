# Batching (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 06**

## 1. Definition

Processing multiple sequences together to improve hardware utilization. It's a throughput technique for self-hosted inference, and largely unavailable as a lever when calling a hosted API.

> The cost angle is in [25-llm-cost-optimization/09](../25-llm-cost-optimization/09-batching.md). This topic is the performance mechanism.

## 2. Simple Explanation

A GPU generating one sequence at a time is mostly idle — the bottleneck is moving model weights from memory, not the arithmetic.

Batching amortizes that memory movement across several sequences, so throughput rises dramatically while per-request latency barely changes.

## 3. How It Works

```
THE BOTTLENECK IN DECODE
  Generating one token requires reading the entire model's
  weights from memory. The arithmetic is trivial by
  comparison.

  → decode is MEMORY-BANDWIDTH BOUND, not compute bound

BATCHING
  Read the weights once, generate a token for N sequences.

  → throughput scales close to N
  → per-sequence latency nearly unchanged
  → until you become compute or memory bound
```

**That memory-bound property is the whole explanation.** It's why batching helps so much, and why it's the first thing any self-hosted serving stack implements.

## 4. Practical Example

**Static versus continuous batching:**

```
STATIC BATCHING
  Collect N requests, run them together, return together.
  → the batch finishes when the SLOWEST sequence finishes
  → short requests wait for long ones
  → GPU idles as sequences complete at different times

CONTINUOUS BATCHING
  As soon as one sequence finishes, a waiting request takes
  its slot.
  → the GPU stays saturated
  → substantially higher throughput at the same latency

Continuous batching is what modern serving stacks (vLLM,
TGI, and similar) implement, and the difference over static
batching is large — it's the single biggest throughput
lever in self-hosted serving.
```

**The KV cache is the constraint on batch size:**

```
Each sequence in the batch holds its own KV cache, sized
by its context length.

  batch of 32 × 8k context   → manageable
  batch of 32 × 100k context → often won't fit

So batch size and context length trade against each other.
A serving deployment handling long contexts runs smaller
batches, which is why long-context workloads have lower
throughput per GPU.
```

**That trade-off is the practical design point** for anyone sizing self-hosted capacity.

**On a hosted API:**

```
The provider batches on their side. You don't control it
and you don't see it.

What you observe is that tokens-per-second varies with
provider load — which is their batch occupancy changing.

The one thing you control is issuing independent requests
concurrently rather than sequentially, which is parallelism
in your client rather than batching in the model.
```

## 5. Why It Matters

- **Decode is memory-bandwidth bound** — that's why batching works so well.
- **Continuous batching over static** is the largest self-hosted throughput lever.
- **KV cache limits batch size**, so long contexts mean lower throughput per GPU.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Static batching** | Short requests wait for long ones |
| **Batch size too large for context length** | KV cache exhaustion |
| **Expecting batching control on a hosted API** | Not a lever you have |
| **Batching interactive requests client-side** | Latency added, nothing gained |
| **Confusing client parallelism with batching** | Different mechanisms |
| **Throughput measured without concurrency** | Single-request benchmarks mislead |

**On benchmarking:** measuring tokens per second with one request at a time tells you almost nothing about a batched deployment's capacity. Throughput has to be measured under realistic concurrency, because the whole point of batching is that per-GPU throughput rises with load up to the memory limit — a single-request benchmark measures the least favourable case.

**On what transfers to hosted APIs:** understanding batching explains why hosted throughput varies with provider load and why long-context requests are relatively more expensive to serve. It's useful for interpreting behaviour even where it isn't a lever — and it's the reason a p99 latency spike can be entirely outside your system.

## 7. Interview Answer

> "Batching improves hardware utilization, and the reason it works so well is that decode is memory-bandwidth bound rather than compute bound. Generating one token requires reading the entire model's weights from memory, and the arithmetic is trivial by comparison. So a GPU generating one sequence at a time is mostly idle waiting on memory.
>
> Batching reads the weights once and generates a token for N sequences, so throughput scales close to N while per-sequence latency barely changes. That's why it's the first thing any self-hosted serving stack implements.
>
> The distinction that matters is static versus continuous batching. Static collects N requests, runs them together, and returns together — so the batch finishes when the slowest sequence finishes, short requests wait for long ones, and the GPU idles as sequences complete at different times. Continuous batching fills each slot as soon as a sequence finishes, keeping the GPU saturated. That difference is large, and it's the single biggest throughput lever in self-hosted serving.
>
> The constraint on batch size is the KV cache, because each sequence in the batch holds its own, sized by its context length. A batch of thirty-two at eight thousand tokens is manageable; thirty-two at a hundred thousand often won't fit. So batch size and context length trade against each other, which means a deployment handling long contexts runs smaller batches and gets lower throughput per GPU. That's the practical design point when sizing self-hosted capacity.
>
> On a hosted API, none of this is a lever — the provider batches on their side and you don't see it. What you observe is tokens-per-second varying with provider load, which is their batch occupancy changing. The only thing you control is issuing independent requests concurrently rather than sequentially, and that's client parallelism rather than batching.
>
> One benchmarking point: measuring tokens per second with one request at a time tells you almost nothing about a batched deployment's capacity. The whole point of batching is that per-GPU throughput rises with load, so a single-request benchmark measures the least favourable case.
>
> And understanding this transfers even when it isn't a lever — it explains why hosted throughput varies with provider load, why long-context requests are relatively more expensive to serve, and why a p99 latency spike can be entirely outside your system rather than something in your code."

## 8. Likely Follow-ups

**Q: Why does batching help so much?**
Because decode is memory-bandwidth bound — generating a token requires reading the whole model's weights from memory, and the arithmetic is trivial. Batching amortizes that memory read across several sequences, so throughput scales close to batch size while latency barely changes.

**Q: Static or continuous batching?**
Continuous, by a large margin. Static batching finishes when the slowest sequence does, so short requests wait for long ones and the GPU idles as sequences complete unevenly. Continuous fills each slot immediately, keeping the GPU saturated.

**Q: What limits batch size?**
KV cache memory. Each sequence holds its own cache sized by its context length, so batch size and context length trade against each other. A deployment serving long contexts runs smaller batches and gets lower throughput per GPU.

**Q: Can you batch on a hosted API?**
No — the provider batches on their side and you don't control or see it. What you can do is issue independent requests concurrently, but that's client parallelism rather than batching, and the two get conflated.

**Q: How should you benchmark throughput?**
Under realistic concurrency. A single-request measurement tells you almost nothing about a batched deployment, because the entire point is that per-GPU throughput rises with load — so one-at-a-time benchmarking measures the least favourable case.

## 9. Common Mistakes

- Using static batching where continuous is available.
- Sizing batches without accounting for KV cache at the target context length.
- Expecting batching control on a hosted API.
- Batching interactive requests client-side.
- Benchmarking throughput with a single request at a time.

## 10. What to Remember

- **Decode is memory-bandwidth bound** — that's why batching works.
- **Continuous batching** is the largest self-hosted throughput lever.
- **KV cache limits batch size** — long contexts mean lower throughput.
- **Not a lever on hosted APIs** — client parallelism is a different thing.
- **Benchmark under concurrency**, or you measure the worst case.
