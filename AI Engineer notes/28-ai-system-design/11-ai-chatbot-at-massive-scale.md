# Design: AI Chatbot at Massive Scale

> **Phase 28 · AI SYSTEM DESIGN · Topic 11**

## 1. Definition

A conversational assistant serving millions of requests per day, where cost per request and tail latency become the dominant design constraints rather than answer quality.

## 2. Simple Explanation

At ten thousand requests a day, almost any design works. At ten million, a tenth of a cent per request is ten thousand dollars a day.

So the design shifts: architectural decisions about which requests reach a model at all matter more than anything about the model.

## 3. How It Works

```
request
  ▼
CACHE CHECK ──── exact, then semantic
  │ hit (~30-40%) ──▶ return
  ▼
CLASSIFY ──────── smallest model tier
  ├── out of scope ──▶ decline (no model call)
  ├── simple ────────▶ RAG pipeline, Flash-class
  └── complex ───────▶ agent (small % of traffic)
  ▼
generate → verify → respond
```

**The cache and the classifier together remove most of the model cost.** Everything downstream operates on the fraction that survives them.

## 4. Practical Example

**The cost arithmetic that drives the design:**

```
10M requests/day, naive: one Flash-class RAG call each
  ~$0.007 × 10M = $70,000/day

With the layers:
  35% cache hit           → 6.5M remaining
  5% out of scope, no call → 6.2M
  90% simple @ $0.007     → 5.6M × 0.007 = $39,000
  10% complex @ $0.045    → 620k × 0.045 = $28,000
                                            ────────
                                            $67,000/day

Still large. Add:
  context caching on the fixed prefix
  tighter top-k (8 chunks not 20)
  shorter output instruction
  smallest tier for classification and rewriting

→ realistically 40-60% off, and every one of those is an
  architectural decision rather than a model choice.
```

**Semantic caching, which is where scale changes the answer:**

```
At small scale, semantic caching isn't worth the complexity
and the risk of serving a near-miss answer.

At 10M requests/day, an FAQ workload has enormous
repetition — the same questions phrased differently. A
semantic cache with a HIGH similarity threshold captures
that.

The critical detail: the cache key must include the
authenticated user and permission set for anything
account-specific. A cache keyed on the normalized query
alone serves one customer's answer to another — a
performance optimization becoming a disclosure.

So: cache aggressively for general policy questions, never
for account-specific ones.
```

**Tail latency at scale:**

```
p50 is easy. p99 at 10M/day is 100,000 requests a day
having a bad experience.

Sources: cold index pages after deploy, a slow shard in
scatter-gather, unusually large contexts, provider latency
variance.

Mitigations: warm indexes before routing traffic, cap
context and output size to bound the tail, and hedge
requests on the slowest path where the cost is acceptable.
```

## 5. Why It Matters

- **Cost per request dominates** — architectural decisions beat model tuning.
- **Cache and classifier remove most model calls** before anything else runs.
- **Cache keys must include identity** for anything account-specific.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No caching layer** | Paying for identical repeated questions |
| **Cache key without identity** | Cross-customer disclosure |
| **Semantic cache threshold too low** | Near-miss answers served |
| **No scope classifier** | Paying for out-of-scope requests |
| **One model tier throughout** | Overpaying on classification |
| **p99 unmonitored** | 100k bad experiences a day, invisible in p50 |

**On cache invalidation:** a cached answer about a fee remains cached after the fee changes. So the cache needs invalidation tied to corpus updates — either a TTL short enough to bound staleness, or explicit invalidation keyed on the documents that produced the answer. The second is better and requires recording which chunks contributed, which is worth doing anyway for audit.

**On what doesn't change at scale:** grounding, abstention, citation, and permission filtering are the same at ten million requests as at ten thousand. The temptation is to relax them for throughput — skipping verification on the fast path, for instance — and that trades a correctness property for latency, which is the wrong trade at any volume.

## 7. Interview Answer

