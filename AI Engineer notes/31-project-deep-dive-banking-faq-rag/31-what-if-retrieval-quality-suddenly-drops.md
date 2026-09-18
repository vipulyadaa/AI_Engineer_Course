# "What If Retrieval Quality Suddenly Drops?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 31**

## 1. Definition

A debugging scenario. The word that determines the approach is *suddenly* — a step change points at a discrete event, which is a much smaller search space than gradual degradation.

## 2. Simple Explanation

Something changed. Find what changed, when, and whether it's on your side.

The fastest path is to compare a bad query now against the same query before, rather than to start theorizing about embeddings.

## 3. How It Works

```
THE ORDER OF INVESTIGATION

1. CONFIRM IT'S REAL
   run the golden set — is it a measured drop or a few
   complaints?

2. FIND THE TIMESTAMP
   when did the score distribution shift? That single
   number eliminates most hypotheses immediately.

3. CORRELATE WITH EVENTS
   deploys, ingestion runs, config changes, and —
   the one people forget — provider-side model updates

4. ISOLATE THE STAGE
   is the right chunk in the index at all?
   is it retrieved but ranked low?
   is it retrieved and filtered out?
   Three different causes, three different fixes.

5. FIX AND VERIFY on the golden set, not by eye
```

## 4. Practical Example

**Step 4 is the one that saves the most time:**

```
Take a query that's now failing. Then, in order:

A. Is the correct chunk in the index?
   Look it up by ID directly.
   NO  → an ingestion problem. Stop here.

B. Retrieve without any filters. Is it in the top 50?
   NO  → an embedding or index problem
   YES → it's a ranking or filtering problem

C. Retrieve with filters. Did it disappear?
   YES → a filter problem — permissions or effective
         dates, not retrieval at all

Three checks, each a minute, and they separate causes that
would otherwise take days to distinguish.
```

**The ranked causes of a sudden drop:**

```
MOST LIKELY
  · an ingestion run partially failed — a source
    silently dropped out. Chunk-count-per-source shows
    this instantly if you have it.
  · a filter change — a new effective-date or permission
    restrict excluding more than intended
  · a config change — top-k, threshold, chunk size in a
    re-index

LESS OBVIOUS, AND THE ONE PEOPLE MISS
  · the embedding model changed under a floating alias.
    No deploy on your side, nothing in your change log,
    and document vectors no longer comparable to query
    vectors.

NOT A SUDDEN CAUSE
  · corpus growth degrading precision — that's gradual
  · a query distribution shift — usually gradual, unless
    a marketing campaign or a policy change sent a new
    kind of question in volume
```

**The query-side possibility worth checking:** retrieval quality can appear to drop because the *questions* changed, not the system. A fee change announced to customers produces a surge of questions the corpus doesn't cover yet. The signature is that golden-set scores are unchanged while live scores fell — and that distinction takes one evaluation run to establish, which is why step 1 comes first.

## 5. Why It Matters

- **"Suddenly" means a discrete event** — find the timestamp first.
- **Three checks isolate the stage** — index, ranking, or filter.
- **Golden set unchanged + live scores down** means the queries changed, not the system.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Tuning parameters before diagnosing | Masks the cause, creates a second problem |
| Not checking whether the chunk is indexed | Hours debugging a retrieval bug that's an ingestion bug |
| Forgetting provider-side model changes | The one cause with no entry in your change log |
| Re-indexing immediately | Destroys the evidence |
| Verifying the fix by spot-checking | No measurement of whether it actually recovered |

**On not re-indexing first:** a full rebuild is the instinctive response and it often does fix the symptom — while destroying the state that would have explained the cause. If a rebuild is needed for service restoration, snapshot the current index first. Otherwise the same failure recurs with no more information than the first time.

**On the fastest single diagnostic:** chunk count per document source, compared to yesterday. Most sudden retrieval drops are ingestion failures, and this one metric identifies them in seconds. If it isn't already collected, adding it is the highest-value change to come out of the incident.

