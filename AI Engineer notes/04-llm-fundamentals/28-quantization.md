# Quantization

> **Phase 04 · LLM FUNDAMENTALS · Topic 28**

## 1. Definition

Reducing the numerical precision of model weights (and sometimes activations and the KV cache) from FP16 to INT8, FP8, or INT4. It cuts memory and increases throughput, because decode is memory-bandwidth-bound.

## 2. Simple Explanation

A parameter stored as 16 bits becomes 8 or 4. The model gets smaller and faster.

It works well because decode is bandwidth-bound — most of the time is spent reading weights from memory, not computing. Halve the bytes and you roughly halve the read time.

## 3. How It Works

```
Precision   Bytes/param   7B model   Typical quality impact
FP32          4            28 GB     reference
FP16 / BF16   2            14 GB     the serving standard
FP8           1             7 GB     minimal
INT8          1             7 GB     small
INT4        0.5           3.5 GB     noticeable but often acceptable
```

**Post-training quantization vs. quantization-aware training:**

| | PTQ | QAT |
|---|---|---|
| When | After training | During training |
| Cost | Minutes to hours | A full training run |
| Quality | Good, especially at INT8 | Better, especially at INT4 |
| Practicality | **What you'll use** | Requires the training pipeline |

**The methods worth naming:**

```
GPTQ     — layer-wise, minimizes output error; strong at INT4
AWQ      — protects "salient" weights identified by activation magnitude
GGUF     — the llama.cpp format; various bit widths, CPU-friendly
bitsandbytes — INT8/INT4 loading in Hugging Face; used by QLoRA
```

## 4. Practical Example

**Why quantization gives a real speedup and not just memory savings:**

```
Decode is MEMORY-BANDWIDTH-bound: generating one token
requires reading every weight to do little arithmetic.

FP16 7B model: read 14 GB per token
INT8 7B model: read  7 GB per token

Roughly half the memory traffic → roughly double the
decode throughput, before accounting for batching.

That's why quantization is a throughput optimization,
not merely a "fits on smaller hardware" one.
```

**What to quantize, and what not to:**

```
✅ Weights                      the main target; largest share
✅ KV cache                     often the binding memory constraint
⚠️ Activations                  more quality-sensitive
❌ Normalization statistics     keep in higher precision; low-precision
                                variance computation is unstable
❌ Embedding/output layer        sometimes kept higher precision;
                                sensitive to quantization error
```

**The evaluation requirement:**

```
Quantization quality is TASK-DEPENDENT. A model that holds up
on general benchmarks may degrade on your domain, and the
degradation is often concentrated in specific behaviors —
numeric precision, long-context retrieval, structured output.

So: run your own eval set before and after. Do not accept a
generic "minimal quality loss" claim, especially at INT4.
```

## 5. Why It Matters

- **It's a throughput optimization, not just a memory one** — the bandwidth-bound argument is the substantive point.
- **QLoRA depends on it** — 4-bit base plus LoRA is what made single-GPU fine-tuning possible.
- **KV cache quantization** targets what's usually the real serving constraint.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Quality loss at INT4** | Noticeable; concentrated in specific behaviors rather than uniform |
| **Accepting generic quality claims** | Evaluate on your own data |
| **Quantizing normalization statistics** | Unstable variance computation |
| **Hardware support varies** | FP8 needs recent GPUs; INT8 kernels vary in quality |
| **Community quantized uploads** | Method and calibration data vary; quality isn't guaranteed |
| **Calibration data mismatch** | PTQ uses a calibration set; if it doesn't match your domain, quality suffers |

**On where INT4 degradation shows up:** it tends to concentrate rather than spread evenly — numeric precision, long-context retrieval, and strict structured-output adherence are common casualties. General conversational quality can look fine while the specific behaviors your application depends on degrade. That's why domain evaluation matters more than benchmark scores.

**On KV cache quantization specifically:** since the KV cache often exceeds the model weights at moderate batch and sequence length, quantizing it to INT8 can increase achievable batch size more than quantizing weights does. It's an underused lever.

