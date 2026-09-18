# "How Would You Migrate It to Google Cloud?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 29**

## 1. Definition

A design question mapping an existing RAG system onto Google Cloud services, and — more importantly — sequencing the migration so quality can be verified at each step rather than after all of it.

## 2. Simple Explanation

The component mapping is the easy half and it's what most people answer. The harder half is the order: change one thing at a time, and keep a way to compare.

Changing the embedding model, the vector store, and the LLM simultaneously means a quality change you can't attribute to anything.

## 3. How It Works

```
THE MAPPING

documents           → Cloud Storage
ingestion trigger   → Eventarc on object finalize
document parsing    → Document AI (layout, tables, forms)
ingestion compute   → Cloud Run jobs
embeddings          → Vertex AI text-embedding-005
vector index        → Vertex AI Vector Search
chunk text + meta   → Firestore
query API           → Cloud Run
generation          → Gemini via Vertex AI
orchestration       → application code, or Agent Engine
                      if it becomes agentic
observability       → Cloud Logging / Monitoring / Trace
secrets             → Secret Manager
```

```
THE COMPLIANCE LAYER — the reason this migration is
attractive in banking at all

  VPC Service Controls   a perimeter so data can't be
                         exfiltrated to another project
  CMEK                   customer-managed keys
  Cloud Audit Logs       who called which model with what
  Data residency         region pinning for all services
  IAM                    one identity model across every
                         component

These come from the platform rather than being rebuilt,
and that is usually the actual business case.
```

## 4. Practical Example

**The sequence — one variable at a time:**

```
PHASE 1  documents into Cloud Storage; ingestion running
         on Cloud Run, still writing to the existing
         index and still using the existing models.
         → infrastructure moved, quality unchanged and
           provably so

PHASE 2  embeddings to Vertex AI. Index side by side,
         tagged by model, evaluate both on the golden
         set, cut over by changing a query filter.
         → one variable, measurable, reversible

PHASE 3  vector store to Vector Search, with the old
         store still populated. Shadow-read both and
         compare result sets before switching traffic.

PHASE 4  generation to Gemini. Evaluate on the golden
         set; the prompt will need adjusting because
         instruction-following differs between model
         families.

PHASE 5  decommission, after a stability period.

Each phase is independently reversible. Doing them
together means an unattributable quality change and no
rollback smaller than everything.
```

**The two Google Cloud specifics worth knowing:**

```
1. VECTOR SEARCH STORES VECTORS, NOT DOCUMENTS
   It holds the vector, an ID, and restrict tokens.
   Chunk text lives in Firestore keyed by chunk ID.
   Retrieval is a search then a batch fetch — an
   architectural difference from an all-in-one store,
   and a migration task in itself.

2. INDEX UPDATE MODE IS A DESIGN DECISION
   Streaming updates let you upsert individual chunks,
   which suits incremental ingestion.
   Batch updates rebuild, which is cheaper at volume but
   means a staleness window.
   Choosing this wrong is expensive to undo, because it
   affects how the whole ingestion pipeline is shaped.
```

**Document AI as the real upgrade:** if parsing was previously a text extraction library, Document AI's layout parser is the change most likely to improve answer quality — it preserves table structure and reading order, which is exactly what a fee schedule needs. Worth framing as a quality improvement rather than an infrastructure swap, and worth evaluating as one.

**What to be honest about:** Vector Search index management is more operationally involved than a Postgres table, streaming updates cost more than batch, and Gemini's prompt behaviour differs enough that prompts need re-tuning rather than copying. A migration answer that claims everything gets simpler isn't credible.

## 5. Why It Matters

- **Sequence one variable at a time** — parallel changes can't be attributed.
- **The compliance layer is usually the business case**, not performance.
- **Vector Search stores vectors, not documents** — a real architectural change.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Changing embeddings, store, and LLM together | Unattributable quality change, no partial rollback |
| No golden set before migrating | Nothing to compare against |
| Assuming prompts transfer unchanged | Instruction-following differs by family |
| Not planning the two-store split | Discovered mid-migration |
| Wrong index update mode | Expensive to reverse |
| Ignoring VPC-SC and CMEK until the end | They constrain architecture, not just config |

**On the prerequisite:** a golden set has to exist *before* the migration starts. Without one there's no way to tell whether the new stack is better, worse, or the same — and the migration becomes a leap of faith with a post-hoc justification. This is the single most common reason migrations produce arguments rather than answers.

**On what genuinely gets simpler:** identity. One IAM model across storage, embeddings, the index, and the model endpoint replaces several separate credential systems, and the audit trail becomes uniform. That's a real operational gain and it's the one worth leading with.

