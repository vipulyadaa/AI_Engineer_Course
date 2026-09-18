# "How Did You Handle Failures?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 08**
>
> ⚠️ **An answer framework.** Describe what you actually built. The
> classification — which failures are recoverable and which aren't — is the
> distinguishing part.

## 1. Definition

A question about failure design. The strong answer classifies failures by what should happen, rather than describing a single catch-all mechanism.

*Related: [09](09-how-did-you-implement-retries.md) covers retries specifically.*

## 2. Simple Explanation

Not every failure should be retried. Some should fail fast, some should degrade to a lesser result, and some should escalate to a human.

Treating them all the same means either retrying things that will never succeed, or giving up on things that would have worked.

## 3. How It Works

```
CLASSIFY BY THE RIGHT RESPONSE

TRANSIENT       timeout, 429, 503
                → retry with backoff

PERMANENT       bad request, auth failure, invalid schema
                → fail fast. Retrying a 400 just wastes
                  time and makes the failure slower.

DEGRADED        one branch failed, another succeeded
                → continue with less. Lexical retrieval
                  failing while dense succeeded is not a
                  workflow failure.

QUALITY         the step ran, the output is unusable
                → the refine loop, not the retry path

TERMINAL        nothing can produce a safe answer
                → abstain honestly, or escalate

The classification is the answer. A single try/except
around everything is not.
```

## 4. Practical Example

**Where failure handling belongs:**

```
INSIDE THE NODE        transient errors on its own
                       dependency — the node owns its
                       retry policy and its timeout

AT THE GRAPH LEVEL     routing after a node has failed
                       and recorded why

The distinction matters because a node that swallows an
error and returns empty state is worse than one that
fails: the graph continues with missing data and the
failure surfaces three nodes later as something
unrelated.

So: nodes retry their own transient failures, then either
succeed or record a structured failure in state and let
the graph route.
```

**The failure that's specific to this domain:**

```
A FAILED VERIFICATION IS NOT A SYSTEM FAILURE

  verification says the answer isn't grounded
  → that's the system working correctly

  the verification CALL errored
  → that's a system failure, and it's the interesting
    one, because now you have an unverified answer

And the decision there is a policy decision, not a
technical one:

  · serve the unverified answer?    ← not in banking
  · abstain?                        ← the safe default
  · escalate to a human?            ← best where the
                                      volume allows

Failing closed is right here. An unverified answer about
a fee is exactly the thing the verification step exists
to prevent.
```

**Partial failure, and why it's the interesting case:**

```
Dense retrieval succeeds; lexical retrieval times out.

  WRONG:  fail the request
  WRONG:  continue silently as if nothing happened
  RIGHT:  continue with dense results only, RECORD the
          degradation in state, and let it influence
          downstream decisions

Why record it: the relevance threshold was calibrated
on fused hybrid results. With only one retriever, the
scores mean something slightly different — so a
degradation flag lets the assess step be more
conservative, or the answer carry a caveat.

Continuing silently is the version that produces a
confident answer from half the evidence.
```

**On the error field:** accumulating failures in state rather than overwriting means the final record shows everything that went wrong across the run, not just the last thing. That's what makes a post-hoc investigation possible, and it requires an append reducer.

## 5. Why It Matters

- **Classify by response** — retry, fail fast, degrade, refine, or escalate.
- **Nodes shouldn't swallow errors** — the failure resurfaces somewhere unrelated.
- **A failed verification call means failing closed**, not serving unverified.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| One try/except around everything | Retries permanent failures, hides causes |
| Nodes returning empty state on error | The failure surfaces three nodes later |
| Retrying a 400 | Slower failure, same outcome |
| Failing the whole request on partial failure | Throwing away usable results |
| Continuing silently after degradation | Confident answers from half the evidence |
| Serving an answer when verification errored | Exactly what verification exists to prevent |

**On what the user sees:** a technical error message is the wrong output for a customer-facing banking assistant. The failure modes that reach the user should be a small set — an honest "I can't answer that right now", a route to a human — and everything else maps into them. The detail belongs in the trace, not in the response.

