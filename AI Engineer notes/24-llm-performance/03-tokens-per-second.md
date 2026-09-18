# Tokens Per Second

> **Phase 24 · LLM PERFORMANCE · Topic 03**

## 1. Definition

The rate at which the model generates output after the first token. Together with output length it determines total generation time, and it's largely a property of the model tier and the serving infrastructure rather than something you tune.

## 2. Simple Explanation

Once generation starts, tokens arrive at some rate. That rate is mostly fixed by which model you chose and how it's served.

So the lever isn't making generation faster — it's generating less, or choosing a faster model.

## 3. How It Works

```
generation_time ≈ output_tokens / tokens_per_second

TYPICAL RATES (illustrative, vary by provider and load)
  smaller tier       fast
  Flash-class        fast
  Pro-class          slower

WHAT AFFECTS IT
  model tier         the dominant factor
  provider load      varies through the day
  output length      slightly — longer sequences decode
                     marginally slower as the cache grows
  your code          nothing
```

**You don't tune tokens per second on a hosted API.** You choose a tier and you control output length — which is why this metric is mainly useful for capacity planning rather than optimization.

## 4. Practical Example

**Using it to set an output budget:**

```
Target: generation under 2 seconds.

If the tier produces roughly 50 tokens/second:
  2 s × 50 = ~100 tokens of output

That's a short answer. If answers need to be 300 tokens,
generation will take ~6 seconds and no prompt tuning
changes that.

So the calculation tells you whether the latency target is
achievable at all with the chosen tier and answer length —
before you spend a week optimizing.
```

**That feasibility check is the practical use of the metric.**

**Reading provider variance:**

```
Tokens per second varies with provider load. A p99
generation time far above p50, with the same output length,
usually means provider variance rather than anything in
your system.

Distinguishing that matters: if it's provider variance,
optimizing your code achieves nothing. Logging output
tokens alongside generation time is what lets you separate
"the answer was longer" from "the provider was slower".
```

**Self-hosted is a different conversation:**

```
If you serve your own model, tokens per second IS tunable:
  · batch size and continuous batching
  · quantization — smaller weights, faster decode
  · speculative decoding
  · hardware

On a hosted API none of those are available, so the topic
is much narrower than it appears. Being clear about which
situation you're in avoids a discussion about levers you
don't have.
```

## 5. Why It Matters

- **It's a capacity-planning number**, not an optimization target on hosted APIs.
- **The feasibility calculation** tells you whether a latency target is achievable at all.
- **Separating provider variance from output length** requires logging both.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Trying to tune it on a hosted API** | Not a lever you have |
| **Latency target set without the calculation** | Unachievable at the chosen tier |
| **Generation time logged without output tokens** | Can't separate cause |
| **Assuming a constant rate** | Varies with provider load |
| **Confusing hosted and self-hosted levers** | A discussion about unavailable options |

**On what to do instead:** since the rate is fixed, total generation time is controlled by output length. An explicit conciseness instruction is the lever — and in a grounded banking system a shorter answer is usually better anyway, so it isn't a compromise.

**On measuring it yourself:** logging output tokens and generation time per request gives you the observed rate for your tier and traffic pattern. That's more useful than a published figure, because it reflects your actual provider load and it lets you detect degradation — a falling rate with unchanged output length is a provider-side signal worth knowing about.

## 7. Interview Answer

> "Tokens per second is the generation rate after the first token, and on a hosted API it's largely fixed — a property of the model tier and the serving infrastructure rather than something I tune. So the lever isn't making generation faster, it's generating less or choosing a faster tier.
>
> Its practical use is a feasibility calculation. If the target is generation under two seconds and the tier produces roughly fifty tokens a second, that's about a hundred tokens of output — a short answer. If answers need to be three hundred tokens, generation takes six seconds and no prompt tuning changes that. Doing that calculation first tells you whether the latency target is achievable at all before spending a week optimizing toward something that isn't.
>
> The other use is diagnostic. A p99 generation time far above p50 with the same output length usually means provider variance rather than anything in my system — and distinguishing that matters, because if it's provider variance then optimizing my code achieves nothing. Logging output tokens alongside generation time is what lets me separate 'the answer was longer' from 'the provider was slower', and without both numbers those look identical.
>
> I'd also measure the observed rate for my own tier and traffic rather than using a published figure, because it reflects actual provider load. And it gives a degradation signal — a falling rate with unchanged output length is provider-side and worth knowing about even though I can't fix it.
>
> Since the rate is fixed, total generation time is controlled by output length. An explicit conciseness instruction is the actual lever — and in a grounded banking system a shorter answer is usually better anyway, so that isn't a compromise.
>
> One thing I'd clarify: if you serve your own model, tokens per second genuinely is tunable — batch size and continuous batching, quantization, speculative decoding, hardware. On a hosted API none of those are available. Being clear about which situation you're in avoids a discussion about levers you don't have, and the same terminology covering both cases is why this topic gets confused."

## 8. Likely Follow-ups

**Q: Can you improve tokens per second?**
Not on a hosted API — it's a property of the tier and the serving infrastructure. You control output length and tier choice. If you serve your own model it's genuinely tunable through batching, quantization, speculative decoding, and hardware.

**Q: What's the metric actually useful for?**
A feasibility calculation. Target generation time divided by the observed rate gives your output token budget. If answers need to be three hundred tokens and the rate implies six seconds, the latency target isn't achievable at that tier — which is worth knowing before optimizing.

**Q: How do you diagnose slow generation?**
By logging output tokens alongside generation time. A p99 far above p50 with the same output length is provider variance; with longer output it's your answers getting longer. Without both numbers those two causes look identical and only one is actionable.

**Q: Should you use published rates?**
Measure your own. The observed rate reflects your actual provider load and traffic pattern, and tracking it gives a degradation signal — a falling rate with unchanged output length is provider-side, which is useful to know even though you can't fix it.

**Q: What's the real lever on generation time?**
Output length, via an explicit conciseness instruction. Since the rate is fixed, that's the only thing you control — and in a grounded banking system a shorter answer stating the figure and the condition is usually better anyway.

## 9. Common Mistakes

- Trying to tune generation rate on a hosted API.
- Setting a latency target without the feasibility calculation.
- Logging generation time without output token count.
- Using published rates rather than measuring your own.
- Confusing hosted and self-hosted levers in the same discussion.

## 10. What to Remember

- **Fixed on hosted APIs** — you choose the tier and control output length.
- **Use it for the feasibility calculation** before optimizing toward a target.
- **Log output tokens with generation time** to separate cause from variance.
- **Measure your own observed rate** — it reflects real provider load.
- **Self-hosted is genuinely tunable** — a different conversation entirely.
