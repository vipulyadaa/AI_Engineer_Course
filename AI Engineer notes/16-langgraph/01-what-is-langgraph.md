# What Is LangGraph?

> **Phase 16 · LANGGRAPH · Topic 01**

## 1. Definition

A library for building stateful, multi-step LLM applications as explicit graphs — nodes that transform a shared state object, edges that determine what runs next, with built-in persistence, resumption, and interrupt points.

## 2. Simple Explanation

LangChain's LCEL composes a pipeline: one thing after another. LangGraph composes a graph: nodes can branch, loop, and run conditionally, and the whole thing carries a state object that every node reads and updates.

The features that justify it aren't the graph structure — it's persistence and resumption, which are genuinely hard to build.

## 3. How It Works

```python
from langgraph.graph import StateGraph, END

class State(TypedDict):
    question: str
    documents: list
    answer: str | None
    attempts: int

g = StateGraph(State)
g.add_node("retrieve", retrieve_node)
g.add_node("grade",    grade_node)
g.add_node("generate", generate_node)
g.add_node("rewrite",  rewrite_node)

g.set_entry_point("retrieve")
g.add_edge("retrieve", "grade")
g.add_conditional_edges("grade", decide, {
    "generate": "generate",
    "rewrite":  "rewrite",
    "abstain":  END,
})
g.add_edge("rewrite", "retrieve")        # ← a loop
g.add_edge("generate", END)

app = g.compile(checkpointer=checkpointer)
```

**Nodes are plain functions** taking state and returning updates. That's the property that makes the whole thing testable — each node is an ordinary function with an ordinary signature.

## 4. Practical Example

**What actually justifies using it:**

```
1. PERSISTENCE AND RESUMPTION
   A checkpointer saves state after each node. Execution can
   be interrupted, persisted, and resumed later — across a
   process restart or a human approval that takes hours.

   Writing that yourself is genuinely non-trivial.

2. INTERRUPTS FOR HUMAN-IN-THE-LOOP
   Pause before a node, surface state for approval, resume
   with the decision. First-class rather than bolted on.

3. EXPLICIT STATE
   One typed object every node reads and updates — which is
   exactly what agents need and what a bare loop lacks.

4. LOOPS WITH BOUNDS
   Retry-and-rewrite cycles expressed as edges, with a
   recursion limit enforced by the runtime.
```

**Points 1 and 2 are the real argument.** The graph structure is nice; the persistence is what you wouldn't want to write.

**Where it's overkill:**

```
A linear retrieve → generate → return pipeline is a graph
with two edges. LCEL or plain Python expresses that more
simply.

LangGraph earns its place when there's branching, looping,
or a need to suspend and resume — not for structure alone.
```

## 5. Why It Matters

- **Persistence and resumption** are the features worth adopting a framework for.
- **Nodes as plain functions** keeps the whole thing unit-testable.
- **Explicit typed state** is what agents need and bare loops lack.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Overkill for linear flows** | A pipeline doesn't need a graph |
| **State schema rigidity** | Changes break in-flight checkpoints |
| **Debugging graph execution** | Requires tracing to follow the path |
| **Checkpoint storage** | Contains customer data; needs retention rules |
| **Recursion limits** | Hit silently if loops don't converge |
| **API churn** | Still evolving |

**On checkpoint storage:** checkpoints hold the full state object, which in a banking system includes customer data and conversation content. That store needs the same access control, retention policy, and deletion path as any other customer data store. It's easy to treat as internal infrastructure and miss.

**On state schema changes:** a checkpoint written under one state schema can't necessarily be resumed after the schema changes. For long-running graphs spanning a deploy, the schema needs versioning and a migration path — otherwise in-flight sessions break on release.

## 7. Interview Answer

> "LangGraph builds stateful multi-step LLM applications as explicit graphs. Nodes are functions that take a shared state object and return updates; edges determine what runs next, including conditional edges and loops. Where LCEL composes a linear pipeline, LangGraph handles branching, cycles, and conditional execution.
>
> But the graph structure isn't what justifies it. The features worth adopting a framework for are persistence and interrupts. A checkpointer saves state after every node, so execution can be suspended, persisted, and resumed later — across a process restart, or across a human approval that takes hours. Writing that yourself is genuinely non-trivial, and it's the one thing in the agent stack I wouldn't want to build.
>
> Interrupts follow from that. You can pause before a node, surface the state for human approval, and resume with the decision recorded — first-class rather than bolted on. For a banking system where irreversible actions need approval, that's directly what the requirement asks for.
>
> The other thing I like is that nodes are plain functions with ordinary signatures, taking state and returning updates. That means each one is unit-testable without the graph, which is a real advantage over testing behaviour inside a framework's loop.
>
> Where it's overkill is a linear retrieve-generate-return pipeline — that's a graph with two edges, and LCEL or plain Python expresses it more simply. LangGraph earns its place when there's branching, looping, or suspension, not for structure alone.
>
> Two things I'd plan for. Checkpoints hold the full state object, which in banking includes customer data and conversation content — so that store needs the same access control, retention policy, and deletion path as any other customer data store, and it's easy to treat as internal infrastructure and miss.
>
> And state schema changes break in-flight checkpoints. For long-running graphs spanning a deploy, the schema needs versioning and a migration path, or in-flight sessions fail on release."

## 8. Likely Follow-ups

**Q: How does LangGraph differ from LCEL?**
LCEL composes a linear pipeline; LangGraph composes a graph with branching, loops, and conditional edges, plus a shared typed state object every node reads and updates. The substantive additions are persistence and interrupts rather than the structure itself.

**Q: What actually justifies using it?**
Persistence and resumption. A checkpointer saves state after each node so execution can suspend and resume across a restart or a multi-hour human approval. That's genuinely hard to build correctly, unlike the agent loop itself, which is about twenty lines.

**Q: When is it overkill?**
For a linear pipeline — retrieve, generate, return. That's a graph with two edges and plain Python or LCEL expresses it more clearly. LangGraph is worth it when there's real branching, looping, or a need to suspend execution.

**Q: What's testable about it?**
Nodes are plain functions taking state and returning updates, so each can be unit-tested independently of the graph. That's a real advantage over testing behaviour embedded in a framework's execution loop, where you can only test end to end.

**Q: What should you plan for operationally?**
Checkpoint storage holds full state including customer data, so it needs access control, retention, and a deletion path like any other customer data store. And state schema changes break in-flight checkpoints, so long-running graphs need schema versioning and a migration path across deploys.

## 9. Common Mistakes

- Adopting it for linear pipelines that don't need a graph.
- Treating the graph structure as the main benefit rather than persistence.
- Excluding checkpoint storage from data retention policies.
- Changing the state schema without a migration path.
- Testing only end to end when nodes are individually testable.

## 10. What to Remember

- **Nodes transform shared state; edges decide what runs next.**
- **Persistence and interrupts are the real justification**, not the graph.
- **Nodes are plain functions** — individually unit-testable.
- **Overkill for linear pipelines.**
- **Checkpoints are customer data**, and schema changes break in-flight runs.
