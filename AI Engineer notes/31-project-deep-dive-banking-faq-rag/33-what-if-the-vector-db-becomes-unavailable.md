# "What If the Vector DB Becomes Unavailable?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 33**

## 1. Definition

A resilience scenario. The key judgement is that for a grounded banking assistant, degrading to "answer without retrieval" is the wrong fallback — failing closed is correct.

## 2. Simple Explanation

If retrieval is down, the system can't ground its answers. A model asked a banking question with no context will answer from parametric memory — confidently, plausibly, and with no source.

That's worse than saying nothing.

## 3. How It Works

```
THE FALLBACK LADDER

1. RETRY with backoff        transient blips
2. SERVE FROM CACHE          exact and semantic hits
                             still work — no retrieval
                             needed for a cached answer
3. SECONDARY INDEX           a replica or a lagging
                             standby, if one exists
4. LEXICAL FALLBACK          BM25 over the document store
                             if it's a separate system —
                             worse retrieval, still
                             grounded
5. DEGRADE HONESTLY          "I can't access the policy
                             documents right now" + a
                             route to a human
6. NEVER: generate ungrounded
```

**Step 6 is the answer.** Everything above it is optional; that one isn't.

## 4. Practical Example

**Why ungrounded fallback is the wrong instinct:**

```
The model, asked about international transfer fees with no
context, will produce a fee. A plausible one. Possibly
right, possibly last year's, possibly another bank's.

It will be confident and it will have no citation.

The user cannot tell that retrieval failed. Which means
the degraded mode is INDISTINGUISHABLE from the working
mode — and that's the property that makes it dangerous.

A visible failure is recoverable. An invisible wrong
answer during an outage becomes a complaint weeks later
with no obvious cause.
```

**What partial availability looks like, and why it's worse:**

```
A vector store that's SLOW rather than down is harder:
  · requests queue, threads occupy, the API stops
    responding, and the outage spreads

  FIX: an aggressive timeout on retrieval — a second or
       two — and treat a timeout as unavailable. Plus a
       circuit breaker that stops sending requests after
       repeated failures, so recovery isn't fought by
       a thundering retry storm.

A vector store returning STALE or PARTIAL results is the
worst case:
  · it succeeds, so nothing triggers
  · quality degrades with no error anywhere
  → this is caught by the retrieval score distribution,
    not by health checks
```

**The two-store failure worth separating:**

```
With Vector Search + Firestore, they fail independently:

  VECTOR SEARCH DOWN  → no chunk IDs → nothing to fetch
                        → total retrieval failure
  FIRESTORE DOWN      → chunk IDs but no text
                        → an EMPTY context, which without
                          an explicit check looks like a
                          successful retrieval of nothing

That second one is the sneaky failure: the pipeline
proceeds, the model receives no documents, and answers
from parametric memory. The fetch path has to treat
"zero documents fetched" as a failure, not as an empty
result.
```

**On recovery:** after an outage the cache is cold and every request is a full retrieval and generation, so the recovery spike can exceed normal peak. Rate limiting on recovery, or warming the cache with the top queries, prevents the system failing again immediately on restoration.

## 5. Why It Matters

- **Fail closed** — an ungrounded banking answer is worse than no answer.
- **Degraded mode must be visible** to the user, or it's dangerous.
- **Empty context must be an error**, not an empty result.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Falling back to ungrounded generation | Confident unsourced answers, invisible to the user |
| No retrieval timeout | A slow store becomes a full API outage |
| No circuit breaker | Retries fight the recovery |
| Treating empty context as success | Silent parametric answering |
| No cache warming on recovery | The restored system fails again under the spike |
| Only health checks | Stale or partial results pass them |

**On the cache as a genuine availability tier:** a semantic cache with a reasonable hit rate keeps the most common questions answerable through an outage, and those are exactly the questions most users are asking. It's worth designing the cache so it can serve independently of the retrieval path rather than being an optimization layered inside it.

