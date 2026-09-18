# What Is a Vector Database?

> **Phase 07 · VECTOR DATABASES · Topic 01**

## 1. Definition

A database optimized for storing high-dimensional vectors and finding nearest neighbours quickly, with metadata filtering, CRUD operations, and the operational properties a production system needs — persistence, replication, and access control.

## 2. Simple Explanation

The core operation is "find the k vectors closest to this one." Everything else exists to make that usable in production.

An approximate nearest-neighbour library gives you the search. A vector database gives you the search *plus* filtering, updates, deletes, persistence, and multi-tenancy — which is most of what actually takes time to build.

## 3. How It Works

```
Store:    vector + text + metadata, keyed by chunk id
Index:    an ANN structure (HNSW, IVF, ScaNN) over the vectors
Search:   query vector + metadata filter → top-k
Manage:   upsert, delete, namespaces, replication, backup
```

**Library vs. database — the distinction that matters:**

| | ANN library (FAISS) | Vector database |
|---|---|---|
| Nearest-neighbour search | ✅ | ✅ |
| Metadata filtering | Manual | ✅ Native |
| Updates and deletes | Awkward | ✅ |
| Persistence | You build it | ✅ |
| Replication, backup | You build it | ✅ |
| Access control / namespaces | You build it | ✅ |
| Operational tooling | None | ✅ |

**FAISS is excellent at the search itself.** The database exists because the other rows are where the work is.

## 4. Practical Example

**The options, and how to choose:**

| Option | Fits |
|---|---|
| **Vertex AI Vector Search** | GCP-native; managed; residency in-project |
| **pgvector** | You already run Postgres; one system to operate |
| **Pinecone** | Managed, mature, provider-agnostic |
| **Weaviate / Qdrant** | Open-source, self-hostable, strong filtering |
| **Chroma** | Prototyping and small local corpora |
| **FAISS** | A library for embedded use, not a service |

**The pgvector argument is stronger than it looks:**

```
If the corpus is under a few million vectors and you already
run Postgres:
  · one system to operate, back up, and secure
  · transactional consistency between vectors and metadata
  · existing access control, monitoring, and expertise
  · SQL joins against relational data

Adding a dedicated vector database means a second datastore
with its own operational burden. At moderate scale, that
burden often outweighs the performance advantage.
```

**The features that actually decide it in production:**

```
1. FILTERED SEARCH — pre-filtering during the search, not after.
   This is an access-control requirement, not an optimization.
2. Namespaces or per-tenant isolation
3. Updates and deletes that actually reconcile
4. Backup and point-in-time recovery
5. Residency and deployment model
```

## 5. Why It Matters

- **The library-vs-database distinction** is the substantive answer to "why not just use FAISS."
- **Pre-filtered search is an access-control requirement**, which makes it a selection criterion rather than a nice-to-have.
- **The pgvector option** is often right at moderate scale, and saying so signals judgment over enthusiasm.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Adopting a dedicated store prematurely** | Operational burden of a second datastore |
| **No native pre-filtering** | Post-filtering leaks and under-retrieves |
| **Poor delete handling** | Removed content stays retrievable |
| **ANN recall loss unmeasured** | Silent, and compounds with upstream losses |
| **Vendor lock-in** | Index formats aren't portable |
| **Residency** | A hosted store means data leaves your environment |

**On measuring ANN recall:** every vector database trades exactness for speed, and the loss is invisible unless you measure it. Sample a few hundred queries, run them against both the ANN index and an exact search over the same vectors, and compute the overlap. That number is what the index is costing you, and almost nobody checks it.

**On deletes:** some implementations handle deletes as tombstones that degrade the index over time. Verify that deleted content is genuinely unretrievable and that the index doesn't degrade after many deletions — it matters for right-to-erasure and for document withdrawal.

## 7. Interview Answer

> "A vector database stores high-dimensional vectors and finds nearest neighbours quickly, with metadata filtering, CRUD, and the operational properties production needs — persistence, replication, access control.
>
> The distinction worth drawing is library versus database. FAISS is excellent at the search itself. What a database adds is metadata filtering, updates and deletes, persistence, replication, backup, and multi-tenancy — which is where most of the actual work is. 'Why not just use FAISS' is answered by that list, not by search performance.
>
> The feature that decides it for me in a banking context is pre-filtered search — filtering during the search rather than after. That's an access-control requirement, not an optimization: post-filtering means ineligible documents were retrieved and scored before being discarded, and it silently under-retrieves because top-k was computed over a population the user can't see. So native filtered search is a hard selection criterion.
>
> On options, for a GCP system Vertex AI Vector Search is the natural fit — managed, and data stays in the project, which is a residency argument that often decides things in a bank before performance does.
>
> But I'd make the pgvector case seriously. If the corpus is under a few million vectors and you already run Postgres, you get one system to operate, back up, and secure; transactional consistency between vectors and metadata; existing access control and monitoring; and SQL joins against relational data. Adding a dedicated vector store means a second datastore with its own operational burden, and at moderate scale that burden often outweighs the performance advantage.
>
> One thing I'd measure that almost nobody does: ANN recall against exact search. Every vector database trades exactness for speed, and the loss is invisible unless you check it. Sample a few hundred queries, run them against the index and against exact search over the same vectors, and compute the overlap — that's what the index is costing you, and it compounds with every other recall loss upstream."

## 8. Likely Follow-ups

**Q: Why not just use FAISS?**
FAISS handles the search well. What it doesn't give you is metadata filtering, updates and deletes, persistence, replication, backup, namespaces, and operational tooling — which is where most of the work is. For an embedded use case with a static corpus it's fine; for a production service you'd end up building a database around it.

**Q: When is pgvector the right choice?**
When the corpus is under a few million vectors and you already run Postgres. You get one system to operate and secure, transactional consistency between vectors and metadata, existing access control and monitoring, and SQL joins against relational data. At moderate scale that operational simplicity usually beats a dedicated store's performance edge.

**Q: What feature matters most in selection?**
Native pre-filtered search — filtering during the search rather than after. It's an access-control requirement rather than an optimization, because post-filtering both leaks and silently under-retrieves. A store without it can't safely serve a multi-tenant or permissioned corpus.

**Q: How do you measure whether the index is costing you recall?**
Sample a few hundred queries, run them against both the ANN index and an exact flat search over the same vectors, and compute the top-k overlap. That's your ANN recall. It's cheap to run and almost nobody does it, which means the loss compounds silently with every other recall loss upstream.

**Q: What would you pick for a Google Cloud banking system?**
Vertex AI Vector Search as the default — managed, native integration with the embedding models, and data staying in the project, which is a residency requirement more than a preference. I'd still evaluate pgvector if the corpus is moderate and Postgres is already in the stack, because one fewer datastore is worth real money in operational terms.

## 9. Common Mistakes

- Adopting a dedicated vector store before scale justifies it.
- Choosing a store without native pre-filtered search.
- Never measuring ANN recall against exact search.
- Not verifying that deletes make content genuinely unretrievable.
- Ignoring residency and deployment model in a regulated context.

## 10. What to Remember

- **Search plus filtering, CRUD, persistence, and multi-tenancy** — the non-search parts are the work.
- **Pre-filtered search is an access-control requirement**, not an optimization.
- **pgvector is often right at moderate scale** — one fewer system to operate.
- **Vertex AI Vector Search** for a GCP system, largely on residency and integration.
- **Measure ANN recall against exact search.** The loss is silent and compounds.
