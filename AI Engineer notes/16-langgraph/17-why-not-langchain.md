# Why Not LangChain?

> **Phase 16 · LANGGRAPH · Topic 17**

## 1. Definition

The reasons a LangChain chain or `AgentExecutor` is the wrong tool for a stateful, branching, interruptible workflow — and the reasons LangChain's components remain useful alongside LangGraph.

## 2. Simple Explanation

They're not competitors. LangGraph is from the same project and is the recommended path for anything beyond a linear chain.

The question is really "why not LCEL or AgentExecutor," and the answer is that neither handles branching, cycles, or suspension well.

## 3. How It Works

| Need | LCEL | AgentExecutor | LangGraph |
|---|---|---|---|
| Linear pipeline | ✅ Best | — | Overkill |
| Streaming a chain | ✅ | ✅ | ✅ |
| Conditional branching | ⚠️ `RunnableBranch` | ✗ | ✅ |
| Cycles | ✗ | Implicit in the loop | ✅ Explicit |
| Explicit shared state | ✗ | ✗ | ✅ |
| Persistence / resumption | ✗ | ✗ | ✅ |
| Human interrupt | ✗ | ✗ | ✅ |
| Enumerable paths | ✅ | ✗ | ✅ |

**The three rows that decide it:** explicit state, persistence, and interrupts. Nothing in LCEL or `AgentExecutor` addresses them.

## 4. Practical Example

**Why `AgentExecutor` specifically falls short:**

```
It has an implicit loop with no addressable state. So:

  · no place to hold verified facts separate from messages
  · no way to suspend and resume
  · no way to inspect what was known at step 4
  · budgets limited to max_iterations and a time cap
  · adding a control means extending someone else's loop

LangGraph makes the same loop explicit — model node, tool
node, conditional edge — with state you define and
checkpoints at every step.
```

**Why LCEL falls short:**

```
LCEL composes a DAG, not a cyclic graph. A retrieve →
grade → rewrite → retrieve loop can't be expressed;
RunnableBranch handles a branch but not a cycle.

For a linear pipeline LCEL is better than LangGraph —
simpler, less ceremony. The moment there's a loop, it isn't
the right tool.
```

**What stays useful from LangChain:**

```
· document loaders and text splitters
· embedding and vector store adapters
· prompt templates
· LCEL for the generation step INSIDE a node
· callbacks and tracing

A LangGraph node can be an LCEL chain. Using LCEL inside a
node for the retrieve-format-prompt-generate sequence, with
the graph handling branching and state, is the natural
combination — not an either/or.
```

**That composition is the answer** — the question is framed as a choice and it usually isn't one.

## 5. Why It Matters

- **They compose** — an LCEL chain can be a LangGraph node.
- **State, persistence, and interrupts** are the three rows LCEL and AgentExecutor don't cover.
- **LCEL is better for linear pipelines**, and saying so avoids over-adopting.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **LangGraph for linear flows** | Ceremony with no benefit |
| **LCEL for cyclic flows** | Can't express the loop |
| **`AgentExecutor` where state matters** | No addressable state |
| **Treating it as either/or** | Missing the natural composition |
| **Two frameworks, one dependency review** | Both need assessing |

**On the composition boundary:** LCEL inside a node means the node's internals aren't inspectable in the checkpoint — you see the node's input and output, not what happened inside the chain. For a generation step that's fine; for anything needing step-level audit, the work should be separate nodes.

**On migrating:** moving from `AgentExecutor` to LangGraph is mostly restructuring, not rewriting. Tools stay the same, prompts stay the same, and the loop becomes a model node, a tool node, and a conditional edge. The new work is defining the state schema and the routing functions — which is the part that was implicit before.

## 7. Interview Answer

> "They're not competitors — LangGraph is from the same project and is the recommended path for anything beyond a linear chain. So the real question is why not LCEL or AgentExecutor.
>
> Three rows decide it: explicit shared state, persistence, and human interrupts. Neither LCEL nor AgentExecutor addresses any of them.
>
> AgentExecutor specifically has an implicit loop with no addressable state. There's no place to hold verified facts separate from the message history, no way to suspend and resume, no way to inspect what was known at step four, and budgets limited to max_iterations and a time cap. Adding any control means extending someone else's loop. LangGraph makes the same loop explicit — a model node, a tool node, a conditional edge — with state I define and checkpoints at every step.
>
> LCEL composes a DAG rather than a cyclic graph, so a retrieve-grade-rewrite-retrieve loop can't be expressed. RunnableBranch handles a branch, not a cycle. But for a genuinely linear pipeline, LCEL is better than LangGraph — simpler, less ceremony. I'd say that plainly rather than over-adopting the graph.
>
> The thing I'd stress is that they compose. A LangGraph node can be an LCEL chain. Using LCEL inside a node for the retrieve-format-prompt-generate sequence, with the graph handling branching, state, and interrupts, is the natural combination. And LangChain's document loaders, splitters, adapters, prompt templates, callbacks, and tracing all remain useful regardless. The question is usually framed as a choice and it isn't one.
>
> One boundary worth knowing: LCEL inside a node means the node's internals aren't visible in the checkpoint — you see input and output, not what happened inside the chain. For a generation step that's fine; for anything needing step-level audit, the work should be separate nodes.
>
> And migrating from AgentExecutor is mostly restructuring rather than rewriting. Tools and prompts stay; the loop becomes three graph elements. The new work is defining the state schema and routing functions, which is exactly the part that was implicit before."

## 8. Likely Follow-ups

**Q: What can't LCEL do?**
Cycles. It composes a DAG, so a retrieve-grade-rewrite-retrieve loop can't be expressed — RunnableBranch handles a branch but not a cycle. It also has no explicit shared state, no persistence, and no interrupt mechanism.

**Q: What's wrong with AgentExecutor?**
Its loop is implicit with no addressable state, so there's nowhere to hold verified facts separately, no way to suspend and resume, and no way to inspect what was known at a given step. Any control you add means extending someone else's loop rather than writing your own.

**Q: Do you have to choose between them?**
No, and framing it as a choice is the mistake. A LangGraph node can be an LCEL chain — LCEL for the generation step inside a node, the graph for branching, state, and interrupts. And LangChain's loaders, splitters, adapters, and tracing remain useful regardless.

**Q: When is LCEL the better choice?**
For a genuinely linear pipeline. Retrieve, generate, return is a graph with two edges, and LCEL expresses it with less ceremony. LangGraph's benefits only appear when there's branching, cycles, or a need to suspend execution.

**Q: How hard is migrating from AgentExecutor?**
Mostly restructuring rather than rewriting. Tools and prompts carry over unchanged, and the loop becomes a model node, a tool node, and a conditional edge. The new work is defining the state schema and routing functions — the parts that were implicit in the executor.

## 9. Common Mistakes

- Framing it as LangChain versus LangGraph rather than composition.
- Using LangGraph for linear pipelines.
- Trying to express cycles in LCEL.
- Expecting checkpoint visibility into an LCEL chain inside a node.
- Rewriting tools and prompts when migrating rather than restructuring.

## 10. What to Remember

- **Not competitors** — LangGraph is the recommended path beyond linear chains.
- **State, persistence, interrupts** are what LCEL and AgentExecutor lack.
- **LCEL is better for linear pipelines** — less ceremony.
- **An LCEL chain can be a LangGraph node** — that's the natural combination.
- **Node internals aren't in the checkpoint** — split what needs step-level audit.
