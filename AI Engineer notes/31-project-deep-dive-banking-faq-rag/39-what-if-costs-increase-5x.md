# "What If Costs Increase 5x?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 39**

## 1. Definition

An incident scenario. A 5× jump with no corresponding traffic growth means tokens per request changed, not usage — and that distinction determines the entire investigation.

*[23](23-how-would-you-reduce-cost.md) covers cost optimization. This is the anomaly.*

## 2. Simple Explanation

Cost is requests times tokens per request times price per token. A 5× increase is one of those three, and dividing cost by request count tells you which within a minute.

Most cost incidents are a quiet change in tokens per request, not more users.

## 3. How It Works

```
THE FIRST CALCULATION

  cost ÷ requests = cost per request

CONSTANT     → it's traffic growth. Capacity question,
               not a bug.
5× HIGHER    → tokens per request changed. Now find
               which direction.

  then: input tokens per request?
        output tokens per request?

That two-step split takes a minute and eliminates most
hypotheses.
```

## 4. Practical Example

**The ranked causes, by how often they're the answer:**

```
CACHE STOPPED WORKING          ← check first
  A deploy changed the cache key, an embedding model
  change invalidated cached query vectors, or the cache
  was accidentally disabled.
  A 40% hit rate going to 0% is a 1.7× increase on its
  own, and nothing errors.

k WAS RAISED
  A change from 5 to 20 chunks quadruples retrieved
  context, which is most of the input tokens. Often
  shipped as a quality improvement without a cost
  review.

CHUNK SIZE GREW
  A re-index with a larger chunk size multiplies tokens
  per retrieved chunk. Same k, far more context.

ROUTING BROKE
  A classifier change or a fallback sending everything
  to the expensive model. The 60-70% saving disappears
  in one config change.

OUTPUTS GOT LONGER
  A prompt change removing a brevity instruction.
  Output tokens cost several times input per token, so
  this hits harder than it looks.

RETRIES
  Failed requests still bill for the tokens they
  consumed. Pairs with the latency incident — the same
  root cause produces both.

A LOOP
  If any agentic path exists, one that runs more
  iterations than intended multiplies everything.
```

**The one nobody checks:**

```
NON-PRODUCTION TRAFFIC

An evaluation suite moved to run on every commit. A load
test left running. A developer's script in a loop.

These don't show up in product metrics at all — request
counts on the user-facing API look normal — and they can
dominate the bill.

Splitting cost attribution by service account or API key
is what makes this visible, and it's worth having before
you need it.
```

**Immediate containment:**

```
· quota caps and budget alerts, so the bleeding stops
  even before the cause is known
· revert recent config changes if the timing correlates
· re-enable or fix the cache
· cap output length

Then diagnose properly. A cost incident isn't an outage,
so there's time — but a 5× burn rate compounds daily and
"we'll look at it next week" is expensive.
```

## 5. Why It Matters

- **Cost per request** distinguishes traffic growth from a token change in one calculation.
- **A broken cache is the most common cause** and it's silent.
- **Non-production traffic** doesn't appear in product metrics at all.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Assuming it's traffic growth | Scaling a problem that's a config bug |
| Not checking cache hit rate first | Missing the most common cause |
| No per-service-account attribution | Non-production spend is invisible |
| Only tracking total cost | No way to see which component moved |
| No budget alerts | A 5× burn discovered at month end |
| Treating retries as free | Failed requests still bill |

**On when it's legitimate:** sometimes a 5× increase is a correctly-shipped quality improvement — a reranker added, k tuned up, a more capable model for hard queries. The question then isn't how to reverse it but whether the quality gain justifies the spend, and whether cheaper equivalents exist. Routing and caching usually recover most of it without giving back the quality.

**On the monitoring gap this reveals:** cost per request, per component, with a daily alert on a percentage change, would have caught this on day one instead of at the invoice. Cost is a quality-adjacent metric — a sudden change in tokens per request usually means the pipeline changed shape, which is worth knowing regardless of the money.

