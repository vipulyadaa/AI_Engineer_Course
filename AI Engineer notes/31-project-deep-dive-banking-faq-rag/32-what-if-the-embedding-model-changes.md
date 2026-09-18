# "What If the Embedding Model Changes?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 32**

## 1. Definition

A scenario about vector space incompatibility. Vectors from two different models — or two versions of one model — are not comparable, and the failure produces no error at any point.

## 2. Simple Explanation

An embedding model defines a coordinate system. Change the model and the coordinates mean something different.

Querying an index built with model A using a vector from model B returns results. They're just meaningless — and nothing anywhere reports a problem.

## 3. How It Works

```
THE TWO SITUATIONS

DELIBERATE — you chose to upgrade
  → a planned migration, side by side, measurable

INVOLUNTARY — the provider updated the model behind a
              floating alias
  → no deploy on your side, no change log entry,
    corpus-wide degradation
  → this is the reason to pin versions

Dimension changes error loudly, which is the lucky case.
SAME-DIMENSION changes are the dangerous one: the index
accepts the query, returns k results, and everything
looks fine.
```

## 4. Practical Example

**The safe migration — side by side, never in place:**

```
1. INDEX ALONGSIDE
   new vectors written with a model-version tag; old
   vectors untouched and still serving

2. EVALUATE BOTH
   the same golden set against each, per category.
   Overall recall can improve while one category
   regresses — and in banking that category might be
   fees.

3. CUT OVER BY FILTER
   change the query-time model-version filter. That's
   the switch: one config change, instantly reversible.

4. DECOMMISSION after a stability period

WHY NOT IN PLACE:
  a partial failure leaves a MIXED index — some vectors
  from each model, in one space. Old vectors score
  essentially randomly against new queries, so retrieval
  is degraded unpredictably and rollback means redoing
  the work you already did.

The side-by-side pattern costs double storage during the
migration and buys an instant rollback. That's a good
trade.
```

**What has to move with the vectors:**

```
Things people forget to re-embed or invalidate:

SEMANTIC CACHE   cached query embeddings are in the old
                 space — the cache must be flushed, or
                 it silently serves matches computed
                 against a space that no longer exists
GOLDEN SET       any stored embeddings in it
THRESHOLDS       score scales differ between models, so
                 the calibrated relevance floor is no
                 longer valid and abstention will fire
                 wrongly in one direction or the other
CHUNK METADATA   the model version stamp, which is what
                 makes the whole pattern possible

The threshold one causes the most confusion after a
migration: retrieval improved, but abstention rate went
haywire because nobody re-calibrated.
```

**The involuntary case, and the defence:**

```
Pin explicit versions, never aliases. Store the model
version in every chunk's metadata.

Then a provider update is a choice you make rather than
an event that happens to you — and if it does happen,
the version stamp tells you immediately which vectors
came from where.

Detection if you weren't pinned: a step change in the
retrieval score distribution with no deploy behind it.
That signature is nearly diagnostic.
```

## 5. Why It Matters

- **Same-dimension changes fail silently** — no error, meaningless results.
- **Side by side, cut over by filter** — instant rollback.
- **Thresholds must be re-calibrated**, because score scales differ.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Re-embedding in place | A mixed index; degraded unpredictably; no rollback |
| Floating model alias | The change happens to you, silently |
| No model version in metadata | Can't tell which vectors came from where |
| Not flushing the semantic cache | Serves matches from a dead vector space |
| Reusing the old threshold | Abstention fires wrongly in one direction |
| Only checking aggregate recall | A category regression hides |

**On the cost:** re-embedding the corpus is one of the few large embedding bills you'll ever incur, and it's still small — ingestion embeddings are under 1% of a typical RAG system's running cost. The expensive part is the evaluation and the migration window, not the tokens. That's worth saying, because people over-weight the re-embedding cost and under-weight the verification effort.

