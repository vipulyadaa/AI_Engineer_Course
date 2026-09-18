# Why Use a Graph?

> **Phase 16 · LANGGRAPH · Topic 02**

## 1. Definition

A graph representation makes control flow explicit and inspectable — every possible path is declared as nodes and edges rather than implied by a model's decisions or buried in nested conditionals.

## 2. Simple Explanation

An agent loop hides the control flow inside the model's choices. A pile of if-statements hides it inside code that has to be read carefully.

A graph puts it on the surface: here are the states, here are the transitions. You can draw it, review it, and enumerate what can happen.

## 3. How It Works

```
        retrieve
           │
         grade
       ┌───┼────────┐
  generate rewrite  abstain
       │     │        │
      END    └─▶retrieve  END
```

**What the graph gives you that a loop doesn't:**

```
ENUMERABLE PATHS   every route is declared, so you can list
                   what the system can do
REVIEWABLE         a diagram a compliance reviewer can read
BOUNDED            cycles are explicit and recursion-limited
TESTABLE           each node independently; each path
                   deliberately
RESUMABLE          state at a node boundary is a checkpoint
```

## 4. Placement Between the Alternatives

```
FIXED PIPELINE   fully deterministic, no branching
                 → simplest; use where it fits

GRAPH            branching and loops DECLARED in code;
                 the model chooses among declared options
                 → deterministic structure, model-driven
                   routing within it

AGENT LOOP       the model chooses freely from a tool set;
                 paths are not enumerable
                 → maximum flexibility, minimum predictability

The graph is the middle position, and in banking it's often
exactly the right one: the model influences which declared
path is taken, but it cannot invent a path.
```

**That framing is the strongest argument** — a graph constrains the model's influence to a set of transitions you approved, which is precisely what an auditable system needs.

## 5. Why It Matters

- **The graph is the middle position** between a fixed pipeline and a free agent loop.
- **The model chooses among declared paths**, it can't invent one — the auditability argument.
- **A drawable diagram** is reviewable by people who don't read the code.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Structure overhead for linear flows** | A pipeline gains nothing |
| **Graph sprawl** | Twenty nodes is harder to follow than code |
| **Implicit coupling through state** | Nodes depending on fields set elsewhere |
| **Unbounded cycles** | Recursion limit hit rather than converging |
| **Diagram drifting from code** | A reviewed diagram that's now wrong |

**On graph sprawl:** the readability benefit inverts past a certain size. A graph of five or six nodes is clearer than the equivalent code; a graph of twenty with many conditional edges is harder to follow than a well-organized function. Sub-graphs — composing smaller graphs as nodes — are the mechanism for keeping each level comprehensible.

**On implicit coupling:** because all nodes share one state object, a node can silently depend on a field another node happened to set. That's the graph equivalent of global mutable state, and it undermines the independent-testability benefit. Being explicit about which fields each node reads and writes — even just in docstrings — keeps that manageable.

## 7. Interview Answer

> "A graph makes control flow explicit. Every possible path is declared as nodes and edges rather than implied by a model's decisions or buried in nested conditionals — so you can draw it, review it, and enumerate what the system can actually do.
>
> The way I'd position it is as the middle option between three. A fixed pipeline is fully deterministic with no branching — simplest, and right where it fits. A free agent loop lets the model choose from a tool set with paths that aren't enumerable — maximum flexibility, minimum predictability. A graph sits between: branching and loops are declared in code, and the model chooses among the declared options.
>
> That middle position is often exactly right for banking. The model influences which declared path is taken, but it cannot invent a path. So the set of things the system can do is fixed and reviewable, while the routing within it can still be intelligent. That's the auditability argument, and it's the strongest reason to prefer a graph over a free loop in a regulated context.
>
> Practically it also gives enumerable paths you can test deliberately, node-level unit testing since each node is a plain function, explicit bounded cycles, and state at node boundaries that serves as a natural checkpoint.
>
> Two things I'd watch. Graph sprawl — the readability benefit inverts past a certain size. Five or six nodes is clearer than the equivalent code; twenty nodes with many conditional edges is harder to follow than a well-organized function. Sub-graphs are the mechanism for keeping each level comprehensible.
>
> And implicit coupling through shared state. Because all nodes share one object, a node can silently depend on a field another node happened to set — that's the graph equivalent of global mutable state and it undermines the independent-testability benefit. I'd be explicit about which fields each node reads and writes, even just in docstrings.
>
> One governance point: if a diagram is what compliance reviewed, it has to stay in sync with the code. A reviewed diagram that no longer matches is worse than no diagram, because it creates false assurance."

## 8. Likely Follow-ups

**Q: What does a graph give you over an agent loop?**
Enumerable paths. The model chooses among transitions you declared rather than inventing a route, so the set of things the system can do is fixed and reviewable. That's the auditability argument, and it matters more than the structural clarity.

**Q: Where does a graph sit relative to a pipeline?**
Between a fixed pipeline and a free agent loop. A pipeline has no branching; an agent loop has unenumerable paths; a graph has declared branching with model-influenced routing inside it. That middle position is often the right one in regulated settings.

**Q: When does the graph become harder to read than code?**
Past roughly a dozen nodes with many conditional edges. The clarity benefit inverts — a well-organized function becomes easier to follow. Sub-graphs, composing smaller graphs as nodes, keep each level comprehensible and preserve the benefit.

**Q: What's the risk of shared state?**
Implicit coupling. Any node can depend on a field another node happened to set, which is effectively global mutable state and undermines the independent testability that made nodes attractive. Documenting which fields each node reads and writes keeps it manageable.

**Q: Does the diagram matter for governance?**
Yes, and it has to stay in sync with the code. If a diagram is what compliance reviewed, one that no longer matches the implementation is worse than none — it creates assurance that isn't backed by anything. Generating it from the graph definition rather than maintaining it by hand is the safer approach.

## 9. Common Mistakes

- Using a graph for a linear pipeline.
- Letting the graph grow past readable size without sub-graphs.
- Nodes silently depending on fields other nodes set.
- Cycles without an explicit convergence condition.
- Maintaining a reviewed diagram separately from the code.

## 10. What to Remember

- **Explicit, enumerable paths** — the model routes, it doesn't invent.
- **The middle position** between fixed pipeline and free agent loop.
- **Readability inverts past ~12 nodes** — use sub-graphs.
- **Shared state creates implicit coupling** — document reads and writes.
- **Keep the diagram in sync** if it's what compliance reviewed.
