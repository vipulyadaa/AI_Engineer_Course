# The Agent Loop

> **Phase 17 · AI AGENTS · Topic 04**

## 1. Definition

The cycle an agent runs: call the model, execute whatever tool it chose, append the result to the conversation, repeat — until the model produces a final answer or a limit is hit.

## 2. Simple Explanation

The whole agent is a `while` loop. The model sees the history, picks an action, the system runs it, the result goes back into the history, and the model looks again.

Everything else — planning, reflection, multi-agent — is elaboration on this loop.

## 3. How It Works

```python
def run(task, tools, max_steps=10, token_budget=50_000):
    messages = [system_prompt(tools), user(task)]

    for step in range(max_steps):
        reply = llm(messages, tools=tools)
        messages.append(reply)

        if not reply.tool_calls:
            return reply.content                  # done

        for call in reply.tool_calls:
            result = execute(call)                # may raise
            messages.append(tool_result(call.id, result))

        if tokens(messages) > token_budget:
            return summarize_and_stop(messages)   # budget exit

    return escalate("step limit reached", messages)
```

**Four exits, and all four are needed:**

```
1. The model returns a final answer         ← the good path
2. Step limit reached                        ← runaway guard
3. Token budget exceeded                     ← cost guard
4. Unrecoverable tool failure                ← error path
```

## 4. Practical Example

**The context growth problem:**

```
Every iteration appends the model's reasoning AND the tool
result. Context grows monotonically.

  step 1:   1,200 tokens
  step 5:   8,000
  step 10: 24,000

Consequences:
  · cost per step rises as the loop continues
  · latency rises with it
  · the model may lose the original task among the noise
  · eventually the context window is exhausted

Mitigations:
  · truncate or summarize old tool results, keeping the
    most recent in full
  · store large results externally and pass a reference
  · cap per-tool result size at the tool boundary
```

**Capping result size at the tool is the highest-value fix** — a tool that returns 30,000 tokens of JSON will destroy the loop regardless of what the agent does. Tools should return what's needed, not everything available.

**What must be logged per iteration:**

```
step number · model reasoning · tool called · arguments ·
result (truncated) · latency · tokens · cumulative cost

Without this, debugging an agent is guesswork. With it, you
can replay exactly what the model saw at each decision.
```

## 5. Why It Matters

- **It's the entire mechanism** — understanding the loop is understanding agents.
- **All four exits are required**; missing any one is a production incident waiting.
- **Context growth is the silent cost driver** in every agent system.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No step limit** | Infinite loop, unbounded cost |
| **No token budget** | Cost blows up before the step limit hits |
| **Tool exceptions propagating** | One failure kills the whole run |
| **Unbounded tool results** | Context exhausted in two steps |
| **Repeating the same call** | Stuck without progress detection |
| **Losing the original task** | Buried under accumulated context |

**On tool errors:** raising an exception out of the loop wastes all the work done so far. Returning the error *to the model* as a tool result lets it adapt — retry with different arguments, try another tool, or report that it can't complete the task. That's usually better, with a cap on retries per tool so a persistently failing tool doesn't consume the whole budget.

**On loop detection:** an agent can get stuck calling the same tool with the same arguments repeatedly. Hashing (tool, arguments) and detecting repeats is a few lines, and injecting "you already tried this and got X — try something else" breaks the cycle far more cheaply than waiting for the step limit.

## 7. Interview Answer

> "The agent loop is: call the model with the conversation history, and if it requests a tool, execute it, append the result to the history, and call the model again. If it returns a final answer, you're done. Everything else in agent design — planning, reflection, multi-agent — is elaboration on this loop.
>
> There are four exits and all four are needed. The model finishing, a step limit as a runaway guard, a token budget as a cost guard, and an error path for unrecoverable tool failures. Missing any one of them is a production incident waiting to happen — a missing step limit is an infinite loop, and a missing token budget means cost blows up before the step limit even triggers.
>
> The issue that drives cost in practice is context growth. Every iteration appends both the model's reasoning and the tool result, so context grows monotonically — maybe twelve hundred tokens at step one and twenty-four thousand by step ten. Cost and latency rise with it, and the model can lose the original task among the accumulated noise.
>
> The highest-value mitigation is capping result size at the tool boundary. A tool returning thirty thousand tokens of JSON will destroy the loop no matter how well the agent behaves — tools should return what's needed, not everything available. Beyond that, summarizing older tool results while keeping recent ones in full, and storing large payloads externally to pass a reference.
>
> On errors, I'd return the failure to the model as a tool result rather than raising out of the loop. Raising throws away all the work so far; returning it lets the model adapt — retry with different arguments, use another tool, or report it can't complete. With a per-tool retry cap so a persistently broken tool doesn't eat the whole budget.
>
> One cheap thing worth adding: loop detection. Agents get stuck calling the same tool with the same arguments. Hashing tool plus arguments and detecting repeats is a few lines, and injecting 'you already tried this and got X, try something else' breaks it far sooner than waiting for the step limit.
>
> And I'd log per iteration — step, reasoning, tool, arguments, truncated result, latency, tokens, cumulative cost. Without that, debugging an agent is guesswork."

## 8. Likely Follow-ups

**Q: What are the loop's exit conditions?**
The model returning a final answer, a step limit, a token budget, and an unrecoverable error path. All four are necessary — without a step limit you get infinite loops, and without a token budget cost can blow up well before the step limit is reached.

**Q: How do you stop context from growing unboundedly?**
Cap tool result size at the tool boundary first, since one oversized result destroys the loop regardless of agent behaviour. Then summarize or truncate older results while keeping recent ones in full, and store large payloads externally so the context carries a reference instead of the data.

**Q: How should tool errors be handled?**
Returned to the model as a tool result rather than raised out of the loop. Raising discards everything done so far; returning lets the model retry with different arguments, switch tools, or report failure. A per-tool retry cap prevents a broken tool from consuming the budget.

**Q: How do you detect a stuck agent?**
Hash the tool name plus arguments each iteration and flag repeats. When one is detected, inject a message saying the action was already tried with that result and to do something different. It's a few lines and it breaks cycles far sooner than waiting for the step limit.

**Q: What should be logged?**
Per iteration: step number, the model's reasoning, the tool called, its arguments, a truncated result, latency, tokens, and cumulative cost. That's what makes it possible to replay exactly what the model saw at each decision point, which is the only practical way to debug an agent.

## 9. Common Mistakes

- Omitting a token budget because a step limit exists.
- Letting tool exceptions propagate out of the loop.
- Not capping tool result size at the tool.
- No loop detection, so repeats burn the full step budget.
- Logging only the final answer rather than each iteration.

## 10. What to Remember

- **The agent is a `while` loop:** model → tool → append → repeat.
- **Four exits:** answer, step limit, token budget, error.
- **Context grows every iteration** — cap tool results at the source.
- **Return tool errors to the model**, don't raise out of the loop.
- **Detect repeated (tool, args) calls** and break the cycle explicitly.
