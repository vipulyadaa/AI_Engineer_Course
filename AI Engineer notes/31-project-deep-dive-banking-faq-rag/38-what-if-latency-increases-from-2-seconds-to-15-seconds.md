# "What If Latency Increases from 2 Seconds to 15 Seconds?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 38**

## 1. Definition

An incident scenario. A 7× jump is not gradual degradation — it's a discrete cause, and the size of the jump rules out most explanations immediately.

*[22](22-how-would-you-reduce-latency.md) covers optimization. This is the incident.*

## 2. Simple Explanation

Nothing in a healthy RAG pipeline takes thirteen extra seconds. So the cause isn't "things got slower" — something is retrying, queuing, or running when it shouldn't be.

That reframe narrows the search dramatically.

## 3. How It Works

```
WHAT A 13-SECOND ADDITION CAN ACTUALLY BE

RETRIES WITH BACKOFF        the most likely single cause.
                            Three retries with exponential
                            backoff against a rate-limited
                            API is ~10-14 seconds, and it
                            SUCCEEDS — so the error rate
                            stays at zero.

QUEUING                     traffic exceeded capacity;
                            requests wait for a worker

COLD STARTS                 a scaled-to-zero service;
                            affects a subset, moves p99
                            hard

A LOOP OR FAN-OUT           an agentic path taking more
                            steps than intended

MUCH LONGER OUTPUTS         a prompt change producing
                            500-token answers instead of
                            100

WHAT IT ISN'T
  · a slightly slower vector search
  · a marginally bigger corpus
  · normal load growth
```

**The retry case is the important one**, because it's invisible to error-rate monitoring by design.

## 4. Practical Example

**The retry signature:**

```
p50: 2.1s → 2.3s      barely moved
p95: 2.8s → 14.9s     collapsed
error rate: 0%        unchanged

That shape means MOST requests are fine and a subset is
doing something expensive. Combined with a clean error
rate, retries against a rate-limited dependency is the
leading hypothesis.

The confirmation: check the provider's 429 rate, not your
own error rate. Your error rate is zero precisely because
the retries are working.

FIX: raise the quota, add request-level concurrency
limiting so you stop exceeding it, and cap retries so a
slow failure becomes a fast one.
```

**Why per-stage timing settles it fastest:**

```
Without stage timings you're guessing. With them:

  retrieval 240ms, generation 14.2s → the model call
  retrieval 12.1s, generation 2.2s  → the retrieval path
  total 15s, stages sum to 3s       → queuing BEFORE
                                      the work starts

That third case is the one people miss entirely. If the
stages don't add up to the total, the time is being spent
waiting to start — which is a capacity problem, not a
component problem.
```

**The check nobody does first:** whether it's your latency or the provider's. Model endpoints have variable latency, and a provider-side degradation produces exactly this with no change on your side. Checking the provider status page and your own historical p50 for the model call takes a minute and can end the investigation.

**Immediate mitigation while diagnosing:**

```
· enable or increase caching aggressiveness
· cap output length
· reduce k
· route more traffic to a smaller, faster model
· shed load gracefully rather than letting everything
  queue

These trade quality for availability, which is the right
trade during an incident and the wrong one permanently.
```

## 5. Why It Matters

- **13 seconds is a discrete cause** — retries, queuing, cold starts, or loops.
- **Retries hide from error-rate monitoring** by definition.
- **If stages don't sum to the total**, the time is queuing before work starts.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Assuming gradual degradation | Searching for the wrong kind of cause |
| Trusting a clean error rate | Retries succeed; that's the point |
| No per-stage timing | Diagnosis by guesswork |
| Not checking the provider | Hours spent on someone else's incident |
| Optimizing instead of mitigating | The incident continues while you tune |
| Unbounded retries | A slow failure instead of a fast one |

**On p50 versus p95:** if p50 moved as much as p95, it's systemic — every request is slower, pointing at a dependency or a deploy. If only p95 moved, a subset is doing something different, pointing at retries, cold starts, or a specific query type. That single comparison splits the hypothesis space in half before any other work.

