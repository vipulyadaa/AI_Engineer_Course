# Model Compression

> **Phase 04 · LLM FUNDAMENTALS · Topic 30**

## 1. Definition

The family of techniques that reduce a model's size or compute cost while preserving as much quality as possible: quantization, distillation, pruning, and architectural efficiency choices like grouped-query attention.

## 2. Simple Explanation

Four different levers, targeting different costs.

Quantization reduces bits per parameter. Distillation trains a smaller model. Pruning removes parameters. Architectural choices reduce what needs computing or caching in the first place. They compose, and choosing among them depends on which cost is actually binding.

## 3. How It Works

| Technique | Reduces | Typical gain | Quality cost |
|---|---|---|---|
| **Quantization** | Bits per parameter | 2–4× memory | Small (INT8) to moderate (INT4) |
| **Distillation** | Parameter count | 10–100× | Task-dependent; can be small |
| **Pruning** | Number of parameters | 1.5–2× | Moderate; needs fine-tuning after |
| **GQA / MQA** | KV cache size | 4–32× cache | Small |
| **Sliding-window attention** | Attention compute | O(n²) → O(n·w) | Loses direct long-range attention |

**They compose:** a distilled student, quantized to INT8, using grouped-query attention, is the realistic production shape — not any one technique alone.

**The prerequisite question:** *which cost is binding?*

```
Memory-bound (model won't fit)        → quantization, distillation
Throughput-bound (KV cache limits batch) → GQA, KV cache quantization
Latency-bound (decode too slow)       → distillation, quantization,
                                        speculative decoding
Cost-bound (per-token price at volume) → distillation, caching, cascading
```

Optimizing the wrong axis is the most common waste.

## 4. Practical Example

**A realistic optimization sequence for a RAG assistant:**

```
Baseline: 70B model, hosted API
  latency 4.2s, cost $0.012/request, 100k requests/day = $1.2k/day

1. Cap max_output_tokens 500 → 250
   → latency 2.4s, cost $0.008.     Free. Do this first.

2. Prompt caching on the fixed system prompt
   → TTFT down, cost $0.007.        Nearly free.

3. Reduce retrieved chunks 8 → 4 via reranking
   → cost $0.005, quality UP (less distraction)

4. Cascade: distilled 7B model for routine queries,
   escalate ~15% to the 70B
   → blended cost ~$0.002, blended latency ~1.1s

Cumulative: ~6× cost reduction, ~4× latency reduction,
quality roughly maintained.
```

**Note the ordering:** the free and nearly-free changes come first. Distillation is last because it's the most work.

**Pruning, and why it's less common in practice:**

```
Unstructured pruning removes individual weights → sparse matrices
  that most hardware can't accelerate. Memory saving without
  a speed gain.

Structured pruning removes whole heads, layers, or channels
  → actually faster, but a larger quality cost, and it needs
  fine-tuning afterwards to recover.

That's why quantization and distillation dominate — they
deliver on current hardware, and pruning often doesn't.
```

## 5. Why It Matters

- **It's the practical toolkit for making an LLM system affordable**, which is a core AI Engineer concern.
- **Diagnosing which cost is binding before optimizing** is the judgment that matters more than knowing the techniques.
- **The free changes come first** — and most teams skip them to reach for the interesting ones.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Optimizing the wrong axis** | Quantizing when the KV cache was the constraint |
| **Skipping free changes** | Output caps and prompt caching before distillation |
| **Stacking without measuring** | Compounding quality loss nobody quantified |
| **Generic quality claims** | Evaluate compressed models on your own data |
| **Unstructured pruning** | Memory saving without speedup on typical hardware |
| **No quality gate** | Cost reduction that quietly broke the product |

**On compounding quality loss:** each technique costs a little quality. INT4 quantization plus aggressive distillation plus structured pruning can compound into something noticeably worse, and nobody measured the combination — only each step in isolation. I'd evaluate the full stack end-to-end on a held-out set, not each change independently.

