# What Is Vertex AI?

> **Phase 20 · VERTEX AI · Topic 01**

## 1. Definition

Google Cloud's unified managed platform for machine learning and generative AI — model access, training, tuning, deployment, evaluation, monitoring, pipelines, and vector search, all under the project's IAM, networking, and audit controls.

## 2. Simple Explanation

Vertex AI is the enterprise surface for AI on Google Cloud. Calling Gemini through it rather than through the standalone API is what puts the model behind IAM, inside a VPC perimeter, and in your audit log.

For a Google Cloud AI Engineer role it's the platform the entire job sits on.

## 3. How It Works

```
GENERATIVE AI
  Gemini and other models · Model Garden · tuning ·
  Gen AI Evaluation · Vector Search · Agent Engine

CLASSICAL ML
  training · Model Registry · endpoints · Pipelines ·
  Feature Store · Experiments

GOVERNANCE (the part that matters in banking)
  IAM · VPC Service Controls · CMEK · Cloud Audit Logs ·
  regional deployment · data residency
```

**The governance column is the reason it exists** for an enterprise. The model capabilities are available elsewhere; the controls aren't.

## 4. Practical Example

**Why it's not optional in a bank:**

```
IAM
  the same identities, roles, and service accounts as the
  rest of the project — no separate API key to issue,
  rotate, and audit

VPC SERVICE CONTROLS
  a perimeter around the project so data can't be
  exfiltrated to another project or the public internet,
  even with valid credentials

CMEK
  customer-managed encryption keys, so key control stays
  with the bank

CLOUD AUDIT LOGS
  who called which model, when, from where — the same
  audit surface as everything else

REGIONAL ENDPOINTS
  processing stays in a chosen region, which is a data
  residency requirement, not a preference

Every one of those is a control a security review will ask
about, and an API key satisfies none of them.
```

**The practical framing:** the Gemini API is for prototyping and consumer applications; Vertex AI is for anything that will face a security review. Saying that unprompted is what signals you understand the environment.

**What you give up:** slightly more setup — a project, service accounts, IAM bindings, region selection — and regional model availability varies. Both are routine in a GCP shop and neither is a real argument against it.

## 5. Why It Matters

- **It's the platform the whole role sits on** — everything else is a service within it.
- **The governance controls** are why it's mandatory in a bank, not the capabilities.
- **IAM, VPC-SC, CMEK, audit logs, residency** is the list a security review asks about.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Regional model availability** | Not every model in every region |
| **Quota limits** | Per-region, per-model; need requesting ahead |
| **IAM complexity** | Over-broad roles are the common mistake |
| **Cost visibility** | Needs labelling to attribute spend |
| **Service sprawl** | Many overlapping ways to do the same thing |
| **API churn** | SDKs and surfaces evolve |

**On IAM:** the common failure is granting `aiplatform.user` broadly because it's simpler than working out the specific permissions. In a bank that's a finding. Predefined roles scoped per service account, with a documented justification, is the expectation — and it's easier to do at the start than to retrofit.

**On quota:** production workloads need quota requested in advance per region and model. Discovering a quota ceiling during a launch is avoidable and entirely predictable, and the lead time isn't always short.

## 7. Interview Answer

> "Vertex AI is Google Cloud's unified managed platform for ML and generative AI — model access, training, tuning, deployment, evaluation, monitoring, pipelines, and vector search. For this role it's the platform the entire job sits on.
>
> The thing I'd emphasize is that in an enterprise, the reason to use it isn't the model capabilities — those are available through the standalone Gemini API too. It's the governance.
>
> IAM means the same identities, roles, and service accounts as the rest of the project, so there's no separate API key to issue, rotate, and audit. VPC Service Controls puts a perimeter around the project so data can't be exfiltrated even with valid credentials. CMEK keeps encryption key control with the bank. Cloud Audit Logs record who called which model, when, from where — the same audit surface as everything else. And regional endpoints keep processing in a chosen region, which is a data residency requirement rather than a preference.
>
> Every one of those is something a security review will ask about, and an API key satisfies none of them. So the practical framing is: the Gemini API is for prototyping and consumer applications, Vertex AI is for anything that will face a security review.
>
> What you give up is a bit more setup — a project, service accounts, IAM bindings, region selection — and regional model availability varies. Both are routine in a GCP shop and neither is a real argument against it.
>
> Two operational things I'd plan for. IAM scoping: the common failure is granting the broad aiplatform.user role because working out specific permissions is fiddly. In a bank that's an audit finding, and it's much easier to scope roles per service account at the start than to retrofit.
>
> And quota. Production workloads need quota requested in advance per region and per model, and the lead time isn't always short. Discovering a ceiling during launch is entirely predictable and entirely avoidable."

## 8. Likely Follow-ups

**Q: Why use Vertex AI rather than the Gemini API?**
Governance. IAM instead of API keys, VPC Service Controls, customer-managed encryption keys, Cloud Audit Logs, and regional endpoints for data residency. The model capabilities are the same; the controls aren't, and those are what a security review asks about.

**Q: What does VPC Service Controls give you?**
A perimeter around the project preventing data exfiltration to other projects or the public internet even when credentials are valid. That's a control against credential compromise and insider risk, which an API-key-based integration can't provide at all.

**Q: What's the common IAM mistake?**
Granting the broad `aiplatform.user` role because scoping specific permissions is more work. In a regulated environment that's an audit finding. Predefined roles scoped per service account with documented justification is the expectation, and retrofitting it later is much harder.

**Q: Any operational surprises?**
Quota, mainly. It's per region and per model, needs requesting in advance, and the lead time isn't always short — so discovering a ceiling during launch is a predictable failure. Regional model availability also varies, which can constrain where a workload runs.

**Q: What are the downsides?**
More setup than an API key — project configuration, service accounts, IAM bindings, region selection — and variable regional model availability. Both are routine in an organization already on GCP, and neither outweighs the governance the platform provides.

## 9. Common Mistakes

- Proposing the standalone Gemini API for an enterprise system.
- Granting broad IAM roles instead of scoping per service account.
- Not requesting quota ahead of a production launch.
- Assuming every model is available in every region.
- Not labelling resources, making cost attribution impossible.

## 10. What to Remember

- **The enterprise surface for AI on GCP** — everything runs within it.
- **The reason is governance**, not capability: IAM, VPC-SC, CMEK, audit, residency.
- **API key for prototypes; Vertex AI for anything facing a security review.**
- **Scope IAM roles per service account** from the start.
- **Request quota in advance** — per region, per model.