## 7. Interview Answer

> "The first thing is one calculation: cost divided by request count. If cost per request is constant, this is traffic growth and it's a capacity question rather than a bug. If cost per request went up five times, tokens per request changed — and then I'd split input versus output tokens per request to see which direction.
>
> That takes a minute and eliminates most hypotheses.
>
> Assuming it's tokens per request, the causes ranked by how often they're the answer. First, the cache stopped working — a deploy changed the cache key, an embedding model change invalidated cached query vectors, or it got disabled. A forty percent hit rate going to zero is a 1.7× increase on its own, and nothing errors, so it's silent. That's the first thing I'd check.
>
> Second, k was raised. Going from five chunks to twenty quadruples retrieved context, which is most of the input tokens, and it's often shipped as a quality improvement without a cost review.
>
> Third, chunk size grew in a re-index — same k, far more tokens per chunk.
>
> Fourth, routing broke. A classifier change or a fallback sending everything to the expensive model wipes out the sixty to seventy percent saving in one config change.
>
> Fifth, outputs got longer, from a prompt change that removed a brevity instruction. Output tokens cost several times input per token, so that hits harder than it looks.
>
> And retries — failed requests still bill for the tokens they consumed. That one pairs with the latency incident, because the same rate-limiting root cause produces both a latency spike and a cost spike.
>
> The one nobody checks is non-production traffic. An evaluation suite moved to run on every commit, a load test left running, a developer's script in a loop. Those don't appear in product metrics at all — the user-facing request count looks completely normal — and they can dominate the bill. Cost attribution split by service account or API key is what makes it visible, and it's worth having before you need it.
>
> For containment while diagnosing: quota caps and budget alerts so the bleeding stops even before I know the cause, revert recent config changes if the timing correlates, fix the cache, and cap output length.
>
> One thing I'd check before assuming it's a bug — it might be legitimate. A reranker added, k tuned up, a more capable model for hard queries. Then the question isn't how to reverse it but whether the quality gain justifies the spend, and routing plus caching usually recovers most of the cost without giving back the quality.
>
> And the real outcome of an incident like this is the monitoring gap it reveals. Cost per request, broken down per component, with a daily alert on percentage change, would have caught this on day one instead of at the invoice. Cost is a quality-adjacent metric — a sudden change in tokens per request means the pipeline changed shape, which is worth knowing regardless of the money."

## 8. Likely Follow-ups

**Q: What's the first thing you'd check?**
Cost per request. Constant means traffic growth; 5× higher means tokens per request changed. That single division separates a capacity question from a configuration bug.

**Q: What's the most common cause?**
A broken cache. A deploy changing the key, or an embedding model change invalidating cached query vectors — hit rate drops to zero, nothing errors, and the cost rises immediately.

**Q: What's invisible in product metrics?**
Non-production traffic. An eval suite on every commit, a load test left running, a script in a loop. User-facing request counts look normal, so attribution by service account is the only way to see it.

**Q: Do failed requests cost money?**
Yes — tokens consumed are billed regardless of outcome. Which is why a rate-limiting incident shows up as both a latency spike and a cost spike from the same root cause.

**Q: What if the increase is legitimate?**
Then the question is whether the quality gain justifies it, not how to reverse it. Routing and caching typically recover most of the cost while keeping the quality improvement.

## 9. Common Mistakes

- Assuming traffic growth without checking cost per request.
- Not checking the cache hit rate first.
- No cost attribution by service account.
- Treating retried and failed requests as free.
- No budget alerts, so it's found at month end.

## 10. What to Remember

- **Cost ÷ requests first** — it splits the problem in one step.
- **A broken cache is the usual cause**, and it's silent.
- **Non-production traffic hides** from every product metric.
- **Failed requests still bill.**
- **Cost per request is a quality signal** — the pipeline changed shape.
