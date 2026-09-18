# "How Did You Implement Retries?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 09**
>
> ⚠️ **An answer framework.** Describe your actual retry policy. The
> distinction between a transient retry and a quality retry is the point.

## 1. Definition

A question about retry mechanics. Two entirely different things are called retries — retrying a failed call, and retrying a bad result — and conflating them is the most common weakness in the answer.

*Related: [08](08-how-did-you-handle-failures.md) covers failure classification; [07](07-did-you-have-loops.md) covers the refine loop.*

## 2. Simple Explanation

If a call times out, you call it again — same inputs, hoping for a different network outcome.

If an answer is wrong, calling again with the same inputs gives the same answer. That needs different inputs, and it belongs in the graph, not in the call.

## 3. How It Works

```
TWO MECHANISMS, TWO PLACES

TRANSIENT RETRY — inside the node
  same inputs, exponential backoff with jitter
  bounded attempts, bounded total time
  only on retryable status codes
  → a network-level concern the graph shouldn't see

QUALITY RETRY — a graph cycle
  different inputs: the failure fed back
  counter in state, exhausted branch
  → a workflow-level concern

Putting a quality retry inside a node hides an expensive
loop from the checkpoint. Putting a transient retry in
the graph makes every network blip a state transition.
```

## 4. Practical Example

**Transient retry, done properly:**

```
RETRY ON     429, 500, 502, 503, 504, timeouts
NEVER ON     400, 401, 403, 404, 422
             — the request is wrong; repeating it is
               still wrong, just later

BACKOFF      exponential WITH JITTER

The jitter is not cosmetic. Without it, every client
that hit the same rate limit retries at the same
instant, so the recovery attempt is itself a
thundering herd and the limit is hit again.

BUDGET       cap total elapsed time, not just attempt
             count. Three attempts with backoff can be
             ~14 seconds, and if the user-facing budget
             is 5 seconds, the retry policy has already
             lost — failing fast at 5s is the better
             product.

IDEMPOTENCY  a timeout doesn't mean the request didn't
             arrive. For a read-only model call that's
             only a duplicate cost; for anything with a
             side effect it needs an idempotency key.
```

**The retry that makes things worse:**

```
RETRYING INTO A RATE LIMIT

You're being 429'd because you're over quota. Retrying
adds load to the thing that's rejecting you.

The correct response is a CIRCUIT BREAKER: after N
consecutive failures, stop sending requests entirely for
a cooling period, fail fast during it, then probe with
one request before resuming.

Without one, the retry policy converts a temporary rate
limit into a sustained outage — and it also produces the
latency signature where p95 collapses while the error
rate stays at zero, because the retries eventually
succeed.
```

**Where the retry state lives:**

```
If a transient retry happens inside a node, the attempt
count is local — invisible in state, invisible in the
checkpoint.

That's usually the right trade, but it means:
  · a crash mid-retry restarts the node's retry budget
    from zero on resume
  · and the retry count has to be EMITTED as a metric,
    or nobody ever sees that half the requests are
    retrying

Logging retry counts per dependency is what makes the
cost-and-latency incident diagnosable later.
```

## 5. Why It Matters

- **Transient and quality retries are different mechanisms** in different places.
- **Jitter prevents the retry storm** — synchronized retries recreate the outage.
- **Cap total elapsed time**, not just attempts — the user budget is the real limit.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| One retry mechanism for both kinds | Quality retries hidden; network blips in state |
| Retrying 4xx errors | A slower failure with the same outcome |
| Backoff without jitter | Synchronized retry storm on recovery |
| No circuit breaker | A rate limit becomes a sustained outage |
| Attempt-count bound only | 14s of retries against a 5s user budget |
| Retrying a non-idempotent call | Duplicated side effects |
| Retry counts not emitted | Invisible latency and cost |

**On the latency connection:** retries are the leading explanation for a p95 collapse with a clean error rate, because successful retries don't count as errors. Any retry policy should therefore emit both a retry count and the underlying dependency's failure rate, or the incident is diagnosable only by guessing.

**On retry budgets across the workflow:** if every node retries three times independently, a multi-node workflow can accumulate far more retry time than any single node's policy suggests. A workflow-level deadline — a wall clock the graph checks — is what bounds the whole run, rather than trusting the sum of local policies to be reasonable.

