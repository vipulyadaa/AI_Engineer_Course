# Loops

> **Phase 16 · LANGGRAPH · Topic 07**

## 1. Definition

Cycles in the graph — an edge returning to an earlier node — used for retry, refinement, and iterative retrieval. Termination is the routing function's responsibility, not the runtime's.

## 2. Simple Explanation

A loop is just an edge pointing backwards. `rewrite → retrieve` means retrieval runs again with a new query.

The only thing stopping it is a condition in the routing function. If that condition depends on the model deciding it's done, the loop may not terminate cheaply — so it should depend on a counter.

## 3. How It Works

```python
g.add_edge("rewrite", "retrieve")          # the cycle

def after_grading(state) -> str:
    if state["top_score"] >= FLOOR:
        return "generate"
    if state["attempts"] < MAX_ATTEMPTS:    # ← the bound
        return "rewrite"
    return "abstain"
```

**Three termination conditions, all needed:**

```
SUCCESS    the loop achieved its goal        → proceed
BUDGET     attempts, tokens, or wall clock   → degrade gracefully
EXHAUSTION the iteration added nothing new   → stop early
```

**LangGraph's `recursion_limit` is a backstop, not a design.** Hitting it means the graph ran to its maximum and raised — you paid for every iteration and got an exception.

## 4. Practical Example

**Exhaustion detection is the one people skip:**

```python
def after_retrieve(state) -> str:
    new_ids = {d.id for d in state["documents"]}
    if new_ids <= state["seen_doc_ids"]:        # nothing new
        return "abstain"
    ...
```

```
A rewrite loop that keeps retrieving the same documents will
run to the attempt limit without improving anything.

Detecting that the iteration returned nothing new stops it
one round earlier, every time, and it's a set comparison.

Same principle as loop detection in agents: the mechanical
signal beats waiting for the budget.
```

**Degrading rather than failing at the bound:**

```
AT THE LIMIT
  bad    raise / return nothing → paid for everything,
         delivered nothing
  good   route to an abstain node that returns "I couldn't
         find this in our documentation, let me connect you
         with someone" — with the partial findings logged

The abstain path is a declared node, so the graph always
terminates somewhere meaningful.
```

**Common loop shapes:**

```
RETRIEVE → GRADE → REWRITE → RETRIEVE     query refinement
GENERATE → VERIFY → REGENERATE → VERIFY   grounding correction
PLAN → EXECUTE → REPLAN → EXECUTE         plan revision
TOOL → OBSERVE → TOOL                     the agent loop itself
```

**Each needs its own counter.** A single shared attempt counter across different loop types conflates them — two retrieval rewrites plus two regenerations would hit a shared limit of four when neither loop individually misbehaved.

## 5. Why It Matters

- **Termination is the routing function's job**, and the recursion limit is only a backstop.
- **Exhaustion detection** saves an iteration reliably, and it's a set comparison.
- **Degrading to an abstain node** means the spend always produces something.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No counter in state** | Relies on the recursion limit |
| **Shared counter across loop types** | Conflates unrelated loops |
| **Model deciding termination** | Unreliable; tends to continue |
| **Raising at the limit** | Paid for everything, delivered nothing |
| **No exhaustion check** | Runs to the cap without improving |
| **State growing each iteration** | Cost per iteration rises |

**On state growth:** each loop iteration typically adds documents, messages, or reasoning to state, and state is checkpointed every node. So iteration five costs more than iteration one in both tokens and checkpoint size. Trimming accumulated content each round — reranking documents against the original question and keeping the best few — keeps the cost flat rather than rising.

**On the model deciding termination:** asking "do you have enough now?" tends toward yes, which terminates loops early rather than late. That's the opposite failure from an agent loop, and it means a model-based sufficiency check should be a secondary signal alongside a mechanical one, not the primary bound.

## 7. Interview Answer

> "A loop is an edge pointing back to an earlier node — rewrite back to retrieve, for query refinement. The graph doesn't stop it; the routing function does.
>
> So termination belongs in the routing condition, based on a counter in state. LangGraph's recursion_limit exists as a backstop, but hitting it means you ran to the maximum and raised an exception — you paid for every iteration and delivered nothing.
>
> I'd have three termination conditions. Success, where the loop achieved its goal. Budget, on attempts or tokens or wall clock. And exhaustion, where the iteration added nothing new.
>
> Exhaustion is the one people skip and it's the cheapest. If a rewrite loop keeps retrieving the same documents, comparing the returned document IDs against what's already been seen detects that immediately — a set comparison. That stops the loop a round earlier, every time, rather than running to the attempt limit without improving anything.
>
> At the bound, I'd degrade rather than fail. Route to a declared abstain node that returns something useful — 'I couldn't find this in our documentation, let me connect you with someone' — with the partial findings logged. That way the graph always terminates somewhere meaningful and the spend produces an outcome.
>
> Two things I'd get right. Each loop type needs its own counter. A single shared attempts field across retrieval rewrites and generation retries conflates them — two rewrites plus two regenerations would hit a shared limit of four when neither loop individually misbehaved.
>
> And state growth. Each iteration adds documents or messages, and state is checkpointed at every node, so iteration five costs more than iteration one in both tokens and checkpoint size. I'd trim accumulated content each round — rerank documents against the original question and keep the best few — so the cost stays flat rather than rising.
>
> One asymmetry worth knowing: asking the model 'do you have enough now?' tends toward yes, so it terminates loops early rather than late. That's the opposite failure from an agent loop, and it means a model sufficiency check should be secondary to a mechanical one."

## 8. Likely Follow-ups

**Q: What stops a loop in LangGraph?**
The routing function, based on a counter in state. The runtime's recursion limit is a backstop that raises after consuming the full budget, which isn't a design — termination has to be an explicit condition you control.

**Q: What are the termination conditions?**
Success, budget, and exhaustion. Success when the loop achieved its goal, budget on attempts or tokens or wall clock, and exhaustion when an iteration returned nothing new. The third is the cheapest and most often missing.

**Q: How do you detect exhaustion?**
Compare what the iteration produced against what's already been seen — a set comparison on document IDs, for instance. If the rewrite retrieved nothing new, further rewrites won't help, so it stops a round earlier than the attempt limit would.

**Q: What should happen at the limit?**
Route to a declared abstain node that returns something useful, with partial findings logged. Raising means paying for every iteration and delivering nothing, which is the worst outcome available at that point.

**Q: Should each loop have its own counter?**
Yes. A shared attempts field across retrieval rewrites and generation retries conflates unrelated loops, so two of each would hit a limit of four when neither individually misbehaved. Separate counters keep each bound meaningful.

## 9. Common Mistakes

- Relying on the recursion limit rather than an explicit counter.
- Sharing one counter across different loop types.
- Letting the model decide when to stop looping.
- Raising at the bound instead of routing to abstention.
- Letting state accumulate so each iteration costs more.

## 10. What to Remember

- **A loop is a backward edge**; the routing function terminates it.
- **Three conditions:** success, budget, exhaustion.
- **Exhaustion detection is a set comparison** and saves a round every time.
- **Degrade to a declared abstain node**, never raise.
- **Separate counters per loop; trim state each iteration.**
