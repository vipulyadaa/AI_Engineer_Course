# Edges

> **Phase 16 · LANGGRAPH · Topic 04**

## 1. Definition

The connections determining what runs after a node. Normal edges always go to the same destination; conditional edges call a routing function over the state to choose among declared destinations.

## 2. Simple Explanation

Edges are the control flow. A normal edge says "after A, always B." A conditional edge says "after A, run this function on the state and go where it says."

The routing function can only return destinations you declared — which is what keeps the set of possible paths fixed.

## 3. How It Works

```python
g.add_edge("retrieve", "grade")              # always

def route(state: State) -> str:
    if state["top_score"] < THRESHOLD:
        return "rewrite" if state["attempts"] < 2 else "abstain"
    return "generate"

g.add_conditional_edges("grade", route, {
    "generate": "generate",
    "rewrite":  "rewrite",
    "abstain":  END,
})
```

**The mapping is the contract.** The routing function returns a key, and only keys in the mapping are valid destinations — an unmapped return is an error rather than an unexpected jump.

**Routing functions should be deterministic Python**, not LLM calls, wherever the decision can be made from state. A threshold comparison is testable; a model's judgment about whether to retry isn't.

## 4. Practical Example

**Routing on state rather than on a model call:**

```
MODEL-BASED ROUTING
  ask the LLM "should we retry or answer?"
  → costs a call, non-deterministic, untestable

STATE-BASED ROUTING
  if top_score < 0.55 and attempts < 2: rewrite
  → free, deterministic, unit-testable, auditable

Both are legitimate. But anything expressible as a rule over
state should be a rule over state — the model's judgment
should be reserved for decisions that genuinely need it.

In banking that matters twice over: the rule can be reviewed,
and it behaves identically every time.
```

**That's the design principle** — push decisions into deterministic routing functions wherever the state contains enough to decide.

**Parallel edges:**

```python
g.add_edge("start", "fetch_tier")
g.add_edge("start", "fetch_transaction")
g.add_edge("start", "fetch_waivers")
# all three run concurrently; the graph waits for all
# before continuing to a node that depends on them
```

**Fan-out is a real latency win** for independent lookups, and it's expressed as edges rather than as concurrency code.

**Testing routing:**

```python
def test_abstains_after_two_failed_attempts():
    assert route({"top_score": 0.2, "attempts": 2}) == "abstain"
```

A routing function is a pure function of state, so every branch is directly testable — which is how you get confidence that the graph's paths behave as declared.

## 5. Why It Matters

- **Edges are where control flow lives**, which is the graph's whole value.
- **State-based routing is deterministic, testable, and auditable**; model-based routing isn't.
- **Parallel edges give fan-out** without writing concurrency code.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Model calls in routing functions** | Cost, latency, non-determinism |
| **Unmapped return values** | Runtime error |
| **Routing logic too complex** | The graph stops being readable |
| **No default branch** | Unhandled state combinations |
| **Cycles without a counter** | Recursion limit instead of convergence |
| **Fan-in waiting on a failed branch** | Whole graph blocked |

**On cycles:** a `rewrite → retrieve` edge is a loop, and the only thing stopping it is a condition in the routing function. That condition must be based on a counter in state — `attempts < 2` — not on the model deciding it's done. Relying on the runtime's recursion limit means burning the full budget before terminating.

**On fan-in failures:** when three parallel branches converge, one failing branch can block the join. Each parallel node should handle its own failure and return a state update indicating it — so the downstream node sees "tier: unavailable" and can proceed or abstain, rather than the graph hanging.

## 7. Interview Answer

> "Edges determine what runs after a node. Normal edges always go to the same place; conditional edges call a routing function over the state and go where it returns. The mapping is the contract — the routing function returns a key, and only declared keys are valid destinations, so an unmapped return is an error rather than an unexpected jump.
>
> The design principle I'd hold to is that routing functions should be deterministic Python wherever the state contains enough to decide. Asking the LLM 'should we retry or answer?' costs a call, is non-deterministic, and isn't testable. A threshold comparison — top score below 0.55 and fewer than two attempts, so rewrite — is free, deterministic, unit-testable, and reviewable. In banking that matters twice over: the rule can be reviewed by someone who isn't reading the model's output, and it behaves identically every time.
>
> Model-based routing is legitimate where the decision genuinely needs judgment. It just shouldn't be the default for things expressible as a rule over state.
>
> The testing benefit is concrete: a routing function is a pure function of state, so every branch is directly testable. I can assert that with a low score and two attempts it returns abstain, which gives real confidence the declared paths behave as intended.
>
> Two things I'd get right. Cycles — a rewrite-back-to-retrieve edge is a loop, and the only thing stopping it is the routing condition. That has to be based on a counter in state, not on the model deciding it's done. Relying on the runtime's recursion limit means burning the whole budget before terminating.
>
> And fan-in. Parallel edges are a genuine latency win for independent lookups — three account lookups running concurrently, expressed as edges rather than concurrency code. But when they converge, one failing branch can block the join. Each parallel node should handle its own failure and return a state update saying so, like 'tier unavailable', so the downstream node can proceed or abstain rather than the graph hanging."

## 8. Likely Follow-ups

**Q: What's the difference between edge types?**
A normal edge always goes to the same node. A conditional edge calls a routing function over the state, which returns a key mapped to a declared destination. The mapping is what keeps the set of reachable paths fixed and enumerable.

**Q: Should routing functions call the model?**
Only when the decision genuinely needs judgment. Anything expressible as a rule over state — a threshold comparison, an attempt counter — should be deterministic Python: free, testable, reviewable, and identical every time. That matters especially in a regulated system.

**Q: How do you bound a cycle?**
With a counter in state that the routing function checks — attempts less than two, for example. The runtime's recursion limit is a backstop, not a design: relying on it means consuming the entire budget before terminating, with no useful output.

**Q: How do parallel edges work?**
Several edges from one node run their targets concurrently, and the graph waits for all before continuing to a node that depends on them. It's a genuine latency win for independent lookups and it's expressed declaratively rather than as concurrency code.

**Q: What happens if a parallel branch fails?**
It can block the join. Each parallel node should catch its own failures and return a state update indicating unavailability, so the downstream node sees the gap and can proceed or abstain. Otherwise one failing lookup hangs the whole graph.

## 9. Common Mistakes

- Using an LLM call for a decision expressible as a state rule.
- Routing functions returning keys not in the mapping.
- Cycles bounded only by the runtime recursion limit.
- No default branch for unexpected state combinations.
- Parallel branches that raise rather than returning a failure state.

## 10. What to Remember

- **Edges are where control flow lives** — the graph's whole value.
- **The mapping is the contract**; unmapped returns are errors.
- **Prefer deterministic state-based routing** — testable and auditable.
- **Bound cycles with a counter in state**, not the recursion limit.
- **Parallel branches must return failure state**, not raise.
