# Deterministic Generation

> **Phase 04 · LLM FUNDAMENTALS · Topic 18**

## 1. Definition

Producing the same output for the same input every time. Temperature 0 gives greedy decoding, which removes sampling randomness — but it does **not** guarantee byte-identical output, for reasons outside the sampling layer.

## 2. Simple Explanation

Setting temperature to 0 makes the model always pick the highest-probability token. That eliminates the obvious source of variation.

What it doesn't eliminate is floating-point non-determinism. The same prompt processed in a different batch can produce marginally different logits, and when two tokens are nearly tied, that difference can flip the choice.

## 3. How It Works

**What temperature 0 removes:**

```
Sampling randomness. Greedy decoding = argmax over logits.
No RNG involved.
```

**What it does not remove:**

```
1. FLOATING-POINT NON-ASSOCIATIVITY
   (a + b) + c ≠ a + (b + c) in floating point.
   GPU reductions sum in non-deterministic order depending on
   thread scheduling and batch composition.

2. BATCH COMPOSITION
   Your request batched with different neighbours produces
   marginally different intermediate values.

3. HARDWARE AND KERNEL VERSION
   Different GPUs, CUDA versions, or attention kernels
   (FlashAttention vs. standard) can differ in the last bits.

4. PROVIDER-SIDE MODEL UPDATES
   Same model name, different weights.
```

**When near-ties exist, those tiny differences flip the argmax** — and once one token differs, everything after it diverges.

## 4. Practical Example

**Why this matters for testing:**

```
❌ Exact-match regression test:
   assert response == "The international wire fee is $45."
   → will flake

✅ Semantic or property-based assertions:
   assert "45" in response
   assert extract_currency(response) == ["$45"]
   assert groundedness(response, context) > 0.9
   assert citations_resolve(response)
```

**What you actually get at temperature 0:**

```
Practically stable, not guaranteed identical.

Most requests will produce identical output most of the time.
A small fraction will differ — usually in phrasing rather
than in substance, because substantive near-ties are rarer
than stylistic ones.

That distinction is what makes property-based testing work:
the FACTS are stable even when the wording isn't.
```

**What you can control:**

| Lever | Effect |
|---|---|
| `temperature = 0` | Removes sampling randomness — the big one |
| `seed` parameter | Some providers support it; helps, doesn't fully guarantee |
| Pin the model version | Removes provider-update variation |
| Self-hosted, fixed batch, fixed kernels | Closest to fully deterministic |

## 5. Why It Matters

- **It's the honest answer to "just set temperature to 0"**, which is stated as a complete solution more often than it should be.
- **It determines how you write regression tests** — exact-match assertions will flake.
- **Pinning the model version** is the larger practical reproducibility concern.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Exact-match tests** | Flake on floating-point near-ties |
| **Assuming temperature 0 is sufficient** | Batching and hardware still vary |
| **Not pinning the model version** | A provider update changes everything |
| **Caching without the config in the key** | A stale answer from a different configuration |
| **Determinism as an audit substitute** | Logging what happened matters more than reproducing it |

**On the audit point:** in banking, the question is usually "what did the system do and why," not "can we reproduce it exactly." That's answered by logging the retrieved chunk versions, the prompt version, the model version, and the answer — not by replaying the request. Reproducibility is nice; auditability is the requirement.

**On provider seed parameters:** several providers expose a seed and a system fingerprint. Seeds help meaningfully but providers generally document them as best-effort rather than guaranteed, precisely because of the batching and kernel issues. Treat them as improving stability, not establishing it.

## 7. Interview Answer

> "Temperature zero gives greedy decoding, which removes sampling randomness — the model always takes the argmax, no RNG involved. But it doesn't guarantee byte-identical output, and that's the part people state too confidently.
>
> The reason is floating-point non-associativity. GPU reductions sum values in an order that depends on thread scheduling and batch composition, and floating-point addition isn't associative — so the same prompt batched with different neighbours can produce marginally different logits. When two tokens are nearly tied, that difference flips the argmax, and once one token differs everything after it diverges.
>
> Hardware, CUDA version, and attention kernel choice contribute the same way. And provider-side model updates change everything under the same model name.
>
> The practical consequence is how you write tests. An exact-match assertion on the response string will flake. What works is property-based assertions — check that the correct figure appears, that extracted currency values match, that groundedness exceeds a threshold, that citations resolve. Those are stable, because in practice the facts are stable even when the phrasing isn't. Substantive near-ties are rarer than stylistic ones.
>
> The larger practical reproducibility lever is pinning the model version, not the sampling config. A provider update changes behavior with no code change on my side, and that's a bigger source of variation than floating-point effects.
>
> And I'd distinguish reproducibility from auditability. In banking the question is usually 'what did the system do and why,' not 'can we replay it exactly.' That's answered by logging the retrieved chunk versions, the prompt version, and the model version — auditability is the requirement; reproducibility is a convenience."

## 8. Likely Follow-ups

**Q: Does temperature 0 guarantee identical output?**
No. It removes sampling randomness, which is the dominant source, but floating-point non-associativity in GPU reductions means batch composition and hardware can produce marginally different logits — and near-ties then resolve differently. Practically stable, not guaranteed identical.

**Q: Why does batch composition affect output?**
Because GPU reductions sum values in an order that depends on scheduling and batch shape, and floating-point addition isn't associative. So `(a+b)+c` and `a+(b+c)` can differ in the last bits. Those tiny differences only matter when two tokens are nearly tied — but then they flip the choice.

**Q: How do you write regression tests then?**
Property-based rather than exact-match. Assert that the correct figure appears, that extracted values match expectations, that groundedness exceeds a threshold, that citations resolve. Those hold even when phrasing varies, because substantive near-ties are much rarer than stylistic ones.

**Q: What about provider seed parameters?**
They help meaningfully and providers generally document them as best-effort rather than guaranteed — precisely because of batching and kernel effects. Some also expose a system fingerprint so you can detect when the backend configuration changed. I'd use them, and not rely on them for exact-match assertions.

**Q: Is determinism actually the requirement in banking?**
Usually not — auditability is. The question is "what did the system do and why," which is answered by logging retrieved chunk versions, prompt version, model version, filters applied, and the answer. Being able to explain a past decision is the requirement; being able to replay it byte-for-byte is a convenience.

## 9. Common Mistakes

- Claiming temperature 0 guarantees reproducibility.
- Writing exact-match regression tests against LLM output.
- Not pinning the model version, which is the larger variation source.
- Caching without the sampling and model config in the cache key.
- Conflating reproducibility with auditability.

## 10. What to Remember

- **Temperature 0 removes sampling randomness, not floating-point variation.**
- **Batch composition and GPU reduction order** can flip near-ties, and divergence compounds.
- **Test with property-based assertions**, not exact-match strings.
- **Pinning the model version matters more** than the sampling config.
- **Auditability is the banking requirement**, not byte-level reproducibility.
