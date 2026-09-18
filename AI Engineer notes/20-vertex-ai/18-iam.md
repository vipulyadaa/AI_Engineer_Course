# IAM

> **Phase 20 · VERTEX AI · Topic 18**

## 1. Definition

Google Cloud's identity and access management as it applies to Vertex AI — controlling which principals can call models, read data, deploy endpoints, and run jobs, with least privilege as the operating principle.

## 2. Simple Explanation

IAM is who can do what. On Vertex AI it replaces API keys entirely: access is a role binding, and revoking it is removing the binding.

The mistake almost everyone makes is granting a broad role because working out the specific permissions is fiddly.

## 3. How It Works

```
PRINCIPAL      a user, group, or service account
ROLE           a bundle of permissions
RESOURCE       project, dataset, endpoint, index
BINDING        principal + role + resource

Common roles:
  aiplatform.user        broad — call models, create most
                         resources  ← over-granted constantly
  aiplatform.viewer      read-only
  predefined narrower    per-service roles
  custom                 exactly the permissions needed
```

**Bindings apply at a level** — organization, folder, project, or individual resource. Granting at the project level when a single endpoint would do is the common over-grant.

## 4. Practical Example

**A workable service account layout for a RAG system:**

```
sa-rag-ingestion
  read source documents from GCS
  call Document AI
  call the embedding model
  write to Vector Search
  → NO permission to call Gemini, no endpoint deployment

sa-rag-query
  call Gemini
  call the embedding model
  query Vector Search
  read chunk payloads from Firestore
  → NO write permission anywhere

sa-rag-eval
  call Gemini, read the golden set
  → read-only on production data

Separation by workload means a compromise of the query
service cannot modify the index, and the ingestion service
cannot answer customer queries.
```

**That separation is the substantive design point** — it's blast-radius containment, and it costs nothing but a few extra service accounts.

**Workload identity over service account keys:**

```
A downloaded service account key is a long-lived credential
in a file. It can leak, it's hard to rotate, and it's a
standing risk with no expiry.

Workload identity federation removes it entirely — the
workload authenticates as itself. Small configuration
difference, meaningful security improvement, and a security
review will ask about it directly.
```

**Where agents complicate this:**

```
An agent's tools must act as the END USER, not the service
account. If tools run with the service account's
permissions, any user who can reach the agent can reach
everything the service account can.

So there are two identity layers: the service account for
platform access, and the end user's identity propagated
into every data access. Conflating them is the privilege
escalation path in agent design.
```

## 5. Why It Matters

- **Separate service accounts per workload** contain blast radius for almost no cost.
- **Workload identity removes long-lived credentials** — a small change, a real improvement.
- **Two identity layers in agents** — service account for platform, end user for data.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Broad `aiplatform.user` grants** | Audit finding; large blast radius |
| **Project-level bindings** | Where a resource-level one would do |
| **Downloaded service account keys** | Long-lived credentials that leak |
| **One service account for everything** | No separation of concerns |
| **Tools running as the service account** | Privilege escalation in agents |
| **No periodic access review** | Permissions accumulate |

**On permission creep:** access gets granted during an incident or a migration and is rarely removed. A periodic review of who holds what, with unused bindings revoked, is the control — and IAM Recommender surfaces over-granted roles based on actual usage, which makes the review evidence-based rather than a negotiation.

**On break-glass access:** production incidents sometimes need elevated access. That should be a documented, time-limited, heavily audited path rather than standing permissions "in case" — which is how broad grants become permanent.

## 7. Interview Answer

> "IAM replaces API keys entirely on Vertex AI — access is a role binding and revoking it is removing the binding, which means the same identity and audit surface as everything else in the project.
>
> The mistake almost everyone makes is granting the broad aiplatform.user role at the project level because working out the specific permissions is fiddly. In a bank that's an audit finding, and it's much easier to scope properly at the start than to retrofit.
>
> The layout I'd use is a service account per workload. An ingestion service account that reads source documents, calls Document AI and the embedding model, and writes to Vector Search — with no permission to call Gemini and no endpoint deployment rights. A query service account that calls Gemini and the embedding model, queries Vector Search, and reads chunk payloads — with no write permission anywhere. And an evaluation service account that's read-only on production data.
>
> That separation is blast-radius containment. A compromise of the query service cannot modify the index, and the ingestion service cannot answer customer queries. It costs nothing but a few extra service accounts.
>
> On credentials, workload identity federation rather than downloaded service account keys. A downloaded key is a long-lived credential sitting in a file — it can leak, it's hard to rotate, and it has no expiry. Workload identity removes that class of risk for a small configuration change, and a security review will ask about it directly.
>
> The part that complicates this in agent systems is that there are two identity layers. The service account provides platform access — permission to call Gemini and query the index. But an agent's tools must act as the end user for data access. If tools run with the service account's permissions, any user who can reach the agent can reach everything that service account can. Conflating those two layers is the privilege escalation path in agent design.
>
> Two operational controls. Periodic access review, because permissions get granted during incidents and migrations and are rarely removed — IAM Recommender surfaces over-granted roles based on actual usage, which makes the review evidence-based rather than a negotiation.
>
> And break-glass access as a documented, time-limited, heavily audited path rather than standing elevated permissions 'in case'. That's how broad grants become permanent."

## 8. Likely Follow-ups

**Q: What's the common IAM mistake?**
Granting the broad `aiplatform.user` role at the project level because scoping specific permissions is more work. It's an audit finding in a regulated environment and it maximizes blast radius, and it's far easier to scope correctly from the start than to retrofit later.

**Q: How would you structure service accounts?**
One per workload — ingestion, query, evaluation — each with only what that workload needs. Then a compromise of the query service can't modify the index, and the ingestion service can't answer customer queries. It's blast-radius containment for the cost of a few accounts.

**Q: Why workload identity over service account keys?**
A downloaded key is a long-lived credential in a file with no expiry — it leaks, and rotation is manual and often skipped. Workload identity federation removes it entirely, which turns a standing risk into no risk for a small configuration change.

**Q: How does IAM interact with agents?**
Two layers. The service account grants platform access — calling models, querying the index. But tools must act as the end user for data access, because if they run with the service account's permissions, anyone who can reach the agent reaches everything it can. Conflating them is the escalation path.

**Q: How do you stop permission creep?**
Periodic access review with unused bindings revoked, informed by IAM Recommender, which flags over-granted roles based on actual usage. And break-glass access as a documented, time-limited, audited path rather than standing elevated permissions kept "in case."

## 9. Common Mistakes

- Granting broad roles at the project level.
- One service account shared across all workloads.
- Downloaded service account keys instead of workload identity.
- Tools in agents running with service account permissions.
- No periodic review, so grants accumulate indefinitely.

## 10. What to Remember

- **Access is a role binding**, not a key — revocation is removal.
- **A service account per workload** contains blast radius cheaply.
- **Workload identity, never downloaded keys.**
- **Two identity layers in agents** — service account for platform, user for data.
- **Review access periodically**; break-glass is time-limited and audited.
