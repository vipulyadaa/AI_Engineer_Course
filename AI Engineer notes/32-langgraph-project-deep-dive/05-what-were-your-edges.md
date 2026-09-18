# "What Were Your Edges?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 05**
>
> ⚠️ **An answer framework.** Describe your actual graph shape. The
> termination guarantee is what a good answer gets to.

## 1. Definition

A question about control flow. Edges are where the workflow's logic actually lives — and the important property is that every path provably reaches an end.

## 2. Simple Explanation

Nodes do work; edges decide what happens next. A fixed edge always goes to the same place, a conditional edge picks from the result.

The thing that separates a considered answer is being able to say why the graph can't get stuck.

## 3. How It Works

```
THE EDGE TYPES

FIXED         A → B, unconditionally
CONDITIONAL   a function reads state and returns the
              name of the next node
PARALLEL      one node fans out to several, which then
              join
CYCLE         a conditional edge pointing backwards —
              the retry loop
TERMINAL      → END

THE PROPERTY THAT MATTERS

Every cycle must have a bounded exit. A counter in
state, checked by the conditional function, with a
defined fallback when it's exhausted.

Unbounded cycles are the failure mode that costs real
money before anyone notices.
```

## 4. Practical Example

**A realistic shape:**

```
START
  → classify_intent
       ├─(out of scope)─→ END
       └─(in scope)─→ rewrite_query
  → retrieve
  → assess_relevance
       ├─(below threshold)─→ abstain → END
       └─(ok)─→ generate
  → verify
       ├─(grounded)─→ check_policy
       ├─(not grounded, attempts < 2)─→ retrieve   ← cycle
       └─(not grounded, attempts = 2)─→ abstain → END
  → check_policy
       ├─(clean)─→ finalize → END
       └─(flagged)─→ human_review → finalize → END

FOUR routes to END, and every one of them is reachable.
The cycle has a counter and an explicit exhausted branch.
```

**Why the "attempts exhausted" branch is the point:**

```
It's tempting to write the retry condition as:

  if not grounded: return "retrieve"
  else: return "check_policy"

That has no bound. A question the corpus genuinely can't
answer loops forever — burning tokens, holding a request
open, and producing nothing.

The bounded version needs THREE outcomes, not two, and
the third is the one people forget:

  grounded              → continue
  not grounded, retries left → retry
  not grounded, exhausted    → ABSTAIN

That third branch is what makes the graph terminate, and
it's also the correct product behaviour — the system
saying it can't answer, which is what should happen.
```

**Where the logic actually lives:**

```
Conditional edge functions are ordinary Python that read
state and return a string. Two consequences worth
stating:

  · they should contain NO model calls — the decision
    should come from state a node already computed, so
    routing is deterministic and testable
  · they're trivially unit-testable: pass a state dict,
    assert on the returned node name

A conditional function that calls a model is a node
wearing an edge's clothes — it costs latency, it can
fail, and it makes routing non-reproducible.
```

**On parallel edges:** fanning out to dense and lexical retrieval and joining afterwards is the common case, and the thing to get right is the reducer on the field both branches write. Without it the join silently keeps one branch's results. That's an edge decision surfacing as a state bug.

## 5. Why It Matters

- **Every cycle needs a bounded exit** with an explicit exhausted branch.
- **Routing logic in edges should be deterministic** — no model calls.
- **Parallel fan-out needs a reducer**, or the join drops data.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Mostly sequential with some conditions" | No shape, no reasoning |
| An unbounded cycle | Runs forever; the expensive failure |
| Only two outcomes on a retry condition | Missing the exhausted branch |
| Model calls in conditional functions | Non-deterministic, slow, can fail |
| No explicit END from every path | Paths that can't terminate |
| Parallel fan-out with no reducer | Silent data loss at the join |

**On graph complexity:** past a certain number of conditional edges the graph becomes hard to reason about, and the fix is subgraphs — grouping a coherent region into its own graph with a single entry and exit. That keeps the top-level flow readable, which matters because the flow is the thing you'll be explaining to someone else.

