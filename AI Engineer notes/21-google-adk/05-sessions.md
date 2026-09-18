# Sessions (ADK)

> **Phase 21 · GOOGLE ADK · Topic 05**

## 1. Definition

An ADK session is one conversation: its event history, its state, and its identity. A session service stores them — in memory for development, or in a managed or database-backed service for production.

## 2. Simple Explanation

A session is the container for a conversation. It holds what was said, what the system established, and who it belongs to.

The security-critical part is the last one: a session belongs to a user, and that binding has to be enforced rather than assumed.

## 3. How It Works

```python
session = session_service.create_session(
    app_name="banking_assistant",
    user_id=authenticated_user_id,      # ← from the verified session
    state={"tenant_id": tenant, "acl_groups": groups},
)

runner.run(user_id=authenticated_user_id,
           session_id=session.id,
           new_message=message)
```

**Session services:** in-memory (development), database-backed, or the managed Vertex AI session service. Production needs a durable one — an in-memory service loses everything on restart and can't scale beyond one instance.

## 4. Practical Example

**The security requirement, stated plainly:**

```
A session ID is a string. If it comes from client input
without verification, a user can request another user's
session and read their conversation and state.

So:
  · derive user_id from the authenticated session server-side
  · verify on every request that the session's user_id
    matches the authenticated caller, and refuse otherwise

The second check is the one that holds even if the first is
bypassed — and session state contains customer data, so the
failure is a breach rather than a bug.
```

**That's the most important thing to say about sessions**, and it's easy to get wrong because the API accepts a session ID as an ordinary parameter.

**The session store is a customer data store:**

```
It holds conversation content and established facts — account
tier, transaction details, what the customer asked.

So it needs:
  · encryption at rest
  · IAM-restricted access
  · a retention policy
  · a deletion path for erasure requests
  · to be in-region for residency

Treating it as framework infrastructure rather than a
customer data store is the compliance gap.
```

**Practical session lifecycle decisions:**

```
· when does a session expire? an abandoned conversation
  holding state indefinitely is both a cost and a data
  retention issue
· what happens on a new session — are established facts
  carried over, or re-established?
· is a session resumable after hours, and if so are
  time-sensitive facts re-validated?

That last one matters: a tier read yesterday may not be
the tier today.
```

## 5. Why It Matters

- **Session-to-user binding must be verified**, not assumed from the ID.
- **The session store is a customer data store** with full data-protection obligations.
- **Session expiry and fact re-validation** are decisions that are easy to skip.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unverified session ownership** | Cross-user conversation access |
| **In-memory service in production** | State lost on restart; can't scale |
| **No expiry** | Cost and retention issues accumulate |
| **Session store outside retention policy** | Compliance gap |
| **Stale facts on resume** | Acting on yesterday's tier or balance |
| **Unbounded event history** | Context and cost grow every turn |

**On event history growth:** a long conversation accumulates events, and every turn re-sends the relevant history to the model. Without a policy — summarize older turns, keep recent ones verbatim, always keep the original request — cost per turn rises continuously and the model can lose the original goal.

**On re-validation:** resuming a session that's hours old means the established facts in state were read then. For anything time-sensitive — a balance, a tier, a permission — re-reading before acting is the correct behaviour, and it's easy to skip because resumption feels like continuation rather than a fresh decision.

## 7. Interview Answer

> "An ADK session is one conversation — its event history, its state, and its identity. A session service stores them, and production needs a durable one, because an in-memory service loses everything on restart and can't scale past a single instance.
>
> The most important thing about sessions is the security binding. A session ID is just a string, and if it comes from client input without verification a user can request someone else's session and read their conversation and state. So I'd derive the user ID from the authenticated session server-side, and verify on every request that the session's user ID matches the authenticated caller, refusing otherwise. That second check is what holds even if the first is bypassed — and session state contains customer data, so the failure is a breach rather than a bug. It's easy to get wrong because the API takes a session ID as an ordinary parameter.
>
> The session store itself is a customer data store. It holds conversation content and established facts — account tier, transaction details, what the customer asked. So it needs encryption at rest, IAM-restricted access, a retention policy, a deletion path for erasure requests, and in-region storage for residency. Treating it as framework infrastructure is the compliance gap, and it's an easy one to create.
>
> Three lifecycle decisions I'd make explicitly. When does a session expire — an abandoned conversation holding state indefinitely is both a cost and a retention issue. What happens on a new session — are established facts carried over or re-established. And is a session resumable after hours.
>
> That last one matters most. Resuming a session that's hours old means the facts in state were read then, and for anything time-sensitive — a balance, a tier, a permission — re-reading before acting is correct. It's easy to skip because resumption feels like continuation rather than a fresh decision.
>
> And I'd manage event history growth. Every turn re-sends the relevant history, so without a policy — summarize older turns, keep recent ones verbatim, always keep the original request unchanged — cost per turn rises continuously and the model can lose track of the original goal."

## 8. Likely Follow-ups

**Q: What's the security concern with sessions?**
Session IDs are strings, so if they come from client input without verification, a user can access another user's conversation and state. The user ID must be derived from the authenticated session server-side, and ownership verified on every request before the session is used.

**Q: Which session service for production?**
A durable one — database-backed or the managed Vertex AI session service. In-memory loses everything on restart and can't scale beyond a single instance, so it's development only. And the durable store needs to be in-region for residency.

**Q: Is the session store subject to data protection?**
Yes — it holds conversation content and established customer facts, so it needs encryption, access control, retention limits, and a deletion path for erasure requests. Treating it as framework infrastructure rather than a customer data store is a real compliance gap.

**Q: What about resuming an old session?**
Time-sensitive facts need re-validating. A tier or balance read yesterday may not be current, and resumption feels like continuation rather than a fresh decision, so the re-read is easy to skip. For anything the customer might act on, re-read before using.

**Q: How do you manage growing history?**
With an explicit policy — summarize older turns, keep recent ones verbatim, and always keep the original request unchanged as the anchor. Every turn re-sends history, so without that, cost per turn rises continuously and the model drifts from the original goal.

## 9. Common Mistakes

- Trusting a client-supplied session ID.
- Using an in-memory session service in production.
- Excluding the session store from retention and erasure policies.
- Resuming without re-validating time-sensitive facts.
- No policy for event history growth.

## 10. What to Remember

- **Verify session ownership against the authenticated user** on every request.
- **Durable session service in production**, in-region.
- **The session store is a customer data store** — retention and erasure apply.
- **Re-validate time-sensitive facts on resume.**
- **Manage history growth**; keep the original request verbatim.