**On the permanent fix:** an incident like this usually reveals that a timeout was missing or too generous. A retrieval or generation call with no bound will wait as long as the dependency takes, and a bounded fast failure with a clear message is a better product than a fifteen-second wait for an answer.

## 7. Interview Answer

> "A seven-times jump is a discrete cause, not gradual degradation, and that reframe narrows things immediately — nothing in a healthy RAG pipeline takes thirteen extra seconds. Something is retrying, queuing, or running when it shouldn't be.
>
> First comparison: did p50 move as much as p95? If both moved, it's systemic — every request is slower, so a dependency or a deploy. If only p95 moved, a subset of requests is doing something different, which points at retries, cold starts, or a particular query type. That one comparison halves the hypothesis space.
>
> The leading hypothesis for this shape is retries with backoff against a rate-limited API. Three retries with exponential backoff is ten to fourteen seconds, and crucially it succeeds — so the error rate stays at zero. That makes it invisible to error-rate monitoring by design, which is why a clean error rate is not reassuring here. The confirmation is to check the provider's 429 rate rather than my own error rate; my error rate is zero precisely because the retries are working.
>
> Second, per-stage timings, because without them this is guesswork. Retrieval at 240 milliseconds and generation at fourteen seconds points at the model call. Retrieval at twelve seconds points at the retrieval path. And the case people miss — if the stages sum to three seconds but the total is fifteen, the time is being spent waiting to start. That's queuing, which is a capacity problem rather than a component problem, and it looks nothing like the other two.
>
> Third, and this takes a minute: is it my latency or the provider's? Model endpoints have variable latency and a provider-side degradation produces exactly this with no change on my side. Checking the status page and my historical p50 for the model call can end the investigation before it starts.
>
> Other candidates: cold starts on a scaled-to-zero service, which moves p99 hard and affects a subset. A loop or fan-out taking more steps than intended, if there's an agentic path. And much longer outputs — a prompt change producing five hundred token answers instead of a hundred is directly five times the generation time, and it's easy to ship without noticing.
>
> While diagnosing, I'd mitigate rather than optimize: increase cache aggressiveness, cap output length, reduce k, route more traffic to a smaller faster model, and shed load gracefully rather than letting everything queue. Those trade quality for availability, which is right during an incident and wrong permanently.
>
> And the permanent fix an incident like this usually reveals is a missing or too-generous timeout. A call with no bound waits as long as the dependency takes, and a fast bounded failure with a clear message is a better product than a fifteen-second wait."

## 8. Likely Follow-ups

**Q: What's the most likely cause?**
Retries with backoff against a rate-limited API. Three retries with exponential backoff lands in the ten-to-fourteen second range, and because they succeed, the error rate stays clean and nothing alerts.

**Q: Why isn't a zero error rate reassuring?**
Because retries succeeding is exactly what produces this. The error rate is zero precisely because the retry logic is working — the provider's 429 rate is the metric that shows it.

**Q: What does p50 versus p95 tell you?**
If both moved, it's systemic — a dependency or a deploy. If only p95 moved, a subset is doing something different — retries, cold starts, or one query type. That comparison halves the search before anything else.

**Q: What if the stages don't add up?**
Then the time is spent waiting to start, which is queuing. That's a capacity problem rather than a component problem, and no amount of optimizing individual stages will touch it.

**Q: What would you do first to mitigate?**
Cache more aggressively, cap output length, reduce k, and route to a smaller model. Trading quality for availability is correct during an incident — the permanent fix comes after the diagnosis.

## 9. Common Mistakes

- Treating a 7× jump as gradual degradation.
- Trusting a clean error rate.
- Diagnosing without per-stage timings.
- Not checking the provider's status first.
- Leaving retries unbounded after the incident.

## 10. What to Remember

- **7× is discrete** — retries, queuing, cold starts, or a loop.
- **Retries hide behind a clean error rate** by design.
- **p50 vs p95 splits the hypothesis space** first.
- **Stages not summing to the total means queuing.**
- **Mitigate during, optimize after** — and add the missing timeout.