## 7. Interview Answer

> "Quantization reduces the numerical precision of weights — and optionally activations and the KV cache — from FP16 to INT8, FP8, or INT4. A 7B model goes from fourteen gigabytes at FP16 to seven at INT8 and three and a half at INT4.
>
> The point I'd emphasize is that it's a throughput optimization, not just a memory one. Decode is memory-bandwidth-bound: generating one token requires reading every weight to do very little arithmetic. So halving the bytes roughly halves the memory traffic and roughly doubles decode throughput. That's a genuine speedup, not just fitting on smaller hardware.
>
> In practice I'd use post-training quantization — GPTQ, AWQ, or bitsandbytes — because quantization-aware training requires a full training run. INT8 is usually close to lossless; INT4 has real quality cost but is often acceptable.
>
> What I'd be careful about is that INT4 degradation concentrates rather than spreads evenly. Numeric precision, long-context retrieval, and strict structured-output adherence are common casualties, while general conversational quality can look fine. So a generic 'minimal quality loss' claim is not something I'd accept — I'd run my own eval set before and after, focusing on the behaviors my application actually depends on.
>
> There are things not to quantize: normalization statistics should stay in higher precision because low-precision variance computation is unstable, and the embedding and output layers are often kept higher precision too.
>
> The underused lever is KV cache quantization. Since the cache often exceeds the model weights at moderate batch and sequence length, quantizing it to INT8 can increase achievable batch size more than quantizing the weights does — and batch size is what actually drives throughput.
>
> And QLoRA is the case where this matters most for fine-tuning: a 4-bit base with LoRA adapters brings a 7B fine-tune to five or six gigabytes, which fits a single consumer GPU."

## 8. Likely Follow-ups

**Q: Why does quantization speed things up?**
Because decode is memory-bandwidth-bound — each token requires reading all model weights to do relatively little arithmetic. Halving the bytes per parameter roughly halves memory traffic and roughly doubles decode throughput. It's not primarily a compute optimization; it's a memory-traffic one.

**Q: How much quality do you lose?**
INT8 is usually close to lossless. INT4 has real cost, but the important detail is that it concentrates rather than spreads — numeric precision, long-context retrieval, and structured-output adherence degrade first while general conversation looks fine. That's why domain-specific evaluation matters more than a benchmark number.

**Q: PTQ or QAT?**
Post-training quantization in practice, because quantization-aware training requires a full training run and you usually don't have the pipeline. PTQ with GPTQ or AWQ is good enough at INT8 and workable at INT4. QAT is better at aggressive bit widths if you're training the model anyway.

**Q: What shouldn't you quantize?**
Normalization statistics — low-precision variance computation is numerically unstable. Embedding and output layers are often kept at higher precision too, since they're sensitive to quantization error. Activations are more quality-sensitive than weights, so weight-only quantization is the common starting point.

**Q: What about the KV cache?**
It's an underused lever. The cache often exceeds the model weights at moderate batch and sequence length, so quantizing it to INT8 can increase achievable batch size more than quantizing weights does — and batch size is what actually drives serving throughput. Worth doing alongside weight quantization rather than instead of it.

## 9. Common Mistakes

- Framing quantization as only a memory saving, missing the bandwidth argument.
- Accepting generic quality claims instead of evaluating on your own data.
- Quantizing normalization statistics.
- Ignoring the KV cache, which is often the binding constraint.
- Trusting third-party quantized uploads without verification.

## 10. What to Remember

- **FP16 → INT8 → INT4:** 14 GB → 7 GB → 3.5 GB for a 7B model.
- **It's a throughput win** because decode is memory-bandwidth-bound.
- **INT8 near-lossless; INT4 degrades in concentrated ways** — numbers, long context, structured output.
- **Don't quantize normalization statistics.** Evaluate on your own data, not benchmarks.
- **Quantize the KV cache too** — it often exceeds the weights and drives batch size.
