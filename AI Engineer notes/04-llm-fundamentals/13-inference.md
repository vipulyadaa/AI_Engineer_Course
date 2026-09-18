# Inference (LLM View)

> **Phase 04 · LLM FUNDAMENTALS · Topic 13**

## 1. Definition

Running a trained LLM to generate text. It splits into two phases with different bottlenecks: **prefill**, which processes the prompt in parallel and is compute-bound, and **decode**, which generates one token at a time and is memory-bandwidth-bound.

## 2. Simple Explanation

Two phases, two different problems.

Prefill reads your whole prompt at once — that's your time to first token, and it scales with prompt length. Decode produces tokens one at a time — that's your inter-token latency, and it scales with output length.

Almost all LLM latency and cost behavior follows from that split.

## 3. How It Works

```
PREFILL
  process all n prompt tokens in ONE parallel forward pass
  populate the KV cache
  → compute-bound (good arithmetic intensity)
  → cost scales with PROMPT length
  → determines TIME TO FIRST TOKEN

DECODE
  for each output token:
    forward pass for ONE token, attending to the cached KV
    append its K,V to the cache
  → memory-bandwidth-bound (read all weights, do little math)
  → cost scales with OUTPUT length
  → determines INTER-TOKEN LATENCY
```

**Why decode is bandwidth-bound:**

```
Generating one token requires reading every model weight
from memory — 14 GB for a 7B model at FP16 — to perform
one token's worth of arithmetic.

Terrible arithmetic intensity. GPU utilization during
unbatched decode is often very low.

The fix is BATCHING: read the weights once, serve many
sequences with them. That's why throughput scales with
batch size far more than it scales with FLOPs.
```

## 4. Practical Example

**Latency decomposition for a RAG request:**

```
prompt 6,000 tokens, output 300 tokens

prefill      ~400 ms      ← TTFT; scales with prompt length
decode       300 × ~15ms = 4,500 ms   ← scales with output length
total        ~4.9 s

Where the levers are:
  · trim retrieved context 6,000 → 3,000  → TTFT roughly halves
  · cap max_output_tokens 300 → 150       → total roughly halves
  · stream                                 → perceived latency = TTFT
  · prefix-cache the system prompt         → TTFT drops further
```

**Output length is the bigger lever**, which is counterintuitive — people instinctively trim the prompt.

**The serving optimizations and what each targets:**

| Technique | Targets |
|---|---|
| **Continuous batching** | Decode utilization — new requests join mid-flight |
| **PagedAttention (vLLM)** | KV cache fragmentation → larger batch |
| **Prefix caching** | Repeated system prompt → skips its prefill |
| **Quantization** | Weight memory → less bandwidth per token |
| **GQA / MQA** | KV cache size → larger batch |
| **Speculative decoding** | Decode latency — a small model drafts, the large one verifies |

**Speculative decoding is worth knowing:** a small draft model proposes several tokens, and the large model verifies them in one parallel forward pass. Accepted drafts are free. It exploits the fact that decode is bandwidth-bound — verifying k tokens costs roughly the same as generating one.

## 5. Why It Matters

- **The prefill/decode split explains all LLM latency behavior**, which is a frequent interview question.
- **Decode being bandwidth-bound rather than compute-bound** is the non-obvious fact that explains batching.
- **Output length being the bigger latency lever** is actionable and counterintuitive.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unbatched decode** | Very low GPU utilization |
| **Uncapped output** | Unbounded latency and cost |
| **KV cache memory** | Usually the throughput limit, not compute |
| **Long prompts** | Prefill cost scales with them; hurts TTFT |
| **Treating latency as one number** | TTFT and total are different and optimized differently |
| **Cold start** | Loading tens of GB of weights takes time on scale-up |

**On streaming:** it doesn't reduce total generation time, but it makes TTFT the perceived latency — and TTFT is what users judge. It's close to free and one of the highest-value UX changes in an LLM product.

