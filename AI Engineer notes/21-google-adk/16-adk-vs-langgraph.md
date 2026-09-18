# ADK vs LangGraph

> **Phase 21 · GOOGLE ADK · Topic 16**

## 1. Definition

A comparison between Google's agent framework and LangGraph: they optimize for different things — ADK for deployment and platform integration, LangGraph for explicit state, persistence, and interrupts.

## 2. Simple Explanation

Both give you agents, tools, and state. Neither gives you budgets, abstention, retrieval quality, or grounding verification.

The difference is what they do well beyond that: ADK's answer is deployment and platform integration; LangGraph's is durable resumable execution with human interrupts.

## 3. How It Works

| | ADK | LangGraph |
|---|---|---|
| Control flow | Workflow agents + LLM agents | Explicit graph, nodes and edges |
| State | Session state with scopes | Typed state with reducers |
| Persistence | Session service | Checkpointer with full history |
| Resume mid-execution | Limited | First-class, from any checkpoint |
| Human interrupt | Via callbacks and design | First-class `interrupt_before` |
| Deployment | Agent Engine, managed | Your own infrastructure |
| Platform integration | Native GCP | Neutral |
| Maturity | Newer | More established |

## 4. Practical Example

**The requirement that decides it:**

```
"An agent proposing a refund must have it approved by a
 human, and approval may take until the next business day.
 Execution must resume exactly where it stopped."

→ LangGraph. interrupt_before plus a checkpointer is
  purpose-built for this, with full checkpoint history and
  resume from any point.

"The agent must deploy under project IAM, inside the VPC
 perimeter, with managed session storage and scaling, and
 appear in Cloud Audit Logs alongside everything else."

→ ADK. Agent Engine provides all of it; with LangGraph you
  build the deployment, session storage, and scaling
  yourself on Cloud Run or GKE.

Neither is better. They answer different questions, and
the requirement decides.
```

**That framing is the honest answer** — a comparison that declares a winner without naming the requirement is not a real comparison.

**Where LangGraph is genuinely stronger:**

```
· checkpoint history — inspect state after every node
· time travel — resume from an earlier checkpoint, branch
· explicit typed state with reducers, including for
  parallel writes
· graph structure you can draw and a reviewer can read
· interrupts as a designed mechanism rather than a pattern
```

**Where ADK is genuinely stronger:**

```
· Agent Engine deployment — hosting, scaling, sessions
· native IAM, audit logging, and VPC-SC integration
· callbacks as a designed control point for authorization
  and audit across every tool
· Vertex AI evaluation integration
· one vendor, one support relationship
```

**The callback point deserves emphasis** for banking: having a single framework-level hook where every tool call is authorized and audited is a meaningful reviewability advantage.

## 5. Why It Matters

- **They answer different questions** — deployment versus durable resumable execution.
- **The requirement decides**, and a comparison without one isn't real.
- **ADK's callbacks and LangGraph's checkpoints** are the respective standout features.

## 6. Trade-offs / Failure Modes

| Risk | Detail |
|---|---|
| **Choosing on vendor alignment** | The requirement should decide |
| **ADK where multi-hour resumption is central** | Persistence story is less developed |
| **LangGraph where GCP integration is central** | Deployment is yours to build |
| **Expecting either to provide governance** | Neither does |
| **Switching an existing system for marginal gain** | Migration cost is real |

**On the hybrid:** they aren't mutually exclusive across a system. A deterministic RAG path needs neither, an ADK agent can handle tool-using investigation, and a LangGraph graph could handle a long-running approval workflow. Using the right tool per component is legitimate, though it does mean two frameworks to maintain and review — which is a real cost worth weighing.

**On the migration question:** an existing LangGraph system with a hard resumable-approval requirement shouldn't switch to ADK for platform integration alone. The integration is real and the migration cost plus the persistence regression usually isn't worth it.

## 7. Interview Answer

