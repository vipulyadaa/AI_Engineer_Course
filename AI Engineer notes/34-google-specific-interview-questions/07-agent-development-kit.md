# Interview Questions: Agent Development Kit

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 07**

## 1. Definition

Google's open-source agent framework. Interview questions test whether you'd choose it for the right reason, and whether you understand that no framework supplies agent governance.

## 2. Simple Explanation

ADK gives you agents, tools, sessions, state, callbacks, and deployment to Agent Engine.

The answer that distinguishes isn't listing those — it's knowing which one actually justifies adopting a framework, and being clear about what you still have to build.

## 3. How It Works

```
WHAT JUSTIFIES IT
  1. Agent Engine deployment — managed hosting, scaling,
     session persistence
  2. native IAM and audit integration
  3. callbacks as designed control points
  4. the agent loop  ← ~20 lines; justifies nothing

WHAT IT DOESN'T GIVE YOU
  token budgets and graceful degradation
  the abstention decision
  retrieval quality — chunking, thresholds, hybrid
  grounding verification
  the deterministic path most traffic should take
```

**Point 4 being worthless is the framing that signals experience** — frameworks are usually sold on the loop and it's the least valuable thing they provide.

## 4. Practical Example

**The callback answer, which is the banking-specific one:**

```
The before-tool callback is a single enforcement point
where every tool call passes through:

  · argument validation against session scope
  · identifier provenance — did this ID come from a prior
    tool result?
  · authorization as the authenticated end user
  · budget check
  · audit log

That matters twice. It's less code and fewer places to get
it wrong. And "show me that every tool call is authorized"
has a one-line answer, which in a regulated environment is
worth as much as the code saving.

Framework-level reviewability is a genuine architectural
argument, not just convenience.
```

**The identity answer, which is the security-specific one:**

```
Identity comes from session state via ToolContext, never
as a tool parameter.

The dangerous alternative — a user_id argument in the
signature — means the MODEL supplies the identity, which
is an authorization bypass by design.

And it's the ergonomic choice, which is exactly what makes
it a real risk rather than a theoretical one.
```

**The honest comparison, if asked ADK versus LangGraph:**

```
They optimize for different things.

LangGraph: checkpointing, time-travel, interrupts — more
developed persistence. Wins when multi-hour resumable
human approval is the central requirement.

ADK: Agent Engine deployment, native platform integration,
callbacks as control points. Wins when deployment and
governance are central.

The requirement decides. Declaring a winner without naming
the requirement isn't a real comparison — and for a GCP
bank the integration argument is strong, but I wouldn't
migrate a working LangGraph system with a hard resumable-
approval requirement for it.
```

## 5. Why It Matters

- **The loop justifies nothing** — knowing that signals experience.
- **Callbacks as a single enforcement point** is the banking-specific argument.
- **Model-supplied identity is the bypass** — and it's the ergonomic choice.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Justifying it by the agent loop | ~20 lines; the least valuable part |
| "It's Google's so we'd use it" | Vendor alignment, not requirement |
| Expecting governance from the framework | Budgets and abstention are yours |
| No mention of callbacks | The strongest ADK-specific point |
| Declaring a winner vs LangGraph | Without naming the requirement |
| Ignoring maturity | It's newer, with fewer established patterns |

**On maturity, honestly:** ADK is newer than the alternatives, with fewer established patterns and less community material, and the API is still evolving. For a team wanting a well-trodden path that's a genuine consideration — and saying so rather than treating first-party status as decisive is what makes the recommendation credible.

**On lock-in:** Agent Engine is a platform-specific deployment path. Keeping the agent's logic, tools, and state schema in your own code means moving is a change of deployment target rather than a rewrite. That's a design discipline more than a framework property, and it's worth stating because it shows you'd plan for it.

## 7. Interview Answer

