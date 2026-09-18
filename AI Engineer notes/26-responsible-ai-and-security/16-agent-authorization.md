# Agent Authorization

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 16**

## 1. Definition

Ensuring an agent acts only within the authority of the user who invoked it. The central problem is that an agent has two identities — the service account it runs as, and the user it acts for — and conflating them is a privilege escalation path.

## 2. Simple Explanation

The agent process needs permissions to call models and query indexes. The user needs permissions to see their own account data.

Those are different, and if tools execute with the first instead of the second, anyone who can talk to the agent can reach everything the agent can reach.

## 3. How It Works

```
TWO IDENTITY LAYERS

SERVICE ACCOUNT    platform access — call Gemini, query the
                   index, write logs
                   → the agent's own identity

END USER           data access — which accounts, which
                   documents, which actions
                   → propagated into every tool call

Conflating them = confused deputy.
The agent, holding broad authority, acts on behalf of a
user who doesn't have it.
```

**The ergonomic implementation is the insecure one**, which is why this recurs: adding a `user_id` parameter to a tool signature is the obvious thing, and it means the model supplies the identity.

## 4. Practical Example

**How identity actually reaches a tool:**

```
WRONG
  def get_balance(account_id: str, user_id: str):
      # the MODEL fills in user_id
      # → it can claim to be anyone

RIGHT
  identity comes from the session, not the arguments:
    · close over the authenticated user when constructing
      tools per request, or
    · read it from session state via a tool context, or
    · check permissions in the executor before invoking

The model never sees or supplies the identity. It can't
influence what it can't provide.
```

**The layered check at the tool boundary:**

```
1. ARGUMENT SCOPE     is this account in the session's set?
2. PROVENANCE         did this identifier come from a prior
                      tool result or the user?
3. AUTHORIZATION      may this user perform this operation?
4. AUDIT              record who, what, when, allowed
5. EXECUTE            as the user

All five in one place — a before-tool hook or an executor
wrapper. Not repeated in twenty tool implementations, where
one will eventually be missed.
```

**That single-chokepoint property is the design argument:** it's fewer places to get wrong, and "show me every tool call is authorized" becomes a one-line answer for a reviewer.

**Denials return to the model, not as exceptions:**

```
return {"error": "You don't have access to that account."}

The agent then tells the customer it can't access that and
offers an alternative. Raising kills the run and the
customer gets an error instead of an explanation.
```

**Delegation in multi-agent systems:** a sub-agent must inherit the invoking user's authority, not gain the supervisor's. Otherwise delegation becomes an escalation path — the supervisor holds broad authority and the specialist inherits it regardless of who asked.

## 5. Why It Matters

- **Two identity layers**, and conflating them is the main agent escalation path.
- **The ergonomic implementation is the insecure one** — a model-supplied user ID.
- **One chokepoint** makes authorization both reliable and reviewable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Model-supplied identity** | Authorization bypass by design |
| **Tools running as the service account** | Confused deputy |
| **Checks inside each tool** | One will be missed |
| **Denials raised as exceptions** | Run dies; customer gets an error |
| **Sub-agents inheriting supervisor authority** | Delegation becomes escalation |
| **Permissions cached for the session** | Revocation doesn't take effect |

**On permission freshness:** permissions captured at session start can be revoked mid-session, and for a long-running agent — particularly one resumed after a human approval that took hours — that gap matters. Re-checking at execution time rather than trusting the session snapshot is the control, and it's easy to skip because resumption feels like continuation.

**On least privilege for the service account itself:** the agent's own service account should hold only what the agent needs — call models, query the index, write logs. Not broad project access. That way even a compromise of the agent process is bounded, and it's the same reasoning applied one layer up.

## 7. Interview Answer

> "An agent has two identities. The service account it runs as, which needs permission to call models, query indexes, and write logs. And the user it acts for, whose permissions determine which accounts, documents, and actions are reachable.
>
> Conflating them is a confused deputy — the agent holds broad authority and acts on behalf of a user who doesn't have it. So anyone who can talk to the agent reaches everything the agent can reach. That's the main escalation path in agent design.
>
> And the ergonomic implementation is the insecure one, which is why it recurs. Adding a user_id parameter to a tool signature is the obvious thing to do, and it means the model fills it in — so the model can claim to be anyone. Identity has to come from the session instead: closed over when constructing tools per request, read from session state via a tool context, or checked in the executor before invoking. The model never sees or supplies it, so it can't influence what it can't provide.
>
> At the tool boundary I'd have five checks in one place: is this account in the session's scope, did this identifier come from a prior tool result or the user, may this user perform this operation, write an audit record, then execute as the user. All five in a before-tool hook or an executor wrapper — not repeated across twenty tool implementations, where one will eventually be missed.
>
> That single-chokepoint property is the design argument. It's fewer places to get wrong, and it means 'show me that every tool call is authorized' has a one-line answer for a reviewer, which in a regulated environment is worth as much as the code saving.
>
> Denials should return to the model as a result rather than raising. The agent then tells the customer it can't access that and offers an alternative; raising kills the run and the customer gets an error instead of an explanation.
>
> Two things I'd get right. In multi-agent systems, a sub-agent must inherit the invoking user's authority, not gain the supervisor's — otherwise delegation itself becomes an escalation path.
>
> And permission freshness. Permissions captured at session start can be revoked mid-session, and for a long-running agent resumed after a human approval that took hours, that gap matters. Re-checking at execution time rather than trusting the snapshot is the control, and it's easy to skip because resumption feels like continuation rather than a fresh decision."

## 8. Likely Follow-ups

**Q: What are the two identity layers?**
The service account, which grants the agent platform access to call models and query indexes, and the end user, whose permissions determine what data and actions are reachable. Conflating them means anyone who can reach the agent reaches everything the agent can.

**Q: Why is a `user_id` parameter dangerous?**
Because the model fills it in, so it can claim to be anyone. It's an authorization bypass by design — and it's the ergonomic implementation, which is exactly why it keeps happening. Identity must come from the session, where the model can't touch it.

**Q: Where should authorization checks live?**
In one chokepoint — a before-tool hook or executor wrapper covering argument scope, provenance, authorization, and audit. Repeating them across twenty tool implementations means one will be missed, and it makes "prove every call is authorized" impossible to answer simply.

**Q: How should a denial be communicated?**
Returned to the model as a result, so the agent can tell the customer it can't access that and offer an alternative. Raising an exception kills the run, discards the work already done, and gives the customer an error rather than an explanation.

**Q: What about delegation between agents?**
A sub-agent must inherit the invoking user's authority, never gain the supervisor's. If it inherits the supervisor's broader permissions, delegation itself becomes an escalation path — the specialist can reach things the original user never could.

## 9. Common Mistakes

- A user identity parameter the model supplies.
- Tools executing with service-account permissions.
- Authorization implemented inside individual tools.
- Denials raised as exceptions rather than returned.
- Sub-agents inheriting supervisor rather than user authority.

## 10. What to Remember

- **Two identities:** service account for platform, end user for data.
- **The ergonomic implementation is the insecure one** — never model-supplied identity.
- **One chokepoint** for scope, provenance, authorization, and audit.
- **Return denials to the model**, don't raise.
- **Re-check permissions at execution**, especially after a resume.
