# Multi-Agent Workflows

> **Phase 16 · LANGGRAPH · Topic 12**

## 1. Definition

Composing several agents as nodes or sub-graphs within one graph, with a shared or partitioned state and explicit edges governing who runs when.

> Multi-agent design generally is in [17-ai-agents/16-multi-agent-systems.md](../17-ai-agents/16-multi-agent-systems.md). This is the LangGraph implementation.

## 2. Simple Explanation

Each agent becomes a node — or a sub-graph compiled and used as a node. Routing between them is an edge, not a model deciding to hand off.

That's the meaningful difference from a general multi-agent framework: the handoffs are declared, so the set of possible agent sequences is fixed and reviewable.

## 3. How It Works

```python
accounts  = build_accounts_graph().compile()     # sub-graphs
payments  = build_payments_graph().compile()

g.add_node("accounts", accounts)
g.add_node("payments", payments)
g.add_node("supervisor", supervisor_node)

g.add_conditional_edges("supervisor", route_to_specialist, {
    "accounts": "accounts",
    "payments": "payments",
    "answer":   "synthesize",
})
g.add_edge("accounts", "supervisor")             # back to route again
```

**Sub-graphs as nodes** is the composition mechanism. Each sub-graph has its own internal state schema, with mapping in and out — which is what keeps a specialist's internals from leaking into the top-level state.

## 4. Practical Example

**Where LangGraph improves on a general multi-agent loop:**

```
DECLARED HANDOFFS
  the supervisor routes via a conditional edge, so the set
  of possible agent sequences is enumerable

SHARED STATE
  the context-loss problem of handoffs is reduced — agents
  read from a common state rather than receiving a summary

PERSISTENCE ACROSS AGENTS
  the whole multi-agent run checkpoints, so a human approval
  inside the payments agent suspends the entire workflow
  cleanly

BOUNDED GLOBALLY
  one recursion limit and one budget across all agents,
  rather than per-agent limits that multiply
```

**The shared-state point is the strongest.** In a general multi-agent system, each handoff is a lossy summary and information that existed somewhere never reaches the agent that needs it. With a shared state object, the specialist reads what's already established rather than being told about it.

**Permission separation is still the main justification:**

```
accounts sub-graph   read-only account tools
payments sub-graph   transactional tools + interrupt before
                     any execution

Separating by privilege means a compromised or confused
accounts agent structurally cannot move money. That's a
containment boundary, and it's the reason to split — not
tidiness.
```

**State partitioning caution:** a single flat state shared by every agent means each can read everything, including facts fetched for another specialist's purpose. Where sensitivity differs, sub-graph state mapping should pass only what's needed — shared state reduces context loss but shouldn't become an unrestricted read of all customer data by every node.

## 5. Why It Matters

- **Declared handoffs** make agent sequences enumerable and reviewable.
- **Shared state reduces the handoff context-loss problem** that plagues multi-agent systems.
- **Permission separation remains the real justification** for splitting at all.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Splitting without a constraint** | Complexity for no capability |
| **Flat shared state** | Every agent reads everything |
| **Supervisor loops** | Routing back and forth without progress |
| **Nested recursion limits** | Sub-graph loops inside supervisor loops |
| **Debugging across sub-graphs** | Traces span several graphs |
| **Sub-graph state mapping errors** | Fields silently not passed through |

**On supervisor loops:** a supervisor that routes to a specialist, gets a result, and routes to the same specialist again can cycle. The routing function needs to track which specialists have run and what they returned — in state — and terminate when no specialist can add anything. That's the same convergence problem as any loop, and it's easy to overlook because it looks like delegation rather than iteration.

**On global budgets:** a supervisor with a recursion limit of ten, calling sub-graphs with limits of ten each, is a hundred node executions worst case. The budget has to be tracked in shared state and decremented across sub-graphs, not enforced per graph.

## 7. Interview Answer

> "In LangGraph a multi-agent workflow is agents as nodes, or sub-graphs compiled and used as nodes, with routing between them as conditional edges rather than a model deciding to hand off.
>
> That difference matters: the handoffs are declared, so the set of possible agent sequences is enumerable and reviewable. A supervisor chooses among specialists you approved rather than inventing a delegation.
>
> The strongest technical advantage is shared state. In a general multi-agent system every handoff is a lossy summary — the supervisor knows things it doesn't pass on, and information that existed somewhere never reaches the agent that needed it. With a shared state object, the specialist reads what's already established rather than being told about it, which removes most of that failure.
>
> The justification for splitting at all is still permission separation. An accounts sub-graph with read-only tools and a payments sub-graph with transactional tools and an interrupt before any execution means a compromised or confused accounts agent structurally cannot move money. That's a containment boundary, and it's the reason to split — not tidiness.
>
> One caution on shared state: a single flat state that every agent reads means each can see facts fetched for another specialist's purpose. Where sensitivity differs, sub-graph state mapping should pass only what's needed. Shared state reduces context loss, but it shouldn't become unrestricted access to all customer data by every node.
>
> Two things I'd get right. Supervisor loops — a supervisor that routes to a specialist, gets a result, and routes to the same one again can cycle. The routing function needs to track which specialists have run and what they returned, in state, and terminate when none can add anything. It's easy to overlook because it looks like delegation rather than iteration.
>
> And global budgets. A supervisor with a recursion limit of ten calling sub-graphs with limits of ten each is a hundred node executions worst case. The budget has to live in shared state and decrement across sub-graphs rather than being enforced per graph."

## 8. Likely Follow-ups

**Q: How do you compose agents in LangGraph?**
As sub-graphs compiled and used as nodes, with conditional edges routing between them. Each sub-graph has its own state schema with mapping in and out, so a specialist's internals don't leak into the top-level state.

**Q: What does LangGraph improve over a general multi-agent system?**
Declared handoffs, so agent sequences are enumerable. Shared state, which removes most of the lossy-summary problem at handoffs. Persistence across the whole workflow, so an approval inside one specialist suspends everything cleanly. And a single global budget rather than per-agent limits that multiply.

**Q: Why split into multiple agents at all?**
Permission separation, primarily. A read-only accounts agent and a transactional payments agent with approval interrupts means a confused or compromised read agent structurally cannot move money. That's a containment boundary; tidiness isn't a reason.

**Q: Is shared state entirely good?**
It reduces context loss but shouldn't become unrestricted access. A flat shared state lets every agent read facts fetched for another purpose, so where sensitivity differs, sub-graph state mapping should pass only what's needed rather than exposing everything.

**Q: How do you stop a supervisor cycling?**
Track in state which specialists have run and what they returned, and terminate when none can contribute further. It's the same convergence problem as any loop, but it's easy to miss because routing to a specialist looks like delegation rather than iteration.

## 9. Common Mistakes

- Splitting agents without a permission or tool-count constraint.
- A flat shared state exposing all data to every agent.
- Per-graph budgets that multiply instead of a global one.
- Supervisors that can route to the same specialist repeatedly.
- Sub-graph state mapping that silently drops fields.

## 10. What to Remember

- **Sub-graphs as nodes; routing as conditional edges** — handoffs are declared.
- **Shared state removes most handoff context loss.**
- **Permission separation is the real justification** for splitting.
- **Map sub-graph state deliberately** — don't expose everything to everyone.
- **One global budget in shared state**, not per-graph limits.
