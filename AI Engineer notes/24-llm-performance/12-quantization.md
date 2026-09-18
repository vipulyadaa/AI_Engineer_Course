# Quantization

> **Phase 24 · LLM PERFORMANCE · Topic 12**

## 1. Definition

Storing model weights at lower numerical precision — FP16 to INT8 or INT4 — reducing memory footprint proportionally and speeding up inference, at some cost in quality.

## 2. Simple Explanation

A model's weights are numbers. Storing them with fewer bits makes the model smaller and faster, because inference is limited by moving those weights from memory.

Halve the bits, halve the memory traffic, roughly double the decode speed.

## 3. How It Works

```
PRECISION    BYTES/PARAM   7B MODEL    QUALITY
FP32              4          28 GB     baseline
FP16              2          14 GB     ≈ baseline, standard
INT8              1           7 GB     small degradation
INT4            0.5         3.5 GB     noticeable degradation

WHY IT SPEEDS THINGS UP
  decode is memory-bandwidth bound — the bottleneck is
  reading weights, not the arithmetic
  → fewer bytes per weight = more tokens per second
```

**The memory-bound property is why quantization helps latency**, not just capacity. If decode were compute-bound, smaller weights would save memory and nothing else.

## 4. Practical Example

**Where it matters in a RAG system:**

```
NOT for the hosted foundation model — the provider decides,
and you don't see it.

FOR SELF-HOSTED COMPONENTS:
  · a cross-encoder reranker on a dedicated endpoint
  · an open model serving classification
  · an embedding model served in-project

And for the VECTOR INDEX, which is a different kind of
quantization but the same idea:
  int8 vectors → ~4× less memory
  → often removes the need to shard, which is a large
    infrastructure and latency win, since sharding adds
    scatter-gather latency bound by the slowest node
```

**The vector index case is the one most likely to be relevant** in a RAG system, and it's the argument for quantizing before sharding.

**Choosing a precision:**

```
INT8   the usual choice — small quality cost, ~2× memory
       reduction and speedup over FP16
INT4   noticeable degradation; justified when the model
       otherwise doesn't fit at all

The decision rule: quantize until the golden set shows a
quality drop you care about, then step back one level.

Measure on YOUR task — quantization degradation is not
uniform across tasks, and a model that holds up on
generation may degrade more on structured extraction.
```

**That task-dependence is worth knowing** — a published "INT8 loses 1%" figure is an average over benchmarks that aren't yours.

**Quantization-aware alternatives:** post-training quantization is the simple case and what's usually meant. Quantization-aware training produces better results at low precision but requires training, which puts it out of scope for anyone using hosted or off-the-shelf models.

## 5. Why It Matters

- **Decode is memory-bound**, so quantization improves speed as well as capacity.
- **Vector index quantization** is the most relevant case in a RAG system.
- **Degradation is task-dependent** — published averages don't transfer.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Quantizing without measuring** | Quality loss on your specific task |
| **INT4 by default** | Noticeable degradation for memory you may not need |
| **Assuming published degradation figures** | Averages over other people's tasks |
| **Sharding before quantizing the index** | A distributed system instead of a flag |
| **Expecting it on hosted models** | The provider decides |
| **Quality checked only on generation** | Structured tasks may degrade more |

**On the index-quantization ordering:** quantizing vectors to int8 is a configuration change giving roughly fourfold memory reduction for modest recall cost. Sharding is a distributed system with scatter-gather latency bound by the slowest node. Taking the flag before the distributed system is almost always right — and it frequently removes the need for sharding entirely, which is a latency win as well as an operational one.

**On measuring recall after quantizing an index:** the effect is a recall change, so measure it the same way as any ANN recall question — sampled production queries against an exact baseline, with realistic filters applied. A recall drop from quantization compounds with every other recall loss upstream.

## 7. Interview Answer

