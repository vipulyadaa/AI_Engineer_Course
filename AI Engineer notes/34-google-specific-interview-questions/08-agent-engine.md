# Interview Questions: Agent Engine

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 08**

## 1. Definition

Vertex AI's managed runtime for agents — hosting, scaling, session persistence, and platform integration. Interview questions test whether you can articulate what it removes and what it doesn't.

## 2. Simple Explanation

An agent needs somewhere to run, with session storage, scaling, and identity. Agent Engine provides those as a service.

The question is what that's worth relative to running it on Cloud Run yourself — and the answer is more than it first appears, because session persistence is the hard part.

## 3. How It Works

```
WHAT IT PROVIDES
  managed hosting and scaling
  session persistence
  platform IAM — runs as a service account
  Cloud Audit Logs and observability integration

WHAT YOU'D OTHERWISE BUILD
  a container image and service to operate
  session storage — chosen, provisioned, backed up, scaled
  scaling configuration and capacity planning
  identity plumbing
  observability wiring
```

**Session persistence is the item that's genuinely hard.** Hosting a container is routine; durable resumable session state that survives restarts and scales horizontally is not.

## 4. Practical Example

**The comparison, answered concretely:**

```
"Agent Engine or Cloud Run?"

CLOUD RUN is reasonable when:
  · you already operate Cloud Run services and want
    consistency in deployment and monitoring
  · a multi-cloud position matters
  · you need control the managed runtime doesn't expose

AGENT ENGINE when:
  · you'd otherwise build session persistence, which is
    the genuinely hard part
  · platform IAM and audit integration matter — no parallel
    identity model
  · the team doesn't have capacity to operate another
    service

The trade is portability against operational work, and
which way it goes depends on the organization rather than
the technology.
```

**That framing — organization rather than technology — is the honest answer**, because both options work and the deciding factors aren't technical.

**What Agent Engine doesn't change:**

```
The architecture is still yours:
  · routing most traffic away from the agent
  · read-only tools by default
  · authorization as the end user at the tool boundary
  · token and step budgets
  · abstention as a first-class outcome
  · grounding verification

Agent Engine solves "where does this run". It doesn't solve
"is this agent safe, bounded, and correct" — and those are
the questions a banking review asks.
```

**Banking deployment specifics:**

```
· region matching the residency requirement
· VPC Service Controls perimeter covering the deployment
· session store encrypted, in-region, with a retention
  policy and deletion path — it holds conversation content
  and established customer facts
· workload identity rather than downloaded keys
· model version pinned
· evaluation gate in CI before deploy
```

**The session store point is the one that gets missed:** it's a customer data store, not framework infrastructure, and it needs the corresponding retention and erasure treatment.

## 5. Why It Matters

- **Session persistence is the genuinely hard part** it removes.
- **It solves "where does this run", not "is this agent safe"** — the key distinction.
- **The session store is a customer data store** with retention and erasure obligations.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "It's managed so it's easier" | Doesn't say what's actually removed |
| No comparison to Cloud Run | The obvious alternative |
| Expecting it to solve agent safety | It solves runtime, not architecture |
| Session store excluded from retention | It holds customer data |
| Ignoring lock-in | A platform-specific deployment path |
| No mention of residency or VPC-SC | The banking deployment questions |

**On lock-in and the mitigation:** Agent Engine is a platform-specific deployment path, and the mitigation is keeping the agent's logic, tools, and state schema in your own code — treating Agent Engine as a deployment target rather than where the system lives. Then moving means changing how it runs rather than rewriting what it is, which is a design discipline rather than a framework property.

**On what "managed" doesn't cover:** scaling and hosting being managed says nothing about whether the agent terminates, stays in budget, or abstains appropriately. Those are the failure modes that actually take agents down, and a managed runtime doesn't touch any of them — which is worth being explicit about rather than letting "managed" imply more than it does.

## 7. Interview Answer

