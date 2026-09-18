# Why LangGraph?

> **Phase 16 · LANGGRAPH · Topic 16**

## 1. Definition

The justification for adopting LangGraph over writing an agent loop: persistence and resumption, native interrupts, explicit typed state, and declared control flow — in that order of importance.

## 2. Simple Explanation

The agent loop is about twenty lines, so a framework that only provides the loop isn't worth adopting.

LangGraph is worth it for what surrounds the loop: durable state that survives restarts, the ability to pause for a human and resume hours later, and a control flow you can enumerate and review.

## 3. How It Works

**Ranked by what they actually save:**

```
1. PERSISTENCE + RESUMPTION
   Durable state at node boundaries, resumable in another
   process. Genuinely hard to build correctly.

2. INTERRUPTS
   Pause, surface state, resume with a decision. Directly
   what a banking approval requirement asks for.

3. EXPLICIT TYPED STATE
   One schema every node reads and updates, with reducers.
   Buildable yourself, but this is a good version of it.

4. DECLARED CONTROL FLOW
   Enumerable paths — the auditability argument.

5. THE LOOP ITSELF
   ~20 lines. Worth almost nothing.
```

**Items 1 and 2 are the honest answer.** If those aren't needed, the case for the framework is weak.

## 4. Practical Example

**The concrete requirement that decides it:**

```
"An agent proposing a refund must have it approved by a human
 before execution, and approval may take until the next
 business day."

Without persistence:
  the process holds state in memory for up to a day, or you
  build serialization, a resume path, a thread store, and
  re-entry into the middle of a workflow yourself

With LangGraph:
  interrupt_before, a checkpointer, and app.invoke(None, config)

That's a real engineering saving on a requirement that's
non-negotiable in banking — unlike the loop, which isn't.
```

**The audit benefit that comes free:**

```
The checkpoint history records state after every node. So
"what did the system know when it decided X" is answerable
from the persistence layer, with no additional instrumentation.

For a regulated system that's genuinely valuable, and it
falls out of the feature rather than being designed for.
```

**When NOT to use it:**

```
· a linear RAG pipeline — a graph with two edges
· no branching, no loops, no suspension
· a team that would rather own 200 lines than a dependency
· extremely latency-sensitive paths where checkpoint writes
  at every node add measurable overhead

The last one is real: persistence costs a write per node.
For a two-node path answering in 200 ms, that's a
meaningful fraction.
```

## 5. Why It Matters

- **Persistence and interrupts** are the honest justification; the loop isn't.
- **Checkpoint history is a free audit artifact** in a regulated context.
- **Persistence costs a write per node** — a real cost on short latency-sensitive paths.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Adopted for the loop** | ~20 lines doesn't justify a dependency |
| **Checkpoint write overhead** | Per node; matters on short fast paths |
| **State schema versioning** | In-flight checkpoints break on change |
| **Checkpoint store as customer data** | Retention and erasure obligations |
| **API still evolving** | Upgrade churn |
| **Debugging graph execution** | Needs tracing to follow paths |

**On the dependency question:** in a bank, adding a framework means a security review, a supply-chain assessment, and ongoing patching. That cost is real and doesn't appear in technical comparisons. It's justified by persistence and interrupts; it wouldn't be justified by the loop or the graph syntax alone.

**On the honest alternative:** if the requirement is just an agent loop with tools and budgets, writing it directly gives full control, no dependency, and stack traces that point at your own code. That's a legitimate choice and worth saying so rather than defending the framework reflexively.

## 7. Interview Answer

> "The agent loop is about twenty lines, so a framework that only provides the loop isn't worth adopting. My justification for LangGraph is what surrounds it, in a specific order.
>
> First, persistence and resumption — durable state at node boundaries, resumable in a different process. Second, interrupts — pause, surface state for a human, resume with the decision recorded. Third, explicit typed state with reducers. Fourth, declared control flow with enumerable paths. And fifth, the loop itself, which is worth almost nothing.
>
> The first two are the honest answer, and there's a concrete requirement that decides it. If an agent proposing a refund must have it approved by a human, and approval may take until the next business day — without persistence you either hold state in memory for a day or build serialization, a resume path, a thread store, and re-entry into the middle of a workflow yourself. With LangGraph it's interrupt_before, a checkpointer, and invoking with None to resume. That's a real saving on a requirement that's non-negotiable in banking, unlike the loop.
>
> There's also an audit benefit that falls out for free: checkpoint history records state after every node, so 'what did the system know when it decided X' is answerable from the persistence layer with no extra instrumentation.
>
> Where I wouldn't use it: a linear RAG pipeline is a graph with two edges. No branching, no loops, no suspension means no case. And extremely latency-sensitive paths, because persistence costs a write per node — for a two-node path answering in two hundred milliseconds that's a meaningful fraction.
>
> I'd also be straight about the dependency cost. In a bank, adding a framework means a security review, a supply-chain assessment, and ongoing patching. That's real and it doesn't show up in feature comparisons. It's justified by persistence and interrupts; it wouldn't be justified by the graph syntax alone.
>
> So if the requirement were just an agent loop with tools and budgets, I'd write it directly — full control, no dependency, stack traces pointing at my own code. Defending the framework reflexively would be the wrong instinct."

## 8. Likely Follow-ups

**Q: What justifies the dependency?**
Persistence and interrupts. Durable resumable state and the ability to pause for a human approval that takes hours are genuinely hard to build correctly. The loop is twenty lines and the graph syntax is convenience — neither would justify a framework on its own.

**Q: When wouldn't you use it?**
For a linear RAG pipeline with no branching, loops, or suspension — that's a graph with two edges. Also on extremely latency-sensitive paths, since persistence costs a checkpoint write per node, which is a meaningful fraction of a two-hundred-millisecond response.

**Q: What's the free audit benefit?**
Checkpoint history is a record of state after every node, so what the system knew at any decision point is answerable directly from the persistence layer. In a regulated environment that's genuinely valuable and it requires no additional instrumentation.

**Q: What does the dependency cost in a bank?**
A security review, a supply-chain assessment, and ongoing patching — real work that doesn't appear in technical comparisons. It's justified by persistence and interrupts, and it wouldn't be by the loop or the syntax, which is why the ordering of the justification matters.

**Q: Would you ever just write the loop?**
Yes. If the requirement is an agent loop with tools and budgets and nothing needs to survive a restart or pause for a human, writing it directly gives full control, no dependency, and stack traces that point at my own code. That's a legitimate choice rather than a compromise.

## 9. Common Mistakes

- Justifying the framework by the loop or the graph syntax.
- Using it for linear pipelines.
- Ignoring checkpoint write overhead on latency-sensitive paths.
- Omitting the dependency review cost in a regulated environment.
- Defending the framework rather than assessing the requirement.

## 10. What to Remember

- **Persistence and interrupts justify it** — not the loop, which is ~20 lines.
- **The hours-long human approval requirement** is the concrete decider.
- **Checkpoint history is a free audit artifact.**
- **Persistence costs a write per node** — real on short fast paths.
- **Writing the loop yourself is legitimate** when nothing needs to suspend.
