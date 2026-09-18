# Deployment (ADK)

> **Phase 21 · GOOGLE ADK · Topic 14**

## 1. Definition

Getting an ADK agent into production — via Vertex AI Agent Engine as the managed option, Cloud Run for container-based deployment, or GKE — with Agent Engine being ADK's distinguishing feature.

## 2. Simple Explanation

An agent needs somewhere to run, with session storage, scaling, and identity.

Agent Engine provides all three as a managed service. Cloud Run gives you a container and you assemble the rest. That difference is the main practical reason to pick ADK over a generic framework.

## 3. How It Works

```
AGENT ENGINE        managed hosting, scaling, session
                    persistence, platform IAM and
                    observability integration
CLOUD RUN           your container; you provide session
                    storage, scaling config, and
                    observability wiring
GKE                 full control; the most operational
                    overhead
```

**Agent Engine is the reason ADK deployment is a shorter conversation** than for a generic framework — "how do we run this" has a first-party answer.

## 4. Practical Example

**What Agent Engine removes:**

```
WITHOUT IT, production means:
  · a container image and a service to operate
  · session storage you choose, provision, back up, scale
  · scaling configuration and capacity planning
  · identity plumbing to the platform
  · observability integration wired by hand

WITH IT, those are provided. That's the saving, and it's
the same shape as LangGraph's persistence argument — a
genuinely operational problem solved rather than a simple
one wrapped.
```

**The deployment checklist for banking:**

```
· dedicated service account, narrowly scoped, via workload
  identity — not a downloaded key
· region matching the data residency requirement
· VPC Service Controls perimeter covering the deployment
· session store encrypted, in-region, with a retention
  policy and deletion path
· model version pinned explicitly
· quota requested per region and model ahead of launch
· audit logging enabled, including data access
· an evaluation gate in CI blocking regressions
```

**On versioning what's deployed:**

```
The agent's behaviour comes from its instruction, its tool
descriptions, its model version, and its callbacks — not
from a model artifact you trained.

So the release record is those things, versioned together
and referenced in every trace. A change to a tool docstring
changes tool selection as much as a model swap would, and
it needs the same gating and rollback path.
```

**That's the point worth making about agent deployment** — the artifact is configuration and prompts, and it's usually governed less rigorously than a model would be.

**Rollback:** the fastest path is deploying the new version alongside the old with traffic split, so rolling back is a percentage change. A deployment you can't reverse in seconds is one people hesitate to make.

## 5. Why It Matters

- **Agent Engine removes real operational work** — the practical reason to choose ADK.
- **The deployed artifact is instruction, tools, and config**, which needs model-grade governance.
- **Traffic-split rollback** is what makes teams willing to deploy.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Agent Engine lock-in** | A platform-specific deployment path |
| **Prompt and tool changes ungoverned** | Behaviour changes with no record |
| **Downloaded service account keys** | Long-lived credentials |
| **Session store outside retention policy** | Compliance gap |
| **No traffic split** | All-or-nothing deployments |
| **Quota not requested** | Launch blocked |

**On lock-in:** the mitigation is keeping the agent's logic, tools, and state schema in your own code, with Agent Engine as a deployment target rather than where the system lives. Then moving means changing how it's deployed, not rewriting it — and that's a design discipline rather than a framework property.

**On Cloud Run as the alternative:** it's a reasonable choice when you already operate Cloud Run services and want consistency, or when a multi-cloud position matters. The cost is building session persistence and scaling configuration yourself, which is exactly what Agent Engine provides — so the trade is portability against operational work.

## 7. Interview Answer

> "An agent needs somewhere to run with session storage, scaling, and identity. Agent Engine provides all three as a managed service — that's the main practical reason to pick ADK over a generic framework, because 'how do we run this' has a first-party answer.
>
> Without it, production means a container image and service to operate, session storage you choose and provision and back up, scaling configuration, identity plumbing, and observability wired by hand. Agent Engine provides those, which is the same shape of argument as LangGraph's persistence — a genuinely operational problem solved rather than a simple one wrapped.
>
> For a banking deployment the checklist is: a dedicated narrowly-scoped service account via workload identity rather than a downloaded key, a region matching the residency requirement, a VPC Service Controls perimeter covering the deployment, an encrypted in-region session store with a retention policy and deletion path, the model version pinned explicitly, quota requested ahead of launch, audit logging including data access, and an evaluation gate in CI.
>
> The point I'd make about agent deployment specifically is what the artifact actually is. The agent's behaviour comes from its instruction, its tool descriptions, its model version, and its callbacks — not from a model you trained. So the release record is those things versioned together and referenced in every trace. A change to a tool docstring changes tool selection as much as a model swap would, and it needs the same gating and rollback path. That's usually governed less rigorously than a model would be, which is the gap.
>
> For rollback I'd deploy the new version alongside the old with a traffic split, so reverting is a percentage change rather than a redeploy. A deployment you can't reverse in seconds is one people hesitate to make, and that slows delivery more than the deployment process itself.
>
> On lock-in: Agent Engine is a platform-specific path, so I'd keep the agent's logic, tools, and state schema in my own code with Agent Engine as a deployment target rather than where the system lives. Then moving means changing how it's deployed rather than rewriting it.
>
> Cloud Run is a reasonable alternative if you already operate Cloud Run services and want consistency, or if a multi-cloud position matters. The cost is building session persistence and scaling yourself — so the trade is portability against operational work, and which way that goes depends on the organization rather than on the technology."

## 8. Likely Follow-ups

**Q: What does Agent Engine provide?**
Managed hosting, scaling, session persistence, and integration with platform IAM and observability. Without it you'd build a container service, choose and operate session storage, configure scaling, and wire observability yourself — which is the real saving.

**Q: What's actually being deployed?**
Instruction, tool descriptions, model version, callbacks, and configuration — not a trained model. So the release record is those versioned together, and a tool docstring change affects tool selection as much as a model swap, needing the same gating and rollback.

**Q: How do you roll back?**
Deploy the new version alongside the old with a traffic split, so reverting is a percentage change rather than a redeploy. Rollback speed is what determines whether people are willing to deploy at all, which affects delivery more than the process itself.

**Q: What about lock-in?**
Agent Engine is a platform-specific deployment path. The mitigation is keeping the agent's logic, tools, and state schema in your own code, treating Agent Engine as a deployment target rather than where the system lives — so moving changes how it runs, not what it is.

**Q: When would you use Cloud Run instead?**
When you already operate Cloud Run services and want consistency, or when a multi-cloud position matters. The cost is building session persistence and scaling configuration yourself, so it's a trade of portability against operational work rather than a technical judgment.

## 9. Common Mistakes

- Governing prompts and tool descriptions less rigorously than models.
- Downloaded service account keys instead of workload identity.
- Session store excluded from retention and deletion policy.
- Deploying without a traffic split or fast rollback.
- Letting Agent Engine hold logic that should live in your own code.

## 10. What to Remember

- **Agent Engine provides hosting, scaling, sessions, and identity** — the real saving.
- **The deployed artifact is instruction, tools, and config** — govern it like a model.
- **Traffic-split rollback** in seconds, not a redeploy.
- **Workload identity, in-region session store, pinned model version.**
- **Keep logic and state schema in your own code** to bound lock-in.
