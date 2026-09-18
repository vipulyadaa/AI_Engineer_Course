# Interview Questions: Google Cloud AI Infrastructure

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 09**

## 1. Definition

The surrounding Google Cloud services an AI system depends on — storage, compute, data, networking, and operations. Interview questions test whether you can design a whole system rather than just the model call.

## 2. Simple Explanation

A RAG system isn't only Vertex AI. It's GCS holding documents, Cloud Run serving the API, Firestore holding chunk payloads, Cloud Logging capturing traces, and Pub/Sub triggering re-ingestion.

Being able to name the whole architecture — and justify each piece — is what the question is testing.

## 3. How It Works

```
A COMPLETE BANKING RAG SYSTEM

STORAGE       GCS — source documents, ingestion staging
              Firestore — chunk payloads, session state
              BigQuery — traces, evaluation results, analytics

COMPUTE       Cloud Run — the API service
              Vertex AI Pipelines — ingestion

AI            Vertex AI — Gemini, embeddings, Vector Search
              Document AI — parsing

EVENTS        Pub/Sub — document change → re-ingestion
              Cloud Scheduler — periodic golden set runs

OPS           Cloud Logging, Monitoring, Trace
              Secret Manager — credentials
              Cloud Armor / IAP — edge protection

GOVERNANCE    IAM, VPC-SC, CMEK, Org Policy, Audit Logs
```

## 4. Practical Example

**The choices worth justifying:**

```
FIRESTORE for chunk payloads
  low-latency key lookup by chunk ID, which is exactly the
  access pattern — Vector Search returns IDs, the app
  fetches payloads. BigQuery would be the wrong shape for
  a per-request point read.

BIGQUERY for traces and evaluation
  analytical queries over large volumes — "abstention rate
  by question type over the last month" is a BigQuery
  query, not a Firestore one.

PUB/SUB for re-ingestion triggers
  a document changing in the source system publishes an
  event; ingestion consumes it. That decouples the source
  systems from the pipeline and makes incremental
  re-indexing event-driven rather than scheduled.

CLOUD RUN for the API
  scales to zero on low traffic, scales out on spikes, and
  it's a container so nothing about it is Vertex-specific.
```

**Naming why each service fits its access pattern is the answer**, rather than listing services — that's the difference between having designed a system and having read a product page.

**The governance layer, which is what makes it banking:**

```
· VPC Service Controls perimeter around the project
· CMEK for customer-managed keys
· Org Policy constraints preventing non-compliant
  configurations outright — regions, public IPs, CMEK
  requirement
· Cloud Audit Logs including data access
· Secret Manager rather than credentials in config
· workload identity rather than service account keys

Org Policy is the one worth naming specifically, because
preventing a misconfiguration is stronger than detecting
it — and in a regulated environment that's the difference
between a control and a monitoring alert.
```

## 5. Why It Matters

- **Justifying each service by access pattern** distinguishes design from recall.
- **Org Policy prevents rather than detects** — the strongest governance point.
- **Pub/Sub for event-driven re-ingestion** decouples source systems from the pipeline.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Listing services without justification | Reads as product knowledge |
| Only naming Vertex AI | Misses most of the system |
| BigQuery for per-request payload reads | Wrong access pattern |
| Credentials in config | Secret Manager exists |
| No event-driven ingestion | Scheduled-only means staleness windows |
| Governance layer unmentioned | The banking-specific part |

**On the data stores holding customer data:** Firestore session state, BigQuery traces, and Cloud Logging all hold customer content. Each needs retention, access control, and a deletion path — and they're easy to classify as infrastructure. Naming that unprompted signals having thought about the compliance surface rather than only the architecture.

**On not over-engineering:** a system serving a few thousand queries a day doesn't need every service listed. Cloud Run, GCS, Firestore, and Vertex AI would serve it. Naming the full architecture and then saying which pieces are only justified at scale demonstrates judgment rather than enthusiasm.

## 7. Interview Answer

