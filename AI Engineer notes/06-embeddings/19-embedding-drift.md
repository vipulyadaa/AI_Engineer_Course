# Embedding Drift

> **Phase 06 · EMBEDDINGS · Topic 19**

## 1. Definition

Degradation of retrieval quality over time caused by the embedding space no longer fitting the data or queries — from corpus evolution, query distribution shift, or the provider updating the model underneath you.

## 2. Simple Explanation

Your embeddings were computed at a point in time against a model at a point in time. Both the corpus and the queries move afterwards.

New products, new terminology, new kinds of questions — and possibly a provider silently updating the model. The index doesn't change; its fit to reality does.

## 3. How It Works

**Three distinct causes with different fixes:**

| Cause | Mechanism | Fix |
|---|---|---|
| **Corpus drift** | New content with terminology the model handles poorly | Evaluate; possibly fine-tune or switch models |
| **Query drift** | Users ask about new topics or in new phrasings | Refresh the eval set; check coverage |
| **Model drift** | Provider updates the model behind the same name | **Pin the version** |

**Model drift is the dangerous one** because it can make new query vectors inconsistent with indexed document vectors — a silent, corpus-wide degradation with no change on your side.

## 4. Practical Example

**Detection without ground-truth labels:**

```
1. SCORE DISTRIBUTION
   Track the mean and percentiles of top-1 similarity over time.
   A distribution shift signals something changed — model,
   corpus, or query mix.

2. BELOW-THRESHOLD RATE
   % of queries where the top result falls below the relevance
   floor. Rising = coverage gaps or degradation.

3. GOLDEN SET, CONTINUOUSLY
   A fixed set of questions with known correct chunks, run on a
   schedule. Recall@k dropping with no deploy on your side is
   the clearest model-drift signal available.

4. QUERY CLUSTERING
   Cluster production queries monthly; new clusters that
   retrieve poorly are query drift, and they're a content backlog.
```

**The golden set is the highest-value control** because it isolates model drift from everything else — if nothing on your side changed and recall dropped, the cause is external.

**Model drift, concretely:**

```
Provider updates "text-embedding-005" behind the same name.

Your indexed vectors came from the OLD model.
New queries are embedded with the NEW model.

If the space shifted, those vectors are no longer properly
comparable → corpus-wide retrieval degradation, no error,
no deploy on your side.

Mitigation:
  · pin the version explicitly, never a floating alias
  · run the golden eval set on every announced update
  · monitor the score distribution for unexplained shifts
  · re-embed deliberately when adopting a new version
```

**Corpus drift, and why re-embedding usually isn't the fix:**

```
The bank launches a crypto custody product. Documents use
terminology the embedding model saw little of.

Re-embedding with the SAME model changes nothing — the model's
representation of that vocabulary is what it is.

The real options: add BM25 so exact product names match
lexically, fine-tune the embedding model on domain triples,
or switch models. Re-embedding alone is a common wasted effort.
```

## 5. Why It Matters

- **Retrieval degrades silently** — no errors, just gradually worse answers.
- **Model drift is externally caused**, which makes version pinning a genuine control rather than hygiene.
- **The three causes have different fixes**, so diagnosis matters more than the observation.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Floating model alias** | Provider updates change behavior silently |
| **No golden set** | Model drift is undetectable |
| **Re-embedding to fix corpus drift** | Same model, same representation — no change |
| **Not refreshing the eval set** | It stops representing production queries |
| **Monitoring only accuracy** | Requires labels that arrive late or never |
| **Confusing the three causes** | Wrong fix applied |

**On the eval set going stale:** a golden set built at launch stops representing production queries as the product evolves. I'd add sampled production queries continuously, especially failures and abstentions, so the set tracks reality rather than launch-day assumptions. But I'd keep a fixed core subset unchanged, because that's what makes model-drift detection valid — if the eval set changes and recall changes, you can't attribute it.

**On the mitigation ordering:** pin the version first, because it's free and it eliminates the most dangerous cause. Then the golden set, because it's what makes the other two detectable.

## 7. Interview Answer

> "Embedding drift is retrieval quality degrading over time because the embedding space no longer fits the data or queries. There are three distinct causes and they need different fixes.
>
> Corpus drift is new content with terminology the model handles poorly — a new product line with unfamiliar vocabulary. Query drift is users asking about new topics or in new phrasings. And model drift is the provider updating the model behind the same name.
>
> Model drift is the dangerous one because it's externally caused and can be corpus-wide. If the provider updates the model, my indexed vectors came from the old version while new queries are embedded with the new one — and if the space shifted, those are no longer properly comparable. Silent, corpus-wide degradation with no error and no deploy on my side. The mitigation is pinning the version explicitly rather than using a floating alias, which is free and eliminates the most dangerous cause.
>
> For detection I'd rely on a golden set — a fixed set of questions with known correct chunks, run on a schedule. If nothing on my side changed and recall drops, the cause is external. That's the clearest model-drift signal available, and it's why I'd keep a core subset of the eval set fixed even while adding production queries to the rest.
>
> Alongside that, three label-free signals: the distribution of top-1 similarity scores over time, the percentage of queries whose top result falls below the relevance floor, and monthly clustering of production queries where new clusters retrieving poorly indicate query drift and a content gap.
>
> One thing I'd flag as a common wasted effort: re-embedding the corpus to fix corpus drift. If the terminology is unfamiliar to the model, re-embedding with the same model changes nothing — its representation of that vocabulary is what it is. The real options there are adding BM25 so exact product names match lexically, fine-tuning the embedding model on domain triples, or switching models."

## 8. Likely Follow-ups

**Q: What causes embedding drift?**
Three things with different fixes. Corpus drift — new content with unfamiliar terminology. Query drift — users asking about new topics or phrasing things differently. And model drift — the provider updating the model behind the same name, which is externally caused and potentially corpus-wide.

**Q: How do you detect it without labels?**
Track the distribution of top-1 similarity scores over time, the rate of queries falling below the relevance threshold, and run a golden set on a schedule. The golden set is the strongest signal because it isolates model drift — if nothing changed on your side and recall dropped, the cause is external.

**Q: What's the fix for model drift?**
Pin the version explicitly rather than using a floating alias, so provider updates don't reach you silently. Then run the golden eval set on any announced update before adopting it, and re-embed deliberately when you do adopt. It's a free mitigation for the most dangerous cause.

**Q: Does re-embedding fix corpus drift?**
Not if you use the same model — its representation of unfamiliar terminology is what it is, so re-embedding produces the same vectors. The real options are adding BM25 so exact product names match lexically, fine-tuning the embedding model on domain triples, or switching models. Re-embedding alone is a common wasted effort.

**Q: Should the eval set change over time?**
Partly. I'd add sampled production queries continuously so it tracks the real distribution, especially failures and abstentions. But I'd keep a fixed core subset unchanged, because model-drift detection depends on holding the measurement constant — if both the eval set and the score change, you can't attribute the difference.

## 9. Common Mistakes

- Using a floating model alias instead of a pinned version.
- No golden set, making model drift undetectable.
- Re-embedding with the same model to fix corpus drift.
- Changing the entire eval set over time, breaking drift attribution.
- Monitoring only label-dependent accuracy, which arrives too late.

## 10. What to Remember

- **Three causes:** corpus drift, query drift, model drift. Different fixes.
- **Model drift is externally caused and corpus-wide** — pin the version.
- **A fixed golden set run on a schedule** is the clearest detection signal.
- **Re-embedding with the same model doesn't fix corpus drift** — add BM25, fine-tune, or switch.
- **Keep a fixed core eval subset** so drift stays attributable.
