# Failure Mode: Embedding Model Changes

> **Phase 13 · RAG FAILURE MODES · Topic 16**

## 1. Definition

Changing the embedding model — deliberately, or because a provider updated it underneath you — invalidates every existing vector. Vectors from different models occupy different spaces and are not comparable, so mixing them silently breaks retrieval.

## 2. Simple Explanation

An embedding model defines a coordinate system. Change the model and you've changed the coordinate system.

A query embedded in the new space compared against documents embedded in the old space produces meaningless similarity scores. Not worse scores — meaningless ones. And nothing errors.

## 3. How It Works

**The two paths:**

```
DELIBERATE  — you choose a better model
              Manageable, if you plan the migration.

PROVIDER-SIDE — the hosted model is updated behind the same name
              Quality shifts with no code change on your side.
              THIS is why you pin versions.
```

**Why mixing is worse than either version alone:**

```
All chunks in model A + query in model A   → works
All chunks in model B + query in model B   → works
Half A, half B + query in model B          → the A chunks score
                                              essentially randomly

So a partial migration is worse than no migration.
```

**The safe migration:**

```
1. Store `embedding_model` in every chunk's metadata
2. Index new vectors alongside the old, tagged with the new model
3. Query filters on model version → the two never mix
4. Evaluate both on a golden set (recall@k, groundedness)
5. Cut over by changing the query filter        ← instant, reversible
6. Delete the old vectors once confident
```

**That `embedding_model` field is what makes the whole thing safe**, and it costs nothing to add at ingestion.

## 4. Practical Example

**The in-place migration that goes wrong:**

```
Re-embedding 500,000 chunks in place with a new model.
At chunk 310,000 the job fails.

  310,000 chunks: model B vectors
  190,000 chunks: model A vectors
  Queries: embedded with model B

The 190,000 model-A chunks now score essentially randomly.
No error. Retrieval quality collapses for 38% of the corpus,
and there's no obvious signal pointing at the cause.

Rolling back means re-embedding 310,000 chunks with model A.
```

**The side-by-side version of the same migration:**

```
  Old index (model A): untouched, still serving
  New index (model B): built in parallel over days

  Evaluate both on the golden set:
    model A: recall@5 = 0.88, groundedness 0.91
    model B: recall@5 = 0.91, groundedness 0.93

  Cut over: change one query filter. Instant.
  Roll back: change it back. Instant.
```

**Provider-side changes — what to do:**

```
· Pin the model version explicitly in every call
· Run the golden eval set on every announced provider update
· Alert on shifts in the similarity score DISTRIBUTION, which
  moves when the model changes even if you can't see why
```

## 5. Why It Matters

- **It's a silent, total failure** for the affected chunks — not degraded, meaningless.
- **Partial migration is worse than no migration**, which makes in-place re-embedding risky.
- **Provider-side updates cause it without any change on your side**, which is why version pinning matters.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **In-place re-embedding** | A partial failure leaves a mixed, broken index |
| **No `embedding_model` metadata** | Can't tell which vectors are which; no safe cutover |
| **Unpinned provider model** | Quality shifts silently |
| **No evaluation before cutover** | The "better" model may be worse on your domain |
| **Cost of full re-embed** | At millions of chunks this is a real bill |
| **Different dimensions** | The new model may not fit the existing index schema |

**On dimension changes:** if the new model outputs a different vector dimension, you can't reuse the index at all — it's a new index by necessity. That's actually a safety feature, because it forces the side-by-side approach.

**On deciding whether to migrate at all:** a full re-embed is expensive in money and time, and leaderboard gains often don't transfer to a specific domain. I'd evaluate candidates on my own golden set first, and only migrate if the measured gain on *my* data justifies the cost and the risk.

## 7. Interview Answer

> "Changing the embedding model invalidates every existing vector, because vectors from different models occupy different spaces and aren't comparable. A query embedded in the new space compared against documents in the old space produces meaningless scores — not worse scores, meaningless ones. And nothing errors.
>
> The consequence is that a partial migration is worse than no migration. If I re-embed five hundred thousand chunks in place and the job fails at three hundred and ten thousand, the remaining hundred and ninety thousand score essentially randomly against new-model queries. Retrieval quality collapses for thirty-eight percent of the corpus with no signal pointing at the cause, and rolling back means re-embedding what I already did.
>
> So the safe approach is side-by-side. Store the embedding model version in every chunk's metadata, index the new vectors alongside the old tagged with the new model, filter queries by model version so the two never mix, evaluate both on a golden set, and cut over by changing one query filter. That makes the cutover instant and the rollback instant. That single metadata field is what makes the whole thing safe, and it costs nothing at ingestion.
>
> The other path is provider-side: a hosted model updated behind the same name. Quality shifts with no change on my side. That's why I'd pin the version explicitly in every call, run the golden eval set on every announced update, and alert on shifts in the similarity score distribution — which moves when the model changes even when you can't see the cause.
>
> And I'd be deliberate about whether to migrate at all. A full re-embed is a real bill at corpus scale, and leaderboard gains often don't transfer to a specific domain. I'd evaluate candidates on my own eval set and migrate only if the measured gain on my data justifies the cost."

## 8. Likely Follow-ups

**Q: Why can't you mix vectors from two models?**
Because each model defines its own coordinate system — the dimensions mean different things. A similarity computed between a vector from model A and one from model B isn't a weaker signal, it's not a signal at all. So chunks in the old space score essentially randomly against queries in the new one.

**Q: How do you migrate safely?**
Side by side. Tag every chunk with its embedding model version, build the new index in parallel, filter queries by version so the spaces never mix, evaluate both on a golden set, then cut over by changing the filter. Cutover and rollback both become instant, which is the property in-place migration lacks entirely.

**Q: What if the provider updates the model?**
That's why you pin the version explicitly rather than using a floating alias. On any announced update, run the golden eval set against both versions before adopting. And monitor the similarity score distribution in production, which shifts when the model changes and gives you a signal even for unannounced changes.

**Q: What if the new model has different dimensions?**
Then you can't reuse the index at all — it's necessarily a new index. That's actually helpful, because it forces the side-by-side approach rather than tempting you into an in-place rebuild. The migration mechanics are the same; the option to do it badly is removed.

**Q: How do you decide whether a new model is worth migrating to?**
Evaluate on your own golden set, not a leaderboard — MTEB filters candidates but doesn't predict domain performance. Measure recall@k and groundedness for both. Then weigh the measured gain against the re-embedding cost, the storage implication if dimensions differ, and the migration risk. A three-point recall gain on a million-chunk corpus may or may not justify the bill.

## 9. Common Mistakes

- Re-embedding in place instead of building side by side.
- Not storing the embedding model version per chunk.
- Using a floating model alias instead of a pinned version.
- Migrating based on leaderboard performance without evaluating on your data.
- No monitoring of the similarity score distribution to catch provider-side changes.

## 10. What to Remember

- **Different models, different spaces.** Mixed vectors produce meaningless scores, not weak ones.
- **Partial migration is worse than none** — never re-embed in place.
- **Store `embedding_model` per chunk.** It's what makes cutover and rollback instant.
- **Pin the provider version** and run the golden set on every announced update.
- **Evaluate on your own data** before paying for a full re-embed.
