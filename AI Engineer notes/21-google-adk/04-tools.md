# Tools (ADK)

> **Phase 21 · GOOGLE ADK · Topic 04**

## 1. Definition

Capabilities available to an ADK agent — Python functions, built-in tools like Google Search and code execution, other agents used as tools, and third-party integrations — with the schema derived from type hints and the description from the docstring.

## 2. Simple Explanation

A tool is a Python function the agent can ask to run. ADK derives the argument schema from your type hints and the tool description from your docstring.

Which means the docstring is a prompt, and the type hints determine how well the model constructs arguments.

## 3. How It Works

```python
def get_transaction_fee(transaction_id: str,
                        tool_context: ToolContext) -> dict:
    """Retrieve the fee charged on a specific transaction.

    Use when the customer asks what they were actually charged.
    NOT for published rates — use get_fee_schedule for those.

    Args:
        transaction_id: Format TXN-XXXXXXXX.
    """
    user = tool_context.state["user"]        # ← identity from state
    ...
```

**`ToolContext` gives access to session state**, which is how a tool reaches the authenticated user's identity without the model supplying it.

**Tool categories:** function tools (your own), built-in tools (Google Search, code execution), agent tools (another agent as a tool), and integrations.

## 4. Practical Example

**The `ToolContext` pattern is the security answer:**

```
The dangerous alternative is a user_id parameter in the
signature — because then the MODEL fills it in, which is
an authorization bypass by design. And it's the ergonomic
choice, which is what makes it a real risk.

ToolContext gives the tool access to session state, where
the authenticated user was placed at session creation.
The model never sees it and can't influence it.

That's the pattern to name explicitly: identity comes from
session state, never from tool arguments.
```

**Built-in tools need a deliberate decision:**

```
GOOGLE SEARCH
  Good for general-knowledge assistants. Wrong for a banking
  system whose requirement is answering from approved
  documentation — it admits unvetted public content, which
  is also an uncontrolled indirect injection surface.

CODE EXECUTION
  Useful narrowly: a computed number is correct where a
  model-generated one may not be. Good for arithmetic over
  data already in context; not a general capability.

Enabling a built-in tool is a governance decision, because
it changes where the agent's information can come from.
```

**Tool descriptions as prompts:**

```
Selection accuracy is mostly docstring quality, and the
highest-value part is negative guidance — "NOT for published
rates, use get_fee_schedule for those."

Most selection failures are docstring failures, and people
debug the model instead of the description.
```

**Return size:** tool results enter the conversation and persist, so a tool returning a large payload consumes context on every subsequent turn. Truncating at the tool, with the full result retrievable by reference, is the fix.

## 5. Why It Matters

- **`ToolContext` for identity** is the pattern that prevents the authorization bypass.
- **Built-in tools are governance decisions**, especially Google Search in a closed corpus.
- **Docstrings are prompts** and are the main lever on selection accuracy.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **`user_id` as a tool parameter** | Authorization bypass |
| **Google Search in a closed-corpus system** | Unvetted sources, injection surface |
| **Vague docstrings** | Wrong tool selected |
| **Loose type hints** | Poor argument construction |
| **Unbounded returns** | Context consumed on every later turn |
| **Raising instead of returning errors** | The run dies, work is lost |

**On type hints:** ADK derives the schema from them, so a function taking a plain `dict` gives the model nothing to work with. Explicit typed parameters with per-argument descriptions produce noticeably better argument construction, and it's a cheap improvement.

**On errors:** returning a descriptive error string lets the agent adapt — correct the argument, try another tool, or explain the limitation. Raising kills the run and discards everything already established, which is almost always the worse outcome.

## 7. Interview Answer

> "An ADK tool is a Python function, with the argument schema derived from type hints and the description from the docstring. So the docstring is a prompt and the type hints determine how well the model constructs arguments — a function taking a plain dict gives the model nothing to work with.
>
> The pattern I'd name explicitly is ToolContext for identity. The dangerous alternative is putting a user_id parameter in the signature, because then the model fills it in — and that's an authorization bypass by design. It's also the ergonomic choice, which is what makes it a real risk. ToolContext gives the tool access to session state, where the authenticated user was placed at session creation, so the model never sees it and can't influence it. Identity comes from session state, never from tool arguments.
>
> On docstrings: selection accuracy is mostly docstring quality, and the highest-value part is negative guidance — 'not for published rates, use get_fee_schedule for those' resolves exactly the ambiguity the positive description leaves open. Most selection failures are docstring failures and people debug the model instead.
>
> Built-in tools need a deliberate decision because they change where the agent's information can come from. Google Search is good for a general-knowledge assistant and wrong for a banking system whose requirement is answering from approved documentation — it admits unvetted public content, which is also an uncontrolled indirect injection surface. Code execution I'd use narrowly, for arithmetic over data already in context, because a computed number is correct where a model-generated one may not be. Enabling either is a governance decision rather than a feature toggle.
>
> Two implementation points. Return size: tool results enter the conversation and persist, so a large payload consumes context on every subsequent turn. Truncate at the tool with the full result retrievable by reference.
>
> And errors: return a descriptive error string rather than raising. That lets the agent correct the argument, try a different tool, or explain the limitation to the customer. Raising kills the run and discards everything already established, which is almost always worse."

## 8. Likely Follow-ups

**Q: How does a tool know who the user is?**
Through `ToolContext`, which gives access to session state where the authenticated user was placed at session creation. Never through a parameter in the signature — that would mean the model supplies the identity, which is an authorization bypass by design.

**Q: What drives tool selection accuracy?**
Docstring quality, particularly negative guidance stating what a tool is not for and naming the alternative. Most selection failures are description failures rather than model limitations, so that's the layer to fix before reaching for a stronger model.

**Q: Would you enable Google Search as a tool?**
Not in a banking system. The requirement is answering from approved documentation, and web grounding admits unvetted public content — which also opens an uncontrolled indirect injection surface. Enabling a built-in tool is a governance decision because it changes where information can come from.

**Q: What about code execution?**
Narrowly useful. A computed number is correct where a model-generated one may not be, so it's worth having for arithmetic over data already in context. I wouldn't treat it as a general capability, since it's sandboxed code the model wrote.

**Q: How should tools handle errors?**
By returning a descriptive error string rather than raising. That lets the agent correct arguments, switch tools, or explain the limitation, whereas raising kills the run and throws away everything already established — usually a large amount of useful work.

## 9. Common Mistakes

- Putting user identity in the tool signature.
- Writing docstrings as documentation rather than selection prompts.
- Enabling built-in search in a closed-corpus system.
- Loose type hints producing an unhelpful schema.
- Raising exceptions from tools instead of returning errors.

## 10. What to Remember

- **`ToolContext` for identity** — never a model-supplied parameter.
- **Docstrings are prompts**; negative guidance matters most.
- **Built-in tools are governance decisions**, not feature toggles.
- **Type hints determine schema quality** — be explicit.
- **Truncate returns; return errors rather than raising.**
