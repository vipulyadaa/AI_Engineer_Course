# Function Calling

> **Phase 05 · PROMPT ENGINEERING · Topic 13**

## 1. Definition

Giving the model a set of tool schemas and letting it emit structured calls against them. The model decides *which* tool and *what arguments*; your code decides whether to execute. It's the mechanism behind agents and tool use.

## 2. Simple Explanation

You describe the available functions. The model, when it needs one, emits a structured call with arguments conforming to your schema.

The essential point: **the model doesn't execute anything.** It produces a request. Your code validates it, decides whether to run it, and returns the result. That separation is where all the safety lives.

## 3. How It Works

```
1. Define tool schemas (name, description, parameter schema)
2. Send them with the prompt
3. Model returns either an answer OR a tool call
4. YOUR CODE validates and executes
5. Return the result to the model
6. Model produces a final answer, or another tool call
```

```python
tools = [{
  "name": "search_policy",
  "description": "Search bank policy documents. Use for questions "
                 "about fees, terms, or procedures.",
  "parameters": {
    "type": "object",
    "properties": {
      "query":   {"type": "string"},
      "product": {"type": "string",
                  "enum": ["savings","current","credit_card","transfers"]},
    },
    "required": ["query"],
  },
}]
```

**The description is the most important field.** It's how the model decides *when* to use the tool. A vague description produces wrong tool selection, and that's the dominant failure mode.

## 4. Practical Example

**Description quality drives tool selection:**

```
❌ "Searches documents."
   → the model can't tell this from any other search tool

✅ "Search bank policy documents for fees, account terms, and
    procedures. Use for questions about what a product costs
    or how a process works. Do NOT use for account-specific
    balances or transactions — use get_account_details instead."

Include what it's for, when to use it, and — critically —
when NOT to use it relative to similar tools.
```

**The security model, which is where this differs from ordinary prompting:**

```
The model EMITS a call. Your code DECIDES whether to execute.

Every tool call must be:
  1. validated against the schema (constrained decoding helps
     but doesn't guarantee semantic validity)
  2. authorized against the CALLER's permissions, not the
     model's — the model has no identity
  3. logged with arguments, for audit
  4. gated behind human approval if consequential

A model with read-only tools has a bad-answer worst case.
A model with write tools has an incident worst case.
```

**Authorization is the point people miss:**

```python
def execute(tool_call, caller):
    validate_schema(tool_call)
    # The MODEL has no permissions. The CALLER does.
    if not authorized(caller, tool_call.name, tool_call.arguments):
        return {"error": "not authorized"}
    audit_log(caller, tool_call)
    return dispatch(tool_call)
```

**The injection escalation:** retrieved document content can influence which tool the model calls next. That's why least privilege on tool scope is the primary control — prompt defenses are probabilistic, capability limits aren't.

## 5. Why It Matters

- **It's the mechanism behind every agent**, and how RAG extends into tool use.
- **The "model emits, code executes" separation** is the security framing that matters most.
- **Tool descriptions drive selection quality**, which is the practical lever most teams underinvest in.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Vague tool descriptions** | Wrong tool selected; the dominant failure mode |
| **Too many tools** | Selection accuracy degrades past roughly 10–20 |
| **Overlapping tools** | Model can't distinguish; descriptions must disambiguate |
| **Authorizing as the model, not the caller** | The model has no identity — authorize the user |
| **No argument validation** | Schema-valid arguments can still be semantically wrong |
| **Consequential tools without approval** | Injection turns a bad answer into an action |
| **No audit logging of calls** | Can't reconstruct what the system did |

**On tool count:** selection accuracy degrades as the tool set grows. Past roughly ten to twenty, the model confuses similar tools. Mitigations: consolidate overlapping tools, or route — a first-stage classifier narrows to a relevant subset before the model sees the options.

**On parallel calls:** modern APIs support emitting several tool calls at once when they're independent. That's a real latency win over sequential calls, and worth using where the calls genuinely don't depend on each other.

## 7. Interview Answer

> "Function calling gives the model a set of tool schemas and lets it emit structured calls against them. The model decides which tool and what arguments; my code decides whether to execute.
>
> That separation is the essential point and it's where all the safety lives. The model doesn't execute anything — it produces a request. My code validates it against the schema, authorizes it, logs it, and then runs it or doesn't.
>
> The authorization detail people miss: the model has no identity and no permissions. Authorization has to be against the *caller's* entitlements, not some notion of what the model is allowed to do. A tool call to fetch account details gets checked against whether this user can see that account.
>
> The practical lever most teams underinvest in is tool descriptions. That's how the model decides when to use a tool, and a vague description produces wrong selection — which is the dominant failure mode. A good description says what the tool is for, when to use it, and critically when *not* to use it relative to similar tools. 'Searches documents' is useless when there are three search tools.
>
> Tool count matters too. Selection accuracy degrades past roughly ten to twenty tools because the model confuses similar ones. The fixes are consolidating overlapping tools or routing — a first-stage classifier narrows to a relevant subset before the model sees the options.
>
> The security point I'd raise: retrieved document content can influence which tool gets called next. So a model with read-only tools has a bad-answer worst case, while a model with write or transaction tools has an incident worst case. Least privilege on tool scope is the primary control, because prompt defenses are probabilistic and capability limits aren't. And anything consequential goes behind human approval.
>
> One efficiency note: modern APIs support parallel tool calls when the calls are independent, which is a real latency win over sequencing them."

## 8. Likely Follow-ups

**Q: Does the model execute the function?**
No — it emits a structured call. Your code validates, authorizes, logs, and executes. That separation is the entire security model: the model is producing a request, and you retain complete control over whether and how it's fulfilled.

**Q: How do you authorize tool calls?**
Against the caller's entitlements, not the model's — the model has no identity. A call to fetch account details is checked against whether this authenticated user can see that account. Doing it any other way means the model's tool access becomes an authorization bypass.

**Q: What drives tool selection quality?**
The description field. It's how the model decides when to use a tool, and vague descriptions produce wrong selection — the dominant failure mode. A good description covers what the tool is for, when to use it, and when *not* to use it relative to similar tools. That last part is what disambiguates overlapping tools.

**Q: How many tools can a model handle?**
Accuracy degrades past roughly ten to twenty, because similar tools become confusable. The fixes are consolidating overlapping tools into one with a parameter, or routing — a first-stage classifier narrows to a relevant subset so the model chooses among fewer options.

**Q: What's the security concern?**
Retrieved content can influence which tool gets called. In single-pass RAG, injected text affects the answer; with tools it affects actions. So least privilege on tool scope is the primary control — a read-only model's worst case under a successful injection is a bad answer, while a model with write access has an incident. Consequential actions also get human approval.

## 9. Common Mistakes

- Vague tool descriptions that don't disambiguate similar tools.
- Authorizing against the model rather than the caller.
- Exposing too many tools at once.
- Not validating arguments beyond schema conformance.
- Granting write or transaction tools without human approval gates.

## 10. What to Remember

- **The model emits a call; your code executes.** That separation is the security model.
- **Authorize against the caller's permissions** — the model has no identity.
- **Tool descriptions drive selection** — say what it's for and when NOT to use it.
- **Accuracy degrades past ~10–20 tools.** Consolidate or route.
- **Least privilege is the primary control** — injection can influence which tool is called.