**On the ordering principle:** cost optimization should go cheapest-intervention-first. Capping output tokens and enabling prompt caching cost nothing and often deliver more than a distillation project. Teams routinely skip them because they're less interesting.

## 7. Interview Answer

> "Model compression covers four levers targeting different costs. Quantization reduces bits per parameter. Distillation trains a smaller model. Pruning removes parameters. And architectural choices like grouped-query attention reduce what needs caching or computing in the first place.
>
> The judgment that matters more than knowing the techniques is diagnosing which cost is actually binding. If the model won't fit, that's quantization or distillation. If the KV cache is limiting batch size, that's grouped-query attention or cache quantization. If decode is too slow, that's distillation, quantization, or speculative decoding. If per-token price at volume is the problem, that's distillation, caching, or cascading. Optimizing the wrong axis is the most common waste.
>
> And the ordering principle is cheapest-intervention-first. For a RAG assistant on a hosted API, I'd start by capping max output tokens — free, and it often halves latency because decode dominates. Then prompt caching on the fixed system prompt — nearly free, cuts TTFT and cost. Then reducing retrieved chunks through better reranking, which cuts cost *and* improves quality because there's less distraction. Only then a distilled small model with a cascade to the large one for hard cases.
>
> In a realistic sequence that's roughly a six-fold cost reduction and four-fold latency reduction with quality maintained — and the first three steps required no model work at all. Teams routinely skip them because they're less interesting than distillation.
>
> On pruning specifically: unstructured pruning removes individual weights and gives you sparse matrices that most hardware can't accelerate, so you save memory without gaining speed. Structured pruning removes whole heads or layers and is actually faster, but costs more quality and needs fine-tuning to recover. That's why quantization and distillation dominate in practice.
>
> And I'd evaluate the full compressed stack end-to-end, not each change in isolation — stacking INT4 quantization with aggressive distillation compounds quality loss that nobody measured."

## 8. Likely Follow-ups

**Q: Which compression technique would you use first?**
None of them — I'd start with the free changes. Capping max output tokens, enabling prompt caching, and reducing retrieved context typically deliver more than a compression project and cost nothing. Then I'd diagnose which resource is actually binding before picking a technique.

**Q: How do you decide between quantization and distillation?**
By what's binding. Quantization if memory or bandwidth is the constraint and you want to keep the same model's behavior. Distillation if per-request cost at volume is the constraint and the task is narrow enough that a small model can learn it. They compose — a distilled model quantized to INT8 is a normal production configuration.

**Q: Why isn't pruning used more?**
Because unstructured pruning produces sparse matrices that most hardware can't accelerate — you save memory without gaining speed. Structured pruning removes whole heads or layers and is genuinely faster, but it costs more quality and requires fine-tuning afterwards to recover. Quantization and distillation deliver more reliably on current hardware.

**Q: What's the risk of combining techniques?**
Compounding quality loss that nobody measured. Each technique is evaluated in isolation and looks acceptable; the stack of INT4 quantization plus aggressive distillation plus pruning can be noticeably worse than any individual step suggested. I'd evaluate the full configuration end-to-end on a held-out set.

**Q: How do you know compression didn't break the product?**
A quality gate on your own eval set, run before and after, with the same slicing you'd use normally. Generic "minimal quality loss" claims don't transfer — degradation from quantization concentrates in specific behaviors like numeric precision and structured-output adherence, which may be exactly what your application depends on.

## 9. Common Mistakes

- Reaching for compression before the free changes.
- Optimizing a resource that isn't the binding constraint.
- Stacking techniques without evaluating the combination.
- Trusting generic quality claims instead of measuring on your data.
- Using unstructured pruning and expecting a speedup.

## 10. What to Remember

- **Four levers:** quantization (bits), distillation (size), pruning (parameters), architecture (GQA, sliding window).
- **Diagnose which cost is binding first** — memory, throughput, latency, or per-request price.
- **Cheapest intervention first:** cap output tokens, prompt caching, fewer chunks — all free.
- **They compose**, and the compounding quality loss needs measuring end-to-end.
- **Pruning underdelivers** on typical hardware; quantization and distillation dominate.
