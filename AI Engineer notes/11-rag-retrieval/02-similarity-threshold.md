# Similarity Threshold

> **Phase 11 · RAG RETRIEVAL · Topic 02**

## 1. Definition

A minimum similarity score a chunk must exceed to be returned, applied alongside or instead of a fixed top-k. It lets retrieval return *fewer* results — including none — when nothing is genuinely relevant.

## 2. Simple Explanation

Top-k always returns k chunks, whether or not any of them are relevant. Ask about cryptocurrency policy when you have no crypto documentation, and you still get five chunks — the five least-irrelevant ones.

A threshold lets the system say "nothing here is close enough," which is the foundation of abstention.

## 3. How It Works

```python
results = index.search(query_vec, k=20)
filtered = [r for r in results if r.score >= THRESHOLD][:final_k]

if not filtered:
    return abstain("I don't have information about that.")
```

**The hard part is that similarity scores are not calibrated.**

| | Detail |
|---|---|
| Not comparable across embedding models | 0.72 means different things in different models |
| Not comparable across corpora | Depends on the density of your vector space |
| Not probabilities | Cosine 0.8 doesn't mean "80% relevant" |
| Query-length dependent | Short queries tend to score lower against long chunks |

So the threshold must be **tuned empirically on your own data**, and re-tuned whenever the embedding model changes.

## 4. Practical Example

**Tuning on an eval set containing out-of-scope questions:**

```
Eval set: 150 answerable questions + 50 deliberately out-of-scope

threshold   correct abstentions   FALSE abstentions   verdict
                (of 50)             (of 150)
  0.50          12                     1              too permissive
  0.60          31                     4
  0.65          42                     9              ← reasonable
  0.70          47                    28              too strict
  0.75          49                    61              unusable
```

**Both columns matter.** Tuning only on out-of-scope questions pushes the threshold too high and the system becomes uselessly cautious on questions it could have answered. You need the false-abstention rate in view.

**A more robust alternative — use the reranker score:**

```
Cross-encoder scores are better calibrated than cosine similarity,
because the model was trained to output a relevance judgment
rather than a geometric distance.

If you already run a reranker, threshold on ITS top score
rather than on cosine. Near-zero extra cost, better signal.
```

**Relative thresholding** is another option that sidesteps calibration:

```
Keep chunks scoring within X% of the top result.
  top = 0.84 → keep anything ≥ 0.84 × 0.85 = 0.71

Adapts automatically to queries that are broadly matched
versus sharply matched, without an absolute cutoff.
```

## 5. Why It Matters

- **It's what makes abstention possible** — the highest-value safety behavior in RAG.
- **It prevents padding context with irrelevant chunks**, which degrades answers.
- **Understanding that scores aren't calibrated** is a real differentiator in interviews.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Threshold too high** | Over-abstention; the system refuses answerable questions |
| **Threshold too low** | Irrelevant chunks pass through; no abstention benefit |
| **Tuned on answerable questions only** | Over-abstention is invisible during tuning |
| **Hardcoded value copied from a tutorial** | Meaningless on a different model or corpus |
| **Not re-tuned after a model change** | A new embedding model shifts the entire score distribution |
| **Applied to hybrid results** | BM25 and cosine scores aren't comparable — threshold after fusion, or per retriever |

**On hybrid retrieval:** you can't apply one threshold to a fused list from BM25 and dense retrieval, because the underlying scores live on different scales. Either threshold each retriever separately before fusion, or threshold on the reranker score afterwards — the latter is cleaner.

## 7. Interview Answer

> "A similarity threshold is a minimum score a chunk must exceed to be returned. The reason it matters is that top-k always returns k chunks whether or not any are relevant — ask about cryptocurrency policy when you have no crypto documentation and you still get five chunks, the five least-irrelevant ones, and the model writes a confident answer from them. A threshold lets the system say 'nothing here is close enough,' which is the foundation of abstention.
>
> The hard part is that similarity scores aren't calibrated. Cosine 0.72 means different things in different embedding models and different corpora, and it isn't a probability. So the threshold has to be tuned empirically on your own data and re-tuned whenever the embedding model changes.
>
> When I tune it, I'd use an eval set containing both answerable questions and deliberately out-of-scope ones, and measure both correct abstentions and *false* abstentions. Tuning only on out-of-scope questions pushes the threshold too high and the system becomes uselessly cautious — you need both columns in view, and the balance between them is a product decision about how cautious the assistant should be.
>
> A more robust approach if you already run a reranker: threshold on the cross-encoder's score rather than on cosine. Those are better calibrated, because the model was trained to output a relevance judgment rather than a geometric distance, and it costs nothing extra.
>
> One thing that trips people up: you can't apply a single threshold to fused hybrid results, because BM25 and cosine scores aren't on comparable scales. Threshold per retriever before fusion, or on the reranker score after."

## 8. Likely Follow-ups

**Q: What's a good threshold value?**
There isn't a transferable one — it depends entirely on your embedding model and corpus. A value that works in one system is meaningless in another. I'd tune it on an eval set with both answerable and out-of-scope questions, and treat any number from a tutorial as a starting point for tuning rather than a value to adopt.

**Q: Why aren't similarity scores calibrated?**
Because they're geometric distances, not probabilities. Cosine measures the angle between vectors in a space whose density depends on the embedding model and the corpus. Two systems can have completely different score distributions for equally relevant matches. There's no universal mapping from cosine to "relevance probability."

**Q: How do you avoid over-abstention?**
Measure it explicitly. Your tuning eval set needs answerable questions alongside out-of-scope ones, so you can see the false-abstention rate at each threshold. Then pick the balance the product needs — a compliance assistant might accept more false abstentions than a general help bot. Without that second column you'll tune too strict.

**Q: Threshold or top-k?**
Both, together. Top-k caps the context size and cost; the threshold drops results that aren't relevant enough to be worth including. A query with one clearly relevant chunk should return one chunk, not be padded to five. Used alone, top-k always pads and the threshold can return unboundedly many.

**Q: What about relative thresholding?**
Keep chunks scoring within some percentage of the top result, rather than above an absolute value. It sidesteps the calibration problem by adapting per query — a sharply-matched query keeps only its top result, a broadly-matched one keeps several. The downside is it never abstains, since there's always a top result, so I'd combine it with an absolute floor for the abstention case.

## 9. Common Mistakes

- Copying a threshold value from a tutorial or another system.
- Tuning only on out-of-scope questions, making over-abstention invisible.
- Not re-tuning after changing the embedding model.
- Applying one threshold to fused hybrid results with incomparable score scales.
- Treating a cosine score as a relevance probability.

## 10. What to Remember

- **A minimum score, applied alongside top-k.** It's what enables abstention.
- **Scores are not calibrated** — not across models, corpora, or query lengths.
- **Tune on both answerable and out-of-scope questions**; measure false abstention.
- **Reranker scores are better calibrated than cosine** — threshold on those if available.
- **Don't threshold fused hybrid scores** — different scales. Per retriever, or after reranking.
