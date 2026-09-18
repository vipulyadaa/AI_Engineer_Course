# Smaller Models (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 11**

## 1. Definition

Using a smaller model to reduce latency. Smaller models prefill faster and decode faster, so the improvement appears in both TTFT and generation time — which makes it one of the few levers affecting both.

> The cost angle is in [25-llm-cost-optimization/10](../25-llm-cost-optimization/10-smaller-models.md). This topic is the latency effect.

## 2. Simple Explanation

A smaller model has fewer weights to read from memory per token, so it generates faster. It also prefills faster, so the first token arrives sooner.

Most latency levers affect one or the other. This one affects both, which is why it's often the largest single improvement available.

## 3. How It Works

```
WHY SMALLER IS FASTER

  decode is memory-bandwidth bound — fewer weights to read
  per token means more tokens per second
  prefill is compute bound — fewer parameters means less
  compute per input token

So a smaller tier improves:
  TTFT              ← faster prefill
  tokens/second     ← faster decode
  → total latency improves on both terms
```

**Both terms improving is what distinguishes this lever.** Reducing context improves TTFT only; shortening output improves generation only.

## 4. Practical Example

**The specialized-model version, which is larger still:**

```
RERANKING
  LLM-based reranking        several hundred ms to seconds
  cross-encoder              tens of ms
  → an order of magnitude, and better ranking

QUERY CLASSIFICATION
  small LLM with enum output  150-300 ms
  trained classifier          5-20 ms
  → sits in front of every request, so it's pure overhead
    on the fast path

GROUNDING CHECK
  LLM judge                   several hundred ms
  NLI entailment model        tens of ms

These aren't "smaller LLMs" — they're different model types
built for one task, and they're faster by an order of
magnitude rather than a factor.
```

**That distinction matters:** tier downgrade gives a factor; specialized models give an order of magnitude, and often better results.

**Measuring the quality trade properly:**

```
Run the golden set at each tier with prompt, temperature,
and retrieved context held constant, measuring quality,
p95 latency, and cost.

And run it in the ISOLATED setting — perfect context
supplied — because retrieval variance otherwise swamps the
model difference you're trying to measure.

If quality is flat between tiers, the faster one is free
latency. If it isn't, you're buying speed with accuracy,
which is a different decision that needs stating as such.
```

**Where not to downgrade:** the final customer answer if quality measurably drops, and anything where the failure is a safety property. Buying two seconds of latency with a correctness regression is the wrong trade at any latency target.

## 5. Why It Matters

- **It improves TTFT and generation time together** — unusual among latency levers.
- **Specialized models are an order of magnitude**, not a factor.
- **The comparison must hold context constant** or retrieval variance dominates.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Downgrading without measuring** | Speed bought with accuracy |
| **Comparing tiers with different prompts** | Measures the prompt |
| **Comparing without isolating retrieval** | Variance swamps the difference |
| **LLM reranking** | An order of magnitude slower than a cross-encoder |
| **Slow classifier on the fast path** | Overhead on the majority of requests |
| **Downgrading safety-critical steps** | The wrong trade at any target |

**On self-hosted smaller models:** a small open model on a dedicated endpoint can be faster than a hosted API call simply by removing network round-trip and queueing variance. For a reranker or classifier called on every request, that consistency matters as much as the mean — a locally-served small model has far tighter p99 than a hosted call subject to provider load.

**On the compounding effect in agents:** a tier change affects every step. In an eight-step agent, saving four hundred milliseconds per step is over three seconds per run — so tier selection matters more in agents than in single-call RAG by roughly the step count, which mirrors the prompt-size argument.

## 7. Interview Answer

> "A smaller model has fewer weights to read from memory per token, so it decodes faster, and fewer parameters to compute over, so it prefills faster. That means it improves TTFT and generation time together — which is unusual, because most latency levers affect only one. Reducing context improves TTFT only; shortening output improves generation only.
>
> But the larger version of this lever is specialized models rather than smaller LLMs. LLM-based reranking is several hundred milliseconds to seconds; a cross-encoder is tens of milliseconds — an order of magnitude, with better ranking. A small LLM classifier is a hundred and fifty to three hundred milliseconds; a trained classifier is five to twenty, and it sits in front of every request so that's pure overhead on the fast path. A grounding check with an LLM judge is several hundred milliseconds; an NLI entailment model is tens.
>
> Those aren't smaller LLMs — they're different model types built for one task, and they're faster by an order of magnitude rather than a factor. That's the distinction worth drawing: a tier downgrade gives you a factor, a specialized model gives you an order of magnitude and often better results.
>
> To measure the quality trade I'd run the golden set at each tier with prompt, temperature, and retrieved context held constant. And critically, in the isolated setting with perfect context supplied — because retrieval variance otherwise swamps the model difference you're trying to measure, and you end up comparing noise.
>
> If quality is flat between tiers, the faster one is free latency. If it isn't, you're buying speed with accuracy, which is a different decision and needs stating as such rather than being folded into a latency improvement.
>
> Where I wouldn't downgrade: the final customer answer if quality measurably drops, and anything where the failure is a safety property. Buying two seconds with a correctness regression is the wrong trade at any latency target.
>
> Two things worth adding. Self-hosting a small model can be faster than a hosted API call simply by removing network round-trip and queueing variance — and for a reranker or classifier called on every request, that consistency matters as much as the mean, because a locally-served model has far tighter p99 than a hosted call subject to provider load.
>
> And the effect compounds in agents. A tier change affects every step, so saving four hundred milliseconds per step across an eight-step run is over three seconds. Tier selection matters more in agents than in single-call RAG by roughly the step count."

## 8. Likely Follow-ups

**Q: Why do smaller models help latency twice?**
They prefill faster because there's less compute per input token, and decode faster because there are fewer weights to read from memory per output token. So both TTFT and generation time improve — unusual, since most levers affect only one.

**Q: What's bigger than a tier downgrade?**
Specialized models. A cross-encoder reranker instead of an LLM, or a trained classifier instead of a small LLM, is an order of magnitude rather than a factor — and often better at the task, since they're built for it rather than being general-purpose.

**Q: How do you measure the quality trade?**
On the golden set with prompt, temperature, and context held constant, and in the isolated setting with perfect context supplied. Otherwise retrieval variance swamps the model difference and you're comparing noise rather than tiers.

**Q: Can self-hosting be faster?**
Yes, by removing network round-trip and provider queueing variance. For a reranker or classifier on every request, the consistency matters as much as the mean — a locally-served small model has a much tighter p99 than a hosted call subject to provider load.

**Q: Does this matter more in agents?**
By roughly the step count. A tier change affects every step, so four hundred milliseconds saved per step across eight steps is over three seconds per run. It mirrors the prompt-size argument — anything per-step compounds in an agent.

## 9. Common Mistakes

- Downgrading a tier without measuring quality.
- Comparing tiers with different prompts or contexts.
- Comparing without isolating retrieval variance.
- Using an LLM where a cross-encoder or classifier fits.
- Trading correctness for latency on safety-critical steps.

## 10. What to Remember

- **Improves TTFT and generation together** — unusual among latency levers.
- **Specialized models are an order of magnitude**, not a factor.
- **Hold prompt and context constant**, and isolate retrieval, when comparing.
- **Self-hosting tightens p99** by removing provider variance.
- **The effect compounds per agent step.**
