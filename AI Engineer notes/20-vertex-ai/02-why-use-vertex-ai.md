# Why Use Vertex AI?

> **Phase 20 · VERTEX AI · Topic 02**

## 1. Definition

The case for Vertex AI over direct model APIs or a self-managed stack: governance you can't replicate with an API key, integration with the rest of the project, and managed services for the parts that are expensive to operate.

## 2. Simple Explanation

You could call models directly and run your own vector database. Vertex AI's value isn't that those are hard — it's that the governance layer around them is, and that you'd end up rebuilding it.

For a bank that layer isn't optional, which changes the calculation entirely.

## 3. How It Works

**Three categories of value:**

```
GOVERNANCE          IAM, VPC-SC, CMEK, audit logs, residency
                    → cannot be replicated with an API key

INTEGRATION         one project, one billing account, one
                    audit surface, one identity model,
                    Cloud Logging and Monitoring

MANAGED SERVICES    Vector Search, evaluation, pipelines,
                    endpoints, Agent Engine
                    → operational work you'd otherwise own
```

**The first category is the argument that decides it in banking.** The other two are ordinary platform benefits.

## 4. Practical Example

**The alternative, costed honestly:**

```
Direct Gemini API + self-hosted vector database:

  · API key management, rotation, and secret storage
  · a separate audit trail to build and retain
  · no VPC perimeter — data can leave with valid credentials
  · a vector database to operate: sizing, backups,
    replication, patching, upgrades
  · a separate access control model to keep in sync
  · a security review for each third-party component

That's a platform team's worth of work, plus a weaker
security posture than the managed option — which is the
unusual case where the managed option is both cheaper in
effort and stronger in controls.
```

**Where the argument is weaker, stated honestly:**

```
· MULTI-CLOUD requirements — Vertex AI is GCP-only, so a
  provider-agnostic mandate rules it out
· COST at very high volume — managed services carry a
  premium over self-hosted infrastructure
· CONTROL — managed retrieval and managed index tuning
  expose less than running it yourself
· LOCK-IN — index formats and pipeline definitions aren't
  portable

Those are real. In a GCP-committed bank they rarely
outweigh the governance, but pretending they don't exist
is worse than acknowledging them.
```

**The nuanced position:** use Vertex AI for the platform and governance, and be selective about which managed services you adopt within it. Vector Search as a managed index, yes. Fully managed retrieval that hides chunking and thresholds, probably not.

## 5. Why It Matters

- **Governance can't be replicated** with an API key — the deciding argument.
- **The self-managed alternative is a platform team's work** and a weaker posture.
- **Adopt the platform, be selective about services within it** — the nuanced answer.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **GCP-only** | Rules it out under a multi-cloud mandate |
| **Managed premium** | Costs more than self-hosted at very high volume |
| **Less control in managed services** | Chunking, thresholds, index parameters |
| **Lock-in** | Index formats and pipelines aren't portable |
| **Adopting every service** | Not all of them fit every requirement |
| **Quota and regional limits** | Constrain where workloads run |

**On lock-in, practically:** the mitigation is keeping your own data as the source of truth. If chunk text and metadata live in your own store and Vector Search holds only vectors and restricts, migrating means re-indexing rather than reconstructing. That's a design decision worth making on day one and nearly impossible to retrofit.

**On the managed premium:** at very high volume, self-hosted infrastructure is cheaper per query. The honest comparison includes the engineering time to build and operate it, the security review for each component, and the cost of the incidents you'd otherwise have avoided — which usually closes the gap, but not always, and it's worth actually calculating rather than asserting.

## 7. Interview Answer

> "The value falls into three categories: governance, integration, and managed services. For a bank the first one decides it and the other two are ordinary platform benefits.
>
> Governance is IAM, VPC Service Controls, customer-managed encryption keys, Cloud Audit Logs, and regional residency — and none of that can be replicated with an API key. That's the argument that settles it, because those are the controls a security review asks about.
>
> The alternative, costed honestly, is the direct Gemini API plus a self-hosted vector database. That means API key management and rotation, a separate audit trail to build and retain, no VPC perimeter so data can leave with valid credentials, a vector database to size and back up and replicate and patch, a separate access control model to keep in sync, and a security review for each third-party component. That's a platform team's worth of work for a weaker security posture — which is the unusual case where the managed option is both cheaper in effort and stronger in controls.
>
> I'd be honest about where the argument is weaker though. It's GCP-only, so a multi-cloud mandate rules it out. Managed services carry a premium over self-hosted at very high volume. Managed retrieval exposes less control than running the pipeline yourself. And there's lock-in — index formats and pipeline definitions aren't portable.
>
> On lock-in specifically, the mitigation is keeping your own data as the source of truth. If chunk text and metadata live in your own store and Vector Search holds only vectors and restricts, migrating is a re-index rather than a reconstruction. That's a design decision worth making on day one and nearly impossible to retrofit.
>
> So my position is nuanced rather than all-in: adopt Vertex AI for the platform and governance, and be selective about which managed services you use within it. Vector Search as a managed index, yes — I don't want to operate a vector database. Fully managed retrieval that hides chunking strategy and relevance thresholds, probably not, because those are the levers that determine quality and enable abstention.
>
> And on the cost premium, I'd actually calculate it rather than assert it either way. The honest comparison includes engineering time, security review per component, and the incidents avoided — which usually closes the gap, but not always."

## 8. Likely Follow-ups

**Q: What's the deciding argument in a bank?**
Governance — IAM, VPC Service Controls, CMEK, audit logs, and regional residency. Those can't be replicated with an API key, and they're exactly what a security review asks about. The model capabilities are available elsewhere; the controls aren't.

**Q: What would the alternative cost?**
A platform team's worth of work: key management, a separate audit trail, a vector database to size, back up, replicate, and patch, a parallel access control model, and a security review per third-party component — for a weaker security posture than the managed option provides.

**Q: Where is the argument weakest?**
Multi-cloud mandates, since it's GCP-only. Cost at very high volume, where self-hosted is cheaper per query. Control, since managed services expose less. And lock-in, since index formats and pipelines aren't portable.

**Q: How do you mitigate lock-in?**
Keep your own data as the source of truth — chunk text and metadata in your own store, with Vector Search holding only vectors and restricts. Then migration is a re-index rather than a reconstruction. It's a day-one design decision and very hard to retrofit.

**Q: Should you adopt every Vertex AI service?**
No. Adopt the platform for governance, then be selective. Vector Search as a managed index, yes — operating a vector database is work I don't want. Fully managed retrieval that hides chunking and thresholds, probably not, since those determine quality and enable abstention.

## 9. Common Mistakes

- Justifying it on model capability rather than governance.
- Adopting every managed service rather than choosing deliberately.
- Not designing against lock-in from the start.
- Asserting the cost comparison instead of calculating it.
- Ignoring that a multi-cloud mandate genuinely rules it out.

## 10. What to Remember

- **Governance is the deciding argument** — it can't be replicated with a key.
- **The self-managed alternative is a platform team** and a weaker posture.
- **Be selective within the platform** — managed index yes, managed retrieval maybe not.
- **Keep your own data as the source of truth** to bound lock-in.
- **Acknowledge the honest weaknesses:** multi-cloud, volume cost, control.