**On the checkpoint advantage:** because state is persisted at each step, a crash mid-workflow doesn't mean restarting from the beginning. The workflow resumes at the node that was in flight, which makes an expensive multi-step run recoverable rather than repeated — and that's one of the genuine reasons to be using this framework at all.

## 7. Interview Answer

> "[**Your handling.** The classification is what makes the answer strong.]
>
> "I'd classify failures by what should happen to them, because a single try/except around everything gets all of these wrong.
>
> Transient failures — timeouts, rate limits, 503s — get retried with backoff, and that lives inside the node, because the node owns its dependency and its timeout policy.
>
> Permanent failures — a malformed request, an auth failure, a schema violation — fail fast. Retrying a 400 makes the failure slower and changes nothing.
>
> Quality failures go down the refine loop rather than the retry path. The step ran successfully and produced something unusable, which is a different problem from the step not running.
>
> And terminal failures, where nothing can produce a safe answer, abstain or escalate.
>
> The rule I'd emphasize about where handling lives: nodes retry their own transient failures, and then either succeed or record a structured failure in state and let the graph route. What a node must not do is swallow an error and return empty state — because the graph continues with missing data and the failure surfaces three nodes later as something completely unrelated. That's much harder to debug than an honest failure at the source.
>
> Partial failure is the interesting case. If dense retrieval succeeds and lexical times out, failing the whole request throws away usable results — but continuing silently is worse. The right thing is to continue with what succeeded and record the degradation in state.
>
> The reason to record it is concrete: the relevance threshold was calibrated on fused hybrid results, so with only one retriever the scores mean something slightly different. A degradation flag lets the assess step be more conservative or the answer carry a caveat. Continuing silently is the version that produces a confident answer from half the evidence.
>
> One failure that's specific to this domain and worth separating. A verification that says the answer isn't grounded is not a system failure — that's the system working. But the verification call erroring is a system failure, and it's the interesting one, because now there's an answer nobody checked.
>
> And what to do there is a policy decision rather than a technical one. Serving an unverified answer about a fee is exactly what the verification step exists to prevent, so the right behaviour is to abstain, or escalate to a human where the volume allows. Failing closed.
>
> Two operational points. Errors accumulate in state rather than overwriting, with an append reducer, so the final record shows everything that went wrong across the run rather than just the last thing — that's what makes a post-hoc investigation possible.
>
> And what the user sees should be a small set of outcomes. An honest 'I can't answer that right now' and a route to a human. A technical error message is the wrong output for a customer-facing banking assistant; the detail belongs in the trace.
>
> The framework genuinely helps with one part of this — because state is checkpointed at each step, a crash doesn't mean restarting from the beginning. The workflow resumes at the node that was in flight, which is one of the real reasons to be using it."

## 8. Likely Follow-ups

**Q: Do you retry everything?**
No. Transient failures retry; permanent ones fail fast, because retrying a 400 makes the failure slower without changing it. Quality failures go down the refine loop, which is a different mechanism entirely.

**Q: What if one retrieval branch fails?**
Continue with what succeeded and record the degradation. Failing the request discards usable results; continuing silently produces a confident answer from half the evidence, and the thresholds were calibrated on the full set.

**Q: What if the verification call itself fails?**
Fail closed — abstain or escalate. Serving an unverified answer is precisely the outcome verification exists to prevent, so it's a policy decision rather than a technical one.

**Q: Why shouldn't a node swallow errors?**
Because the graph continues with missing data and the failure resurfaces several nodes later as something unrelated. An honest failure at the source is far easier to diagnose than empty state propagating forward.

**Q: What does the user see?**
A small set of outcomes — an honest inability to answer, and a route to a human. Technical error detail belongs in the trace, not in a customer-facing banking response.

## 9. Common Mistakes

- A single catch-all exception handler.
- Retrying permanent failures.
- Nodes returning empty state instead of failing.
- Continuing after partial failure without recording it.
- Serving an answer when verification errored.

## 10. What to Remember

- **Classify by response** — retry, fail fast, degrade, refine, escalate.
- **Nodes own transient retries**; the graph routes on recorded failures.
- **Record degradation**, don't continue silently.
- **A failed verification call means failing closed.**
- **Accumulate errors in state** with an append reducer.
