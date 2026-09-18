# Parameters (LLM View)

> **Phase 04 · LLM FUNDAMENTALS · Topic 11**

## 1. Definition

The learned weights of a model — what "7B" or "70B" refers to. Parameter count determines memory footprint, inference cost, and deployability, and roughly tracks capability at a given training-data scale.

## 2. Simple Explanation

Parameters are what the model learned. Everything it knows is encoded in those numbers.

The count matters practically because it determines whether the model fits on your hardware and what it costs per token — not because bigger is automatically better.

## 3. How It Works

**The memory arithmetic, which is the thing to know:**

```
Inference (weights only):
  FP32   4 bytes/param  →  7B = 28 GB
  FP16   2 bytes/param  →  7B = 14 GB    ← standard
  INT8   1 byte/param   →  7B =  7 GB
  INT4   0.5 byte/param →  7B =  3.5 GB

Plus the KV cache, which at moderate batch and sequence
length often EXCEEDS the weights.

Training (full fine-tuning, Adam):
  weights + gradients + 2 optimizer moments ≈ 4× weights
  7B → ~56 GB before activations
```

**Where the parameters sit:**

| Component | Share |
|---|---|
| Feed-forward layers | ~2/3 |
| Attention projections | ~1/3 |
| Embeddings | `vocab × d` — significant in smaller models |

**Scaling laws and the Chinchilla correction:** performance scales predictably with parameters, data, and compute — but the 2022 Chinchilla work showed earlier guidance under-weighted data. For a fixed compute budget, models should be smaller and trained on more tokens than was then standard.

## 4. Practical Example

**Parameter count is not the whole story:**

```
A 7B model trained on 2T tokens can outperform a 13B model
trained on 300B tokens.

And beyond raw capability:
  · instruction tuning quality varies hugely
  · alignment quality varies
  · domain fit varies
  · a 7B model may beat a 70B one on YOUR task

So "how many parameters" is a deployability question more
than a capability question. Capability needs measuring on
your own eval set.
```

**The practical sizing decision:**

```
Task: RAG over banking policy, context contains the answer

7B  model: comprehension and synthesis from provided context
           is not the hard part. Often sufficient.
70B model: better on ambiguity, multi-step reasoning,
           edge cases.

Cost/latency difference is roughly 10×.

The right approach: benchmark both on your eval set. When
retrieval has put a clear answer in the context, the
generation task is comprehension — and smaller models do
that well.
```

**Parameter-efficient fine-tuning changes the arithmetic:**

```
Full fine-tune of 7B:  ~56 GB (weights + gradients + optimizer)
LoRA on 7B:            base weights frozen (14 GB) +
                       adapter (<1% of params) + its optimizer state
                       → fits on a single consumer GPU

That's why LoRA made fine-tuning accessible.
```

## 5. Why It Matters

- **The memory arithmetic determines deployability** and is a standard interview calculation.
- **Parameter count is a deployability question, not a capability answer** — that framing is the mature view.
- **The 4× training-memory rule** explains why parameter-efficient fine-tuning exists.

## 6. Trade-offs / Failure Modes

| Larger | Smaller |
|---|---|
| Better general capability | Much cheaper and faster |
| More memory, higher cost | Fits on modest hardware |
| Slower inference | Higher throughput |
| Harder to fine-tune | Easy to fine-tune, even fully |

| Failure | Detail |
|---|---|
| **Estimating memory from weights alone** | Forgets KV cache, which often exceeds them |
| **Assuming bigger is better for your task** | Often untrue when context contains the answer |
| **Forgetting the 4× training multiplier** | Full fine-tuning OOMs unexpectedly |
| **Ignoring training-data volume** | A well-trained 7B can beat an undertrained 13B |

**On the distillation pattern:** the practical resolution at volume is using a large model to generate labels or to handle escalations, and a small model to serve the bulk of traffic. You get most of the quality at a fraction of the cost, and it's usually a better architecture than choosing one model for everything.

## 7. Interview Answer

> "Parameters are the learned weights — what 7B or 70B refers to. Practically, the count determines memory footprint, inference cost, and deployability.
>
> The arithmetic I'd have ready: at FP16, two bytes per parameter, so a 7B model is fourteen gigabytes of weights. But that's not the memory requirement — the KV cache at moderate batch and sequence length often exceeds the weights, so estimating from weights alone is a common underestimate. For full fine-tuning with Adam it's roughly four times the weights, because you hold gradients plus two optimizer moments per parameter — so 7B needs about fifty-six gigabytes before activations. That four-times multiplier is exactly why parameter-efficient fine-tuning exists: LoRA freezes the base weights and trains an adapter under one percent of the size, which fits on a single consumer GPU.
>
> The framing I'd push back on is that parameter count answers a capability question. A 7B model trained on two trillion tokens can outperform a 13B trained on three hundred billion — the Chinchilla work showed earlier guidance under-weighted data, so many large models were undertrained for their size. And instruction tuning quality, alignment quality, and domain fit all vary independently of size.
>
> For my actual work, the practical version is: in a RAG system where retrieval has put a clear answer in the context, the generation task is comprehension and synthesis, which smaller models do well. So I'd benchmark a 7B against a 70B on my own eval set rather than assuming the larger one is needed — the cost and latency difference is roughly tenfold and the quality difference is often small.
>
> The pattern I'd usually land on at volume is a cascade: a small model serving the bulk of traffic, escalating to a larger one when the small model abstains or the query is flagged complex."

## 8. Likely Follow-ups

**Q: How much memory does a 7B model need?**
About 14 GB for weights at FP16, but that's not the requirement — the KV cache at moderate batch and sequence length often exceeds the weights, so plan for substantially more. For full fine-tuning with Adam it's roughly 4× the weights, around 56 GB before activations.

**Q: Why is training memory 4× the weights?**
Weights, gradients, and Adam's two moment estimates — first and second — are each one tensor per parameter. So you hold four times the parameter count in optimizer-related state, before activations which scale with batch size and sequence length. That multiplier is what makes full fine-tuning of large models impractical without many GPUs.

**Q: Does a larger model always perform better?**
No. A well-trained smaller model can beat an undertrained larger one — Chinchilla showed many large models were undertrained for their size. Instruction tuning quality, alignment, and domain fit also vary independently. And on a task where retrieval has already put the answer in the context, the generation job is comprehension, which smaller models do well.

**Q: Where are the parameters in an LLM?**
About two-thirds in the feed-forward layers and a third in attention projections, plus embeddings at vocabulary times d_model, which is a significant share in smaller models. The feed-forward dominance surprises people and is why mixture-of-experts targets that component.

**Q: How would you choose a model size for a RAG system?**
By benchmarking on my own eval set rather than assuming. The cost and latency difference between a 7B and a 70B is roughly tenfold; the quality difference on grounded comprehension is often small. I'd likely end up with a cascade — small model for the bulk, escalating to a larger one when it abstains or the query is complex.

## 9. Common Mistakes

- Estimating memory from weights alone, forgetting the KV cache.
- Forgetting the 4× training-memory multiplier.
- Assuming parameter count answers a capability question.
- Not knowing where parameters sit — the FFN dominates, not attention.
- Defaulting to the largest model without benchmarking a smaller one.

## 10. What to Remember

- **FP16: 2 bytes/param.** 7B ≈ 14 GB weights — plus a KV cache that often exceeds them.
- **Training ≈ 4× weights** with Adam. That's why LoRA exists.
- **~2/3 of parameters are in the FFN**, ~1/3 in attention.
- **Count is a deployability question, not a capability answer.** Benchmark on your data.
- **Cascade at volume:** small model for the bulk, escalate the hard cases.