> "ADK gives you agents, tools, sessions, state, callbacks, and deployment to Agent Engine. But listing those isn't the answer — the question is which one justifies adopting a framework at all.
>
> It isn't the agent loop. That's about twenty lines of code, and frameworks are usually sold on it while it's the least valuable thing they provide. What justifies ADK is Agent Engine deployment — managed hosting, scaling, and session persistence — plus native IAM and audit integration, and callbacks.
>
> The callback point is the banking-specific one and it's the strongest. The before-tool callback is a single enforcement point where every tool call passes through argument validation against session scope, identifier provenance, authorization as the authenticated end user, a budget check, and an audit log. That matters twice: it's less code and fewer places to get it wrong, and 'show me that every tool call is authorized' has a one-line answer. In a regulated environment that reviewability is worth as much as the code saving, so it's a genuine architectural argument rather than convenience.
>
> The security detail I'd raise is identity. It comes from session state via ToolContext, never as a tool parameter — because a user_id argument in the signature means the model supplies the identity, which is an authorization bypass by design. And it's the ergonomic choice, which is exactly what makes it a real risk rather than a theoretical one.
>
> What ADK doesn't give me, and I'd say this plainly: token budgets and graceful degradation, the abstention decision, retrieval quality — chunking, thresholds, hybrid — grounding verification, and the deterministic path most traffic should take. Those are architecture, and no framework supplies them. That's the same list for every framework, so it isn't a criticism of ADK.
>
> If asked ADK versus LangGraph, they optimize for different things. LangGraph's persistence — checkpointing, time-travel, interrupts — is more developed, so it wins when multi-hour resumable human approval is the central requirement. ADK wins when deployment and platform governance are central. The requirement decides, and declaring a winner without naming one isn't a real comparison. For a GCP bank the integration argument is strong, but I wouldn't migrate a working LangGraph system with a hard resumable-approval requirement just for it.
>
> And I'd be honest about maturity. ADK is newer, with fewer established patterns and less community material, and the API is still evolving. For a team wanting a well-trodden path that's a real consideration — treating first-party status as automatically decisive would be the wrong instinct.
>
> One design note: Agent Engine is a platform-specific deployment path, so I'd keep the agent's logic, tools, and state schema in my own code. Then moving is a change of deployment target rather than a rewrite."

## 8. Likely Follow-ups

**Q: What justifies adopting ADK?**
Agent Engine deployment, native IAM and audit integration, and callbacks as designed control points. Not the agent loop — that's about twenty lines and it's the least valuable thing any framework provides, though it's what they're usually sold on.

**Q: What's the strongest ADK-specific point for banking?**
The before-tool callback as a single enforcement point for validation, provenance, authorization, budget, and audit. Fewer places to get it wrong, and it makes "prove every tool call is authorized" answerable in one line — which matters in a regulated review.

**Q: How does identity reach a tool?**
Through session state via ToolContext, never as a parameter. A user_id argument means the model supplies the identity, which is an authorization bypass by design — and it's the ergonomic implementation, which is what makes it a real rather than theoretical risk.

**Q: ADK or LangGraph?**
The requirement decides. LangGraph's persistence — checkpointing, interrupts, time-travel — is more developed, so it wins on multi-hour resumable approval. ADK wins on deployment and platform governance. Declaring a winner without naming the requirement isn't a comparison.

**Q: What are its weaknesses?**
It's newer, with fewer established patterns and less community material, and the API is still evolving. Agent Engine is also a platform-specific deployment path, though keeping logic and state schema in your own code bounds that.

## 9. Common Mistakes

- Justifying the framework by the agent loop.
- Choosing it on vendor alignment rather than requirement.
- Expecting budgets, abstention, or verification from the framework.
- Not mentioning callbacks as the distinguishing feature.
- Treating first-party status as decisive despite the maturity gap.

## 10. What to Remember

- **The loop justifies nothing** — deployment, integration, and callbacks do.
- **Before-tool callback** is the single enforcement point — reviewable in one place.
- **Identity from session state**, never a model-supplied parameter.
- **The requirement decides** ADK versus LangGraph.
- **Acknowledge the maturity gap** — first-party isn't automatically decisive.
