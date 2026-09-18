# Generative AI on Vertex AI

> **Phase 20 · VERTEX AI · Topic 03**

## 1. Definition

The generative AI surface within Vertex AI — model access through Model Garden, tuning, the Gen AI Evaluation Service, Vector Search, grounding, and Agent Engine — as a coherent set rather than isolated features.

## 2. Simple Explanation

Vertex AI's generative side gives you everything from calling a model to deploying an agent, with the same IAM and audit controls across all of it.

The useful mental model is the lifecycle: choose a model, ground it, evaluate it, deploy it, monitor it — each with a corresponding service.

## 3. How It Works

```
CHOOSE      Model Garden — Gemini, open models, partner models
ADAPT       prompting → grounding → tuning (in that order)
GROUND      Vector Search, Vertex AI Search, your own retrieval
EVALUATE    Gen AI Evaluation Service — groundedness, quality
DEPLOY      endpoints, Agent Engine
OPERATE     Cloud Monitoring, Cloud Logging, Cloud Trace
```

**The "in that order" on adaptation matters.** Prompting is free and immediate, grounding fixes knowledge gaps, and tuning is expensive and rarely the right first move.

## 4. Practical Example

**The adaptation ladder, which is the substantive framing:**

```
1. PROMPTING
   Free, immediate, reversible. Fixes instruction-following
   and output format.

2. GROUNDING (RAG)
   Fixes "the model doesn't know our fee schedule."
   This is almost always the answer in banking — the problem
   is knowledge, not capability.

3. TUNING
   Fixes "the model doesn't behave the way we need" — a
   consistent style, a specialized classification, a domain
   vocabulary the model handles poorly.
   Expensive, needs training data, and needs re-doing when
   the base model changes.

The mistake is reaching for tuning when the actual problem
is that the model has never seen your fee schedule. Tuning
teaches behaviour; retrieval supplies knowledge. Confusing
those wastes months.
```

**That distinction — tuning for behaviour, retrieval for knowledge — is the highest-value thing to be able to say here.**

**What Agent Engine adds:**

```
Managed deployment for agents: hosting, scaling, sessions,
and integration with the platform's IAM and observability.

It's the deployment answer for an ADK or compatible agent,
so the question "how do you run this in production" has a
first-party answer rather than "on Cloud Run, with session
storage we built."
```

**Model Garden:** first-party Gemini, open models like Gemma, and partner models — all accessible through the same platform controls, which means evaluating an alternative doesn't mean a new vendor review.

## 5. Why It Matters

- **The adaptation ladder** — prompt, then ground, then tune — is the framing that prevents wasted effort.
- **Tuning teaches behaviour; retrieval supplies knowledge.** Confusing them is the expensive mistake.
- **Model Garden means evaluating alternatives** without a new vendor review.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Tuning for a knowledge problem** | Expensive, and doesn't fix it |
| **Skipping evaluation** | No way to tell whether anything helped |
| **Tuned model tied to a base version** | Re-tuning needed when the base changes |
| **Service overlap** | Several ways to do retrieval; unclear which |
| **Agent Engine lock-in** | A deployment path specific to the platform |
| **Regional availability** | Varies by service and model |

**On tuning's hidden cost:** a tuned model is tied to the base model version it was tuned from. When that version is deprecated or superseded, the tuning has to be redone — training data curated again, the job re-run, quality re-validated. That recurring cost rarely appears in the initial decision and is a strong reason to exhaust prompting and grounding first.

**On service overlap:** there are several ways to do retrieval on the platform — Vertex AI Search, Vector Search, or your own pipeline — and the docs don't strongly steer you. Choosing deliberately, based on how much of the retrieval behaviour you need to own, is better than adopting whichever appeared first in a tutorial.

## 7. Interview Answer

> "The generative side of Vertex AI is best understood as a lifecycle: choose a model in Model Garden, adapt it, ground it, evaluate it, deploy it, and operate it — each with a corresponding service, and all under the same IAM and audit controls.
>
> The framing I'd emphasize is the adaptation ladder, in order. Prompting first — free, immediate, reversible, and it fixes instruction-following and output format. Then grounding, which fixes 'the model doesn't know our fee schedule.' Then tuning, which fixes 'the model doesn't behave the way we need' — a consistent style, a specialized classification, a domain vocabulary it handles poorly.
>
> The distinction that matters most is that tuning teaches behaviour and retrieval supplies knowledge. The expensive mistake is reaching for tuning when the actual problem is that the model has never seen your fee schedule — no amount of tuning fixes that, and teams lose months to it. In banking the problem is almost always knowledge, so grounding is almost always the answer.
>
> Tuning also has a hidden recurring cost: a tuned model is tied to the base version it was tuned from, so when that's deprecated or superseded the tuning has to be redone — data curated again, job re-run, quality re-validated. That rarely appears in the initial decision, and it's a strong reason to exhaust prompting and grounding first.
>
> On the other services: the Gen AI Evaluation Service runs groundedness and quality metrics in-project, so evaluation data stays in the environment. Agent Engine is managed agent deployment with hosting, scaling, sessions, and platform IAM and observability — which means 'how do we run this in production' has a first-party answer rather than 'on Cloud Run with session storage we built.' And Model Garden gives first-party Gemini, open models like Gemma, and partner models under the same controls, so evaluating an alternative doesn't mean a new vendor review.
>
> One thing I'd navigate carefully: there are several ways to do retrieval on the platform — Vertex AI Search, Vector Search, or your own pipeline — and the documentation doesn't strongly steer you. I'd choose deliberately based on how much of the retrieval behaviour I need to own, rather than adopting whichever showed up first in a tutorial."

## 8. Likely Follow-ups

**Q: When would you tune rather than ground?**
Tuning fixes behaviour — a consistent output style, a specialized classification, a domain vocabulary the model handles poorly. Grounding fixes knowledge. If the problem is that the model doesn't know your fee schedule, tuning won't fix it however much you spend, and that confusion costs teams months.

**Q: What's the hidden cost of tuning?**
The tuned model is tied to the base version it was trained from. When that's deprecated or superseded, the tuning has to be redone — data curated, job re-run, quality re-validated. That recurring cost rarely features in the original decision.

**Q: What's the right order of adaptation?**
Prompting, then grounding, then tuning. Prompting is free, immediate, and reversible. Grounding addresses the usual problem in banking, which is missing knowledge. Tuning is expensive, needs training data, and needs redoing, so it's the last resort rather than the first idea.

**Q: What does Agent Engine give you?**
Managed agent deployment — hosting, scaling, session management, and integration with platform IAM and observability. It means the production deployment question has a first-party answer rather than assembling Cloud Run plus your own session storage and scaling.

**Q: How do you choose among the retrieval options?**
By how much of the retrieval behaviour you need to own. Fully managed if chunking and thresholds don't need controlling; Vector Search with your own pipeline if they do, which is usual in banking. The documentation doesn't steer strongly, so it needs deciding deliberately.

## 9. Common Mistakes

- Tuning to solve a knowledge problem.
- Skipping evaluation, so no change can be assessed.
- Not accounting for re-tuning when base models change.
- Adopting a retrieval service without deciding how much control is needed.
- Treating the services as unrelated features rather than a lifecycle.

## 10. What to Remember

- **Lifecycle:** choose → adapt → ground → evaluate → deploy → operate.
- **Prompt, then ground, then tune** — in that order.
- **Tuning teaches behaviour; retrieval supplies knowledge.**
- **Tuned models are tied to a base version** — re-tuning is a recurring cost.
- **Choose the retrieval service deliberately**, by how much control you need.
