# Failure Handling

> **Phase 16 · LANGGRAPH · Topic 14**

## 1. Definition

Deciding what happens when a node fails — retry, route to a fallback, degrade, or abstain — and ensuring the graph always terminates at a declared node rather than raising.

## 2. Simple Explanation

Something will fail: a retrieval, a model call, a downstream API. The design question is whether the graph handles it or the exception escapes.

An exception escaping means the customer gets an error and all the work already done is discarded. A declared failure path means they get a useful answer or a clean handoff.

## 3. How It Works

**Failures are state, not exceptions:**

```python
def retrieve_node(state) -> dict:
    try:
        docs = retriever.invoke(state["query"], filter=f(state))
        return {"documents": docs, "retrieval_status": "ok"}
    except Exception as e:
        log.exception("retrieval failed")
        return {"documents": [], "retrieval_status": "failed",
                "errors": [str(e)]}      # ← appended via reducer
```

```python
def route(state) -> str:
    if state["retrieval_status"] == "failed":
        return "degraded"          # cached or partial answer
    if state["top_score"] < FLOOR:
        return "rewrite" if state["attempts"] < 2 else "abstain"
    return "generate"
```

**Converting failures into state fields** is what lets routing handle them like any other condition — which is the whole reason to use a graph.

## 4. Practical Example

**A failure taxonomy with different routes:**

```
TRANSIENT       timeout, rate limit
                → node retry policy, then degrade

DEPENDENCY DOWN a service is unavailable
                → fallback node: cached data, or abstain with
                  a handoff

SEMANTIC        retrieval found nothing relevant
                → rewrite loop, then abstain

VALIDATION      hallucinated ID, out-of-scope argument
                → return to the model to correct

BUDGET          steps, tokens, or time exhausted
                → conclude with what's known

Each routes somewhere declared. None raise.
```

**The principle:** every failure path ends at a node that produces something — a degraded answer, an abstention, or a handoff. The graph should have no route to an uncaught exception.

**Partial results are usually the right degradation:**

```
Three parallel lookups; the tier lookup fails.

BAD    fail the whole request
GOOD   "I can see you were charged $45.00 on 3 March. I
        wasn't able to verify your account tier, so I can't
        confirm whether that's the correct rate — let me
        connect you with someone who can check."

That answers what could be answered, states precisely what
couldn't, and routes to a human. It's a better outcome than
either an error or a guess.
```

**Alerting:** a failure the graph handled gracefully still means something is broken. Handled failures need to be logged with the failure type and alerted on by rate — otherwise the graph's resilience becomes the reason nobody notices a dependency is down.

## 5. Why It Matters

- **Failures as state** let routing handle them declaratively.
- **Every path ends at a declared node** — no route to an uncaught exception.
- **Partial results with explicit gaps** beat both errors and guesses.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Exceptions escaping nodes** | Request fails; prior work discarded |
| **No degraded path** | All-or-nothing outcomes |
| **Handled failures unalerted** | Outages masked by resilience |
| **Partial results presented as complete** | Worse than failing |
| **Failure state without a reducer** | Parallel failures overwrite each other |
| **Fallbacks to stale data without saying so** | Silently wrong answers |

**On fallback to cached data:** serving a cached fee schedule when the live service is down is reasonable — but only if the answer says so. "Based on our fee schedule as of 1 March" is honest; presenting cached data as current is not, and in banking a rate that has since changed is a real customer harm.

**On the reducer for errors:** parallel branches each returning an error field will overwrite each other without an add reducer, so two of three failures vanish. That makes the failure look less severe than it is, and it's timing-dependent, which makes it hard to reproduce.

## 7. Interview Answer

> "The principle I'd start from is that failures should be state, not exceptions. A node catches its own failure and returns a status field — retrieval_status failed, with the error appended to an errors list. Then the routing function handles it like any other condition, which is the whole reason to use a graph.
>
> An exception escaping a node means the request fails and everything already established is discarded. A declared failure path means the customer gets a useful answer or a clean handoff.
>
> I'd taxonomize failures because they route differently. Transient ones — timeouts, rate limits — get a node retry policy, then degrade. A dependency being down routes to a fallback node with cached data or an abstention plus handoff. Semantic failures, where retrieval found nothing relevant, go through a rewrite loop then abstain. Validation failures like a hallucinated ID return to the model to correct. And budget exhaustion concludes with what's known. Each routes somewhere declared, and none raise.
>
> Partial results are usually the right degradation. If three parallel lookups run and the tier lookup fails, I'd rather say 'I can see you were charged forty-five dollars on the third of March; I wasn't able to verify your account tier so I can't confirm whether that's correct — let me connect you with someone who can'. That answers what could be answered, states precisely what couldn't, and routes to a human. Better than either an error or a guess.
>
> Two things I'd be careful about. Falling back to cached data is reasonable, but only if the answer says so — 'based on our fee schedule as of the first of March' is honest, presenting cached data as current isn't, and in banking a rate that has since changed is real customer harm.
>
> And the errors field needs an add reducer. Parallel branches each returning an error will overwrite each other without one, so two of three failures vanish — which makes the situation look less severe than it is and is timing-dependent, so it's hard to reproduce.
>
> Last thing: a failure the graph handled gracefully still means something is broken. Handled failures need logging by type and alerting by rate, otherwise the graph's resilience is exactly why nobody notices a dependency has been down for a day."

## 8. Likely Follow-ups

**Q: How should nodes handle failures?**
By catching them and returning a status field in state rather than raising. That lets the routing function treat failure as another condition to route on, which is the graph's strength — and it preserves the work already done instead of discarding it with an exception.

**Q: What's the right degradation?**
Usually partial results with explicit gaps — answer what could be answered, state precisely what couldn't be determined, and offer a handoff. That's better than an error, which gives the customer nothing, and better than a guess, which gives them something wrong.

**Q: Is falling back to cached data acceptable?**
Yes, if the answer says so. "Based on our fee schedule as of the first of March" is honest; presenting cached data as current isn't. In banking a rate that has since changed causes real harm, so the staleness has to be visible to the customer.

**Q: What's the risk of handling failures well?**
Masking. A graph that degrades gracefully every time reports nothing wrong while a dependency is down. Handled failures need logging by type and alerting by rate, so resilience doesn't become the reason an outage goes unnoticed.

**Q: Any subtle bug around failure state?**
The errors field needs an add reducer. Parallel branches each returning an error overwrite each other without one, so two of three failures disappear. That understates the severity and is timing-dependent, which makes it difficult to reproduce and diagnose.

## 9. Common Mistakes

- Letting exceptions escape nodes.
- No declared degraded or abstention path.
- Presenting partial or cached results as complete and current.
- Missing the reducer on the errors field.
- Not alerting on failures the graph handled.

## 10. What to Remember

- **Failures are state, not exceptions** — then routing handles them.
- **Every path ends at a declared node**; no route to an uncaught exception.
- **Partial results with explicit gaps** beat errors and guesses.
- **Say when data is cached or stale.**
- **Alert on handled failures** — resilience masks outages otherwise.
