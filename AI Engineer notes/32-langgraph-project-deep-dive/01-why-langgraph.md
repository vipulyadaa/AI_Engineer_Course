# "Why LangGraph?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 01**
>
> ⚠️ **An answer framework, not a script.** The structure and reasoning below
> are what makes an answer strong. Fill the specifics with your own project —
> never recite details you didn't build.

## 1. Definition

A justification question. The strong answer names the specific capability that a plain function or a chain couldn't provide — and the weak answer is a feature list.

## 2. Simple Explanation

LangGraph exists for workflows that don't run straight through: ones that loop, branch on results, pause for a human, or need to resume after a crash.

If your workflow does none of those, LangGraph is overhead. Saying that clearly is what makes the justification credible when you do need it.

## 3. How It Works

```
WHAT ACTUALLY JUSTIFIES IT

PERSISTENCE       state survives a process restart, so a
                  long workflow resumes instead of
                  starting over
INTERRUPTS        pause mid-execution, wait for a human,
                  resume with their input
CYCLES            retry, refine, and re-plan loops that a
                  DAG can't express
CONDITIONAL FLOW  the next step chosen from the result of
                  the last one
OBSERVABILITY     every state transition is inspectable,
                  which is what makes it debuggable

WHAT DOESN'T JUSTIFY IT
  "it's the standard framework"
  "it composes LLM calls"      ← a function does that
  "it has memory"              ← a dict does that
```

**Persistence and interrupts are the two that are genuinely hard to build yourself.** The rest you could write.

## 4. Practical Example

**The honest comparison that lands well:**

```
The core agent loop is about twenty lines:

  while not done:
      decision = model(state)
      if decision.is_final: break
      state += run_tool(decision)

That loop does NOT justify a framework. Anyone can write
it.

What justifies a framework:
  · the process restarts and the workflow continues from
    where it stopped
  · a human approves a step three hours later and it
    resumes
  · you can inspect why it took a particular branch
    two weeks ago

Those are checkpointing, interrupt, and trace
infrastructure — and they're weeks of work to build
properly.

Saying this shows you chose the tool rather than
defaulted to it.
```

**The banking-specific reason:**

```
Any workflow that can commit a customer-visible action
needs a human approval point, and approval is
ASYNCHRONOUS — minutes or hours, not milliseconds.

Which means the workflow cannot hold a process open
waiting. It has to persist, release, and resume on a
callback.

That single requirement rules out a plain script, and
it's the most defensible reason to reach for LangGraph
in this domain.
```

## 5. Why It Matters

- **Persistence and interrupts** are the real justification; the loop isn't.
- **Asynchronous human approval** forces persistence in a banking workflow.
- **Naming when you wouldn't use it** makes the justification credible.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| A feature list | Sounds like documentation, not a decision |
| "It's the standard for agents" | Not a reason |
| "It gives memory/state" | A dictionary gives state |
| No mention of what it costs | Suggests no trade-off was considered |
| Using it for a linear pipeline | Overhead with no return |

**On the cost, which is worth naming:** a graph is harder to read than a function. Execution order is implicit in the edges rather than visible in the code, debugging means reasoning about state transitions instead of a stack trace, and there's a real learning curve for anyone joining. For a workflow that genuinely branches and resumes, that's worth paying. For one that runs straight through, it isn't.

**On the alternative you rejected:** naming one — a plain orchestration function, a durable execution engine like a workflow service, or an agent framework with less control — shows the choice had alternatives. "LangGraph versus writing it myself" is the most honest framing, and the answer is usually persistence.

## 7. Interview Answer

> "[**Your reason.** The framing below is what makes it land.]
>
> "The honest starting point is that the agent loop itself doesn't justify a framework. Call the model, check whether it wants a tool, run the tool, append the result, repeat — that's about twenty lines and anyone can write it.
>
> What justified LangGraph for me was persistence and interrupts. [**Your specific need.**]
>
> The concrete driver was human approval. [**If this applies**] Any step that produces a customer-visible action needs review before it commits, and approval is asynchronous — it might come back in minutes or hours. So the workflow can't hold a process open waiting for it. It has to checkpoint its state, release, and resume when the approval arrives.
>
> That's the requirement that rules out a plain script. Building checkpointing, interrupt, and resume infrastructure yourself is weeks of work to get right, and getting it slightly wrong means a workflow that silently loses state.
>
> Beyond that, the conditional routing and the retry loop. [**Your flow.**] A chain runs a fixed sequence; I needed the next step chosen from the result of the last one, and a refinement loop that could run two or three times before giving up. Cycles specifically are what a DAG can't express, and that's a real structural difference rather than a convenience.
>
> And the observability matters more than it sounds. Every state transition is recorded, so when someone asks why the system took a particular branch on a specific request two weeks ago, I can answer it from the checkpoint history rather than from logs I hoped to have added.
>
> [**Name the cost.**] What it costs is readability. Execution order lives in the edges rather than in the code, so you can't read the flow top to bottom, and debugging means reasoning about state transitions rather than following a stack trace. There's also a learning curve for anyone new to it.
>
> Which is why I'd say plainly: if the workflow ran straight through with no branching, no loops, and no human in it, I wouldn't use LangGraph. A function would be clearer and easier to maintain. The justification is specifically the parts that aren't linear."

## 8. Likely Follow-ups

**Q: Couldn't you write the loop yourself?**
Yes — it's about twenty lines and that's not the hard part. The hard part is checkpointing, interrupts, and resume, which take weeks to build properly and fail silently when they're slightly wrong.

**Q: When wouldn't you use LangGraph?**
For a linear pipeline with no branching, loops, or human steps. A function is clearer, easier to debug, and has no learning curve. Using a graph for a straight-through flow is overhead with no return.

**Q: What does it cost?**
Readability. Execution order is implicit in the edges rather than visible in the code, debugging means reasoning about state transitions instead of a stack trace, and there's a real onboarding cost for anyone joining.

**Q: What alternative did you consider?**
[**Your honest answer.**] The most defensible framing is LangGraph versus writing the orchestration directly — and the deciding factor is usually whether the workflow needs to survive a restart or pause for a human.

**Q: What can't a chain do?**
Cycles and conditional routing based on runtime results. A chain runs a fixed sequence; a retry-and-refine loop that runs a variable number of times is structurally outside what a DAG expresses.

## 9. Common Mistakes

- Answering with a feature list.
- Claiming state management as the justification.
- Not naming what the framework costs.
- Failing to say when you wouldn't use it.
- Implying the agent loop itself is hard.

## 10. What to Remember

- **The loop is ~20 lines** — it justifies nothing.
- **Persistence and interrupts** are the real justification.
- **Asynchronous human approval** forces persistence.
- **Cycles are what a DAG can't express.**
- **Say when you wouldn't use it** — that's what makes it credible.