## 7. Interview Answer

> "The word I'd anchor on is suddenly, because a step change points at a discrete event — and that's a much smaller search space than gradual degradation. So I'd be looking for what changed and when, rather than theorizing about the retrieval quality itself.
>
> First, confirm it's real by running the golden set. A few complaints might be three unusual questions; a measured drop is a different situation. And this also distinguishes something important — if golden-set scores are unchanged but live retrieval scores fell, the questions changed, not the system. A fee change announced to customers produces a surge of questions the corpus doesn't cover yet, and that looks exactly like a retrieval regression from the metrics alone.
>
> Second, find the timestamp of the shift in the retrieval score distribution. That single number eliminates most hypotheses immediately, and it's why that metric is worth having in advance.
>
> Third, correlate with events — deploys, ingestion runs, config changes. And provider-side model updates, which is the one people forget because there's nothing in your own change log. If the embedding model moved under a floating alias, your indexed document vectors came from the old model and your query vectors come from the new one, and they're no longer properly comparable. No deploy on your side, corpus-wide degradation.
>
> Fourth, and this is the step that saves the most time — isolate the stage with three checks on a failing query. Is the correct chunk in the index at all? Look it up by ID. If not, it's an ingestion problem and you can stop. If it is, retrieve with no filters and see whether it's in the top fifty — if not, it's an embedding or index problem. If it is, add the filters back and see whether it disappears — if it does, it's a permission or effective-date filter, not retrieval at all.
>
> Three checks, a minute each, separating causes that otherwise take days to tell apart.
>
> On likely causes, ranked: an ingestion run that partially failed and silently dropped a source — chunk count per source shows that instantly, and it's the fastest single diagnostic available. A filter change excluding more than intended. A config change to top-k, threshold, or chunk size in a re-index. And then the embedding model alias case.
>
> What I'd specifically not do is re-index first. It's the instinctive response and it often does fix the symptom, while destroying the state that would have explained the cause — so the same failure recurs later with no more information than the first time. If a rebuild is needed to restore service, snapshot the index first.
>
> And I'd verify the fix by re-running the golden set, not by spot-checking a few queries. Spot-checking tells you those queries work now; it doesn't tell you whether quality recovered."

## 8. Likely Follow-ups

**Q: What's the fastest single diagnostic?**
Chunk count per document source compared to yesterday. Most sudden drops are ingestion failures and this identifies them in seconds — if it isn't collected already, adding it is the main outcome of the incident.

**Q: How do you tell a retrieval problem from an ingestion problem?**
Look up the correct chunk by ID. If it isn't in the index, it's ingestion and no amount of retrieval debugging helps. That check takes a minute and eliminates the largest category first.

**Q: What cause has no entry in your change log?**
A provider updating the embedding model behind a floating alias. Document vectors came from the old model, query vectors from the new one, and they're no longer comparable — with no deploy on your side.

**Q: Could the system be fine?**
Yes — if the questions changed. A policy announcement sends in a surge of questions the corpus doesn't cover, so live retrieval scores fall while golden-set scores hold. That comparison distinguishes it in one evaluation run.

**Q: Why not just re-index?**
Because it destroys the evidence while often fixing the symptom, so the same failure recurs with nothing learned. If a rebuild is needed for service restoration, snapshot the current index first.

## 9. Common Mistakes

- Tuning thresholds or k before diagnosing.
- Skipping the "is the chunk indexed" check.
- Not considering provider-side model changes.
- Re-indexing immediately and losing the evidence.
- Verifying the fix by eye rather than by evaluation.

## 10. What to Remember

- **"Suddenly" means find the timestamp** — it eliminates most hypotheses.
- **Three checks**: indexed? retrieved unfiltered? survives filters?
- **Chunk count per source** is the fastest diagnostic.
- **Golden set steady + live down** = the queries changed.
- **Don't re-index before diagnosing** — snapshot first if you must.