**On when it's worth doing at all:** a newer model isn't automatically better for your corpus. The decision needs a measured recall improvement on your own golden set, per category, not a benchmark score — because the migration has real risk and a marginal improvement doesn't justify it.

## 7. Interview Answer

> "The core fact is that vectors from two different models aren't comparable — an embedding model defines a coordinate system, and changing it changes what the coordinates mean. Querying an index built with model A using a vector from model B returns results that are meaningless, and nothing errors.
>
> If the dimensions differ you get a loud failure, which is actually the lucky case. Same-dimension changes are the dangerous ones: the index accepts the query, returns k results, and everything looks normal.
>
> There are two situations. A deliberate upgrade, which is a planned migration. And an involuntary one, where the provider updates the model behind a floating alias — no deploy on your side, nothing in your change log, and corpus-wide degradation. That second case is the entire reason to pin explicit versions.
>
> For a deliberate migration, the pattern is side by side, never in place. Write new vectors alongside the old ones tagged with the model version, keep the old ones serving, evaluate both on the same golden set, and cut over by changing a query-time filter. That filter change is the switch — one config change, instantly reversible.
>
> The reason not to do it in place is that a partial failure leaves a mixed index — some vectors from each model in one space. Old vectors score essentially randomly against new queries, so retrieval is degraded unpredictably, and rollback means redoing work you already did. Side by side costs double storage during the migration and buys an instant rollback, which is a good trade.
>
> On evaluation, I'd compare per category rather than in aggregate. Overall recall can improve while one category regresses, and in a banking corpus that category might be fees — which is exactly the one where a regression matters.
>
> The things people forget to move with the vectors are where this usually goes wrong. The semantic cache holds query embeddings in the old space, so it has to be flushed or it silently serves matches computed against a space that no longer exists. Any stored embeddings in the golden set. And the relevance threshold — score scales differ between models, so the calibrated abstention floor is no longer valid. That one causes the most post-migration confusion: retrieval improved, but abstention rate went haywire because nobody re-calibrated.
>
> On cost — re-embedding the whole corpus is one of the larger embedding bills you'll incur and it's still small, because ingestion embeddings are under one percent of a RAG system's running cost. The expensive part is the evaluation and the migration window, not the tokens.
>
> And on whether to do it at all: a newer model isn't automatically better for your corpus. I'd want a measured recall improvement on my own golden set, per category — not a benchmark score — because the migration carries real risk and a marginal improvement doesn't justify it."

## 8. Likely Follow-ups

**Q: Why can't you just re-embed in place?**
A partial failure leaves a mixed index where old vectors score randomly against new queries. Retrieval degrades unpredictably, and rollback means redoing work. Side-by-side with a version tag makes the cutover a filter change.

**Q: How would you know if the provider changed the model?**
A step change in the retrieval score distribution with no deploy behind it — that signature is nearly diagnostic. The defence is pinning explicit versions and stamping the model version into chunk metadata.

**Q: What else has to change?**
The semantic cache must be flushed, because cached query embeddings are in the old space. And the relevance threshold has to be re-calibrated, since score scales differ between models — that one is the usual source of post-migration confusion.

**Q: How do you decide it's worth it?**
A measured per-category recall improvement on your own golden set. A benchmark score doesn't justify the risk, and an aggregate improvement can hide a regression in the category that matters most.

**Q: Is re-embedding expensive?**
Less than people expect — ingestion embeddings are under 1% of running cost. The expensive parts are the evaluation and the dual-index window, which is where the effort should be budgeted.

## 9. Common Mistakes

- Re-embedding in place.
- Using a floating model alias.
- Not flushing the semantic cache.
- Reusing the old relevance threshold.
- Judging the upgrade on aggregate recall or benchmark scores.

## 10. What to Remember

- **Same-dimension changes fail silently** — results without meaning.
- **Side by side, tagged, cut over by filter** — instant rollback.
- **Flush the cache; re-calibrate the threshold.**
- **Evaluate per category**, not in aggregate.
- **Pin versions** so the change is a choice, not an event.
