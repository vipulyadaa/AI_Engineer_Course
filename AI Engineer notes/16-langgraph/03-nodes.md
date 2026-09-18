# Nodes

> **Phase 16 · LANGGRAPH · Topic 03**

## 1. Definition

Functions that take the current state and return a partial update to it. A node is the unit of work in the graph, and the returned dict is merged into state rather than replacing it.

## 2. Simple Explanation

A node is an ordinary Python function. State in, a dict of changed fields out.

It doesn't mutate state directly and doesn't decide what runs next — those are deliberately someone else's job, which is what keeps nodes simple and testable.

## 3. How It Works

```python
def retrieve_node(state: State) -> dict:
    docs = retriever.invoke(
        state["query"],
        filter={"tenant_id": state["tenant_id"],
                "acl_groups": state["user_groups"]},
    )
    return {
        "documents": docs,
        "top_score": docs[0].score if docs else 0.0,
        "attempts": state["attempts"] + 1,
    }
```

**Three rules that make nodes work:**

```
1. RETURN updates, don't mutate state
2. Return only the fields you changed
3. Don't decide routing — that's the edge's job
```

**Rule 3 is the one people break.** A node that returns `{"next": "generate"}` and an edge that reads it has moved routing into the node, which defeats the point of declaring control flow in the graph.

## 4. Practical Example

**Node design that keeps the graph clean:**

```
ONE RESPONSIBILITY   retrieve, or grade, or generate — not
                     retrieve-and-grade
PURE WHERE POSSIBLE  same state in, same update out, so tests
                     are trivial
SIDE EFFECTS NAMED   a node that writes to a database or calls
                     an external service should be obvious
                     from its name
IDEMPOTENT           a node may re-run after a resume from a
                     checkpoint — it must tolerate that
```

**Idempotency is the one that bites:**

```
If a node sends an email or writes a record, and the graph
resumes from a checkpoint taken BEFORE that node, it runs
again.

  · a duplicate email
  · a duplicate database write
  · a duplicate payment, in the worst case

Side-effecting nodes need idempotency keys — derived from
the run ID and node name — so a re-run is detected and
skipped rather than repeated.

This is exactly the kind of thing that works in testing and
fails the first time a resume happens in production.
```

**Testing a node:**

```python
def test_retrieve_applies_acl_filter():
    state = {"query": "wire fee", "tenant_id": "uk",
             "user_groups": ["staff"], "attempts": 0}
    out = retrieve_node(state)
    assert out["attempts"] == 1
    assert all(d.metadata["tenant_id"] == "uk"
               for d in out["documents"])
```

**No graph, no framework** — just a function call. That's the practical benefit of the node contract.

## 5. Why It Matters

- **Nodes as pure-ish functions** make the system unit-testable without the graph.
- **Routing belongs in edges**, and putting it in nodes defeats the graph's purpose.
- **Idempotency matters** because resumption re-runs nodes.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Routing decided in the node** | Control flow no longer declared in the graph |
| **Non-idempotent side effects** | Duplicated on resume |
| **Returning the whole state** | Overwrites fields other nodes set |
| **Nodes doing several things** | Harder to test, reuse, and reason about |
| **Hidden dependencies on state fields** | Breaks when upstream nodes change |
| **Unbounded execution in a node** | No per-node timeout by default |

**On returning the whole state:** a node that returns the entire state object rather than a partial update will overwrite fields that concurrent or subsequent logic set. Returning only changed keys is both clearer and safer, and it's the contract the merge behaviour assumes.

**On timeouts:** a node calling an external service can hang, and the graph won't interrupt it by default. Timeouts belong inside the node, sized from the overall latency budget rather than chosen per call.

## 7. Interview Answer

> "A node is a plain function taking the current state and returning a partial update, which gets merged into state. It doesn't mutate state directly and doesn't decide what runs next.
>
> Three rules make them work. Return updates rather than mutating. Return only the fields you changed, not the whole state — returning everything overwrites what other logic set. And don't decide routing, because that's the edge's job.
>
> That third one is the one people break. A node returning a 'next' field that an edge then reads has moved control flow back into the node, which defeats the point of declaring it in the graph. The routing function can read state to decide — it just shouldn't be the node asserting the destination.
>
> The practical benefit of this contract is testing. A node is an ordinary function call, so I can pass a state dict and assert on the returned update — no graph, no framework, no mocking an execution loop. That's a real advantage over testing agent behaviour end to end.
>
> The failure mode I'd design around is idempotency. A node may re-run after resuming from a checkpoint taken before it completed. If it sends an email or writes a record, that happens twice — a duplicate email, a duplicate database write, a duplicate payment in the worst case. So side-effecting nodes need idempotency keys derived from the run ID and node name, so a re-run is detected and skipped. That's exactly the kind of thing that works in testing and fails the first time a resume happens in production.
>
> Beyond that I'd keep each node to one responsibility, make side effects obvious from the name, and put timeouts inside nodes that call external services — the graph won't interrupt a hanging node by default, and the timeout should be sized from the overall latency budget rather than chosen per call."

## 8. Likely Follow-ups

**Q: What's the node contract?**
Take state, return a dict of only the fields you changed. Don't mutate state directly, and don't decide routing. That contract is what makes nodes independently testable and keeps control flow declared in the graph rather than scattered across functions.

**Q: Why shouldn't nodes decide routing?**
Because then control flow is no longer declared in the graph, which is the graph's main benefit. A node returning a "next" field read by an edge has just moved the decision back into imperative code and made the graph a misleading representation of what happens.

**Q: What's the idempotency concern?**
A node can re-run after resuming from a checkpoint taken before it completed. Anything with a side effect — an email, a database write, a payment — would happen twice. Side-effecting nodes need idempotency keys from the run ID and node name so re-runs are detected and skipped.

**Q: How do you test a node?**
Call it with a state dict and assert on the returned update. No graph, no framework, no execution loop to mock — it's an ordinary function. That's the practical payoff of the contract and a real advantage over end-to-end-only agent testing.

**Q: Why return partial updates rather than full state?**
Because the return value is merged, so returning the whole state overwrites fields set elsewhere. Returning only changed keys is what the merge behaviour assumes, and it also makes each node's effect obvious from reading its return statement.

## 9. Common Mistakes

- Returning a routing decision from a node.
- Returning the entire state object instead of changed fields.
- Side-effecting nodes without idempotency keys.
- Nodes that do several things at once.
- No timeout inside nodes that call external services.

## 10. What to Remember

- **State in, partial update out** — don't mutate, don't route.
- **Routing belongs in edges**, or the graph stops being the source of truth.
- **Side-effecting nodes need idempotency keys** — resume re-runs them.
- **Nodes are ordinary functions** — test them directly.
- **Put timeouts inside nodes**, sized from the overall budget.
