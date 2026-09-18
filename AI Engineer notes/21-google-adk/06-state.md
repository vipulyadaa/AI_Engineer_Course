# State (ADK)

> **Phase 21 · GOOGLE ADK · Topic 06**

## 1. Definition

The structured data carried within an ADK session, readable and writable by agents and tools through `ToolContext`, with prefixes that scope a value to the session, the user, or the application.

## 2. Simple Explanation

State is what the system knows, as structured fields rather than conversation text.

ADK's distinctive feature is scoping: a key can be session-scoped, user-scoped across all their sessions, or app-scoped globally. Choosing the right scope is a design decision with security consequences.

## 3. How It Works

```python
# in a tool
tool_context.state["transaction"] = txn          # session scope
tool_context.state["user:preferred_language"]    # across sessions
tool_context.state["app:fee_schedule_version"]   # global
tool_context.state["temp:draft"]                 # not persisted
```

| Prefix | Scope | Use |
|---|---|---|
| *(none)* | This session | Conversation facts |
| `user:` | All of this user's sessions | Durable preferences |
| `app:` | All users | Global configuration |
| `temp:` | Not persisted | Working values |

## 4. Practical Example

**Scope choice as a security decision:**

```
user: scope persists across sessions, which makes it the
right place for a language preference and the WRONG place
for anything sensitive that shouldn't outlive a conversation.

app: scope is shared across ALL users. Writing anything
user-specific there is a cross-user data leak — and because
it's a prefix rather than a separate API, it's a one-character
mistake.

So: session scope by default, user: only for durable
non-sensitive preferences, app: only for genuinely global
configuration that no tool writes user data into.
```

**That app-scope risk is the point worth making** — the convenience of prefixes makes the mistake cheap to commit.

**What belongs in state versus conversation:**

```
STATE                          CONVERSATION
verified facts (tier,          what the user said
transaction, waivers)          what the model replied
control values (attempts,
tokens used)
identity (user, tenant)

State is structured, validatable, and readable by code.
Conversation is text the model interprets.

The rule: facts a routing decision or a tool depends on go
in state. If the tier only exists as a sentence the model
wrote, nothing can validate it and the model may restate
it wrongly at step six.
```

**Who writes state:** tools, from real results — never the model's assertions. A tool that looked up the tier writes "Premier" into state directly; the model's later mention of it isn't the source of truth. That's what makes state safe to route on.

**Identity immutability:** `user_id` and `tenant_id` are set at session creation and should never be written by a tool. If a tool could modify them, a prompt injection influencing that tool's behaviour could change whose data is accessed.

## 5. Why It Matters

- **`app:` scope is shared across all users** — a one-character path to a leak.
- **Tools write verified facts, not the model** — that's what makes state trustworthy.
- **Identity immutability** is a security property, not tidiness.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **User data in `app:` scope** | Cross-user leak |
| **Sensitive data in `user:` scope** | Persists beyond the conversation |
| **Model output written into fact fields** | Hallucinations become facts |
| **Mutable identity** | Injection could redirect data access |
| **Unbounded state growth** | Cost and storage |
| **No schema discipline** | Arbitrary keys nobody can reason about |

**On schema discipline:** state is a dictionary, so anything can write any key. Without a documented set of expected keys and who writes them, a system accumulates state nobody understands and tools develop hidden dependencies on values another tool happened to set. Documenting reads and writes per tool keeps it manageable.

**On retention:** `user:`-scoped state persists across sessions, which makes it personal data with retention obligations and an erasure requirement. That's easy to overlook because it feels like framework configuration rather than a customer record.

## 7. Interview Answer

> "ADK state is structured data in a session, accessible to tools through ToolContext. Its distinctive feature is scoping — a key can be session-scoped by default, user-scoped across all that user's sessions with a `user:` prefix, app-scoped globally with `app:`, or temporary with `temp:`.
>
> Scope choice is a security decision, and I'd flag the `app:` prefix specifically. It's shared across all users, so writing anything user-specific there is a cross-user data leak — and because it's a prefix rather than a separate API, it's a one-character mistake. So: session scope by default, `user:` only for durable non-sensitive preferences like language, and `app:` only for genuinely global configuration that no tool writes user data into.
>
> `user:` scope also persists across sessions, which makes it personal data with retention obligations and an erasure requirement. That's easy to overlook because it feels like framework configuration rather than a customer record.
>
> On what goes in state versus conversation: verified facts, control values, and identity go in state; what was said stays in the conversation. The rule I'd use is that any fact a routing decision or a tool depends on goes in state. If the account tier only exists as a sentence the model wrote, nothing can validate it — and the model may restate it wrongly at step six with nothing catching the contradiction.
>
> Critically, tools write verified facts from real results, never the model's assertions. A tool that looked up the tier writes Premier into state directly. The model's later mention of it isn't the source of truth, and that distinction is what makes state safe to route on.
>
> And identity — user_id and tenant_id — is set at session creation and never written by a tool. That's a security property rather than tidiness: if a tool could modify them, a prompt injection influencing that tool's behaviour could change whose data gets accessed.
>
> One discipline point: state is a dictionary, so anything can write any key. Without a documented set of expected keys and who writes them, you accumulate state nobody understands and tools develop hidden dependencies on values another tool happened to set. I'd document reads and writes per tool even if it's just docstrings."

## 8. Likely Follow-ups

**Q: What are the state scopes?**
Session by default, `user:` across all of that user's sessions, `app:` globally across all users, and `temp:` for non-persisted working values. Choosing the wrong one has real consequences, since `app:` is shared by everyone.

**Q: What's the risk with `app:` scope?**
It's shared across all users, so writing user-specific data there leaks it to everyone. And because it's a prefix rather than a separate API, it's a one-character mistake — which is exactly what makes it worth calling out explicitly in review.

**Q: Who writes verified facts?**
Tools, from real results. A tool that looked up the tier writes the value directly; the model's later restatement isn't the source of truth. Letting model output populate fact fields turns hallucinations into recorded facts and makes routing on state unsafe.

**Q: Why is identity immutable?**
Because every retrieval and tool call scopes on user and tenant. If a tool could write those fields, a prompt injection influencing that tool could redirect which customer's data is accessed. Setting them at session creation and never allowing writes removes that path.

**Q: Does `user:` state have compliance implications?**
Yes — it persists across sessions, which makes it personal data subject to retention limits and erasure requests. It's easy to overlook because it reads as framework configuration rather than a customer record, which is precisely why it gets missed.

## 9. Common Mistakes

- Writing user-specific data to `app:` scope.
- Storing sensitive values in `user:` scope where they outlive the conversation.
- Letting model output populate verified-fact fields.
- Allowing tools to write identity fields.
- No documented schema, so tools develop hidden dependencies.

## 10. What to Remember

- **Four scopes:** session, `user:`, `app:`, `temp:` — and `app:` is shared by everyone.
- **Tools write verified facts**, never the model.
- **Identity is set at session creation and immutable.**
- **`user:` state is personal data** — retention and erasure apply.
- **Document who reads and writes each key**, or state becomes unmanageable.
