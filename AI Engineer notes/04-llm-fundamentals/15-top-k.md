# Top-k Sampling

> **Phase 04 · LLM FUNDAMENTALS · Topic 15**

## 1. Definition

Restricting sampling to the k highest-probability tokens, renormalizing over them, and sampling from that subset. It caps how far down the distribution the model can reach.

## 2. Simple Explanation

The model produces a probability for every token in a 128,000-token vocabulary. Most of those are nonsense in context, but they collectively hold some probability mass — and pure sampling will occasionally pick one.

Top-k cuts the tail: keep the best k candidates, discard the rest, sample from what's left.

## 3. How It Works

```
1. Sort tokens by probability
2. Keep the top k
3. Renormalize so those k sum to 1
4. Sample
```

```
k = 3, from a vocabulary of 128,000:

  "$"       0.41  ✓
  "not"     0.12  ✓
  "waived"  0.08  ✓
  ──────── cut ────────
  "45"      0.06  ✗
  ... 127,995 others  ✗

Renormalized: [0.67, 0.20, 0.13]
```

**The structural weakness — k is fixed while the distribution isn't:**

```
CONFIDENT context: "The capital of France is"
  "Paris" 0.98, everything else negligible
  → k=50 still admits 49 junk tokens into the candidate set

UNCERTAIN context: "My favourite colour is"
  50 plausible colours, each ~0.02
  → k=50 is about right

One fixed k cannot be correct for both.
That's exactly what top-p fixes.
```

## 4. Practical Example

**Top-k vs. top-p, side by side:**

| | Top-k | Top-p (nucleus) |
|---|---|---|
| Criterion | Fixed **count** | Cumulative **probability mass** |
| Adapts to confidence | **No** | **Yes** |
| Confident context | Admits junk | Keeps ~1 token |
| Uncertain context | May cut good options | Keeps many |
| Default in practice | Less common now | **The standard** |

**Why top-p generally wins:**

```
Same two contexts, top-p = 0.9:

"The capital of France is"
  Paris 0.98 → cumulative 0.98 ≥ 0.9 after ONE token
  → candidate set = {Paris}. Correct.

"My favourite colour is"
  needs ~40 colours to reach 0.9 cumulative
  → candidate set = 40 tokens. Also correct.

The threshold adapts. That's the whole argument.
```

**Where top-k is still used:**

```
· As a SAFETY CAP alongside top-p — e.g. top_p=0.9, top_k=50,
  so even a pathologically flat distribution can't admit
  thousands of candidates
· In some provider APIs where it's the exposed parameter
· Vertex AI exposes both; using top_p as primary with top_k
  as a bound is a reasonable configuration
```

**And for RAG: at temperature 0, none of this matters.** Greedy decoding takes the argmax and ignores the distribution shape entirely.

## 5. Why It Matters

- **The top-k vs. top-p comparison is a standard question**, and the adaptivity argument is the substantive answer.
- **Knowing it's irrelevant at temperature 0** shows you understand the sampling pipeline order.
- **Using top-k as a safety cap** is the practical current usage rather than as a primary control.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Fixed k on a confident distribution** | Admits low-quality tokens unnecessarily |
| **Fixed k on a flat distribution** | Cuts genuinely plausible options |
| **Tuning top-k and top-p together** | They interact; change one at a time |
| **Using it at temperature 0** | Has no effect — greedy ignores the distribution |
| **k = 1** | Equivalent to greedy decoding; use temperature 0 instead for clarity |

**Order of operations:** temperature is applied to logits first, then top-k filters by count, then top-p filters by cumulative mass over what remains, then sampling occurs. Applying both means the candidate set is the intersection — which is why top-k works as a bound on top-p rather than as a competing control.

**On defaults:** many APIs ship with a nonzero temperature and a top-p around 0.95. For a factual RAG system that's the wrong default and worth explicitly overriding rather than inheriting.

## 7. Interview Answer

> "Top-k restricts sampling to the k highest-probability tokens, renormalizes over them, and samples from that subset. It cuts the long tail of the distribution, which is where genuinely nonsensical tokens live.
>
> Its structural weakness is that k is fixed while the distribution isn't. After 'the capital of France is,' the model puts nearly all probability on one token — so a k of fifty admits forty-nine junk candidates. After 'my favourite colour is,' there are fifty roughly equally plausible continuations, and fifty is about right. One fixed k can't be correct for both.
>
> That's exactly what top-p fixes. Top-p keeps the smallest set of tokens whose cumulative probability reaches a threshold, so on a confident distribution it keeps one token and on a flat one it keeps forty. The threshold adapts to the model's own confidence, which is why top-p is the standard now and top-k is less common as a primary control.
>
> Where top-k is still used is as a safety cap alongside top-p — say top-p of 0.9 with top-k of 50 — so that even a pathologically flat distribution can't admit thousands of candidates. Vertex AI exposes both, and that combination is a reasonable configuration.
>
> The order matters: temperature is applied to logits first, then top-k filters by count, then top-p filters by cumulative mass over what remains, then sampling. So they compose as an intersection, which is why top-k functions as a bound on top-p rather than as a competing control.
>
> And for a RAG system, at temperature zero none of this matters — greedy decoding takes the argmax and ignores distribution shape entirely. Which means the first thing to get right is temperature, not these."

## 8. Likely Follow-ups

**Q: Top-k or top-p?**
Top-p, generally. Top-k uses a fixed count, which can't adapt to how confident the model is — it admits junk on a peaked distribution and cuts good options on a flat one. Top-p keeps the smallest set reaching a cumulative probability threshold, so the candidate set size adapts. Top-k is useful as a safety bound alongside it.

**Q: What's wrong with a fixed k?**
The distribution's shape varies enormously by context. After "the capital of France is," one token holds nearly all the mass, so k=50 admits 49 unnecessary candidates. After "my favourite colour is," fifty is about right. No single k is correct across contexts, which is the argument for an adaptive criterion.

**Q: Do top-k and top-p interact?**
Yes — applied together, the candidate set is the intersection. Temperature is applied to logits first, then top-k filters by count, then top-p by cumulative mass over what remains. That's why top-k works well as a bound on top-p rather than as a competing setting, and why tuning both at once makes results hard to attribute.

**Q: Does top-k matter at temperature 0?**
No. Greedy decoding takes the argmax and ignores the distribution shape entirely, so any candidate-set filtering is irrelevant. That's worth knowing because it means for a factual RAG system, temperature is the parameter to get right and these are moot.

**Q: What would you set for a banking RAG assistant?**
Temperature 0, which makes the rest irrelevant. If the provider requires nonzero temperature for some reason, I'd use a very low temperature with top-p around 0.9 and top-k around 50 as a bound. But the default of 0.7 temperature with top-p 0.95 that many APIs ship with is wrong for factual work and should be explicitly overridden rather than inherited.

## 9. Common Mistakes

- Using top-k as the primary control when top-p adapts better.
- Tuning top-k and top-p simultaneously.
- Setting top-k at temperature 0, where it has no effect.
- Using k=1 instead of temperature 0 — same result, less clear intent.
- Inheriting API defaults for factual tasks.

## 10. What to Remember

- **Keep the k highest-probability tokens, renormalize, sample.**
- **Fixed k can't adapt** to how confident the model is — that's its structural flaw.
- **Top-p adapts** and is the standard; top-k is best used as a safety bound alongside it.
- **Order: temperature → top-k → top-p → sample.** They compose as an intersection.
- **At temperature 0 it's irrelevant** — fix temperature first.
