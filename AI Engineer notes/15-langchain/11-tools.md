# Tools (in LangChain)

> **Phase 15 · LANGCHAIN · Topic 11**

## 1. Definition

Callable functions exposed to a model with a name, description, and argument schema. LangChain's `@tool` decorator derives the schema from type hints and the description from the docstring.

## 2. Simple Explanation

A tool is a Python function the model can ask to run. You write the function; the decorator turns its signature and docstring into the schema the model sees.

That convenience has a consequence worth internalizing: **the docstring is a prompt**, not documentation.

## 3. How It Works

```python
from langchain_core.tools import tool

@tool
def get_transaction_fee(transaction_id: str) -> str:
    """Retrieve the fee charged on a specific transaction.

    Use when the customer asks what they were actually charged.
    Do NOT use for published fee rates — use get_fee_schedule
    for those.

    Args:
        transaction_id: Format TXN-XXXXXXXX.
    """
    ...

llm_with_tools = llm.bind_tools([get_transaction_fee, ...])
```

**`bind_tools` attaches the schemas to the model.** The response then contains `tool_calls` the application executes — the model never runs anything itself.

**`StructuredTool.from_function`** and Pydantic `args_schema` give more control where the decorator's inference isn't enough.

## 4. Practical Example

**The docstring determines whether the right tool is chosen:**

```
WEAK   """Gets fee information."""
       → ambiguous against three other fee-related tools

STRONG """Retrieve the fee charged on a specific transaction.
        Use when the customer asks what they were actually
        charged. Do NOT use for published rates — use
        get_fee_schedule for those."""
       → the negative guidance resolves the exact confusion

Most tool selection failures are docstring failures. It's
worth treating them as prompt engineering and iterating on
them with a labelled query set.
```

**Authorization is not the decorator's job:**

```python
@tool
def get_transaction_fee(transaction_id: str) -> str:
    """..."""
    # ← nothing here knows WHO is asking

The tool has no access to the authenticated user unless you
give it one. Options:
  · close over the session when constructing tools per request
  · use an injected-argument mechanism so the model can't
    supply the user identity
  · check permissions in the executor before invoking

What must NOT happen is a user_id parameter the MODEL fills
in — that's an authorization bypass by design, and the
decorator makes it the path of least resistance.
```

**That last point is the important one:** the ergonomic thing — adding `user_id: str` to the signature — is the insecure thing, because the model then supplies it.

**Error handling:** returning a descriptive error string from the tool lets the agent adapt; raising kills the run. `handle_tool_error` supports this, and a message saying what went wrong and what to try is far more useful than an exception message.

## 5. Why It Matters

- **The docstring is a prompt**, and it's the main lever on tool selection.
- **User identity must never be a model-supplied parameter** — the ergonomic path is the insecure one.
- **Returning errors as strings** lets the agent recover.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Vague docstrings** | Wrong tool selected |
| **`user_id` as a model parameter** | Authorization bypass |
| **Raising instead of returning errors** | The run dies, work is lost |
| **Unbounded return size** | One call destroys the context |
| **Too many tools bound** | Selection accuracy degrades past ~15–20 |
| **Schema inferred from loose types** | `dict` or `Any` gives the model no guidance |

**On return size:** a tool returning a full transaction list can be tens of thousands of tokens. Capping the return at the tool — summarizing or paginating — is the fix, because no agent-side handling recovers a context already consumed.

**On schema inference:** the decorator infers the schema from type hints, so `def f(params: dict)` gives the model nothing to work with. Explicit typed parameters with per-field descriptions, or a Pydantic `args_schema`, produce far better argument construction.

## 7. Interview Answer

> "In LangChain a tool is a Python function exposed to the model, with the `@tool` decorator deriving the argument schema from type hints and the description from the docstring. `bind_tools` attaches the schemas, and the response contains tool calls the application executes — the model never runs anything itself.
>
> The consequence worth internalizing is that the docstring is a prompt, not documentation. 'Gets fee information' is ambiguous against three other fee-related tools. 'Retrieve the fee charged on a specific transaction — use when the customer asks what they were actually charged; do NOT use for published rates, use get_fee_schedule for those' resolves exactly the confusion the first one leaves open. Most tool selection failures are docstring failures, so I'd treat them as prompt engineering and iterate against a labelled query set.
>
> The security point I'd raise is authorization, because the decorator makes the insecure thing the path of least resistance. The tool function has no idea who's asking unless you give it that. The ergonomic move is adding a user_id parameter to the signature — and that's an authorization bypass by design, because the model then supplies it. The right approaches are closing over the session when constructing tools per request, using an injected-argument mechanism the model can't populate, or checking permissions in the executor before invoking. But never a model-supplied identity.
>
> On schema quality, the decorator infers from type hints, so a function taking a plain dict gives the model nothing to work with. Explicit typed parameters with per-field descriptions, or a Pydantic args_schema, produce much better argument construction.
>
> Two operational points. I'd return errors as descriptive strings rather than raising — a message saying what went wrong and what to try lets the agent adapt, while an exception kills the run and discards everything already established. And I'd cap return size at the tool, because a call returning a full transaction list can be tens of thousands of tokens, and no agent-side handling recovers a context that's already consumed."

## 8. Likely Follow-ups

**Q: What does the `@tool` decorator do?**
Derives the argument schema from type hints and the tool description from the docstring, producing what the model sees. That makes the docstring a prompt rather than documentation, and it makes type hint quality directly determine how well the model constructs arguments.

**Q: How do you handle authorization?**
Never with a model-supplied user parameter — that's a bypass by design. Close over the authenticated session when constructing tools per request, use an injected-argument mechanism the model can't fill, or check permissions in the executor before invoking. The ergonomic path here is the insecure one.

**Q: How do you improve tool selection?**
Rewrite the docstrings, particularly adding negative guidance — what the tool is *not* for and which tool to use instead. Most selection failures are description failures rather than model limitations, and iterating docstrings against a labelled query set is the effective loop.

**Q: Should tools raise or return errors?**
Return descriptive error strings. Raising kills the run and discards all prior work, while a returned message saying what failed and what to try lets the agent correct arguments, switch tools, or explain the limitation to the user.

**Q: What about tool output size?**
Cap it at the tool. A call returning a full transaction list can be tens of thousands of tokens, and once that's in the context there's no recovering it — summarize or paginate at the source rather than trying to handle it downstream.

## 9. Common Mistakes

- Writing docstrings as documentation rather than selection prompts.
- Adding a `user_id` parameter the model fills in.
- Using loose types like `dict` so no useful schema is inferred.
- Raising exceptions from tools.
- Returning unbounded results into the context.

## 10. What to Remember

- **The docstring is a prompt** — include negative guidance.
- **Never let the model supply user identity** — close over the session instead.
- **Type hints determine schema quality**; use explicit types or `args_schema`.
- **Return errors as strings**, don't raise.
- **Cap return size at the tool** — context can't be un-consumed.
