# Callbacks (ADK)

> **Phase 21 · GOOGLE ADK · Topic 08**

## 1. Definition

Hooks that run before and after agent execution, model calls, and tool calls. They can inspect, modify, log, or block — which makes them the designed place for authorization, validation, and audit.

## 2. Simple Explanation

A callback runs at a defined point in the agent's execution and can intervene.

That's what makes them the most important ADK feature for a regulated system: every tool call passes through the same hook, so the controls live in one place a reviewer can verify.

## 3. How It Works

```python
def before_tool(tool, args, tool_context):
    user = tool_context.state["user"]

    if args.get("account_id") not in tool_context.state["accounts"]:
        return {"error": "That account is not in this session."}   # blocks

    if not user.can(tool.name):
        return {"error": "You don't have access to that."}          # blocks

    audit.log(user.id, tool.name, args, tool_context.state["session_id"])
    return None            # None = proceed
```

**Returning a value blocks the call** and that value becomes the result the model sees. Returning `None` lets it proceed. That single mechanism covers validation, authorization, and graceful refusal.

**Available hooks:** before/after agent, before/after model, before/after tool.

## 4. Practical Example

**What goes in each hook:**

```
BEFORE MODEL
  · inject verified facts from state into the prompt
  · check the token budget before spending
  · redact PII from anything being sent

AFTER MODEL
  · record tokens and cost
  · check the finish reason for truncation or safety blocks
  · scan output for advice-like or guarantee-like language

BEFORE TOOL          ← the most important one
  · validate arguments against session scope
  · authorize as the authenticated end user
  · audit log
  · block with a message the model can act on

AFTER TOOL
  · truncate large results
  · record which facts were established, into state
  · log latency and errors
```

**Why before-tool is the critical hook:**

```
Every tool call passes through it. So authorization isn't
scattered across twenty tool implementations that each have
to remember — it's one function.

That matters twice. It's less code and fewer places to get
it wrong. And "show me that every tool call is authorized"
has a one-line answer, which in a regulated environment is
worth more than the code saving.
```

**That reviewability argument is the substantive point.**

**Blocking gracefully:** returning an error message rather than raising means the agent sees the refusal as a tool result and can tell the customer it can't access that — rather than the run dying and the customer getting an error.

## 5. Why It Matters

- **Before-tool is a single chokepoint** for authorization, validation, and audit.
- **One function beats twenty tool implementations remembering** — and it's reviewable.
- **Blocking returns a message the model can act on**, not an exception.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Authorization inside individual tools** | Twenty places to get wrong |
| **Callbacks raising exceptions** | Kills the run instead of refusing |
| **Slow synchronous callbacks** | Added latency on every tool call |
| **Logging full arguments with PII** | Compliance exposure |
| **Callbacks with side effects on retry** | Duplicated audit records |
| **Too much logic in callbacks** | Hidden behaviour hard to follow |

**On performance:** callbacks run inline on every call, so a synchronous write to a remote audit service adds that latency to every tool invocation. Buffering and flushing asynchronously is the right pattern — though for audit specifically, there's a genuine trade-off, because a buffered audit record can be lost on a crash. For high-value actions I'd accept the synchronous write.

**On keeping logic visible:** a callback that substantially changes behaviour makes the system hard to follow, because reading an agent's definition no longer tells you what it does. Callbacks should be cross-cutting concerns — authorization, audit, truncation — not business logic that belongs in a tool or an agent.

## 7. Interview Answer

> "Callbacks are hooks before and after agent execution, model calls, and tool calls. Returning a value blocks the call and becomes the result the model sees; returning None lets it proceed. That single mechanism covers validation, authorization, and graceful refusal.
>
> Before-tool is the most important one, and it's the reason I'd consider ADK well suited to a regulated system. Every tool call passes through it, so authorization isn't scattered across twenty tool implementations that each have to remember — it's one function doing argument validation against session scope, authorization as the authenticated end user, and audit logging.
>
> That matters twice. It's less code and fewer places to get it wrong. And more importantly, 'show me that every tool call is authorized' has a one-line answer. In a regulated environment that reviewability is worth more than the code saving.
>
> Across the other hooks: before-model is where I'd inject verified facts from state into the prompt, check the token budget before spending, and redact PII. After-model records tokens and cost, checks the finish reason for truncation or safety blocks, and scans output for advice-like or guarantee-like language. After-tool truncates large results, records established facts into state, and logs latency.
>
> On blocking, I'd return an error message rather than raising. The agent sees the refusal as a tool result and can tell the customer it can't access that, rather than the run dying and the customer getting an error.
>
> Two things I'd be careful about. Performance — callbacks run inline, so a synchronous write to a remote audit service adds that latency to every tool call. Buffering and flushing asynchronously is usually right, though for audit there's a genuine trade-off because a buffered record can be lost on a crash. For high-value actions I'd accept the synchronous write and the latency.
>
> And keeping logic visible. A callback that substantially changes behaviour makes the system hard to follow, because reading the agent's definition no longer tells you what it does. Callbacks should be cross-cutting concerns — authorization, audit, truncation — not business logic that belongs in a tool or an agent."

## 8. Likely Follow-ups

**Q: What's the most important callback?**
Before-tool. Every tool call passes through it, so argument validation, authorization as the end user, and audit logging live in one function rather than being repeated across every tool implementation — which is both less error-prone and far easier to review.

**Q: How does a callback block a call?**
By returning a value instead of `None`. That value becomes the result the model sees, so a refusal message lets the agent explain the limitation to the customer. Raising an exception instead kills the run and discards the work already done.

**Q: What goes in the model callbacks?**
Before-model: inject verified facts from state, check the token budget, redact PII. After-model: record tokens and cost, check the finish reason for truncation or safety blocks, and scan output for advice-like or guarantee-like language that shouldn't reach a customer.

**Q: Any performance concern?**
Callbacks run inline, so a synchronous write to a remote service adds latency to every call. Buffering and flushing asynchronously is usually right — but for audit there's a real trade-off, since a buffered record can be lost on a crash, so high-value actions justify the synchronous write.

**Q: What shouldn't go in a callback?**
Business logic. A callback that substantially changes behaviour makes the system hard to follow, because reading an agent's definition no longer tells you what it does. Callbacks belong to cross-cutting concerns — authorization, audit, truncation — not domain decisions.

## 9. Common Mistakes

- Implementing authorization inside individual tools.
- Raising exceptions from callbacks instead of returning a refusal.
- Synchronous remote writes on every callback.
- Logging full arguments including PII.
- Putting business logic in callbacks, hiding behaviour.

## 10. What to Remember

- **Before-tool is the chokepoint** for validation, authorization, and audit.
- **Return a value to block**, `None` to proceed — refusals reach the model.
- **One function, reviewable in one place** — the regulated-environment argument.
- **Buffer async, except where losing an audit record matters.**
- **Cross-cutting concerns only** — keep business logic out.