> "Quantization stores weights at lower precision — FP16 to INT8 or INT4 — reducing memory proportionally. FP16 is two bytes per parameter, so a seven-billion-parameter model is fourteen gigabytes; INT8 is seven, INT4 is three and a half.
>
> The reason it improves speed and not just capacity is that decode is memory-bandwidth bound. The bottleneck is reading weights from memory, not the arithmetic — so halving the bytes per weight roughly doubles the tokens per second. If decode were compute-bound, smaller weights would save memory and nothing else.
>
> In a RAG system it doesn't apply to the hosted foundation model — the provider decides that and you don't see it. It applies to self-hosted components: a cross-encoder reranker, an open model serving classification, an embedding model served in-project.
>
> But the case most likely to be relevant is the vector index. Quantizing vectors to int8 is roughly four times less memory for a modest recall cost, and it frequently removes the need to shard entirely. That matters because sharding is a distributed system with scatter-gather latency bound by your slowest node, whereas quantization is a configuration flag. Taking the flag before the distributed system is almost always right, and it's a latency win as well as an operational one.
>
> On choosing precision, INT8 is the usual answer — small quality cost for about a twofold reduction and speedup over FP16. INT4 has noticeable degradation and is justified mainly when the model otherwise doesn't fit at all. The rule I'd use is quantize until the golden set shows a quality drop you care about, then step back one level.
>
> And measure on your own task, because degradation isn't uniform across tasks. A model that holds up on generation may degrade more on structured extraction — so a published figure like 'INT8 loses one percent' is an average over benchmarks that aren't yours. Checking quality only on generation and assuming it transfers is the mistake.
>
> For the index specifically, the effect is a recall change, so I'd measure it the same way as any ANN recall question — sampled production queries against an exact baseline, with realistic filters applied. And I'd note that a recall drop from quantization compounds with every other recall loss upstream, so a few points there isn't isolated.
>
> One scope note: post-training quantization is the simple case and what's usually meant. Quantization-aware training gives better results at low precision but requires training, which puts it out of scope for anyone using hosted or off-the-shelf models."

## 8. Likely Follow-ups

**Q: Why does quantization improve speed?**
Because decode is memory-bandwidth bound — the bottleneck is reading weights from memory rather than the arithmetic. Halving the bytes per weight roughly halves the memory traffic and doubles the decode rate. If it were compute-bound, you'd only save memory.

**Q: Where does it apply in a RAG system?**
Self-hosted components — a reranker, a classifier, an embedding model — and the vector index. Not the hosted foundation model, where the provider decides. The index case is usually the most relevant one.

**Q: INT8 or INT4?**
INT8 as the default — small quality cost for roughly a twofold reduction and speedup. INT4 has noticeable degradation and is justified mainly when the model otherwise doesn't fit. Quantize until the golden set shows a drop you care about, then step back a level.

**Q: Why quantize the index before sharding?**
Because quantization is a configuration flag giving fourfold memory reduction, while sharding is a distributed system with scatter-gather latency bound by the slowest node. Quantizing frequently removes the need to shard entirely, which improves latency as well as operations.

**Q: Can you trust published degradation figures?**
No — they're averages over benchmarks that aren't your task. Degradation isn't uniform: a model holding up on generation may degrade more on structured extraction. Measuring on your own golden set is the only reliable answer.

## 9. Common Mistakes

- Quantizing without measuring on your own task.
- Defaulting to INT4 for memory you don't need.
- Trusting published degradation percentages.
- Sharding the index before quantizing it.
- Checking quality only on generation and assuming it transfers.

## 10. What to Remember

- **Decode is memory-bound** — that's why quantization speeds it up.
- **FP16 is 2 bytes/param** — 7B is 14 GB, INT8 is 7, INT4 is 3.5.
- **The vector index is the relevant case** in most RAG systems.
- **Quantize before sharding** — a flag beats a distributed system.
- **Degradation is task-dependent** — measure on your golden set.