> "A RAG system isn't only Vertex AI, and I'd answer by naming the whole architecture with a justification for each piece.
>
> Storage: GCS for source documents and ingestion staging. Firestore for chunk payloads and session state — low-latency key lookup by chunk ID, which is exactly the access pattern, since Vector Search returns IDs and the application fetches payloads. BigQuery for traces and evaluation results, because 'abstention rate by question type over the last month' is an analytical query over large volumes, which is the wrong shape for Firestore and exactly right for BigQuery.
>
> Compute: Cloud Run for the API service — it scales to zero on low traffic, scales out on spikes, and it's a container so nothing about it is Vertex-specific. Vertex AI Pipelines for ingestion, which gives reproducibility, lineage, caching, and scheduling.
>
> AI services: Vertex AI for Gemini, embeddings, and Vector Search; Document AI for parsing, because a table-heavy fee schedule needs structure-preserving extraction.
>
> Events: Pub/Sub for re-ingestion triggers. A document changing in the source system publishes an event and ingestion consumes it — which decouples the source systems from the pipeline and makes incremental re-indexing event-driven rather than scheduled, so there's no staleness window waiting for the next nightly run.
>
> Operations: Cloud Logging, Monitoring, and Trace; Secret Manager rather than credentials in config; Cloud Armor or IAP at the edge.
>
> And the governance layer, which is what makes it banking rather than generic. A VPC Service Controls perimeter around the project so data can't be exfiltrated even with valid credentials. CMEK for customer-managed keys. Cloud Audit Logs including data access. Workload identity rather than service account keys.
>
> The one I'd name specifically is Org Policy constraints — restricting which regions resources can be created in, requiring CMEK, disallowing public IPs. Preventing a misconfiguration outright is stronger than detecting it afterwards, and in a regulated environment that's the difference between a control and a monitoring alert. Reviewers treat those very differently.
>
> One thing I'd raise unprompted: Firestore session state, BigQuery traces, and Cloud Logging all hold customer content. Each needs retention, access control, and a deletion path — and they're easy to classify as infrastructure rather than customer data stores, which is the compliance gap an audit finds.
>
> And I'd be clear that a system serving a few thousand queries a day doesn't need all of this. Cloud Run, GCS, Firestore, and Vertex AI would serve it — the pipelines, Pub/Sub, and BigQuery analytics are justified at scale or by an audit requirement, not by default."

## 8. Likely Follow-ups

**Q: Why Firestore for chunk payloads?**
Because the access pattern is a low-latency point read by chunk ID — Vector Search returns IDs and the application fetches payloads. BigQuery is the wrong shape for a per-request key lookup, though it's right for analytical queries over traces.

**Q: What's Pub/Sub for?**
Event-driven re-ingestion. A document changing in the source system publishes an event and the ingestion pipeline consumes it, which decouples source systems from the pipeline and removes the staleness window you'd have waiting for a nightly scheduled run.

**Q: What makes the architecture specifically banking?**
The governance layer — VPC Service Controls, CMEK, Cloud Audit Logs including data access, workload identity, and Org Policy constraints. Org Policy especially, because preventing a misconfiguration outright is a control where detecting it afterwards is a monitoring alert.

**Q: Which stores hold customer data?**
Firestore session state, BigQuery traces, and Cloud Logging, alongside the obvious ones. All need retention, access control, and a deletion path — and they're easy to classify as infrastructure, which is exactly the compliance gap an audit finds.

**Q: Is all of this necessary?**
No. A few thousand queries a day needs Cloud Run, GCS, Firestore, and Vertex AI. Pipelines, Pub/Sub, and BigQuery analytics are justified at scale or by an audit requirement — naming what's conditional is part of the answer.

## 9. Common Mistakes

- Listing services without justifying the fit.
- Naming only Vertex AI and missing the surrounding system.
- Choosing a store that doesn't match the access pattern.
- Omitting the governance layer entirely.
- Proposing the full architecture regardless of scale.

## 10. What to Remember

- **Justify each service by access pattern**, not by naming it.
- **Firestore for point reads; BigQuery for analytics.**
- **Pub/Sub makes re-ingestion event-driven**, removing staleness windows.
- **Org Policy prevents; monitoring detects.** Name the difference.
- **Say which pieces are conditional on scale** — that's judgment.