**On cold start:** self-hosted serving has to load tens of gigabytes of weights before serving a request, which makes aggressive autoscaling impractical. Keeping warm capacity is usually necessary, and it's a real cost consideration people miss when comparing self-hosted to serverless.

## 7. Interview Answer

> "LLM inference splits into two phases with different bottlenecks, and almost all latency and cost behavior follows from that.
>
> Prefill processes the entire prompt in one parallel forward pass and populates the KV cache. It's compute-bound with good arithmetic intensity, and its cost scales with prompt length — that's your time to first token.
>
> Decode generates one token at a time, each attending to the cached keys and values. It's memory-bandwidth-bound, not compute-bound: generating one token requires reading every model weight from memory — fourteen gigabytes for a 7B at FP16 — to do one token's worth of arithmetic. That's terrible arithmetic intensity, so unbatched decode has very low GPU utilization. The fix is batching: read the weights once and serve many sequences with them, which is why throughput scales with batch size far more than with FLOPs.
>
> For a typical RAG request — six thousand prompt tokens, three hundred output tokens — prefill might be four hundred milliseconds and decode four and a half seconds. So output length is the bigger lever, which is counterintuitive since people instinctively trim the prompt. Capping max output tokens often halves total latency; trimming retrieved context mainly improves TTFT.
>
> Streaming is the highest-value near-free change: it doesn't reduce total time but it makes TTFT the perceived latency, and that's what users judge.
>
> On the serving side, continuous batching keeps decode utilization up by letting new requests join mid-flight, PagedAttention eliminates KV cache fragmentation so batches can be larger, and prefix caching skips prefill on a repeated system prompt. Speculative decoding is the clever one — a small model drafts several tokens and the large model verifies them in one parallel pass, which works precisely because decode is bandwidth-bound and verifying k tokens costs about the same as generating one."

## 8. Likely Follow-ups

**Q: What are prefill and decode?**
Prefill processes the whole prompt in one parallel forward pass, populating the KV cache — compute-bound, scaling with prompt length, determining TTFT. Decode generates one token at a time attending to the cache — memory-bandwidth-bound, scaling with output length, determining inter-token latency. Different bottlenecks, different optimizations.

**Q: Why is decode memory-bandwidth-bound?**
Because generating one token requires reading all model weights from memory to do one token's worth of arithmetic. The arithmetic intensity is terrible, so the GPU sits idle waiting on memory. Batching fixes it by amortizing that weight read across many sequences, which is why throughput scales with batch size rather than with compute.

**Q: What's the biggest latency lever?**
Output length, usually — decode dominates total time for any non-trivial answer, so capping max output tokens often halves it. Trimming the prompt mainly improves TTFT rather than total time. And streaming, which doesn't change total time but makes TTFT the perceived latency, is close to free.

**Q: What is speculative decoding?**
A small draft model proposes several tokens, and the large model verifies them in one parallel forward pass. Accepted tokens are effectively free. It works because decode is bandwidth-bound — verifying k tokens costs about the same as generating one, since the weight read dominates either way.

**Q: What limits serving throughput?**
The KV cache, usually, not compute. At moderate batch and sequence length the cache exceeds the model weights, so how many sequences fit in memory determines throughput. That's why GQA, PagedAttention, and quantized caches matter — they all increase achievable batch size, which is what actually raises throughput.

## 9. Common Mistakes

- Treating LLM latency as one number rather than TTFT plus decode.
- Trimming the prompt when output length is the bigger lever.
- Assuming decode is compute-bound.
- Not capping max output tokens.
- Forgetting cold-start weight loading when planning self-hosted autoscaling.

## 10. What to Remember

- **Prefill (prompt, compute-bound, TTFT) + decode (output, bandwidth-bound, total time).**
- **Decode reads all weights per token** — terrible arithmetic intensity, fixed by batching.
- **Output length is the bigger latency lever.** Cap `max_output_tokens`.
- **Stream** — same total time, TTFT becomes the perceived latency.
- **KV cache, not compute, limits throughput.** Hence GQA, PagedAttention, quantization.
