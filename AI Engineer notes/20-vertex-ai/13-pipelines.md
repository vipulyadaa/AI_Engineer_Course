# Pipelines

> **Phase 20 · VERTEX AI · Topic 13**

## 1. Definition

Vertex AI Pipelines runs containerized, versioned ML workflows as DAGs — built with KFP or TFX — with artifact tracking, lineage, caching, and scheduling.

## 2. Simple Explanation

A pipeline is a workflow whose steps run in containers, with inputs and outputs tracked as artifacts.

For a RAG system the obvious use isn't model training — it's the ingestion pipeline, which is the part that most needs to be reproducible, resumable, and auditable.

## 3. How It Works

```python
@component(base_image="python:3.11")
def chunk_documents(parsed: Input[Dataset],
                    chunks: Output[Dataset],
                    chunk_size: int = 800):
    ...

@pipeline(name="rag-ingestion")
def ingestion(source_uri: str, embedding_model: str):
    parsed  = parse_documents(source_uri=source_uri)
    chunked = chunk_documents(parsed=parsed.outputs["parsed"])
    embedded = embed_chunks(chunks=chunked.outputs["chunks"],
                            model=embedding_model)
    index_vectors(embedded=embedded.outputs["embedded"])
```

**Steps are containers, and artifacts are tracked** — so every run records which inputs produced which outputs, with lineage.

**Caching:** an unchanged step with unchanged inputs is skipped on re-run, which makes iterating on a later stage cheap.

## 4. Practical Example

**Why RAG ingestion belongs in a pipeline:**

```
1. REPRODUCIBILITY
   "Which chunking parameters and embedding model produced
    the current index?" is answered by the pipeline run,
    not by asking someone.

2. CACHING
   Changing the chunking parameter re-runs chunking,
   embedding, and indexing — but not parsing. Since parsing
   with Document AI is expensive, that's a real saving on
   every iteration.

3. LINEAGE
   Every chunk traces to a run, to the source document, to
   the parameters. That's what an audit asks for.

4. SCHEDULING
   Weekly re-ingestion runs without someone remembering.

5. RESUMABILITY
   A failure at the embedding step restarts from there
   rather than re-parsing everything.
```

**Point 2 is the one that changes day-to-day work.** Iterating on chunking without re-paying for parsing is the difference between trying five configurations and trying one.

**Where a pipeline is over-engineering:**

```
A one-off ingestion of a static corpus doesn't need a
pipeline. A script is fine.

The pipeline earns its place when ingestion recurs, when
parameters get iterated on, or when lineage is an audit
requirement. In banking the third usually applies, which
is what makes it worth the setup.
```

**Cost note:** pipeline steps run on provisioned machines billed for the duration of the step. A component requesting a large machine for a lightweight step wastes money on every run, which compounds for a scheduled pipeline.

## 5. Why It Matters

- **RAG ingestion is the natural pipeline use**, not just model training.
- **Caching makes iterating on chunking cheap** by skipping expensive parsing.
- **Lineage answers the audit question** about what produced the current index.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Over-engineering one-off work** | A script would do |
| **Oversized machines per step** | Wasted spend on every run |
| **Cache invalidation surprises** | A changed container image invalidates everything |
| **Container build overhead** | Slower iteration than a local script |
| **Secrets in components** | Must come from Secret Manager, not baked in |
| **No failure alerting** | Scheduled runs failing silently |

**On cache behaviour:** caching keys on inputs *and* the container image. Rebuilding the image — even for an unrelated change — invalidates the cache for that step and everything downstream. That's correct behaviour and it surprises people who expected only parameter changes to matter.

**On scheduled failures:** a weekly re-ingestion that fails silently means the index quietly goes stale while everything appears normal. Alerting on pipeline failure is essential, and so is a freshness metric on the index itself — because a pipeline that succeeded while producing nothing is also possible.

## 7. Interview Answer

> "Vertex AI Pipelines runs containerized workflows as DAGs with artifact tracking, lineage, caching, and scheduling. The use I'd point to isn't model training — it's RAG ingestion, which is the part of the system that most needs to be reproducible and auditable.
>
> Five reasons it belongs in a pipeline. Reproducibility: 'which chunking parameters and embedding model produced the current index' is answered by the run record rather than by asking someone. Lineage: every chunk traces back to a run, a source document, and the parameters — which is what an audit asks for. Scheduling, so weekly re-ingestion happens without someone remembering. Resumability, so a failure at the embedding step restarts from there rather than re-parsing everything.
>
> And caching, which is the one that changes day-to-day work. Changing the chunking parameter re-runs chunking, embedding, and indexing, but not parsing. Since parsing with Document AI is expensive, that's a real saving on every iteration — it's the difference between trying five chunking configurations and trying one.
>
> One thing about caching that surprises people: it keys on inputs *and* the container image. Rebuilding the image for an unrelated change invalidates the cache for that step and everything downstream. That's correct behaviour, and it catches people who expected only parameter changes to matter.
>
> Where a pipeline is over-engineering is a one-off ingestion of a static corpus — a script is fine. It earns its place when ingestion recurs, when parameters get iterated on, or when lineage is an audit requirement. In banking the third usually applies, which is what makes the setup worth it.
>
> Two operational points. Pipeline steps run on provisioned machines billed for the step duration, so a component requesting a large machine for a lightweight step wastes money on every run — and that compounds for a scheduled pipeline.
>
> And scheduled failures need alerting. A weekly re-ingestion failing silently means the index quietly goes stale while everything looks normal. I'd alert on pipeline failure and also track a freshness metric on the index itself, because a pipeline that succeeded while producing nothing is equally possible."

## 8. Likely Follow-ups

**Q: What would you use a pipeline for in a RAG system?**
Ingestion — parse, chunk, enrich, embed, index. It's the part needing reproducibility, lineage, scheduling, and resumability, and caching makes iterating on chunking cheap by skipping the expensive parsing step.

**Q: How does caching help?**
An unchanged step with unchanged inputs is skipped on re-run. So changing a chunking parameter re-runs chunking, embedding, and indexing but not parsing — which matters a lot when parsing with Document AI is the expensive stage. It turns iteration from costly to routine.

**Q: What invalidates the cache?**
Changed inputs, and a changed container image. Rebuilding the image for an unrelated reason invalidates that step and everything downstream, which is correct but surprises people expecting only parameter changes to count.

**Q: When is a pipeline over-engineering?**
For a one-off ingestion of a static corpus, where a script is fine. It earns its place when ingestion recurs, when parameters get iterated on, or when lineage is an audit requirement — and in banking the last one usually applies.

**Q: What operational risks are there?**
Oversized machines per step wasting money on every scheduled run, and silent failures. A weekly re-ingestion that fails without alerting means the index goes stale while everything appears normal, so I'd alert on failure and also track index freshness independently.

## 9. Common Mistakes

- Building a pipeline for one-off work.
- Requesting large machines for lightweight steps.
- No alerting on scheduled pipeline failures.
- Baking secrets into components instead of using Secret Manager.
- Assuming only parameter changes invalidate the cache.

## 10. What to Remember

- **RAG ingestion is the natural use** — reproducible, resumable, auditable.
- **Caching skips expensive parsing** when iterating on chunking.
- **Cache keys on inputs and the container image.**
- **Lineage answers the audit question** about what produced the index.
- **Alert on scheduled failures** and track index freshness separately.