> "At ten thousand requests a day almost any design works. At ten million, a tenth of a cent per request is ten thousand dollars a day — so the design shifts toward architectural decisions about which requests reach a model at all.
>
> The shape is: cache check first, exact then semantic; then a classifier on the smallest model tier routing out-of-scope requests to a decline with no further model call, simple questions to a Flash-class RAG pipeline, and the complex minority to an agent.
>
> The cache and classifier together remove most of the model cost, and everything downstream operates on what survives them.
>
> Concretely, ten million requests at seven tenths of a cent each is seventy thousand dollars a day naive. With a thirty-five percent cache hit rate, five percent declined as out of scope, and a ninety-ten split between simple and complex, that's around sixty-seven thousand — still large. Then context caching on the fixed prefix, tighter top-k at eight chunks rather than twenty, a shorter output instruction, and the smallest tier for classification and query rewriting gets you realistically forty to sixty percent off. Every one of those is an architectural decision, not a model choice.
>
> Semantic caching is where scale changes the answer. At small scale it isn't worth the complexity or the risk of serving a near-miss. At ten million requests an FAQ workload has enormous repetition — the same questions phrased differently — so a semantic cache with a high similarity threshold captures a lot.
>
> But the critical detail is the cache key. It must include the authenticated user and permission set for anything account-specific. A cache keyed on the normalized query alone serves one customer's answer to another, which turns a performance optimization into a disclosure. So I'd cache aggressively for general policy questions and never for account-specific ones.
>
> Cache invalidation matters too — a cached fee answer stays cached after the fee changes. So either a TTL short enough to bound staleness, or explicit invalidation keyed on the documents that produced the answer. The second is better, and it requires recording which chunks contributed, which is worth doing anyway for audit.
>
> On tail latency: p50 is easy, but p99 at ten million a day is a hundred thousand bad experiences daily. Sources are cold index pages after deploy, a slow shard in scatter-gather, oversized contexts, and provider variance. I'd warm indexes before routing traffic, cap context and output size to bound the tail, and consider hedged requests where the cost is acceptable.
>
> And the thing that doesn't change: grounding, abstention, citation, and permission filtering are identical at ten million as at ten thousand. The temptation is to relax them for throughput — skipping verification on the fast path — and that trades a correctness property for latency, which is the wrong trade at any volume."

## 8. Likely Follow-ups

**Q: What dominates the design at scale?**
Cost per request and tail latency rather than answer quality. Architectural decisions about which requests reach a model — caching and classification — matter more than anything about the model itself, because they remove calls entirely rather than making them cheaper.

**Q: When does semantic caching become worthwhile?**
At high volume with a repetitive workload. At small scale the complexity and near-miss risk outweigh the saving; at ten million requests an FAQ workload has enough repetition that a high-threshold semantic cache captures a substantial share.

**Q: What's the risk with caching?**
Cross-customer disclosure if the key omits identity and permissions. A cache keyed on the normalized query serves one customer's answer to another — a performance optimization becoming a breach. Cache general policy answers aggressively; never cache account-specific ones.

**Q: How do you handle cache invalidation?**
Either a TTL short enough to bound staleness, or explicit invalidation keyed on the documents that produced the answer. The second is better and requires recording which chunks contributed — which is worth capturing anyway for audit, so it's not extra work.

**Q: What shouldn't change at scale?**
Grounding, abstention, citation, and permission filtering. The temptation is relaxing them for throughput — skipping verification on the fast path — which trades a correctness property for latency. That's the wrong trade at any volume, and worse at high volume because more customers are affected.

## 9. Common Mistakes

- No caching layer on a repetitive workload.
- Cache keys without identity and permissions.
- No scope classifier, so out-of-scope requests cost a model call.
- One model tier across classification, rewriting, and generation.
- Relaxing verification on the fast path for throughput.

## 10. What to Remember

- **Cache and classifier remove most model calls** before anything else runs.
- **Semantic caching becomes worthwhile at scale** — with a high threshold.
- **Cache keys need identity** — never cache account-specific answers by query alone.
- **p99 at 10M/day is 100k bad experiences** — cap context and output to bound it.
- **Correctness controls don't relax** for throughput.
