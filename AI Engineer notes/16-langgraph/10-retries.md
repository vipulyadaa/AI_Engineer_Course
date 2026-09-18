# Retries

> **Phase 16 · LANGGRAPH · Topic 10**

## 1. Definition

Re-executing a failed node, either automatically via a retry policy or by routing back to it through an edge. The two mechanisms address different failure types and shouldn't be confused.

## 2. Simple Explanation

A node fails. Either it's a transient problem — a timeout, a rate limit — and retrying the same thing works. Or the approach was wrong, and retrying identically will fail identically.

Node-level retry handles the first. Graph-level loops handle the second.

## 3. How It Works

```python
from langgraph.pregel import RetryPolicy

g.add_node("retrieve", retrieve_node,
           retry=RetryPolicy(max_attempts=3,
                             retry_on=(TimeoutError, RateLimitError)))
```

| Mechanism | For | Behaviour |
|---|---|---|
| **Node retry policy** | Transient infrastructure failures | Same input, backoff |
| **Graph loop** | Wrong approach or bad results | Different input, new state |

```
TRANSIENT   timeout, 503, rate limit
            → node retry, same arguments, exponential backoff

SEMANTIC    retrieval returned nothing relevant
            → graph loop through a rewrite node, new query

Retrying a semantic failure identically wastes the budget.
Routing a transient failure through a rewrite node produces
a needlessly different query for what was just a timeout.
```

## 4. Practical Example

**Retry-on is the important parameter:**

```python
retry_on=(TimeoutError, RateLimitError, ConnectionError)
```

```
Retrying everything is wrong. A permission denial, a
validation error, or a not-found result will fail identically
every time — retrying three times just triples the latency
before the inevitable.

Only retry what might succeed on a second attempt.
```

**Retries interact with idempotency:**

```
A node retried after a partial side effect repeats it.

  node writes an audit record → times out waiting for the
  response → retries → writes a second audit record

Whether that's harmless or serious depends on the side
effect, but it's the same idempotency requirement as
resumption — and retries make it far more likely to occur,
because they happen on every transient blip rather than only
on resume.
```

**Budget interaction:**

```
3 nodes × 3 retries × 30s timeout = 270 seconds worst case,
before any successful work.

Retry counts and timeouts must be derived together from the
overall latency budget. A generous retry policy on every
node produces a worst case no interactive system tolerates.
```

**The fallback pattern:** for a node whose failure is survivable, routing to a degraded alternative — cached data, a simpler model, a partial answer — beats retrying until the budget is gone. That's a graph edge, not a retry policy.

## 5. Why It Matters

- **Transient and semantic failures need different mechanisms** — retry versus loop.
- **`retry_on` must be selective**, or you triple latency before an inevitable failure.
- **Retries make the idempotency requirement routine**, not exceptional.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Retrying non-transient errors** | Latency for no chance of success |
| **Semantic failures retried identically** | Same failure, budget consumed |
| **Non-idempotent nodes** | Duplicated side effects |
| **Retries multiplying the latency budget** | Worst case far above the target |
| **No backoff** | Retries hammering a struggling service |
| **Retries masking outages** | Failures absorbed, never alerted |

**On masking:** a node that retries successfully on the third attempt every time is reporting nothing wrong while a dependency degrades. Retry counts should be a monitored metric, so persistent retry activity surfaces as a signal rather than being absorbed silently.

**On backoff:** retrying immediately against a rate-limited or overloaded service makes things worse. Exponential backoff with jitter is the standard, and without jitter, concurrent requests retry in lockstep and produce a thundering herd on recovery.

## 7. Interview Answer

> "There are two retry mechanisms and they address different failures. A node-level retry policy re-executes the same node with the same input — right for transient infrastructure failures like timeouts, rate limits, and connection errors. A graph loop routes back through a node that changes something — right for semantic failures, like retrieval returning nothing relevant, where you need a different query rather than the same one again.
>
> Confusing them wastes budget in both directions. Retrying a semantic failure identically produces the identical failure; routing a timeout through a rewrite node produces a needlessly different query for what was just a blip.
>
> The parameter that matters is retry_on. Retrying everything is wrong — a permission denial, a validation error, or a not-found result fails identically every time, so three retries just triples the latency before the inevitable. Only retry what might plausibly succeed on a second attempt.
>
> Retries interact with idempotency, and more routinely than resumption does. A node that writes an audit record and then times out waiting for the response will write a second one on retry. Resumption makes that possible occasionally; retries make it likely, because they fire on every transient blip. So side-effecting nodes need idempotency keys regardless.
>
> Budget is the other interaction. Three nodes at three retries with thirty-second timeouts is two hundred and seventy seconds worst case before any successful work. Retry counts and timeouts have to be derived together from the overall latency target, not chosen per node — a generous policy everywhere produces a worst case no interactive system tolerates.
>
> For nodes whose failure is survivable, I'd prefer a fallback edge to more retries — route to cached data, a simpler model, or a partial answer. That's a graph edge rather than a retry policy, and it produces something instead of consuming the budget.
>
> And I'd monitor retry counts. A node that succeeds on the third attempt every time reports nothing wrong while a dependency degrades, so persistent retry activity needs to surface as a signal rather than be absorbed."

## 8. Likely Follow-ups

**Q: When do you use a retry policy versus a loop?**
Retry policy for transient infrastructure failures — timeouts, rate limits, connection errors — where the same call might succeed. A graph loop for semantic failures, where the approach needs to change, like rewriting a query that retrieved nothing relevant.

**Q: What should `retry_on` include?**
Only errors that might succeed on a second attempt. Permission denials, validation errors, and not-found results fail identically every time, so retrying them triples the latency before an inevitable failure without any chance of a different outcome.

**Q: How do retries interact with idempotency?**
They make it a routine concern rather than an occasional one. A node that writes a record and then times out waiting for the response writes a second one on retry — so side-effecting nodes need idempotency keys, and retries make that happen far more often than resumption does.

**Q: How do retries affect the latency budget?**
Multiplicatively. Three nodes at three retries with thirty-second timeouts is a two-hundred-seventy-second worst case. Retry counts and timeouts have to be derived together from the end-to-end target rather than chosen per node in isolation.

**Q: What's the alternative to more retries?**
A fallback edge — route to cached data, a simpler model, or a partial answer when a node fails. That produces something useful instead of consuming the budget, and it's expressed as graph structure rather than as retry configuration.

## 9. Common Mistakes

- Retrying errors that can't succeed on a second attempt.
- Using a retry policy for semantic failures.
- Side-effecting nodes without idempotency keys.
- Setting retry counts without reference to the latency budget.
- Not monitoring retry rates, so degrading dependencies stay hidden.

## 10. What to Remember

- **Retry policy for transient; graph loop for semantic.**
- **Be selective with `retry_on`** — some errors never succeed.
- **Retries make idempotency a routine requirement.**
- **Derive retries and timeouts from the latency budget together.**
- **Prefer a fallback edge**, and monitor retry rates as a signal.
