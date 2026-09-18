# Security

> **Phase 20 · VERTEX AI · Topic 19**

## 1. Definition

The platform controls that make Vertex AI usable in a regulated environment — VPC Service Controls, private connectivity, customer-managed encryption keys, data residency, and audit logging — plus the application-level controls those don't cover.

## 2. Simple Explanation

Platform security is about containing data: where it goes, who can reach it, and what's recorded.

Application security is about what the model does with it. Both are needed, and the platform controls are the ones a security review asks about first.

## 3. How It Works

```
VPC SERVICE CONTROLS   a perimeter around the project;
                       data can't leave even with valid
                       credentials
PRIVATE CONNECTIVITY   Private Service Connect, so traffic
                       doesn't traverse the public internet
CMEK                   customer-managed encryption keys —
                       key control stays with the bank
DATA RESIDENCY         regional endpoints; processing stays
                       in region
AUDIT LOGGING          admin activity and data access in
                       Cloud Audit Logs
ORG POLICY             constraints preventing non-compliant
                       configurations entirely
```

**VPC Service Controls is the control that most distinguishes the platform** — it defends against credential compromise and insider exfiltration, which nothing at the application layer can.

## 4. Practical Example

**What a banking security review will ask:**

```
· Where is data processed, and can it leave the region?
· Can data be exfiltrated with valid credentials?
· Who holds the encryption keys?
· Is traffic on the public internet?
· Is model access audited, including data access?
· What data is retained, where, and for how long?
· How is a deletion request satisfied across every store?

Vertex AI answers the first five with platform controls.
The last two are yours to design, and they're where the
gaps usually are.
```

**The stores people forget when answering the last two:**

```
· vector index and chunk payload store
· LangGraph or agent checkpoints
· conversation session store
· traces and observability data
· the evaluation golden set
· prompt and response logs

Every one holds customer data. Every one needs retention
policy, access control, and a deletion path. Treating any
of them as "infrastructure" rather than a customer data
store is the compliance gap that an audit finds.
```

**That list is the substantive contribution here** — the platform controls are well documented and the forgotten stores aren't.

**Org Policy as prevention rather than detection:**

```
Constraints that block non-compliant configurations
outright — restricting which regions resources can be
created in, requiring CMEK, disallowing public IPs.

Preventing a misconfiguration is stronger than detecting
it afterwards, and in a bank it's the difference between a
control and a monitoring alert.
```

## 5. Why It Matters

- **VPC Service Controls defends against valid credentials** — nothing at the app layer can.
- **The forgotten data stores** — checkpoints, traces, eval sets — are where compliance gaps live.
- **Org Policy prevents misconfiguration** rather than detecting it.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No VPC-SC perimeter** | Exfiltration possible with valid credentials |
| **Public endpoints** | Traffic on the public internet |
| **Data access logs off** | No record of what was accessed |
| **Forgotten data stores** | Retention and erasure gaps |
| **Platform controls only** | Doesn't cover what the model outputs |
| **VPC-SC breaking integrations** | Perimeters block legitimate cross-project calls |

**On VPC-SC friction:** a perimeter blocks cross-project calls that were previously fine, which surfaces as confusing permission errors during a rollout. Planning the perimeter — which projects are inside, which access levels are needed — before enabling it avoids an outage that looks like an IAM problem and isn't.

**On what platform controls don't cover:** they contain data; they don't prevent the model producing regulated financial advice, guaranteeing an outcome, stating an ungrounded figure, or disclosing information the user shouldn't see. Those are application controls — grounding, verification, output checks, and pre-filtered retrieval — and a security posture built only on platform controls misses all of them.

## 7. Interview Answer

> "Platform security on Vertex AI is VPC Service Controls, private connectivity, customer-managed encryption keys, regional residency, audit logging, and Org Policy constraints.
>
> VPC Service Controls is the one I'd highlight, because it's the control that defends against something nothing at the application layer can — data exfiltration with valid credentials. That covers credential compromise and insider risk, and it's what a security review is really asking about when it asks whether data can leave.
>
> A banking review will ask: where is data processed and can it leave the region, can it be exfiltrated with valid credentials, who holds the encryption keys, is traffic on the public internet, is model access audited including data access, what data is retained and for how long, and how is a deletion request satisfied across every store. Vertex AI answers the first five with platform controls. The last two are mine to design, and that's where the gaps usually are.
>
> The stores people forget are the vector index and chunk payload store, agent or LangGraph checkpoints, the conversation session store, traces and observability data, the evaluation golden set, and prompt and response logs. Every one holds customer data, and every one needs retention policy, access control, and a deletion path. Treating any of them as infrastructure rather than a customer data store is the compliance gap an audit finds — and it's easy to create because none of them feel like a database.
>
> I'd also use Org Policy constraints rather than relying on review — restricting which regions resources can be created in, requiring CMEK, disallowing public IPs. Preventing a misconfiguration is stronger than detecting it, and in a bank that's the difference between a control and a monitoring alert.
>
> One practical thing: enabling a VPC-SC perimeter blocks cross-project calls that previously worked, and it surfaces as confusing permission errors during rollout. Planning which projects are inside the perimeter and which access levels are needed before enabling it avoids an outage that looks like an IAM problem and isn't.
>
> And I'd be clear that platform controls contain data but don't govern what the model outputs. They don't prevent regulated financial advice, guaranteed outcomes, ungrounded figures, or disclosing what a user shouldn't see. Those are application controls — grounding, verification, output checks, pre-filtered retrieval — and a security posture built only on platform controls misses all of them."

## 8. Likely Follow-ups

**Q: What does VPC Service Controls protect against?**
Data exfiltration with valid credentials — credential compromise and insider risk. It's a perimeter around the project, so even an authenticated principal can't move data outside it. Nothing at the application layer provides that, which is why it's the distinguishing platform control.

**Q: Which data stores get forgotten?**
Agent checkpoints, session stores, traces, the evaluation golden set, and prompt and response logs. All hold customer data and all need retention policy, access control, and a deletion path — and none of them feel like a database, which is exactly why they're missed.

**Q: How do you satisfy a deletion request?**
By having a delete path reaching every store — vector index, chunk payloads, checkpoints, sessions, traces, logs, and backups within the retention window — with an audit record per store proving it happened. A system that deletes only the primary store leaves data everywhere else.

**Q: What's Org Policy for?**
Preventing non-compliant configurations outright rather than detecting them afterwards — restricting creation regions, requiring CMEK, disallowing public IPs. In a regulated environment prevention is a control and detection is a monitoring alert, and reviewers treat them very differently.

**Q: What don't platform controls cover?**
What the model outputs. They don't prevent regulated financial advice, guaranteed outcomes, ungrounded figures, or inappropriate disclosure. Those need application controls — grounding, verification, output checks, and pre-filtered retrieval — and a posture built only on platform controls misses them entirely.

## 9. Common Mistakes

- Relying on platform controls alone for safety.
- Not enabling data access audit logs.
- Treating checkpoints, traces, and eval sets as infrastructure.
- Enabling VPC-SC without planning the perimeter.
- Using detection where Org Policy could prevent.

## 10. What to Remember

- **VPC-SC defends against valid credentials** — unique among the controls.
- **The forgotten stores** — checkpoints, sessions, traces, eval sets — hold customer data.
- **A deletion path must reach every store**, with audit evidence.
- **Org Policy prevents; monitoring detects.** Prefer prevention.
- **Platform controls contain data; application controls govern output.**
