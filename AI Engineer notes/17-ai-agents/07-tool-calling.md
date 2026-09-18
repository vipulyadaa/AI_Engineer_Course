# Tool Calling

> **Phase 17 · AI AGENTS · Topic 07**

## 1. Definition

The mechanism by which a model requests that the system execute a named function with structured arguments. The model doesn't run anything — it emits a request, and your code decides whether and how to execute it.

## 2. Simple Explanation

You describe the available functions to the model. When it wants one, it outputs a structured call — name plus arguments — instead of text.

Your code receives that, validates it, executes it, and sends the result back. The model never touches your systems directly, which is the property that makes it safe to design around.

## 3. How It Works

```
1. DECLARE    tool schemas in the request (name, description,
              JSON Schema for parameters)
2. MODEL      returns a tool_call: {name, arguments}
3. VALIDATE   arguments against the schema AND against
              business rules
4. AUTHORIZE  check the END USER may perform this action
5. EXECUTE    run it
6. RETURN     the result as a tool message
7. CONTINUE   the model sees the result and proceeds
```

**Steps 3 and 4 are yours, and they're the ones that matter.** The model proposes; your code disposes.

## 4. Practical Example

**A tool definition, with the parts that actually affect behaviour:**

```python
{
  "name": "get_transaction_fee",
  "description": (
      "Retrieve the fee charged on a specific transaction. "
      "Use when the customer asks what they were charged. "
      "Does NOT return the fee SCHEDULE — for policy rates "
      "use get_fee_schedule."                  # ← disambiguation
  ),
  "parameters": {
    "type": "object",
    "properties": {
      "transaction_id": {"type": "string",
                         "description": "Format: TXN-XXXXXXXX"},
    },
    "required": ["transaction_id"],
  },
}
```

**The description is the prompt.** Tool selection accuracy is mostly a function of description quality, and the highest-value sentences are the ones that distinguish this tool from the similar one next to it. Most tool-selection failures are description problems, not model problems.

**Authorization is the critical design point:**

```python
def execute(call, user):
    args = validate_schema(call.arguments)        # structure

    if not can(user, call.name, args):            # ← the user's
        return "Error: not authorized for this account."
                                                  #   permissions,
    return TOOLS[call.name](**args, actor=user)   #   not the
                                                  #   service's
```

```
If tools run with the SERVICE's permissions, the agent is a
privilege escalation path — a user can ask for any account
and get it.

Tools must act as the authenticated end user. And a denial
should be returned to the MODEL as a result, not raised —
so the agent can tell the user it can't access that, rather
than crashing.
```

## 5. Why It Matters

- **It's what makes an agent able to do anything** beyond generate text.
- **Tool descriptions are prompts** and are the main lever on selection accuracy.
- **Authorization at the tool boundary** is the defining security control.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Vague descriptions** | Wrong tool selected |
| **Overlapping tools** | Model can't distinguish them |
| **Too many tools** | Selection accuracy degrades past ~15–20 |
| **Hallucinated arguments** | Plausible but non-existent IDs |
| **Service-level permissions** | Privilege escalation |
| **Unbounded results** | Context destroyed by one call |
| **Errors raised, not returned** | The agent can't adapt |

**On hallucinated arguments:** a model will confidently produce a transaction ID that looks right and doesn't exist. Validating format is easy; validating *existence* requires a lookup, and the safe pattern is for tools to return "not found" as a result the model can react to rather than as an exception. Never let a hallucinated identifier reach a write operation.

**On tool count:** past roughly fifteen to twenty tools, selection accuracy falls noticeably. The fixes are grouping related operations into one tool with a mode parameter, or hierarchical selection where the agent first picks a category. Both are better than presenting forty flat options.

## 7. Interview Answer

> "Tool calling is how a model requests that the system execute a named function with structured arguments. The important framing is that the model doesn't run anything — it emits a request, and my code validates, authorizes, executes, and returns the result. The model proposes; the code disposes.
>
> The flow is: declare tool schemas in the request, the model returns a tool call, I validate the arguments against the schema and against business rules, I check the end user is authorized, execute, and return the result as a tool message so the model can continue. Validation and authorization are the steps that are mine, and they're the ones that matter.
>
> Something worth stressing: tool descriptions are prompts. Tool selection accuracy is mostly a function of description quality, and the highest-value sentences are the ones distinguishing a tool from the similar one next to it — 'use this for what the customer was charged, not for the fee schedule; for policy rates use get_fee_schedule'. Most selection failures are description problems, not model problems, and people debug the wrong thing.
>
> The critical design point in banking is authorization. Tools must act as the authenticated end user, not the service account. If they run with service permissions, the agent is a privilege escalation path — a user asks about any account and gets it. And a denial should be returned to the model as a result rather than raised, so the agent can tell the user it can't access that instead of crashing.
>
> Two failure modes I'd design for. Hallucinated arguments — a model will confidently produce a transaction ID that looks right and doesn't exist. Format validation is easy, existence validation needs a lookup, and the safe pattern is returning 'not found' as a result the model reacts to. A hallucinated identifier should never reach a write operation.
>
> And tool count. Past roughly fifteen to twenty tools, selection accuracy falls off noticeably. The fixes are grouping related operations into one tool with a mode parameter, or hierarchical selection where the agent picks a category first — both better than forty flat options."

## 8. Likely Follow-ups

**Q: Does the model execute the tool?**
No. It emits a structured request — a name and arguments — and your code decides whether to execute it. That separation is what makes the pattern safe to build on: validation, authorization, rate limiting, and auditing all happen in your code, not the model's.

**Q: What determines tool selection accuracy?**
Description quality, mostly. The descriptions are prompts, and the sentences that disambiguate one tool from a similar one matter most. Most selection failures are description problems rather than model limitations, so that's where I'd look before reaching for a larger model.

**Q: How many tools can an agent handle?**
Accuracy degrades noticeably past roughly fifteen to twenty. Beyond that I'd group related operations into a single tool with a mode parameter, or use hierarchical selection where the agent picks a category before a specific tool. Forty flat options reliably produces confusion.

**Q: How do you handle authorization?**
At the tool boundary, acting as the authenticated end user rather than the service account — otherwise the agent becomes a privilege escalation path. And a denial should be returned to the model as a tool result so it can explain the limitation, rather than raised as an exception that kills the run.

**Q: What about hallucinated arguments?**
Validate format against the schema, then validate existence with a lookup where it matters. Return "not found" as a result the model can react to rather than as an exception. The hard rule is that a hallucinated identifier must never reach a write operation — reads can tolerate it, writes can't.

## 9. Common Mistakes

- Treating tool descriptions as documentation rather than prompts.
- Running tools with service-account permissions.
- Raising authorization denials instead of returning them to the model.
- Presenting dozens of flat tools without grouping.
- Allowing unvalidated identifiers to reach write operations.

## 10. What to Remember

- **The model proposes; your code validates, authorizes, and executes.**
- **Tool descriptions are prompts** — disambiguation sentences matter most.
- **Authorize as the end user**, never the service account.
- **Return errors and denials to the model**, don't raise them.
- **Keep the tool count under ~15–20**, or group hierarchically.