> "Agent Engine is Vertex AI's managed runtime for agents — hosting, scaling, session persistence, and platform integration.
>
> The item that makes it genuinely worth something is session persistence. Hosting a container is routine; durable resumable session state that survives restarts and scales horizontally is not. Without it, production means choosing, provisioning, backing up, and scaling a session store yourself, plus scaling configuration, identity plumbing, and observability wiring.
>
> If asked Agent Engine or Cloud Run, I'd say Cloud Run is reasonable when you already operate Cloud Run services and want consistency in deployment and monitoring, when a multi-cloud position matters, or when you need control the managed runtime doesn't expose. Agent Engine when you'd otherwise build session persistence, when platform IAM and audit integration matter so there's no parallel identity model, or when the team lacks capacity to operate another service.
>
> The trade is portability against operational work, and which way it goes depends on the organization rather than the technology. Both options work, and the deciding factors aren't technical.
>
> The distinction I'd emphasize is that Agent Engine solves 'where does this run'. It doesn't solve 'is this agent safe, bounded, and correct'. Routing most traffic away from the agent, read-only tools by default, authorization as the end user at the tool boundary, token and step budgets, abstention as a first-class outcome, grounding verification — all still mine. And those are the questions a banking review actually asks, so letting 'managed' imply more than it does would be a mistake.
>
> Related: scaling and hosting being managed says nothing about whether the agent terminates, stays in budget, or abstains appropriately. Those are the failure modes that take agents down in production, and a managed runtime doesn't touch any of them.
>
> For a banking deployment specifically: region matching the residency requirement, a VPC Service Controls perimeter covering the deployment, workload identity rather than downloaded keys, the model version pinned, and an evaluation gate in CI before deploy.
>
> And the one that gets missed — the session store is a customer data store. It holds conversation content and established facts like account tier and transaction details, so it needs encryption, in-region storage, a retention policy, and a deletion path reaching every session. Treating it as framework infrastructure rather than customer data is a real compliance gap, and it's easy to create because it looks like plumbing.
>
> On lock-in, it's a platform-specific deployment path. I'd keep the agent's logic, tools, and state schema in my own code so moving is a change of deployment target rather than a rewrite."

## 8. Likely Follow-ups

**Q: What does Agent Engine actually remove?**
Session persistence primarily — durable resumable state surviving restarts and scaling horizontally, which is the genuinely hard part. Plus hosting, scaling configuration, identity plumbing, and observability wiring, all of which you'd otherwise build and operate.

**Q: Agent Engine or Cloud Run?**
Cloud Run if you already operate Cloud Run services and want consistency, or if multi-cloud matters. Agent Engine if you'd otherwise build session persistence or need platform IAM integration. The trade is portability against operational work, decided by the organization rather than the technology.

**Q: Does it make the agent safe?**
No — it solves where the agent runs, not whether it's safe, bounded, and correct. Routing, tool limits, user-scoped authorization, budgets, abstention, and grounding verification are all still architecture, and those are what a banking review asks about.

**Q: What's the compliance consideration?**
The session store holds conversation content and established customer facts, so it's a customer data store needing encryption, in-region storage, retention limits, and a deletion path. Treating it as framework infrastructure is an easy and real compliance gap.

**Q: What about lock-in?**
It's a platform-specific deployment path. Keeping the agent's logic, tools, and state schema in your own code means moving is a change of deployment target rather than a rewrite — a design discipline rather than something the framework provides.

## 9. Common Mistakes

- Saying "it's managed" without naming what's removed.
- No comparison to the Cloud Run alternative.
- Implying a managed runtime addresses agent safety.
- Excluding the session store from retention and erasure policy.
- Ignoring residency and VPC-SC in a banking deployment.

## 10. What to Remember

- **Session persistence is the hard part** it removes — hosting is routine.
- **Cloud Run versus Agent Engine** is portability against operational work.
- **It solves runtime, not architecture** — safety and bounds are still yours.
- **The session store is a customer data store.**
- **Keep logic and state schema in your own code** to bound lock-in.
