# Function Calling (Gemini)

> **Phase 19 · GOOGLE GEMINI · Topic 10**

## 1. Definition

Declaring functions to Gemini so it can request their execution with structured arguments. The model emits a `FunctionCall`; your code validates, authorizes, executes, and returns a `FunctionResponse`.

## 2. Simple Explanation

You describe what functions exist. Gemini decides when one is needed and produces the name and arguments.

It doesn't execute anything. That separation is what makes the pattern safe to build on — every control point is in your code.

## 3. How It Works

```python
tool = Tool(function_declarations=[
    FunctionDeclaration(
        name="get_transaction_fee",
        description=(
            "Retrieve the fee charged on a specific transaction. "
            "Use when the customer asks what they were actually "
            "charged. NOT for published rates — use "
            "get_fee_schedule for those."
        ),
        parameters={
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string",
                                   "description": "Format TXN-XXXXXXXX"},
            },
            "required": ["transaction_id"],
        },
    ),
])

response = model.generate_content(contents, tools=[tool])
call = response.candidates[0].content.parts[0].function_call
# validate → authorize → execute → return FunctionResponse
```

**Tool config controls the mode:** `AUTO` lets the model decide, `ANY` forces a call, `NONE` disables calling. Forcing a call is how you use function calling purely for structured extraction.

## 4. Practical Example

**Parallel function calling is a direct latency win:**

```
Gemini can return SEVERAL function calls in one response when
the tasks are independent:

  get_customer_tier(...)
  get_transaction(...)
  count_waivers_mtd(...)

Executing those concurrently turns three sequential rounds
into one. It's a real latency reduction and it's commonly
left unused because the obvious implementation loops over
the calls one at a time.
```

**The description is the prompt:**

```
Selection accuracy is mostly a function of description
quality, and negative guidance is the highest-value part —
"NOT for published rates, use get_fee_schedule for those"
resolves exactly the ambiguity the positive description
leaves open.

Most selection failures are description failures, not model
failures, and people debug the wrong layer.
```

**The banking control points:**

```python
def handle(call, session):
    if call.args.get("account_id") not in session.accounts:   # scope
        return err("That account is not in this session.")
    if not session.user.can(call.name):                       # authz
        return err("You don't have access to that.")
    audit.log(session.user_id, call.name, dict(call.args))     # audit
    return TOOLS[call.name](**call.args, actor=session.user)   # as user
```

```
Never a user_id parameter the MODEL fills in. That's an
authorization bypass by design, and it's the ergonomic
choice, which is what makes it dangerous.

Identity comes from the session, closed over or injected —
never from the model.
```

## 5. Why It Matters

- **The model proposes, your code disposes** — every control is yours.
- **Parallel calls** are free latency that's routinely left unused.
- **Model-supplied identity** is the authorization bypass to design out.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Vague descriptions** | Wrong function selected |
| **`user_id` as a model parameter** | Authorization bypass |
| **Hallucinated arguments** | Well-formed, non-existent identifiers |
| **Sequential execution of parallel calls** | Avoidable latency |
| **Too many declarations** | Selection degrades past ~15–20 |
| **Unbounded responses** | One call consumes the context |

**On hallucinated arguments:** Gemini will produce a well-formed transaction ID that doesn't exist. Format validation is easy; existence validation needs a lookup. The hard rule is that no write operation acts on an identifier that didn't come from a prior function response or directly from the user.

**On `FunctionResponse` size:** the response goes back into the conversation, so a function returning a large payload consumes context on every subsequent turn. Truncating at the function boundary, with the full result retrievable by reference, is the fix — no downstream handling recovers context already spent.

## 7. Interview Answer

> "Function calling in Gemini is declaring functions with a name, description, and JSON Schema parameters. The model emits a FunctionCall with the name and arguments, and my code validates, authorizes, executes, and returns a FunctionResponse. The model never executes anything, which is what makes the pattern safe — every control point is in my code.
>
> Tool config sets the mode: AUTO lets the model decide, ANY forces a call, NONE disables it. Forcing a call is how you use function calling purely for structured extraction, with nothing actually executed.
>
> Two things I'd emphasize. First, parallel function calling — Gemini can return several calls in one response when the tasks are independent, like fetching tier, transaction, and waiver count together. Executing those concurrently turns three sequential rounds into one. It's a real latency win and it's routinely left unused, because the obvious implementation loops over the calls one at a time.
>
> Second, the description is a prompt, not documentation. Selection accuracy is mostly description quality, and negative guidance is the highest-value part — 'not for published rates, use get_fee_schedule for those' resolves exactly the ambiguity the positive description leaves open. Most selection failures are description failures, and people debug the model instead.
>
> For banking, the control points in my handler are: validate arguments against the session's scope, check the user's authorization, write an audit record, and execute as the authenticated user. And critically, never a user_id parameter the model fills in — that's an authorization bypass by design, and it's the ergonomic choice, which is what makes it dangerous. Identity comes from the session, closed over or injected.
>
> Two failure modes. Hallucinated arguments — Gemini will produce a well-formed transaction ID that doesn't exist. Format validation is easy, existence validation needs a lookup, and the hard rule is that no write operation acts on an identifier that didn't come from a prior function response or the user directly.
>
> And response size. The FunctionResponse goes back into the conversation, so a large payload consumes context on every subsequent turn. Truncate at the function boundary with the full result retrievable by reference — no downstream handling recovers context already spent."

## 8. Likely Follow-ups

**Q: Does Gemini execute the function?**
No — it returns a FunctionCall with a name and arguments, and your code decides whether to execute. That separation is what allows validation, authorization, rate limiting, and auditing to live in your code rather than depending on the model behaving.

**Q: What is parallel function calling?**
Gemini returning several independent function calls in one response. Executing them concurrently collapses multiple sequential rounds into one, which is a direct latency reduction — and it's commonly unused because the natural implementation loops over the calls sequentially.

**Q: What drives selection accuracy?**
Description quality, especially negative guidance saying what a function is not for and naming the alternative. Most selection failures come from descriptions that don't disambiguate similar functions, so that's the layer to fix rather than the model.

**Q: How do you handle identity?**
From the authenticated session, closed over when constructing handlers or injected server-side — never as a parameter the model fills in. A user_id argument the model supplies is an authorization bypass by design, and it's the path of least resistance, which is what makes it a real risk.

**Q: What about hallucinated arguments?**
Validate format against the schema and existence with a lookup where it matters, returning "not found" as a response the model can react to. The hard rule is that no write operation acts on an identifier lacking provenance from a prior function response or the user.

## 9. Common Mistakes

- Writing descriptions as documentation rather than selection prompts.
- Accepting user identity as a model-supplied argument.
- Executing parallel calls sequentially.
- Allowing writes on identifiers with no provenance.
- Returning unbounded payloads into the conversation.

## 10. What to Remember

- **The model proposes; your code validates, authorizes, executes.**
- **Parallel calls collapse rounds** — execute them concurrently.
- **Descriptions are prompts** — negative guidance matters most.
- **Identity from the session, never from the model.**
- **Truncate responses** — they persist in the conversation.
