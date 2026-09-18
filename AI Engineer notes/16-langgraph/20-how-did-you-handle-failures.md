# "How Did You Handle Failures?"

> **Phase 16 · LANGGRAPH · Topic 20**
>
> ⚠️ **An answer framework.** Use the structure and fill in your own
> project's specifics. If you handled fewer failure types than listed here,
> say which — a partial system described honestly beats a complete one
> described inaccurately.

## 1. Definition

A question testing production thinking. The interviewer wants to hear that you distinguished failure types, that the system degraded rather than erroring, and that failures were visible to operators.

## 2. Simple Explanation

The weak answer is "we had try-except and retries." The strong answer distinguishes failure *types*, because they need different responses.

A timeout and "retrieval found nothing relevant" are both failures, and retrying identically helps with exactly one of them.

## 3. How It Works

**The structure:**

```
1. TAXONOMY     the failure types you distinguished
2. MECHANISM    how failures were represented (state, not exceptions)
3. DEGRADATION  what the customer got instead of an error
4. VISIBILITY   how operators found out
```

**Part 4 is the one most candidates skip**, and it's what distinguishes someone who has operated a system from someone who has built one.

## 4. Practical Example

**A taxonomy worth describing:**

```
TRANSIENT       timeout, rate limit, connection error
                → retry in the node with backoff, then degrade

DEPENDENCY DOWN a service unavailable
                → fallback node: cached data (labelled as such),
                  or abstain with a handoff

SEMANTIC        retrieval returned nothing relevant
                → rewrite loop, capped, then abstain

VALIDATION      hallucinated ID, argument out of session scope
                → error returned to the model to correct

BUDGET          steps, tokens, or wall clock exhausted
                → conclude with what's established
```

**The mechanism to explain:**

```
Nodes caught their own failures and returned a status field
rather than raising:

  {"documents": [], "retrieval_status": "failed",
   "errors": [str(e)]}

Then the routing function treats failure as another condition.
That's the whole reason it's a graph — failures route like
anything else, and nothing escapes as an exception.

The errors field needed an add reducer, because parallel
branches each returning an error would otherwise overwrite
each other.
```

**The degradation to describe:**

```
Three parallel lookups, one fails:

  "I can see you were charged $45.00 on 3 March. I wasn't
   able to verify your account tier, so I can't confirm
   whether that's the correct rate — let me connect you
   with someone who can check."

Answers what could be answered, states precisely what
couldn't, routes to a human. Better than an error and
better than a guess.
```

**The visibility point:**

```
A failure the graph handled gracefully still means something
is broken. So handled failures were logged by type and
alerted on by rate — otherwise the system's resilience is
exactly why nobody notices a dependency has been down.
```

## 5. Why It Matters

- **Distinguishing failure types** shows you designed rather than wrapped everything in try-except.
- **Failures as state** is the graph-specific insight.
- **Alerting on handled failures** is what signals operational experience.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Try-except and retries" | No taxonomy, no design |
| Retrying everything | Permission errors never succeed |
| No degradation described | All-or-nothing outcomes |
| No visibility mentioned | Suggests it was never operated |
| Claiming nothing ever failed | Not credible |

**On honesty about scope:** if the system handled transient and semantic failures but not dependency outages, say that — and say what you'd add. A partial taxonomy described accurately, with a stated gap, is more convincing than a complete one described vaguely.

**On the strongest single detail:** "we alerted on failures the graph recovered from" is the sentence that most reliably signals production experience, because it's the thing you only learn after resilience hides an outage from you once.

## 7. Interview Answer

> "I'd separate it into four parts: the failure types, how they were represented, what the customer got, and how we found out.
>
> On types — I distinguished transient failures like timeouts and rate limits, dependency outages, semantic failures where retrieval found nothing relevant, validation failures like a hallucinated ID, and budget exhaustion. They need different responses. Transient gets a retry with backoff in the node; semantic gets a rewrite loop, because retrying the same query gives the same result; validation goes back to the model to correct; budget exhaustion concludes with what's established. Retrying everything would be wrong — a permission denial fails identically every time, so three retries just triples latency before the inevitable.
>
> On mechanism, the graph-specific part: nodes caught their own failures and returned a status field in state rather than raising. So retrieval failing returns documents empty, status failed, and the error appended. Then the routing function handles it like any other condition — which is the whole reason it's a graph. Nothing escapes as an exception, so the work already done isn't discarded.
>
> One detail there: the errors field needed an add reducer, because parallel branches each returning an error would overwrite each other, and two of three failures would vanish depending on timing.
>
> On degradation — partial results with explicit gaps. If three parallel lookups run and the tier lookup fails, the answer says what was confirmed, states precisely what couldn't be verified, and offers a handoff. That's better than an error, which gives the customer nothing, and better than a guess.
>
> And visibility, which I think is the part that matters most: a failure the graph handled gracefully still means something is broken. So handled failures were logged by type and alerted on by rate — otherwise the system's resilience is exactly why nobody notices a dependency has been down for a day.
>
> [**Adapt to your own scope.** If you handled some of these and not others, say which and what you'd add — a partial taxonomy described accurately is more convincing than a complete one described vaguely.]"

## 8. Likely Follow-ups

**Q: Why not retry everything?**
Because some errors never succeed on a second attempt. A permission denial, a validation error, or a not-found result fails identically every time, so retrying triples the latency before an inevitable failure. Retry is for transient infrastructure problems only.

**Q: How were failures represented?**
As state, not exceptions. Nodes caught their own failures and returned a status field, so the routing function could handle failure like any other condition. That preserves the work already done, which an escaping exception would discard.

**Q: What did the customer see?**
Partial results with explicit gaps where possible — what was confirmed, what couldn't be verified, and a handoff. That's better than an error and better than a guess. Where nothing could be established, an abstention with a handoff rather than an answer from weak context.

**Q: How did you find out about failures?**
Handled failures were logged by type and alerted on by rate. That matters because graceful degradation means nothing looks broken from outside — the resilience is precisely why an outage would otherwise go unnoticed.

**Q: What didn't you handle?**
[Your own honest answer. Naming a gap and what you'd add is more credible than claiming complete coverage, and it's a question where overclaiming is easy to detect through follow-ups.]

## 9. Common Mistakes

- Answering "try-except and retries" with no taxonomy.
- Retrying failures that can't succeed.
- Not mentioning what the customer actually received.
- Omitting alerting on handled failures.
- Claiming complete coverage of every failure type.

## 10. What to Remember

- **Taxonomy first** — types need different responses.
- **Failures as state, not exceptions** — the graph-specific insight.
- **Partial results with explicit gaps** beat errors and guesses.
- **Alert on handled failures** — the sentence that signals real operations.
- **Name your gaps honestly.**