**On what to tell the user:** "I can't access the policy documents right now — here's how to reach an advisor" is a good outage message. It's honest, it doesn't expose internals, and it routes the user somewhere useful. A generic error, or worse an answer, does neither.

## 7. Interview Answer

> "The first decision is whether to fail open or closed, and for a grounded banking assistant it's closed. If retrieval is down the system can't ground anything, and a model asked about international transfer fees with no context will produce a fee — a plausible one, possibly last year's, possibly another bank's. Confident, and with no citation.
>
> The property that makes that dangerous is that the user can't tell retrieval failed. The degraded mode is indistinguishable from the working mode. A visible failure is recoverable; an invisible wrong answer during an outage turns into a complaint weeks later with no obvious cause.
>
> So the ladder is: retry with backoff for transient blips. Then serve from cache — exact and semantic hits don't need retrieval at all, and for FAQ traffic that keeps the most common questions answerable through an outage, which is most of the traffic. Then a secondary index or replica if there is one. Then a lexical fallback — BM25 over the document store if that's a separate system, which is worse retrieval but still grounded. And then degrade honestly: 'I can't access the policy documents right now', plus a route to a human.
>
> What I wouldn't do at any rung is generate without retrieval.
>
> The harder case is partial availability. A store that's slow rather than down causes requests to queue and threads to occupy, and the API stops responding — so the vector store outage becomes a full system outage. The fix is an aggressive retrieval timeout, a second or two, treating a timeout as unavailable. Plus a circuit breaker, so after repeated failures you stop sending requests and let it recover instead of fighting it with a retry storm.
>
> And the worst case is a store returning stale or partial results. It succeeds, so nothing triggers, and quality degrades with no error anywhere. That's caught by the retrieval score distribution rather than by health checks, which is another argument for having that metric.
>
> One architecture-specific point: with Vector Search plus Firestore, those fail independently. Vector Search down means no chunk IDs, which is a total retrieval failure and obvious. Firestore down means you have chunk IDs but no text — so you get an empty context, and without an explicit check that looks like a successful retrieval of nothing. The pipeline proceeds, the model receives no documents, and answers from parametric memory. So the fetch path has to treat zero documents fetched as a failure rather than as an empty result.
>
> And on recovery — after an outage the cache is cold, so every request is a full retrieval and generation and the recovery spike can exceed normal peak. Rate limiting on recovery, or warming the cache with the top queries, stops the restored system failing again immediately."

## 8. Likely Follow-ups

**Q: Why not answer without retrieval?**
Because the model produces a plausible unsourced fee and the user can't tell retrieval failed. The degraded mode looks identical to the working one, which turns an outage into wrong answers discovered weeks later.

**Q: What's worse than the store being down?**
It being slow, or returning partial results. Slow causes queuing that spreads the outage to the whole API; partial succeeds, so nothing triggers and quality degrades silently. A timeout plus circuit breaker handles the first; the score distribution catches the second.

**Q: How do the two stores fail differently?**
Vector Search down is total and obvious. The document store down gives you chunk IDs with no text — an empty context that looks like a successful retrieval unless zero fetched documents is explicitly treated as a failure.

**Q: Can the cache help during an outage?**
Yes, meaningfully. FAQ traffic is head-heavy, so a semantic cache keeps the most-asked questions answerable. It's worth designing it to serve independently of the retrieval path rather than as a layer inside it.

**Q: What happens on recovery?**
A cold cache means every request is a full retrieval and generation, so the recovery spike can exceed normal peak and take the system down again. Rate limit on recovery or warm the cache with the top queries.

## 9. Common Mistakes

- Falling back to ungrounded generation.
- No timeout, so a slow dependency becomes a full outage.
- Treating an empty context as a valid retrieval.
- Relying on health checks to detect partial results.
- No plan for the recovery spike.

## 10. What to Remember

- **Fail closed** — no grounding means no answer.
- **The degraded mode must be visible** to the user.
- **Timeout plus circuit breaker** for the slow case.
- **Zero documents fetched is an error**, not an empty result.
- **Plan the recovery spike** — the cold cache is the second outage.
