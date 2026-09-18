# Tool Execution

> **Phase 16 · LANGGRAPH · Topic 13**

## 1. Definition

Running the tools a model requested, as a node in the graph. `ToolNode` is the built-in implementation; a custom node is what you write when authorization, validation, or auditing is required.

## 2. Simple Explanation

The model node returns a message containing tool calls. A tool node executes them and appends the results to state as tool messages. An edge routes back to the model.

That three-part cycle — model, tools, back to model — is the agent loop expressed as a graph.

## 3. How It Works

```python
from langgraph.prebuilt import ToolNode, tools_condition

g.add_node("model", call_model)
g.add_node("tools", ToolNode(tools))

g.add_conditional_edges("model", tools_condition)   # tools or END
g.add_edge("tools", "model")                        # loop back
```

**`tools_condition`** routes to the tool node if the last message has tool calls, otherwise to END. That's the whole agent loop in four lines.

**`ToolNode` executes calls in parallel** when the model returns several, which is a free latency win over sequential execution.

## 4. Practical Example

**Why a custom tool node in banking:**

```python
def tool_node(state: State) -> dict:
    results = []
    for call in state["messages"][-1].tool_calls:

        if not arguments_in_session_scope(call, state):      # 1
            results.append(err(call, "Not in this session's scope."))
            continue

        if not state["user"].can(call["name"]):              # 2
            results.append(err(call, "Not authorized."))
            continue

        audit.log(state["user_id"], call["name"],            # 3
                  call["args"], state["thread_id"])

        try:
            out = TOOLS[call["name"]].invoke(
                call["args"], actor=state["user"])           # 4
        except Exception as e:
            out = f"Error: {e}. Try a different approach."   # 5
        results.append(tool_msg(call, truncate(out)))        # 6

    return {"messages": results}
```

```
1  arguments validated against session scope
2  authorization as the END USER
3  every call audited before execution
4  executed AS the user, not the service account
5  errors returned to the model, not raised
6  results truncated so one call can't destroy the context

ToolNode does none of 1, 2, 3, or 6. That's why a custom
node is the right choice for anything regulated.
```

**That list is the answer to "would you use ToolNode?"** — it's fine for prototypes and insufficient where authorization and audit are requirements.

**Keeping tool results out of checkpoint bloat:** tool results go into `messages`, which is checkpointed at every subsequent node. A tool returning a large payload gets written repeatedly, so truncating at the tool node — with the full result stored by reference — keeps checkpoints small.

## 5. Why It Matters

- **The model-tools-model cycle** is the agent loop in graph form, in four lines.
- **`ToolNode` omits authorization, validation, audit, and truncation** — all required in banking.
- **Tool results enter checkpointed state**, so truncation affects storage and resume cost.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **`ToolNode` without authorization** | Tools run with whatever the process has |
| **Tool errors raised** | The graph fails; work is lost |
| **Unbounded tool results** | Context and every subsequent checkpoint bloat |
| **No argument validation** | Hallucinated identifiers reach execution |
| **No audit of tool calls** | No record of what was accessed |
| **Sequential execution of parallel calls** | Avoidable latency |

**On parallel calls:** when the model returns several tool calls in one message, executing them concurrently is a genuine latency saving. A custom node must implement that deliberately — it's easy to write a simple loop and lose what `ToolNode` gave for free.

**On the messages reducer:** tool results append to `messages`, which requires an add reducer on that field. Without it, the tool node's return replaces the entire conversation with just the tool results — a bug that manifests as the model losing all context immediately after the first tool call.

## 7. Interview Answer

> "Tool execution in LangGraph is a node. The model node returns a message with tool calls, the tool node executes them and appends results, and an edge routes back to the model. With tools_condition routing to the tool node when tool calls are present and to END otherwise, that's the entire agent loop in four lines.
>
> ToolNode is the built-in implementation and it executes parallel calls concurrently, which is a free latency win. But for banking I'd write a custom tool node, because ToolNode doesn't do four things I need.
>
> It doesn't validate arguments against the session's scope — so a hallucinated or injected account ID reaches execution. It doesn't authorize as the end user, so tools run with whatever permissions the process has, which is a privilege escalation path. It doesn't audit, so there's no record of what was accessed. And it doesn't truncate results, so one large tool response destroys the context.
>
> So my tool node validates arguments in scope, checks the user's permissions, writes an audit record before executing, invokes the tool as the authenticated user, catches exceptions and returns them to the model as error messages rather than raising, and truncates results with the full payload stored by reference.
>
> Returning errors rather than raising matters because raising fails the graph and loses the work already done, whereas an error message lets the model correct arguments, try another tool, or explain the limitation.
>
> Two implementation details. If I write a custom node I have to implement parallel execution deliberately — it's easy to write a simple loop and lose what ToolNode gave for free.
>
> And the messages field needs an add reducer. Tool results append to messages, so without the reducer the tool node's return replaces the entire conversation with just the tool results. That manifests as the model losing all context immediately after the first tool call, which is confusing to debug if you don't know to look at the reducer.
>
> One more: tool results live in checkpointed state, so a large payload is rewritten at every subsequent node. Truncating at the tool node keeps checkpoint size and resume time down as well as protecting the context window."

## 8. Likely Follow-ups

**Q: What does the tool cycle look like?**
Model node returns tool calls, tool node executes them and appends results to state, edge routes back to the model. With `tools_condition` handling the branch to END when there are no tool calls, that's the complete agent loop in about four lines of graph definition.

**Q: Would you use `ToolNode` in production?**
Not in banking. It doesn't validate arguments against session scope, doesn't authorize as the end user, doesn't audit calls, and doesn't truncate results. Those four are requirements in a regulated system, so a custom node is the right choice — ToolNode is fine for prototypes.

**Q: Should tool errors raise?**
No — return them to the model as error messages. Raising fails the graph and discards everything already established, while a returned error lets the model correct arguments, switch tools, or explain the limitation to the user.

**Q: What's the reducer issue?**
Tool results append to the messages field, which requires an add reducer. Without it, the tool node's return replaces the whole conversation with just the tool results, so the model loses all context right after the first tool call — confusing to debug unless you know to check the reducer.

**Q: Why truncate tool results?**
Two reasons. They enter the context window, where a large payload crowds out everything else. And they enter checkpointed state, so they're rewritten at every subsequent node — which costs storage and slows resumption. Truncating with the full result stored by reference handles both.

## 9. Common Mistakes

- Using `ToolNode` where authorization and audit are required.
- Raising tool exceptions instead of returning error messages.
- Forgetting the add reducer on the messages field.
- Losing parallel execution when writing a custom node.
- Returning unbounded tool results into checkpointed state.

## 10. What to Remember

- **Model → tools → model** is the agent loop as a graph, in four lines.
- **`ToolNode` omits validation, authorization, audit, and truncation.**
- **Return tool errors to the model**, don't raise.
- **The messages field needs an add reducer** or context is wiped.
- **Truncate results** — they're in the context *and* every checkpoint.
