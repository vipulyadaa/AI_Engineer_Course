# Agent Permissions

> **Phase 17 · AI AGENTS · Topic 24**

## 1. Definition

The authority under which an agent's tools execute. The central rule is that tools act as the authenticated end user, not as the service — otherwise the agent becomes a privilege-escalation path.

## 2. Simple Explanation

An agent is software calling APIs. Those APIs need credentials.

If the credentials belong to a service account that can see everything, then anyone who can talk to the agent can potentially reach everything — because the agent is the one making the call. The fix is that every tool call carries the actual user's identity.

## 3. How It Works

```
WRONG
  user ──▶ agent ──▶ tool (service account: full access)
                     ↳ can read ANY account

RIGHT
  user ──▶ agent ──▶ tool (acting as: this authenticated user)
                     ↳ can read only what THEY can read
```

**Three layers, all needed:**

```
1. IDENTITY PROPAGATION  the user's identity reaches every tool
2. TOOL-LEVEL AUTHZ      each tool checks that user's rights
3. ARGUMENT VALIDATION   arguments must be within the
                         session's scope
```

**Layer 3 catches what layer 2 might miss:** if the session is for customer A and the agent constructs a call with customer B's ID — through hallucination or injection — code rejects it before authorization is even consulted.

## 4. Practical Example

**Implementing it:**

```python
def execute_tool(call, session):
    tool = TOOLS[call.name]

    # 3. arguments must be in session scope
    if "account_id" in call.arguments:
        if call.arguments["account_id"] not in session.accounts:
            return "Error: that account is not in this session."

    # 2. the user must hold the right
    if not session.user.can(tool.required_permission):
        return "Error: you don't have access to that."

    # 1. execute AS the user
    return tool.run(**call.arguments, actor=session.user)
```

**Denials return to the model, not as exceptions.** Then the agent can tell the customer it can't access that, rather than crashing — and the customer gets a useful response instead of an error.

**Permission design for agents:**

```
READ-ONLY BY DEFAULT
  Most agent capability is informational. Write tools should
  be added deliberately, individually justified.

SEPARATE AGENTS BY PRIVILEGE
  A read-only agent and a transactional agent, not one agent
  with both. Containment by tool availability.

SCOPE TO THE SESSION
  Not "can read accounts" but "can read THESE accounts" —
  the ones this authenticated session established.

NARROW OVER BROAD
  get_own_balance beats get_balance(account_id) — the
  narrower tool cannot be pointed at the wrong account
  at all.
```

**That last point is the strongest design move.** A tool that takes no account parameter can't be manipulated into reading another account, whatever the model is persuaded to attempt. Removing the parameter removes the attack.

## 5. Why It Matters

- **Service-account permissions turn an agent into a privilege escalation path** — the core risk.
- **Parameterless, session-scoped tools** eliminate whole attack classes structurally.
- **Denials as results** let the agent respond usefully rather than fail.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Service-account credentials** | Confused deputy; escalation |
| **Broad tools with an ID parameter** | Can be pointed anywhere |
| **Authorization only at the agent** | Bypassed if a tool is called another way |
| **Denials raised as exceptions** | The agent can't respond gracefully |
| **Unlogged access** | No audit trail of what was reached |
| **Stale permissions in state** | Access checked once, used throughout |

**On checking freshly:** permissions captured at session start can be revoked mid-session. For long-running or resumed agents — particularly across a human approval wait — authorization should be re-checked at execution time rather than trusted from the session snapshot.

**On audit:** every tool call should log who, what, when, with what arguments, and whether it was allowed. For a bank that's the record proving the agent only accessed what it was entitled to, and reconstructing it after the fact isn't possible.

## 7. Interview Answer

> "The central rule is that an agent's tools act as the authenticated end user, not as the service. If tools run with a service account that can see everything, then anyone who can talk to the agent can potentially reach everything — because the agent is making the call. That's a confused deputy problem and it's the main security risk in agent design.
>
> I'd implement three layers. Identity propagation, so the user's identity reaches every tool. Tool-level authorization, so each tool checks that user's rights rather than trusting the agent. And argument validation against session scope — if the session is for customer A and the agent constructs a call with customer B's ID, through hallucination or injection, code rejects it before authorization is even consulted.
>
> The strongest design move is narrowing the tools themselves. Prefer get_own_balance over get_balance with an account_id parameter. A tool that takes no account parameter cannot be pointed at the wrong account whatever the model is persuaded to attempt — removing the parameter removes the attack, rather than defending against it.
>
> Beyond that: read-only by default, with write tools added deliberately and individually justified. And separating agents by privilege — a read-only agent and a transactional agent rather than one agent holding both — so containment comes from tool availability rather than from the prompt.
>
> One implementation detail: denials should be returned to the model as tool results, not raised as exceptions. Then the agent tells the customer it can't access that, and they get a useful response instead of an error.
>
> Two things I'd get right for banking specifically. Permissions captured at session start can be revoked mid-session, so for long-running or resumed agents — especially across a human approval wait — authorization should be re-checked at execution time rather than trusted from the snapshot. And every tool call gets logged with who, what, when, arguments, and whether it was allowed. That's the record proving the agent only accessed what it was entitled to, and it can't be reconstructed afterwards."

## 8. Likely Follow-ups

**Q: Whose permissions should tools use?**
The authenticated end user's, always. Service-account credentials make the agent a privilege escalation path — anyone who can talk to it can potentially reach anything it can reach. The user's identity has to propagate to every tool call and be checked there.

**Q: How do you stop an agent accessing the wrong account?**
Two ways. Validate arguments against the session's scope in code, so a call naming an out-of-scope account is rejected before authorization. And better, design tools without an account parameter at all — a tool that reads only the session's own account can't be pointed elsewhere.

**Q: Why return denials to the model?**
So the agent can respond usefully — telling the customer it can't access that and offering an alternative — rather than crashing. A raised exception loses all the work in the run and gives the customer an error instead of an explanation.

**Q: What about permissions changing mid-session?**
They need re-checking at execution time rather than trusting a snapshot from session start. That matters most for long-running agents and for anything resumed after a human approval wait, where a meaningful amount of time has passed and access may have been revoked.

**Q: How do you make agent access auditable?**
Log every tool call with the user, the tool, the arguments, the timestamp, and whether it was permitted. That's the record proving the agent only reached what the user was entitled to, and it has to be built in — it can't be reconstructed from anything else after the fact.

## 9. Common Mistakes

- Running tools under a service account.
- Designing broad tools with identifier parameters where narrow ones would do.
- Checking authorization at the agent rather than at each tool.
- Raising denials instead of returning them to the model.
- Trusting permissions captured at session start for the whole session.

## 10. What to Remember

- **Tools act as the end user**, never the service account.
- **Three layers:** identity propagation, tool-level authz, argument validation.
- **Narrow tools beat broad ones** — no parameter means no attack.
- **Return denials to the model** so it can respond gracefully.
- **Re-check permissions at execution**, and log every call.
