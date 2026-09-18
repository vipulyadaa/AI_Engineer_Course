# Agents (in LangChain)

> **Phase 15 · LANGCHAIN · Topic 12**

## 1. Definition

LangChain's agent abstractions run the tool-calling loop: call the model, execute requested tools, feed results back, repeat until a final answer or a limit. `AgentExecutor` is the classic implementation; LangGraph is the current recommendation.

## 2. Simple Explanation

The agent loop is about twenty lines of code. LangChain wraps it with configuration, callbacks, and error handling.

The honest position is that this is the part of LangChain that saves the least, because the loop is easy and everything that makes an agent production-ready — budgets, authorization, observability, state — you write regardless.

## 3. How It Works

```python
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(
    agent=agent, tools=tools,
    max_iterations=8,
    max_execution_time=30,
    return_intermediate_steps=True,     # ← essential
    handle_parsing_errors=True,
)
result = executor.invoke({"input": question})
```

**`return_intermediate_steps=True` is not optional in practice** — without it you get the final answer and no record of which tools ran with what arguments, which makes failures undiagnosable.

**LangGraph is the current direction.** LangChain's own guidance points there for anything beyond a simple loop, because branching, persistence, and human-in-the-loop are awkward in `AgentExecutor`.

## 4. Practical Example

**What `AgentExecutor` gives you, honestly:**

```
PROVIDES     the loop, iteration and time limits, parsing
             error handling, callback hooks, intermediate
             step capture

DOESN'T      token budgets
             per-tool authorization
             loop and repeat detection
             state persistence across a human approval wait
             graceful degradation at the budget
             cost accounting
             audit logging

The second list is most of what makes an agent shippable in
banking, and none of it is provided.
```

**So the value assessment is:**

```
The loop itself is ~20 lines. AgentExecutor saves writing
those 20 lines and gives you iteration limits.

What it costs is a layer between your code and the model
that makes the second list harder to add cleanly — because
you're extending a framework's loop rather than writing your
own.

For a prototype that's a fine trade. For a production
banking agent I'd write the loop, because I need all of the
second list and I want it in plain sight.
```

**Where LangGraph changes the calculation:** it models the agent as a graph with explicit state, checkpointing, and interrupt points. Those aren't things you'd want to write yourself — persistence across a human approval wait, and resumable execution, are genuinely non-trivial. That's a real reason to use a framework, unlike the loop itself.

## 5. Why It Matters

- **The loop is the least valuable thing a framework provides** — it's twenty lines.
- **What's missing is what makes agents shippable** in a regulated context.
- **LangGraph's persistence and interrupts** are a genuine reason to use a framework.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No token budget** | Cost can blow up before iteration limits fire |
| **No authorization layer** | Must be added at the tool boundary yourself |
| **`return_intermediate_steps` off** | Failures undiagnosable |
| **Hard stop at max_iterations** | Pays for everything, returns nothing useful |
| **Legacy agent types** | ReAct/ZeroShot agents are superseded |
| **Framework loop constrains extensions** | Adding controls means fighting the abstraction |

**On the hard stop:** `max_iterations` terminates rather than degrading. The better behaviour is instructing the agent to conclude with what it has as the budget approaches, so the spend produces an answer. That requires intervening in the loop, which is exactly the kind of thing that's awkward inside the executor.

**On legacy agent types:** `ZeroShotAgent`, `ReActAgent`, and the older `initialize_agent` helper predate native tool calling and prompt the model to emit a text format that's then parsed. They're superseded by `create_tool_calling_agent` using the provider's structured tool calling, which is both more reliable and simpler. A lot of tutorial code still uses the old ones.

## 7. Interview Answer

> "LangChain's agent abstraction runs the tool-calling loop — call the model, execute requested tools, feed results back, repeat until a final answer or a limit. AgentExecutor is the classic implementation and LangGraph is the current recommendation.
>
> My honest position is that this is the part of LangChain that saves the least. The loop is about twenty lines of code. AgentExecutor saves writing those twenty lines and gives you iteration and time limits, parsing error handling, and callback hooks.
>
> What it doesn't give you is token budgets, per-tool authorization, loop detection, state persistence across a human approval wait, graceful degradation at the budget, cost accounting, or audit logging. That second list is most of what makes an agent shippable in banking, and none of it is provided — so I'd be writing it anyway, but now inside someone else's loop.
>
> One concrete example: max_iterations terminates hard rather than degrading. The better behaviour is instructing the agent to conclude with what it has as the budget approaches, so the spend produces something. Doing that means intervening in the loop, which is awkward inside the executor.
>
> So for a prototype, AgentExecutor is fine. For a production banking agent I'd write the loop, because I need all of that second list and I want it in plain sight where a reviewer can verify it.
>
> LangGraph changes the calculation though. It models the agent as a graph with explicit state, checkpointing, and interrupt points — and persistence across a human approval wait with resumable execution is genuinely non-trivial to write. That's a real reason to use a framework, unlike the loop itself.
>
> Two practical notes. return_intermediate_steps has to be on, or you get a final answer with no record of which tools ran with what arguments, which makes failures undiagnosable. And the older agent types — ZeroShotAgent, ReActAgent, initialize_agent — predate native tool calling and parse a text format instead. They're superseded and still all over tutorials."

## 8. Likely Follow-ups

**Q: Does AgentExecutor save much?**
Not much. The loop is about twenty lines, and what it adds is iteration limits, parsing error handling, and callbacks. Everything that makes an agent production-ready — budgets, authorization, loop detection, persistence, audit — you write yourself regardless.

**Q: What's missing for production?**
Token budgets, per-tool authorization, repeat detection, state persistence across human approval, graceful degradation instead of hard termination, cost accounting, and audit logging. That list is most of what a banking agent needs, so the framework isn't doing the hard part.

**Q: Why is LangGraph recommended instead?**
Because it models the agent as a graph with explicit state, checkpointing, and interrupt points. Persistence across a human approval wait and resumable execution are genuinely hard to write, which makes that a real reason to use a framework — unlike the loop.

**Q: What's the problem with max_iterations?**
It terminates hard, so you pay for every step and get nothing useful back. Better behaviour is instructing the agent to conclude with what it has as the limit approaches, which produces an answer for the spend — but that requires intervening in the loop, which the executor makes awkward.

**Q: Which agent constructor should be used?**
`create_tool_calling_agent`, which uses the provider's native structured tool calling. The older ZeroShotAgent, ReActAgent, and initialize_agent predate that and parse a text format from the model, which is less reliable and more complex. A lot of tutorial code still uses them.

## 9. Common Mistakes

- Overstating what the agent abstraction provides.
- Leaving `return_intermediate_steps` off.
- Relying on `max_iterations` as the only budget control.
- Using legacy agent types that parse text instead of native tool calls.
- Assuming the framework handles authorization or cost.

## 10. What to Remember

- **The loop is ~20 lines** — the least valuable thing a framework provides.
- **Budgets, authz, loop detection, audit** are all still yours.
- **LangGraph's persistence and interrupts** are a genuine framework benefit.
- **`return_intermediate_steps=True`** or failures are undiagnosable.
- **Use `create_tool_calling_agent`**; the older agent types are superseded.
