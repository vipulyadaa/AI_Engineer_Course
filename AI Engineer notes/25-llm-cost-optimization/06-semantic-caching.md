# Semantic Caching

> **Phase 25 · LLM COST OPTIMIZATION · Topic 06**

## 1. Definition

Serving a cached answer when a new query is *semantically similar* to a previous one, rather than identical — capturing repetition that exact-match caching misses, at the risk of serving a near-miss.

## 2. Simple Explanation

"What's the international transfer fee?" and "How much do you charge for overseas transfers?" are the same question. An exact-match cache treats them as different.

Semantic caching embeds the query and returns a cached answer if a previous query is close enough — which raises the obvious question of how close is close enough.

## 3. How It Works

```
1. embed the incoming query
2. search the cache index for the nearest cached query
3. if similarity ≥ THRESHOLD → return the cached answer
4. otherwise → generate, and store the query + answer

The threshold is the entire design. Too low and you serve
answers to questions nobody asked.
```

**The failure is asymmetric and that shapes the threshold.** A cache miss costs a model call. A false hit gives a customer the wrong answer confidently, with no signal that anything went wrong.

## 4. Practical Example

**Why the threshold must be high:**

```
"What's the fee for international transfers?"
"What's the fee for international transfers over £10,000?"

Cosine similarity: very high. Different answers.

"Can I cancel my transfer?"
"Can I cancel my account?"

High similarity. Completely different answers, and the
second one matters a lot to the customer.

So the threshold has to sit where near-misses like these
fall below it — which means accepting a lower hit rate
than a naive threshold would give.
```

**Calibrating it properly:**

```
· take pairs of production queries
· label whether the same answer serves both
· plot similarity for same-answer and different-answer pairs
· set the threshold where the FALSE HIT rate is acceptable

The false hit rate is what matters, not the hit rate. A
90% hit rate with 3% false hits is worse than a 40% hit
rate with 0.1%, because those 3% are customers receiving
answers to questions they didn't ask.
```

**That asymmetry is the substantive point.**

**Where semantic caching is safe and where it isn't:**

```
SAFE
  general policy and product questions, where the answer
  depends only on the corpus

UNSAFE
  anything account-specific — the answer depends on the
  customer, so two identical queries from different
  customers have different correct answers

So: partition the cache. General questions cache
semantically; account-specific ones don't cache at all.
That's a classification step before the cache lookup, not
a threshold adjustment.
```

**Scale dependency:** at low volume the complexity and false-hit risk outweigh the saving. At high volume with a repetitive FAQ workload the repetition is large enough to justify it. The decision follows from the measured hit rate at a safe threshold, not from the technique being available.

## 5. Why It Matters

- **The failure is asymmetric** — a miss costs a call, a false hit costs correctness.
- **False hit rate is the metric**, not hit rate.
- **Account-specific queries must be partitioned out**, not threshold-managed.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Threshold tuned for hit rate** | False hits serve wrong answers |
| **Account-specific queries cached** | Customer A's answer to customer B |
| **No cache key partitioning** | Personalization ignored |
| **Negations and qualifiers** | "over £10,000" barely moves similarity |
| **Stale entries on corpus change** | Cached answers outlive the policy |
| **Implemented at low volume** | Complexity exceeding the saving |

**On negation and qualifiers:** embeddings represent meaning approximately, and small textual differences that completely change the answer — "over £10,000", "if I'm not a customer", "excluding weekends" — often barely move the similarity score. That's the structural weakness of the technique, and it's why the threshold has to be conservative rather than tuned for coverage.

**On monitoring:** false hits are invisible without sampling. Periodically taking cache hits and generating the answer fresh, then comparing, is the only way to measure the false hit rate in production. Without that check, a threshold set once degrades silently as the query distribution shifts.

## 7. Interview Answer

> "Semantic caching serves a cached answer when a new query is similar enough to a previous one, rather than identical — which captures the repetition an exact-match cache misses, since 'what's the international transfer fee' and 'how much do you charge for overseas transfers' are the same question.
>
> The threshold is the entire design, and the reason it has to be high is that the failure is asymmetric. A cache miss costs a model call. A false hit gives a customer a confident answer to a question they didn't ask, with no signal that anything went wrong.
>
> Concretely: 'what's the fee for international transfers' and 'what's the fee for international transfers over ten thousand pounds' have very high cosine similarity and different answers. 'Can I cancel my transfer' and 'can I cancel my account' likewise — and the second one matters a great deal to the customer. So the threshold has to sit where near-misses like those fall below it, which means accepting a lower hit rate than a naive threshold would give.
>
> That's the structural weakness of the technique: embeddings represent meaning approximately, and small textual differences that completely change the answer — 'over ten thousand', 'if I'm not a customer', 'excluding weekends' — often barely move the similarity score.
>
> To calibrate, I'd take pairs of production queries, label whether the same answer serves both, plot similarity for same-answer and different-answer pairs, and set the threshold where the false hit rate is acceptable. And the false hit rate is the metric, not the hit rate — a ninety percent hit rate with three percent false hits is worse than a forty percent hit rate with a tenth of a percent, because those three percent are customers receiving answers to questions they didn't ask.
>
> The other thing is partitioning. General policy questions cache safely because the answer depends only on the corpus. Anything account-specific doesn't cache at all, because the answer depends on the customer — two identical queries from different customers have different correct answers. That's a classification step before the cache lookup, not something you manage with a threshold.
>
> On monitoring: false hits are invisible without sampling. I'd periodically take cache hits, generate the answer fresh, and compare — that's the only way to measure the false hit rate in production, and without it a threshold set once degrades silently as the query distribution shifts.
>
> And the decision to use it at all follows from the measured hit rate at a safe threshold. At low volume the complexity and risk outweigh the saving; at high volume with a repetitive FAQ workload the repetition justifies it."

## 8. Likely Follow-ups

**Q: Why must the threshold be high?**
Because the failure is asymmetric. A miss costs a model call; a false hit gives a customer a confident answer to a different question with no signal. And near-misses like "transfers" versus "transfers over ten thousand pounds" have very high similarity and different answers.

**Q: What metric do you tune on?**
False hit rate, not hit rate. Ninety percent hits with three percent false hits is worse than forty percent hits with a tenth of a percent, because those false hits are customers receiving answers to questions they didn't ask.

**Q: What's the structural weakness?**
Embeddings represent meaning approximately, so qualifiers and negations that completely change the answer — "over ten thousand", "excluding weekends", "if I'm not a customer" — barely move the similarity score. That's why the threshold must be conservative rather than tuned for coverage.

**Q: How do you handle account-specific queries?**
Partition them out entirely rather than managing them with a threshold. The answer depends on the customer, so two identical queries from different customers have different correct answers. It's a classification step before the cache lookup.

**Q: How do you monitor it?**
By sampling cache hits, generating the answer fresh, and comparing. False hits are otherwise invisible, and without that check a threshold set once degrades silently as the query distribution shifts over time.

## 9. Common Mistakes

- Tuning the threshold for hit rate rather than false hit rate.
- Caching account-specific answers semantically.
- Ignoring that qualifiers barely move similarity scores.
- No sampling to measure false hits in production.
- Implementing it at volumes where the saving doesn't justify the risk.

## 10. What to Remember

- **The failure is asymmetric** — a miss costs money, a false hit costs correctness.
- **Tune on false hit rate**, not hit rate.
- **Qualifiers barely move similarity** — the structural weakness.
- **Partition account-specific queries out**; don't threshold them.
- **Sample hits against fresh generation** or false hits stay invisible.
