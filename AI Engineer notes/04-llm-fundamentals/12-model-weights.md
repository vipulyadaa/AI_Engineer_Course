# Model Weights

> **Phase 04 · LLM FUNDAMENTALS · Topic 12**

## 1. Definition

The concrete numerical values of a trained model's parameters — the artifact you download, load, and serve. "Weights" emphasizes the file and its properties: format, precision, size, and licence.

## 2. Simple Explanation

Parameters are the concept; weights are the file.

When you download a model you get a few tens of gigabytes of floating-point numbers plus a config describing the architecture. That's the entire model — everything it knows.

## 3. How It Works

**What a model release actually contains:**

```
model-00001-of-00004.safetensors   ← the weights, sharded
config.json                        ← architecture: layers, d_model, heads
tokenizer.json                     ← vocabulary and merge rules
generation_config.json             ← default sampling parameters
```

**Formats:**

| Format | Note |
|---|---|
| **safetensors** | The standard. Memory-mappable, and **safe** |
| PyTorch `.bin` (pickle) | Legacy. **Can execute arbitrary code on load** |
| GGUF | Optimized for CPU/llama.cpp inference, quantization built in |

**The pickle issue is a real security point:** PyTorch's default `.bin` format uses Python pickle, which can execute arbitrary code during deserialization. Loading an untrusted `.bin` file is remote code execution. Safetensors was created specifically to fix this — it's a plain tensor container with no code execution path.

## 4. Practical Example

**Precision determines size and what hardware it fits:**

```
7B model:
  FP32   28 GB    training reference precision
  FP16   14 GB    standard serving
  BF16   14 GB    better dynamic range; preferred for training
  INT8    7 GB    small quality cost
  INT4  3.5 GB    fits a consumer GPU; more quality cost

BF16 vs FP16: same size, BF16 has FP32's exponent range with
less mantissa precision. Fewer overflow problems in training,
which is why it's preferred there.
```

**Open weights vs. open source — a distinction worth making precisely:**

```
"Open source" implies the training data and code are available
and the licence permits arbitrary use.

Most "open" models are OPEN WEIGHTS:
  · weights downloadable
  · training data NOT disclosed
  · licence may restrict commercial use, scale, or
    downstream training

Llama's licence, for instance, has usage conditions.
In a bank, licence review is a real gating step — worth
raising as a practical consideration, not a pedantic one.
```

**Why open weights matter in a regulated context:**

```
· Data residency — the model runs in your VPC; no data leaves
· No provider-side model changes without your consent
· Auditability — the artifact is fixed and versionable
· Cost predictability at high volume

Against:
· You operate the serving infrastructure
· You own the GPU capacity planning
· Quality often trails frontier hosted models
```

## 5. Why It Matters

- **The safetensors/pickle security point** is concrete and shows security awareness.
- **Open weights vs. open source** is a precision distinction that matters for licence review in a bank.
- **Precision formats determine deployability** and are a standard sizing conversation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Loading untrusted pickle files** | Arbitrary code execution |
| **Precision mismatch** | Loading FP32 weights when you planned FP16 memory |
| **Licence assumptions** | "Open" often isn't unrestricted commercial use |
| **Weights ≠ a usable system** | You still need serving, batching, and cache management |
| **Version drift** | Community re-uploads and quantizations vary in quality |
| **Storage and transfer** | Tens of GB per model; a real infrastructure concern |

**On serving your own weights:** having the file is the easy part. Production serving needs continuous batching, KV cache management, quantization, and monitoring — which is why vLLM, TGI, and managed endpoints like Vertex AI exist. Underestimating that gap is a common planning error.

**On quantized community uploads:** a GGUF or INT4 version from a third party may differ in quality from the original, and the quantization method matters. I'd evaluate any quantized artifact on my own eval set rather than assuming equivalence.

## 7. Interview Answer

> "Model weights are the concrete numerical values of a trained model — the artifact you download and serve. Parameters are the concept; weights are the file.
>
> A release is typically sharded safetensors files plus a config describing the architecture and a tokenizer. Safetensors is the standard now, and the reason matters: PyTorch's legacy `.bin` format uses Python pickle, which can execute arbitrary code during deserialization. Loading an untrusted `.bin` is remote code execution. Safetensors was created specifically to close that — it's a plain tensor container with no code path. In a bank, that's a real supply-chain consideration for any third-party model artifact.
>
> Precision determines size and deployability. A 7B model is 28 gigabytes at FP32, 14 at FP16 or BF16, 7 at INT8, and about 3.5 at INT4. BF16 is the same size as FP16 but with FP32's exponent range and less mantissa precision, which means fewer overflow problems — that's why it's preferred for training.
>
> The distinction I'd be precise about is open weights versus open source. Most 'open' models are open weights: the file is downloadable, but the training data isn't disclosed and the licence may restrict commercial use or scale. Llama's licence has usage conditions, for instance. In a bank, licence review is an actual gating step, so it's a practical point rather than a pedantic one.
>
> Why open weights matter in a regulated context: the model runs in your VPC so no data leaves, there are no provider-side changes without your consent, the artifact is fixed and auditable, and cost is predictable at volume. Against that, you own the serving infrastructure and GPU capacity planning, and quality typically trails frontier hosted models.
>
> And having the file is the easy part — production serving needs continuous batching, KV cache management, and monitoring, which is why vLLM and managed endpoints exist."

## 8. Likely Follow-ups

**Q: Why safetensors rather than PyTorch `.bin`?**
Because `.bin` uses Python pickle, which can execute arbitrary code during deserialization — loading an untrusted file is remote code execution. Safetensors is a plain tensor container with no code path, plus it's memory-mappable so loading is faster. It was created specifically to solve the pickle security problem.

**Q: What's the difference between open weights and open source?**
Open source implies training data and code are available and the licence permits arbitrary use. Most "open" models are open weights: downloadable file, undisclosed training data, and a licence that may restrict commercial use or scale. In a regulated context that distinction matters because licence review is a real gating step.

**Q: FP16 or BF16?**
Same size — two bytes per parameter. BF16 has FP32's exponent range with fewer mantissa bits, so it has far fewer overflow and underflow problems at the cost of some precision. That makes it preferred for training. For inference either works, and hardware support sometimes decides it.

**Q: Why would a bank self-host rather than use a hosted API?**
Data residency — the model runs in your VPC and no data leaves. No provider-side model changes without consent, which removes a silent-behavior-change risk. A fixed auditable artifact. And predictable cost at high volume. Against that: you own serving infrastructure, GPU capacity planning, and typically trail frontier hosted models on quality.

**Q: Is having the weights enough to serve a model?**
No — that's the easy part. Production serving needs continuous batching, KV cache management with something like PagedAttention, quantization, autoscaling, and monitoring. That gap is why vLLM, TGI, and managed endpoints exist, and underestimating it is a common planning error.

## 9. Common Mistakes

- Loading untrusted pickle-format weights.
- Conflating open weights with open source.
- Assuming "open" means unrestricted commercial use.
- Underestimating the serving infrastructure beyond the weights file.
- Trusting third-party quantized uploads without evaluating them.

## 10. What to Remember

- **Weights are the file; parameters are the concept.**
- **Safetensors over pickle** — `.bin` can execute arbitrary code on load.
- **7B: 28 GB FP32 / 14 GB FP16 or BF16 / 7 GB INT8 / 3.5 GB INT4.**
- **Open weights ≠ open source.** Licence review is a real gate in a bank.
- **The file is the easy part** — serving needs batching, cache management, and monitoring.