**On the recursion limit:** LangGraph has a default maximum step count that stops a runaway graph, and relying on it is not a bound — it's a backstop. Hitting it produces an error rather than the abstention the product actually wants, so the counter in state is what does the real work.

## 7. Interview Answer

> "[**Your shape.** The termination argument is what a good answer reaches.]
>
> "Mostly fixed edges with three conditional ones, and one cycle.
>
> The shape was: classify intent, which either exits early for out-of-scope questions or continues. Rewrite the query, retrieve, then assess relevance — and that's a conditional edge, because if the top scores are below the threshold it routes straight to abstain rather than generating from weak context.
>
> Then generate, then verify, and that's the interesting one. Verification has three outcomes, not two. Grounded goes forward to the policy check. Not grounded with retries remaining goes back to retrieve — that's the cycle. And not grounded with retries exhausted goes to abstain.
>
> That third branch is the one people forget, and it's what makes the graph terminate. The obvious way to write the condition is 'if not grounded, retry, else continue' — which has no bound, so a question the corpus genuinely can't answer loops forever, burning tokens and holding the request open.
>
> The bounded version needs a counter in state and an explicit exhausted branch. And what I'd point out is that the exhausted branch isn't just a safety valve — it's the correct product behaviour. The system saying it can't answer is what should happen when verification keeps failing.
>
> Then the policy check routes either to finalize or to human review, and human review rejoins at finalize.
>
> So there are four routes to END and every one is reachable. That's the property I'd want to be able to state: the graph provably terminates on every path.
>
> On where the logic lives — conditional edge functions are ordinary Python reading state and returning a node name. Two things I'd hold to. No model calls inside them: the decision should come from state a node already computed, so routing is deterministic and reproducible. A conditional function that calls a model is a node wearing an edge's clothes — it adds latency, it can fail, and the same state can route differently on different runs.
>
> And they're trivially testable — pass a state dict, assert on the returned node name. That covers the workflow's control flow in ordinary unit tests.
>
> [**On parallel, if you had it**] Retrieval fanned out to dense and lexical and joined afterwards, and the thing to get right there is the reducer on the field both branches write. Without it the join keeps one branch's results and drops the other's, silently. It's an edge decision that surfaces as a state bug.
>
> One last thing — LangGraph has a default recursion limit that stops a runaway graph, and I wouldn't treat that as the bound. Hitting it produces an error rather than the abstention the product wants, so the counter in state is what actually does the work."

## 8. Likely Follow-ups

**Q: How do you guarantee termination?**
Every cycle has a counter in state and an explicit exhausted branch. The retry condition has three outcomes — continue, retry, give up — and the third is what makes the path finite.

**Q: Isn't the recursion limit enough?**
No, it's a backstop. Hitting it raises an error rather than producing the abstention the product should return, so the outcome is wrong even though the runaway stopped.

**Q: Should conditional functions call a model?**
No. Routing should be deterministic and reproducible, so the decision should read state that a node already computed. A model call in an edge adds latency, introduces a failure point, and makes the same state route differently across runs.

**Q: How do you test control flow?**
Conditional functions are pure — pass a state dict, assert on the node name returned. That covers routing in ordinary unit tests without running the graph.

**Q: What goes wrong with parallel edges?**
The join. If both branches write the same field without a reducer, one branch's results are silently discarded — an edge-level decision that shows up as a state bug and passes sequential tests.

## 9. Common Mistakes

- Unbounded cycles.
- Retry conditions with only two outcomes.
- Model calls inside conditional edge functions.
- Relying on the recursion limit as the bound.
- Parallel fan-out with no reducer on the joined field.

## 10. What to Remember

- **Every cycle needs a counter and an exhausted branch.**
- **The exhausted branch is correct behaviour**, not just a safety valve.
- **Keep routing deterministic** — no model calls in edges.
- **Edge functions are unit-testable** — that's the control-flow coverage.
- **The recursion limit is a backstop**, not a bound.