> "Both give you agents, tools, and state, and neither gives you budgets, abstention, retrieval quality, or grounding verification. So the comparison is about what they do well beyond that — and they optimize for different things.
>
> LangGraph optimizes for explicit state and durable resumable execution. Checkpoint history lets you inspect state after every node. Time travel lets you resume from an earlier checkpoint and branch. Typed state with reducers handles parallel writes correctly. Interrupts are a designed mechanism with `interrupt_before` rather than a pattern you assemble. And the graph structure is something you can draw and a reviewer can read.
>
> ADK optimizes for deployment and platform integration. Agent Engine provides managed hosting, scaling, and session persistence. IAM, audit logging, and VPC Service Controls integrate natively. Vertex AI evaluation integrates. And callbacks are a designed control point where every tool call is authorized and audited — which for banking is a meaningful reviewability advantage, because 'show me every tool call is authorized' has a one-line answer.
>
> So the requirement decides. If the requirement is that an agent proposing a refund must have it approved by a human, approval may take until the next business day, and execution must resume exactly where it stopped — that's LangGraph. Interrupt plus checkpointer is purpose-built for it.
>
> If the requirement is that the agent deploys under project IAM inside the VPC perimeter with managed session storage and scaling, appearing in Cloud Audit Logs alongside everything else — that's ADK, because with LangGraph you build the deployment, session storage, and scaling yourself.
>
> Neither is better. A comparison that declares a winner without naming the requirement isn't a real comparison.
>
> They're also not mutually exclusive across a system — a deterministic RAG path needs neither, an ADK agent could handle tool-using investigation, and a LangGraph graph could handle a long-running approval workflow. That's legitimate, though it means two frameworks to maintain and review, which is a real cost.
>
> And I'd say plainly that an existing LangGraph system with a hard resumable-approval requirement shouldn't switch to ADK for platform integration alone. The integration is real, and the migration cost plus the persistence regression usually isn't worth it."

## 8. Likely Follow-ups

**Q: Which would you choose?**
It depends on the requirement. Multi-hour resumable human approval with mid-execution resume points at LangGraph. Managed deployment under project IAM with native audit and VPC-SC points at ADK. Choosing without naming the requirement isn't a real decision.

**Q: What's LangGraph's standout feature?**
Checkpointing and interrupts — durable state after every node, resume from any checkpoint including earlier ones, and `interrupt_before` as a designed mechanism for human approval. That's genuinely hard to build and it's the thing worth adopting a framework for.

**Q: What's ADK's standout feature?**
Agent Engine deployment plus callbacks. Managed hosting, scaling, and sessions removes real operational work, and callbacks give a single framework-level point where every tool call is authorized and audited — which is a reviewability advantage in a regulated environment.

**Q: Can you use both?**
Across a system, yes — a deterministic RAG path needs neither, an ADK agent for tool-using investigation, a LangGraph graph for a long-running approval workflow. It's legitimate, but it means two frameworks to maintain, review, and keep patched, which is a real cost.

**Q: Would you migrate an existing LangGraph system?**
Not for platform integration alone. If there's a hard requirement for resumable multi-hour approvals, the migration cost plus the persistence regression usually outweighs the integration benefit. The requirement has to justify the move, not the vendor relationship.

## 9. Common Mistakes

- Declaring a winner without naming the requirement.
- Choosing on vendor alignment rather than technical fit.
- Expecting either framework to provide governance.
- Using ADK where multi-hour resumption is the central requirement.
- Migrating an existing system for marginal integration benefit.

## 10. What to Remember

- **LangGraph: state, checkpoints, interrupts. ADK: deployment, integration, callbacks.**
- **The requirement decides** — a comparison without one isn't real.
- **Neither provides governance** — budgets, abstention, verification are yours.
- **Both can coexist** in one system, at the cost of two frameworks to maintain.
- **Don't migrate for integration alone** when persistence is the requirement.
