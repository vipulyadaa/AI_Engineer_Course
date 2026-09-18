# Model Registry

> **Phase 20 · VERTEX AI · Topic 14**

## 1. Definition

Vertex AI's catalogue of model versions with metadata, lineage, aliases, and deployment state — the record of what exists, where it came from, and what's currently serving.

## 2. Simple Explanation

The registry answers "what model versions do we have, which one is in production, and what produced it."

For generative systems it's less central than it looks, because the model is usually a hosted foundation model you didn't train — and the things that actually need registering are your prompts and configurations.

## 3. How It Works

```
VERSIONS      immutable, numbered, with metadata
ALIASES       "production", "candidate" — pointers that move
LINEAGE       the pipeline run and dataset that produced it
DEPLOYMENT    which endpoints serve which versions
EVALUATION    metrics attached to a version
```

**Aliases are the useful mechanism:** application code references `production`, and promoting a version means moving the alias rather than changing code.

## 4. Practical Example

**Where it genuinely applies in a RAG system:**

```
· a fine-tuned model, if you tuned one
· a cross-encoder reranker deployed from Model Garden
· a query classifier
· any custom model on a dedicated endpoint

Those are real registered artifacts with versions,
evaluation metrics, and deployment state.
```

**Where the gap is:**

```
The things that most determine behaviour in a generative
system are NOT in Model Registry:

  · the system instruction and prompt templates
  · the generation config
  · retrieval parameters — k, thresholds, filters
  · chunking strategy
  · the embedding model version used for the index

Those change behaviour as much as a model swap, and they
typically live in a config file with no version record,
no evaluation attached, and no lineage.

So the honest answer is: use Model Registry for what it's
for, and build the equivalent discipline for prompts and
configuration — version control, an evaluation gate, a
recorded version in every trace, and a rollback path.
```

**That observation is the substantive point** — the registry pattern is right and the artifact it applies to has changed.

**A practical version record for a RAG deployment:**

```
{
  "release":          "2026-03-15-a",
  "prompt_version":   "answer-v7",
  "model":            "gemini-2.0-flash-001",
  "generation_config":{"temperature": 0.1, ...},
  "retrieval":        {"k": 20, "threshold": 0.55, "rerank": true},
  "index_version":    "policies-v3",
  "embedding_model":  "text-embedding-005",
  "eval": {"groundedness": 0.94, "answer_correctness": 0.88}
}
```

Recorded per release and referenced in every trace — that's what makes a quality regression attributable to a specific change.

## 5. Why It Matters

- **The registry pattern is right; the artifact has changed** in generative systems.
- **Aliases decouple promotion from code changes.**
- **A version record referenced in traces** is what makes regressions attributable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Prompts outside any version record** | Behaviour changes untracked |
| **No evaluation attached to a version** | Can't compare candidates |
| **Hardcoded version references** | Promotion requires a code change |
| **Registry entries without lineage** | Can't reproduce a model |
| **Config drift between environments** | Staging and production differ silently |
| **No version in traces** | Regressions unattributable |

**On environment drift:** if staging and production use different prompt versions or retrieval parameters, a staging evaluation says nothing about production behaviour. The version record should be deployed as a unit and verifiable at runtime — a health endpoint reporting the active versions is a small thing that prevents a whole class of confusion.

**On what "reproducible" means here:** for a hosted foundation model you can't reproduce the weights, so reproducibility means recording exactly which model version, prompt version, and parameters produced an output. That's weaker than classical ML reproducibility, and it's what's actually available — claiming more would be inaccurate.

## 7. Interview Answer

> "Model Registry catalogues model versions with metadata, lineage, aliases, and deployment state. Aliases are the useful mechanism — application code references 'production', and promoting a version means moving the alias rather than changing code.
>
> In a RAG system it genuinely applies to a fine-tuned model if you have one, a cross-encoder reranker deployed from Model Garden, and a query classifier. Those are real registered artifacts with versions and evaluation metrics.
>
> But I'd point out the gap, because I think it's the substantive observation. The things that most determine behaviour in a generative system aren't in Model Registry — the system instruction and prompt templates, the generation config, retrieval parameters like k and thresholds and filters, the chunking strategy, and the embedding model version behind the index. Those change behaviour as much as a model swap, and they typically live in a config file with no version record, no evaluation attached, and no lineage.
>
> So the registry pattern is right and the artifact it applies to has changed. My answer is to use Model Registry for what it's for, and build the equivalent discipline for prompts and configuration: version control, an evaluation gate, a version recorded in every trace, and a rollback path.
>
> Concretely I'd have a release record capturing the prompt version, model version, generation config, retrieval parameters, index version, embedding model, and the evaluation metrics that release scored. Referenced in every trace, that's what makes a quality regression attributable to a specific change rather than something that started 'sometime last week'.
>
> Two things I'd guard. Environment drift — if staging and production run different prompt versions or retrieval parameters, a staging evaluation says nothing about production. So the version record should deploy as a unit and be verifiable at runtime; a health endpoint reporting the active versions is a small thing that prevents a whole class of confusion.
>
> And I'd be precise about what reproducibility means here. For a hosted foundation model you can't reproduce the weights, so reproducibility means recording exactly which model version, prompt version, and parameters produced an output. That's weaker than classical ML reproducibility, and it's what's actually available — claiming more would be inaccurate."

## 8. Likely Follow-ups

**Q: What does Model Registry give you?**
Versioned model entries with metadata, lineage back to the producing pipeline run, aliases like "production" that decouple promotion from code changes, deployment state, and attached evaluation metrics. It's the record of what exists and what's serving.

**Q: How useful is it for a RAG system?**
Directly useful for a reranker, a classifier, or a tuned model. Less central than it looks overall, because the model is usually a hosted foundation model and the artifacts that determine behaviour — prompts, retrieval parameters, chunking — aren't models at all.

**Q: So what do you version instead?**
A release record capturing prompt version, model version, generation config, retrieval parameters, index version, embedding model, and the evaluation scores for that release — in version control, gated by evaluation, and referenced in every trace so regressions are attributable.

**Q: Why do aliases matter?**
Because application code references the alias rather than a version number, so promoting a candidate is moving a pointer rather than deploying a code change. Rollback is moving it back, which is fast enough that people are willing to deploy.

**Q: What does reproducibility mean for a hosted model?**
Recording which model version, prompt version, and parameters produced an output — not reproducing weights, which isn't possible. That's genuinely weaker than classical ML reproducibility, and it's worth being precise about rather than overclaiming.

## 9. Common Mistakes

- Versioning models rigorously while prompts live in an unversioned config.
- No evaluation metrics attached to a version.
- Hardcoding version references instead of using aliases.
- Staging and production running different configurations.
- Claiming full reproducibility for hosted foundation models.

## 10. What to Remember

- **Aliases decouple promotion from code changes.**
- **The registry pattern is right; the artifact has changed** in generative systems.
- **Version the prompt, config, retrieval params, and index** as a release record.
- **Reference the version in every trace** for attribution.
- **Verify active versions at runtime** to catch environment drift.