## 7. Interview Answer

> "[**Your policy.** The two-mechanisms distinction is the substance.]
>
> "I'd separate two things that both get called retries, because they're different mechanisms and they belong in different places.
>
> Transient retries are for a call that failed — a timeout, a 429, a 503. Same inputs, exponential backoff, hoping for a different network outcome. That lives inside the node, because it's a dependency concern and the graph doesn't need to see every network blip as a state transition.
>
> Quality retries are for a call that succeeded and produced something unusable. Calling again with identical inputs gives an identical result, so that needs different inputs — the failure fed back — and it belongs in the graph as a cycle with a counter. Putting that inside a node would hide an expensive loop from the checkpoint entirely.
>
> On the transient policy specifically. Retry on 429s, 5xxs, and timeouts; never on 4xx client errors, because a malformed or unauthorized request is still malformed on the second attempt — you've just made the failure slower.
>
> Backoff is exponential with jitter, and the jitter isn't cosmetic. Without it, every client that hit the same rate limit retries at the same instant, so the recovery attempt is itself a thundering herd and the limit gets hit again.
>
> I'd bound total elapsed time, not just attempt count. Three attempts with exponential backoff can be around fourteen seconds, and if the user-facing latency budget is five, the retry policy has already lost — failing fast at five seconds with an honest message is the better product than succeeding at fourteen.
>
> And a circuit breaker, because retrying into a rate limit adds load to the thing that's rejecting you. After some number of consecutive failures, stop sending entirely for a cooling period, fail fast during it, then probe with a single request before resuming. Without that, a retry policy converts a temporary rate limit into a sustained outage.
>
> Two things I'd make sure of. Idempotency — a timeout doesn't mean the request didn't arrive. For a read-only model call, a duplicate is just duplicated cost. For anything with a side effect it needs an idempotency key, or a retry becomes a double-write.
>
> And emitting retry counts as a metric. If the retry happens inside a node, the attempt count is local and invisible in state and in the checkpoint — which is usually the right trade, but it means nobody ever sees that half the requests are retrying unless it's explicitly emitted.
>
> That last point connects to something concrete: retries are the leading explanation for a p95 latency collapse with a clean error rate, because successful retries don't count as errors. So the retry count and the dependency's underlying failure rate both need to be visible, or that incident is diagnosable only by guessing.
>
> One thing I'd add at the workflow level: if every node retries three times independently, a multi-node run can accumulate far more retry time than any single policy suggests. So a workflow-level deadline — a wall clock the graph checks — is what actually bounds the run."

## 8. Likely Follow-ups

**Q: What's the difference between the two retry types?**
One repeats a failed call with the same inputs, hoping the network behaves. The other repeats a successful call with different inputs, because the output was unusable. Same word, different mechanisms, different places in the design.

**Q: Why does jitter matter?**
Without it, every client that hit the same rate limit retries at the same instant. The recovery attempt becomes a synchronized burst that hits the limit again, so backoff alone prolongs the outage it's meant to ride out.

**Q: Which errors do you not retry?**
4xx client errors — malformed requests, auth failures, not-found. The request is wrong, so repeating it is still wrong, just later. Retrying them converts a fast clear failure into a slow one.

**Q: Why cap elapsed time rather than attempts?**
Because the user-facing budget is the real constraint. Three attempts with exponential backoff can run to fourteen seconds, and failing fast at five with an honest message is a better product than succeeding at fourteen.

**Q: How do retries show up in monitoring?**
As a p95 latency collapse with a clean error rate, because successful retries aren't errors. That's why the retry count and the dependency failure rate both need emitting — otherwise the incident is only diagnosable by guessing.

## 9. Common Mistakes

- Conflating transient and quality retries.
- Retrying 4xx responses.
- Backoff with no jitter.
- No circuit breaker, so retries prolong a rate limit.
- Retry counts never emitted as a metric.

## 10. What to Remember

- **Two mechanisms**: transient in the node, quality in the graph.
- **Never retry 4xx** — a slower failure, same result.
- **Jitter, or the recovery is another outage.**
- **Bound elapsed time** against the user budget.
- **Emit retry counts** — otherwise the latency incident is invisible.
