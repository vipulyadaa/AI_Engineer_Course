# Model Garden

> **Phase 20 · VERTEX AI · Topic 12**

## 1. Definition

Vertex AI's catalogue of available models — first-party Gemini, Google's open models like Gemma, third-party partner models, and open-source models — all deployable and callable under the same platform controls.

## 2. Simple Explanation

Model Garden is where you find and deploy models without a separate vendor relationship for each one.

The practical value is that evaluating an alternative doesn't require a new procurement and security review — the model runs inside your project under the same IAM and audit controls.

## 3. How It Works

```
FIRST-PARTY        Gemini, Imagen, embedding models
                   → called via publisher endpoints, per token

GOOGLE OPEN        Gemma and variants
                   → deploy to your own endpoint, per uptime

PARTNER            third-party commercial models
                   → typically per-token via the platform

OPEN SOURCE        Hugging Face models
                   → deploy to your own endpoint
```

**The serving model differs by category**, and that determines cost structure: per-token for hosted, per-uptime for anything you deploy yourself.

## 4. Practical Example

**Where Model Garden genuinely helps in banking:**

```
1. EVALUATING ALTERNATIVES WITHOUT PROCUREMENT
   Comparing a partner model against Gemini on a golden set
   doesn't need a new vendor assessment — it's already
   inside the project's controls. That removes weeks of
   process from what should be an engineering decision.

2. SPECIALIST OPEN MODELS
   A cross-encoder reranker or a small classifier deployed
   in-project. Those aren't tasks for a frontier LLM, and
   Model Garden is how you get them running under the same
   governance.

3. FULL CONTROL WHERE REQUIRED
   An open model on your own endpoint means the weights and
   the serving infrastructure are in your project — which
   can matter for a workload where even a hosted first-party
   call is questioned.
```

**Point 2 is the most practically useful.** A reranker is a real component of a good RAG system, it's a small model, and Model Garden plus a dedicated endpoint is the clean way to run one.

**The cost trap with self-deployed models:**

```
Deploying an open model means a dedicated endpoint billed
for uptime, not per request.

  a GPU replica left running after an evaluation bills
  continuously

So: set a maximum replica count, use scale-to-zero for
non-interactive workloads, and keep an endpoint inventory
with owners and expiry. Model Garden makes it easy to
deploy things — and easy to forget them.
```

**On evaluating open models honestly:** a smaller open model may match a frontier model on a narrow task like reranking or classification while costing far less. That's worth measuring. It's unlikely to match on open-ended grounded generation, and claiming otherwise without measurement is the failure mode in the opposite direction.

## 5. Why It Matters

- **Evaluating alternatives without procurement** removes weeks from an engineering decision.
- **Specialist open models** — rerankers and classifiers — are the realistic use.
- **Self-deployed models bill for uptime**, which is the cost trap.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Forgotten endpoints** | Continuous billing for idle GPUs |
| **Open models needing tuning** | Deployment is the easy part |
| **Licensing terms** | Vary by model; matter commercially |
| **Support expectations** | Open models have no support contract |
| **Regional availability** | Varies by model |
| **Assuming parity with frontier models** | Rarely true for open-ended generation |

**On licensing:** open models carry licences with real terms — some restrict commercial use, some require attribution, some have usage limits. In a bank that needs checking before deployment rather than after, and it's the kind of thing that's easy to skip because deployment is so frictionless.

**On the support question:** a first-party model has Google's support; a self-deployed open model has your team. That's fine for a reranker and a bigger commitment for anything on the critical path — which is a reason to use open models for well-scoped components rather than core generation.

## 7. Interview Answer

> "Model Garden is Vertex AI's model catalogue — first-party Gemini, Google's open models like Gemma, partner models, and open-source models, all under the same platform IAM and audit controls.
>
> Where it genuinely helps in banking is three places. First, evaluating alternatives without procurement. Comparing a partner model against Gemini on a golden set doesn't need a new vendor assessment, because it's already inside the project's controls — that removes weeks of process from what should be an engineering decision.
>
> Second, and most practically useful, specialist open models. A cross-encoder reranker or a small classifier deployed in-project. Those aren't tasks for a frontier LLM — a reranker is a real component of a good RAG system and using an LLM for it would be the wrong tool at any tier. Model Garden plus a dedicated endpoint is the clean way to run one under the same governance as everything else.
>
> Third, full control where a workload requires the weights and serving infrastructure to be in your project.
>
> The cost trap is that self-deployed models are billed for uptime, not per request. A GPU replica left running after an evaluation bills continuously, and Model Garden makes it easy to deploy things and equally easy to forget them. So I'd set a maximum replica count, use scale-to-zero for non-interactive workloads, and keep an endpoint inventory with owners and expiry dates.
>
> Two things I'd check that are easy to skip because deployment is so frictionless. Licensing — open models carry real terms, some restricting commercial use or requiring attribution, and in a bank that needs checking before deployment rather than after. And support: a first-party model has Google's support, a self-deployed open model has my team. That's fine for a reranker and a bigger commitment for anything on the critical path.
>
> On evaluating open models, I'd be balanced. A smaller open model may match a frontier model on a narrow task like reranking or classification while costing far less — that's worth measuring. It's unlikely to match on open-ended grounded generation, and claiming otherwise without measurement is the failure in the opposite direction."

## 8. Likely Follow-ups

**Q: What's Model Garden useful for?**
Evaluating alternatives without a new vendor assessment, since everything runs inside the project's controls. And deploying specialist open models — a cross-encoder reranker or a small classifier — which are real components that don't warrant a frontier LLM.

**Q: What's the cost consideration?**
Self-deployed models are billed for uptime rather than per request, so an idle GPU replica bills continuously. Model Garden makes deployment easy and forgetting equally easy, so maximum replica counts and an endpoint inventory with owners and expiry are necessary controls.

**Q: Would you use an open model instead of Gemini?**
For narrow tasks, possibly — a reranker or a classifier, where a smaller model may match quality at much lower cost and it's worth measuring. For open-ended grounded generation it's unlikely to match, and asserting otherwise without measurement is the opposite mistake.

**Q: What's easy to overlook?**
Licensing and support. Open models carry real licence terms, some restricting commercial use or requiring attribution, which needs checking before deployment in a bank. And a self-deployed model has no support contract — that's fine for a reranker, less so for something on the critical path.

**Q: What's the realistic use in a RAG system?**
A cross-encoder reranker. It's a small model, called on every query, latency-sensitive, and it's typically the largest single quality gain in a RAG pipeline. Deploying it from Model Garden to a dedicated endpoint keeps it in-project under the same governance.

## 9. Common Mistakes

- Leaving evaluation endpoints running after the comparison.
- Deploying open models without checking licence terms.
- Assuming an open model will match a frontier model on generation.
- Using a frontier LLM for reranking instead of a cross-encoder.
- Not accounting for the support difference on self-deployed models.

## 10. What to Remember

- **One catalogue, one set of platform controls** — alternatives without procurement.
- **The realistic use is specialist models** — rerankers and classifiers.
- **Self-deployed models bill for uptime** — inventory and cap them.
- **Check licences before deploying**; deployment is frictionless, terms aren't.
- **Measure narrow-task parity**; don't assume it for open-ended generation.
