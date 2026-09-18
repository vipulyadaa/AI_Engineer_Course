# Gemini on Vertex AI

> **Phase 20 · VERTEX AI · Topic 04**

## 1. Definition

Accessing Gemini through Vertex AI — the same models as the standalone API, but authenticated with IAM, deployed regionally, logged to Cloud Audit Logs, and constrainable by VPC Service Controls.

> Gemini's capabilities are covered in [19-google-gemini](../19-google-gemini/). This topic is what changes when you access it through Vertex AI.

## 2. Simple Explanation

The models are the same. What changes is everything around the call: who is allowed to make it, where it's processed, what gets logged, and whether data can leave.

For an enterprise those differences are the entire point.

## 3. How It Works

```python
import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project=PROJECT, location="europe-west2")  # region
model = GenerativeModel("gemini-2.0-flash-001")          # pinned
```

**Authentication is Application Default Credentials** — a service account, workload identity, or a user's own credentials — not an API key. That means access is granted through IAM roles and revoked the same way.

**The location parameter is a residency control**, determining where the request is processed.

## 4. Practical Example

**What changes concretely:**

```
                      Gemini API        Vertex AI
Auth                  API key           IAM / ADC
Access revocation     rotate the key    remove a role binding
Audit trail           limited           Cloud Audit Logs
Network controls      none              VPC Service Controls
Residency             limited control   regional endpoints
Encryption keys       Google-managed    CMEK available
Billing               separate          project billing
Quota                 account-level     per project/region

The second column is what a security review is checking.
```

**Practical setup for a banking project:**

```
· a dedicated service account per workload, with only
  aiplatform.user scoped to what it needs — not a broad
  project-level grant
· workload identity rather than service account keys, so
  there's no long-lived credential to leak
· regional endpoint matching the data residency requirement
· CMEK if key control is required
· quota requested per region and model ahead of launch
· model version pinned explicitly
```

**Workload identity is the detail worth naming:** a downloaded service account key is a long-lived credential in a file. Workload identity federation removes it entirely, which turns a standing risk into no risk. It's a small configuration difference and a meaningful security improvement.

**Audit logging:** data access logs for Vertex AI aren't always on by default and generate volume. In a bank they're usually required, so enabling them and budgeting for the log volume is part of the setup rather than an afterthought.

## 5. Why It Matters

- **The models are identical** — the difference is entirely governance.
- **Workload identity removes long-lived credentials**, a small change with real value.
- **Data access audit logs** need enabling deliberately and budgeting for.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Service account keys** | Long-lived credentials that can leak |
| **Broad IAM grants** | An audit finding |
| **Wrong region** | Residency violation |
| **Unpinned model version** | Behaviour changes silently |
| **Quota not requested** | Launch blocked |
| **Audit logs not enabled** | No record of model access |

**On region selection:** it's not only a residency question — model availability and quota differ by region, and latency depends on proximity. A residency requirement may force a region where the preferred model isn't available, which is a constraint worth discovering during design rather than during launch.

**On version pinning:** a floating model reference means Google can update the model behind it, changing behaviour with no deploy on your side. Pinning explicitly, testing new versions against a golden set, and cutting over deliberately is the same discipline as with embedding models and matters for the same reason.

## 7. Interview Answer

> "The models are identical to the standalone API. What changes is everything around the call — authentication, processing location, logging, and whether data can leave the perimeter. For an enterprise those differences are the entire point.
>
> Authentication is Application Default Credentials rather than an API key, so access is granted through IAM roles and revoked by removing a role binding rather than rotating a shared secret. The location parameter determines where the request is processed, which is a residency control. Calls appear in Cloud Audit Logs alongside everything else. And the endpoint can sit inside a VPC Service Controls perimeter, so data can't be exfiltrated even with valid credentials.
>
> For a banking project the setup I'd want is: a dedicated service account per workload with narrowly scoped roles rather than a broad project-level grant, workload identity instead of downloaded service account keys, a regional endpoint matching the residency requirement, CMEK if key control is needed, quota requested per region and model ahead of launch, and the model version pinned explicitly.
>
> Workload identity is the detail I'd name specifically. A downloaded service account key is a long-lived credential sitting in a file — it can leak, it's hard to rotate, and it's a standing risk. Workload identity federation removes it entirely. That's a small configuration difference and a meaningful security improvement, and it's the kind of thing a security review will ask about directly.
>
> Two things that catch people. Region selection isn't only about residency — model availability and quota differ by region, and latency depends on proximity. A residency requirement can force a region where the preferred model isn't available, which is much better discovered during design than during launch.
>
> And data access audit logs for Vertex AI aren't always on by default and they generate real volume. In a bank they're usually required, so enabling them and budgeting for the log volume is part of the setup rather than something to add later.
>
> On version pinning — a floating model reference means Google can update the model behind it and behaviour changes with no deploy on my side. Pin explicitly, test new versions against a golden set, cut over deliberately. Same discipline as embedding models, same silent-degradation risk."

## 8. Likely Follow-ups

**Q: What actually differs from the Gemini API?**
Authentication via IAM rather than an API key, regional processing for residency, Cloud Audit Logs, VPC Service Controls, CMEK availability, and project-level billing and quota. The models themselves are the same — the difference is entirely the governance surface around them.

**Q: How should authentication be set up?**
Workload identity federation with a dedicated service account per workload, scoped narrowly. Downloaded service account keys are long-lived credentials sitting in files — they leak and they're hard to rotate. Workload identity removes that class of risk entirely for a small configuration change.

**Q: What decides the region?**
Residency requirements first, then model availability, quota, and latency. Those can conflict — a residency requirement may force a region where the preferred model isn't available — so it's worth checking during design rather than discovering at launch.

**Q: Why pin the model version?**
Because a floating reference lets Google update the model underneath you, changing behaviour with no deploy on your side. Pinning, testing new versions against a golden set, and cutting over deliberately is what keeps behaviour attributable to your own changes.

**Q: Anything to know about audit logging?**
Data access logs for Vertex AI aren't always enabled by default and they generate substantial volume. In a bank they're generally required, so enabling them and budgeting for the log storage is part of the initial setup rather than a later addition.

## 9. Common Mistakes

- Using downloaded service account keys instead of workload identity.
- Broad project-level IAM grants rather than scoped per-workload roles.
- Choosing a region without checking model availability and quota.
- Leaving the model version unpinned.
- Assuming data access audit logs are on by default.

## 10. What to Remember

- **Same models; the difference is governance.**
- **Workload identity, not service account keys** — removes a standing risk.
- **Region is residency, availability, quota, and latency** — they can conflict.
- **Pin the model version** and test new ones on a golden set.
- **Enable data access audit logs** deliberately and budget for the volume.
