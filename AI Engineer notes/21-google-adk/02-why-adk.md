# Why ADK?

> **Phase 21 · GOOGLE ADK · Topic 02**

## 1. Definition

The case for choosing ADK: managed deployment via Agent Engine, native platform integration for identity, audit, and evaluation, and designed control points for authorization — weighed against maturity and portability.

## 2. Simple Explanation

Every agent framework gives you a loop and tool calling. Those aren't worth choosing on.

ADK's argument is what happens around the agent — how it deploys, how it authenticates, how it's audited, and where the hooks are for the controls a bank requires.

## 3. How It Works

**Ranked by what actually matters:**

```
1. DEPLOYMENT      Agent Engine — managed hosting, scaling,
                   session persistence
2. IDENTITY & AUDIT project IAM and Cloud Audit Logs natively,
                   no parallel identity model
3. CONTROL POINTS  callbacks designed for authorization,
                   validation, and audit
4. EVALUATION      Vertex AI evaluation integration
5. THE AGENT LOOP  ~20 lines; worth nothing
```

**Item 5 is worth stating explicitly** because it's what frameworks are usually sold on and it's the least valuable thing they provide.

## 4. Practical Example

**The deployment argument, concretely:**

```
WITHOUT a managed target, running an agent in production
means:
  · a container and a service to operate
  · session storage you build, scale, and back up
  · scaling configuration and capacity planning
  · identity plumbing to the platform
  · your own observability integration

WITH Agent Engine those are provided. That's the real
saving, and it's the same shape of argument as LangGraph's
persistence — a genuinely hard problem solved rather than
a simple one wrapped.
```

**The control-point argument, which is the banking-specific one:**

```
Before-tool and after-tool callbacks are where I'd put:

  · argument validation against session scope
  · authorization as the authenticated end user
  · audit logging of every tool call
  · result truncation

Having those as designed extension points rather than
hand-rolled wrappers matters twice: it's less code, and
it's much easier for a reviewer to verify that every tool
goes through the same checks.

That second point is worth more than it sounds in a
regulated environment — "show me that every tool call is
authorized" is a question with a one-line answer.
```

**Where the argument is weaker:**

```
· MATURITY — newer, fewer established patterns, less
  community material
· PORTABILITY — Google Cloud oriented; a multi-cloud
  mandate weakens it
· PERSISTENCE DEPTH — LangGraph's checkpointing,
  time-travel, and interrupt model is more developed
· CHURN — the API is still evolving

If durable resumption across multi-hour human approvals is
the central requirement, LangGraph's persistence story is
more mature. If deployment and platform integration are the
central requirement, ADK's is.
```

**That comparison is the honest framing** — they optimize for different things rather than one being better.

## 5. Why It Matters

- **Deployment and platform integration** are the real arguments, not the loop.
- **Callbacks as designed control points** make authorization verifiable in one place.
- **ADK and LangGraph optimize for different things** — deployment versus persistence.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Choosing on the loop** | The least valuable thing provided |
| **Maturity gap** | Fewer patterns, less community material |
| **Multi-cloud mandate** | Weakens the platform-integration argument |
| **Persistence requirements** | LangGraph's model is more developed |
| **Agent Engine lock-in** | Platform-specific deployment |
| **Expecting governance** | Budgets, abstention, verification are yours |

**On lock-in:** Agent Engine is a platform-specific deployment path, and the mitigation is the same as everywhere else — keep the agent's logic, tools, and state schema in your own code so that moving means changing the deployment target rather than rewriting the agent. That's a design discipline more than a framework property.

**On the decision generally:** for a GCP-committed bank, ADK's integration argument is strong. For a team with an existing LangGraph system and a hard requirement for multi-hour resumable approvals, switching for platform integration alone would be a poor trade. The requirement should decide it, not the vendor relationship.

## 7. Interview Answer

> "Every agent framework gives you a loop and tool calling, and that's about twenty lines — so it's the least valuable thing any of them provide and not what I'd choose on.
>
> ADK's real arguments are deployment and platform integration. Agent Engine gives managed hosting, scaling, and session persistence. Without a managed target, running an agent in production means a container and service to operate, session storage you build and back up, scaling configuration, identity plumbing, and your own observability integration. Having those provided is the actual saving — same shape of argument as LangGraph's persistence, a genuinely hard problem solved rather than a simple one wrapped.
>
> The banking-specific argument is callbacks. Before-tool and after-tool hooks are where I'd put argument validation against session scope, authorization as the authenticated end user, audit logging of every tool call, and result truncation. Having those as designed extension points rather than hand-rolled wrappers matters twice — it's less code, and it's much easier for a reviewer to verify that every tool goes through the same checks. In a regulated environment 'show me that every tool call is authorized' becoming a one-line answer is worth more than it sounds.
>
> Where the argument is weaker: it's newer, so fewer established patterns and less community material. It's Google Cloud oriented, so a multi-cloud mandate weakens it. And LangGraph's persistence model — checkpointing, time-travel, interrupts — is more developed.
>
> So the honest framing is that they optimize for different things. If durable resumption across multi-hour human approvals is the central requirement, LangGraph's persistence is more mature. If deployment and platform integration are central, ADK's is. For a GCP-committed bank the integration argument is strong — but I'd let the requirement decide rather than the vendor relationship. Switching an existing LangGraph system with a hard resumable-approval requirement over to ADK for platform integration alone would be a poor trade.
>
> And on lock-in: Agent Engine is a platform-specific deployment path, so I'd keep the agent's logic, tools, and state schema in my own code. Then moving means changing the deployment target rather than rewriting the agent — which is a design discipline more than a framework property."

## 8. Likely Follow-ups

**Q: What's the main argument for ADK?**
Managed deployment via Agent Engine plus native platform integration — IAM, audit logging, and evaluation without a parallel identity model. The agent loop isn't the argument; it's twenty lines and every framework has one.

**Q: What makes callbacks valuable?**
They're designed extension points for authorization, argument validation, and audit rather than hand-rolled wrappers. Less code, and much easier to demonstrate to a reviewer that every tool call passes the same checks — which in a regulated environment is a question that gets asked directly.

**Q: ADK or LangGraph?**
They optimize for different things. LangGraph's persistence — checkpointing, time-travel, interrupts — is more developed, so it wins when multi-hour resumable approvals are central. ADK wins when deployment and platform integration are central. The requirement should decide it.

**Q: What are ADK's weaknesses?**
Maturity — it's newer with fewer established patterns and less community material. Google Cloud orientation, which weakens under a multi-cloud mandate. A less developed persistence story than LangGraph. And ongoing API churn.

**Q: How do you limit the lock-in?**
Keep the agent's logic, tools, and state schema in your own code so that Agent Engine is a deployment target rather than where the system lives. Then moving means changing how it's deployed rather than rewriting it — a design discipline that applies regardless of framework.

## 9. Common Mistakes

- Choosing a framework on the agent loop.
- Not using callbacks as the authorization and audit point.
- Treating first-party status as decisive regardless of requirements.
- Ignoring the persistence maturity gap when approvals span hours.
- Letting Agent Engine hold logic that should live in your own code.

## 10. What to Remember

- **Deployment and integration are the arguments** — the loop is worth nothing.
- **Callbacks make authorization verifiable in one place.**
- **ADK optimizes for deployment; LangGraph for persistence.**
- **Let the requirement decide**, not the vendor relationship.
- **Keep logic and state schema in your own code** to bound lock-in.