## 7. Interview Answer

> "I'd separate the mapping, which is the easy half, from the sequencing, which is where migrations actually succeed or fail.
>
> The mapping: documents in Cloud Storage, ingestion triggered by Eventarc on object finalize, parsing through Document AI, ingestion compute on Cloud Run jobs, embeddings from Vertex AI, the index in Vector Search, chunk text and metadata in Firestore, the query API on Cloud Run, generation with Gemini through Vertex AI, and observability through Cloud Logging, Monitoring, and Trace.
>
> But the reason this migration is attractive in banking isn't the components — it's the compliance layer. VPC Service Controls give a perimeter so data can't be exfiltrated to another project. CMEK for customer-managed keys. Cloud Audit Logs recording who called which model with what. Region pinning for residency. And one IAM model across every component instead of several separate credential systems. Those come from the platform rather than being rebuilt, and that's usually the actual business case.
>
> On sequencing — the rule is one variable at a time, because changing the embedding model, the vector store, and the LLM together produces a quality change you can't attribute to any of them, and no rollback smaller than everything.
>
> So: phase one moves documents to Cloud Storage and ingestion to Cloud Run, still writing to the existing index with the existing models. Infrastructure has moved and quality is provably unchanged.
>
> Phase two is embeddings. Index side by side, tagged by model version, evaluate both on the golden set, and cut over by changing a query filter. One variable, measurable, reversible.
>
> Phase three is the vector store, with the old one still populated — shadow-read both and compare result sets before switching traffic.
>
> Phase four is generation to Gemini, evaluated on the golden set, with the expectation that prompts need adjusting rather than copying, because instruction-following differs between model families.
>
> Phase five is decommissioning, after a stability period.
>
> Two Google Cloud specifics worth knowing. Vector Search stores vectors, IDs, and restrict tokens — not documents. So chunk text lives in Firestore keyed by chunk ID and retrieval becomes a search then a batch fetch. If you're coming from an all-in-one store, that's an architectural change and a migration task in itself.
>
> And the index update mode is a real decision: streaming updates let you upsert individual chunks, which suits incremental ingestion; batch updates rebuild and are cheaper at volume but leave a staleness window. Getting that wrong is expensive to undo because it shapes the whole ingestion pipeline.
>
> One thing I'd frame as an upgrade rather than a swap: if parsing was previously a text extraction library, Document AI's layout parser is probably the single change most likely to improve answer quality, because it preserves table structure and reading order — and the fee schedule is a table. So I'd evaluate it as a quality change, not just move it.
>
> The prerequisite for all of it is having a golden set before starting. Without one there's no way to tell whether the new stack is better, worse, or the same, and the migration becomes a leap of faith with a post-hoc justification.
>
> And I'd be honest that not everything gets simpler. Vector Search index management is more involved than a Postgres table, streaming updates cost more than batch, and Gemini prompts need re-tuning. What genuinely does get simpler is identity — one IAM model and a uniform audit trail across every component."

## 8. Likely Follow-ups

**Q: What order would you migrate in?**
Storage and compute first with models unchanged, then embeddings side-by-side, then the vector store with shadow reads, then generation, then decommission. One variable per phase so each is measurable and reversible.

**Q: What's the prerequisite?**
A golden set. Without one there's no way to tell whether the new stack is better or worse, and every migration decision becomes an argument rather than a measurement.

**Q: What surprises people about Vector Search?**
It stores vectors, IDs, and restrict tokens — not documents. Chunk text goes in Firestore keyed by chunk ID, and retrieval becomes search-then-fetch. Coming from an all-in-one store, that's a real architectural change.

**Q: Do prompts transfer between model families?**
Not unchanged. Instruction-following differs, so a prompt tuned for one family needs re-evaluation and usually adjustment on another — which is why generation moves in its own phase with a golden-set comparison.

**Q: What's the real business case?**
The compliance layer — VPC-SC, CMEK, audit logs, residency, and a single IAM model — obtained from the platform rather than rebuilt. In banking that's worth more than any performance difference.

## 9. Common Mistakes

- Reciting the service mapping with no migration sequence.
- Changing several components at once.
- Migrating without a golden set to compare against.
- Copying prompts across model families unchanged.
- Treating VPC-SC and CMEK as configuration to add at the end.

## 10. What to Remember

- **One variable per phase** — measurable and reversible.
- **The compliance layer is the business case.**
- **Vector Search stores vectors, not documents** — search then fetch.
- **Document AI parsing is a quality upgrade**, not just a swap.
- **A golden set is the prerequisite**, not a nice-to-have.
