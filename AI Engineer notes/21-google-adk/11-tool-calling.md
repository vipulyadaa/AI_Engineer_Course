# Tool Calling (ADK)

> **Phase 21 · GOOGLE ADK · Topic 11**

## 1. Definition

The execution cycle in ADK — the model requests a tool, callbacks intercept, the tool runs, the result returns to the model — with the before-tool callback as the enforcement point.

> Tool calling mechanics generally are in [17-ai-agents/07-tool-calling.md](../17-ai-agents/07-tool-calling.md). This is ADK's flow and where controls attach.

## 2. Simple Explanation

The model asks for a tool. ADK runs your before-tool callback, which can block. If it doesn't, the tool executes and the after-tool callback can modify the result before the model sees it.

That interception is the whole security story — the enforcement point is in the framework, not in each tool.

## 3. How It Works

```
model requests tool(args)
        ↓
before_tool_callback(tool, args, context)
        ├─ returns a value → BLOCKED, that value is the result
        └─ returns None    → proceed
        ↓
tool executes (with ToolContext → session state)
        ↓
after_tool_callback(tool, args, context, response)
        ├─ returns a value → replaces the result
        └─ returns None    → original result used
        ↓
result appended to the conversation
```

**Parallel calls:** when the model requests several tools in one turn, ADK can execute them concurrently — a latency win that requires no code on your part.

## 4. Practical Example

**The complete control set at the before-tool hook:**

```python
def before_tool(tool, args, ctx):
    # 1. arguments in session scope
    if "account_id" in args and args["account_id"] not in ctx.state["accounts"]:
        return {"error": "That account is not in this session."}

    # 2. provenance — identifiers must come from prior results
    if "transaction_id" in args and \
       args["transaction_id"] not in ctx.state.get("seen_txn_ids", set()):
        return {"error": "Look up the transaction first with "
                         "get_transactions."}

    # 3. authorization as the end user
    if not ctx.state["user"].can(tool.name):
        return {"error": "You don't have access to that."}

    # 4. budget
    if ctx.state["tool_calls"] >= MAX_TOOL_CALLS:
        return {"error": "Step budget reached. Summarize what you know."}

    # 5. audit
    audit.log(ctx.state["user"].id, tool.name, args, ctx.state["session_id"])
    return None
```

**Control 2 is the one most systems lack.** A model will produce a well-formed transaction ID that doesn't exist, and checking that identifiers came from a prior tool result — rather than being invented — catches it before any write. That check is a few lines and it prevents acting on a fabricated identifier.

**After-tool as the truncation point:**

```python
def after_tool(tool, args, ctx, response):
    text = json.dumps(response)
    if len(text) > MAX_TOOL_RESULT:
        ref = store_full_result(response)
        return {"truncated": True, "preview": text[:MAX_TOOL_RESULT],
                "full_result_ref": ref}
    return None
```

**Tool results persist in the conversation**, so an oversized result consumes context on every subsequent turn. Truncating here bounds it in one place rather than in every tool.

## 5. Why It Matters

- **The before-tool hook is the single enforcement point** for every control.
- **Provenance checking on identifiers** prevents acting on fabricated values.
- **After-tool truncation** bounds context growth in one place.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Controls inside individual tools** | Repeated and inconsistently applied |
| **No provenance check** | Hallucinated identifiers reach execution |
| **Raising instead of returning** | Kills the run rather than refusing |
| **No truncation** | One result consumes the context |
| **Callbacks not idempotent** | Duplicate audit records on retry |
| **Blocking without guidance** | The model can't recover |

**On blocking messages:** a refusal that says only "denied" leaves the model stuck. One that says what went wrong and what to try — "look up the transaction first with get_transactions" — lets it recover in one step. Blocking messages are prompts, and writing them as such is the difference between a graceful refusal and a wasted turn.

**On write operations specifically:** the hard rule is that no write executes on an identifier without provenance — it must have appeared in a prior tool result or directly in the user's message. Reads can tolerate a not-found; writes acting on a fabricated identifier are money moving on a number the model made up.

## 7. Interview Answer

> "The ADK cycle is: the model requests a tool, the before-tool callback runs and can block, the tool executes with access to session state through ToolContext, the after-tool callback can modify the result, and the result goes back into the conversation.
>
> That interception is the whole security story, because the enforcement point is in the framework rather than in each tool. So at the before-tool hook I'd put the complete control set: validate arguments against session scope, check identifier provenance, authorize as the authenticated end user, check the budget, and write an audit record.
>
> Provenance is the one most systems lack, and I'd highlight it. A model will produce a well-formed transaction ID that doesn't exist — schema validation passes, format validation passes, and it's fabricated. Checking that identifiers appeared in a prior tool result, or came directly from the user's message, catches it before any write. That's a few lines and it prevents acting on an invented value.
>
> For writes specifically the rule is hard: no write executes on an identifier without provenance. A read can tolerate a not-found result; a write acting on a fabricated identifier is money moving on a number the model made up.
>
> The after-tool hook is where I'd truncate. Tool results persist in the conversation, so an oversized result consumes context on every subsequent turn — and truncating in the callback bounds it in one place rather than requiring every tool to remember.
>
> Two details. Blocking messages are prompts. A refusal saying only 'denied' leaves the model stuck; one saying what went wrong and what to try — 'look up the transaction first with get_transactions' — lets it recover in a single step. That's the difference between a graceful refusal and a wasted turn.
>
> And callbacks need to be idempotent, because a retried tool call runs the before-tool hook again. Without care that means duplicate audit records, which is a minor problem for reads and a real one for anything an auditor counts.
>
> One thing ADK gives for free: when the model requests several tools in one turn, they can execute concurrently. That's a latency win requiring no code, and it's worth not undoing by adding sequential logic in a callback."

## 8. Likely Follow-ups

**Q: Where do the controls go?**
The before-tool callback — argument scope validation, identifier provenance, authorization as the end user, budget checking, and audit logging. Putting them in the framework hook rather than in each tool means one place to get right and one place to review.

**Q: What's a provenance check?**
Verifying that an identifier in the arguments appeared in a prior tool result or in the user's message, rather than being invented by the model. Schema and format validation both pass on a fabricated ID, so provenance is what actually catches it.

**Q: What's the rule for write operations?**
No write executes on an identifier without provenance. Reads can tolerate a not-found result and adapt, but a write acting on a fabricated identifier is money moving on a number the model produced, which is a correctness failure rather than a quality one.

**Q: Why truncate in the after-tool callback?**
Because tool results persist in the conversation, so an oversized result consumes context on every subsequent turn. Truncating in the callback bounds it centrally rather than requiring every tool to remember — and storing the full result by reference keeps it retrievable.

**Q: How should a block be communicated?**
As a message the model can act on — what went wrong and what to try instead. A bare "denied" leaves it stuck and wastes a turn, whereas "look up the transaction first with get_transactions" lets it recover in one step. Blocking messages are prompts.

## 9. Common Mistakes

- Implementing controls inside individual tools.
- No provenance check on identifiers.
- Allowing writes on unverified identifiers.
- Raising from callbacks instead of returning a refusal.
- Non-idempotent callbacks producing duplicate audit records on retry.

## 10. What to Remember

- **Before-tool is the single enforcement point** for every control.
- **Check identifier provenance** — schema validation doesn't catch fabrication.
- **No writes on unverified identifiers.**
- **Truncate in after-tool**; results persist in the conversation.
- **Blocking messages are prompts** — say what to try instead.
