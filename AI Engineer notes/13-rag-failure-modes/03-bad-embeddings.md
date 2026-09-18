# Failure Mode: Bad Embeddings

> **Phase 13 · RAG FAILURE MODES · Topic 03**

## 1. Definition

Vector representations that don't discriminate well for your content — from a poor domain fit, a configuration error, or a silent bug. The result is that semantically relevant chunks don't land near their queries.

## 2. Simple Explanation

Embeddings are the representation everything else depends on. If similar meaning doesn't produce nearby vectors for *your* text, retrieval cannot work regardless of index tuning or reranking.

The tricky part is that most embedding failures are configuration bugs that produce no error — they just quietly degrade recall.

## 3. How It Works

**The silent configuration bugs, in order of frequency:**

| Bug | Effect | Check |
|---|---|---|
| **Chunk exceeds max input** | Tail silently truncated from the vector | `chunk_tokens <= model.max_input` |
| **Query/document asymmetry ignored** | Real recall loss, no error | Are you passing task types / prefixes? |
| **Different model for index vs. query** | Retrieval returns noise | Same model, same version, both sides |
| **Provider updated the model** | Quality shifts with no code change | Pin the version |
| **Vectors not normalized** | Metric mismatch changes rankings | Check normalization vs. the chosen metric |

**The genuine quality problems:**

```
· Domain mismatch — jargon, product codes, and acronyms
  don't separate well in a general-purpose model
· Language mismatch — a monolingual model can't match
  across languages
· Exact identifiers — STRUCTURAL, not fixable by model choice.
  All policy numbers embed as "a policy identifier."
```

**That last one is worth separating out:** it isn't a bad embedding, it's what embeddings *are*. The fix is hybrid retrieval, not a better model.

## 4. Practical Example

**Diagnosing an embedding problem:**

```
Symptom: recall@50 is only 0.62. Reranking can't help.

1. Is the correct chunk in the index?
   Yes → not an ingestion problem.

2. Direct similarity check:
     sim(query_vec, correct_chunk_vec) = 0.41
     sim(query_vec, top_result_vec)    = 0.79
   → the model genuinely doesn't see them as related.

3. Check the config bugs:
     chunk tokens = 780,  model max = 512   ← FOUND IT
     → 268 tokens of every long chunk were dropped from the
       embedding. The answer was often in the dropped tail.

Fix: reduce chunk size below 512, or use a longer-input model.
     Re-embed the corpus.
```

**The asymmetry bug, which produces no error at all:**

```python
# ❌ Same encoding for both sides
doc_vec   = embed(chunk)
query_vec = embed(question)

# ✅ Vertex AI task types
doc_vec   = embed(chunk,    task_type="RETRIEVAL_DOCUMENT")
query_vec = embed(question, task_type="RETRIEVAL_QUERY")

# ✅ E5-family prefixes
doc_vec   = embed("passage: " + chunk)
query_vec = embed("query: "   + question)
```

## 5. Why It Matters

- **It's the representation everything depends on** — a bad one caps the whole system.
- **Most failures are silent configuration bugs**, not model quality, and they're cheap to check.
- **Changing the model means re-embedding the corpus**, so it's an expensive fix to get wrong.

## 6. Trade-offs / Failure Modes

**The diagnostic order — cheap checks first:**

```
1. chunk_size < model.max_input_tokens        (free)
2. Same model + version on both sides         (free)
3. Task types / prefixes applied correctly    (free)
4. Vectors normalized, metric matches         (free)
5. ANN recall vs. exact search on a sample    (cheap)
6. Domain fit: evaluate 2-3 models on YOUR eval set
7. Exact-identifier gap → add BM25, not a new model
```

**On model migration:** vectors from different models aren't comparable, so a change means re-embedding everything. Store `embedding_model` in chunk metadata, build the new index alongside the old, evaluate both on a golden set, then cut over by changing a query filter. Migrating in place gives you a window where retrieval is silently broken.

**On leaderboards:** MTEB is a filter for candidates, not an answer. Leaderboard performance often doesn't transfer to a specific domain. Evaluate on your own eval set.

## 7. Interview Answer

> "Bad embeddings mean vectors that don't discriminate well for your content. It's the representation everything else depends on, so a bad one caps the whole system regardless of index tuning or reranking.
>
> The important thing is that most embedding failures aren't model quality — they're silent configuration bugs. The most common is chunk size exceeding the model's input limit. If chunks are 780 tokens and the model caps at 512, 268 tokens of every long chunk are dropped from the vector while the full text is still stored and returned. Content is indexed and unretrievable, with no error anywhere.
>
> Second is query-document asymmetry. Several models expect different task types or prefixes for queries versus passages — Vertex AI uses RETRIEVAL_QUERY and RETRIEVAL_DOCUMENT, E5 models use literal prefixes. Ignoring that costs real recall silently.
>
> So my diagnostic starts with the free checks: chunk size against the input limit, same model and version on both sides, task types applied, vectors normalized consistently with the metric. Those cost nothing and they're the cause more often than model quality is.
>
> One thing I'd separate out: exact-identifier failures aren't bad embeddings. All policy numbers embed as 'a policy identifier' because that's what the representation captures. That's structural, and the fix is hybrid retrieval, not a better model.
>
> And if I do change the model, that means re-embedding the corpus, since vectors from different models aren't comparable. I'd store the model version in chunk metadata, build the new index alongside the old, evaluate both on a golden set, and cut over by changing a query filter — migrating in place gives you a window where retrieval is silently broken."

## 8. Likely Follow-ups

**Q: What's the most common embedding bug?**
Chunk size exceeding the model's max input, causing silent truncation. It produces no error, the text is stored and returned normally, and only the vector is affected — so content appears present and is unretrievable. It's free to check and it's frequently the whole problem.

**Q: How do you know it's the embedding model and not something else?**
Directly compare similarity between the query vector and the known-correct chunk vector. If that similarity is low while an irrelevant chunk scores high, the model genuinely doesn't see them as related. Then rule out the configuration bugs before concluding it's model quality, because those are far more common.

**Q: How do you choose a better model?**
Evaluate candidates on your own eval set measuring recall@k — leaderboards like MTEB filter candidates but don't predict domain performance. Also check max input length against your chunk size, dimension count against storage and latency cost, and language coverage. And confirm the exact-identifier gap isn't what you're actually trying to fix, because no model solves that.

**Q: What happens when you change the model?**
The whole corpus must be re-embedded, because a query vector from the new model won't match document vectors from the old one. Store the model version per chunk, build the new index alongside the old, evaluate both, then cut over by changing a query filter. In-place migration means a window where retrieval silently returns noise.

**Q: Is an exact-identifier failure an embedding problem?**
No, it's structural. Embeddings encode meaning, and the "meaning" of an arbitrary identifier is just "identifier" — so all policy numbers land in the same region. No embedding model fixes that. The answer is BM25 alongside dense retrieval, which is exactly why hybrid is the production default.

## 9. Common Mistakes

- Blaming model quality before checking the free configuration items.
- Chunk size exceeding the model's input limit.
- Ignoring query-document asymmetry.
- Choosing a model from a leaderboard without evaluating on your data.
- Migrating models in place instead of building alongside and cutting over.

## 10. What to Remember

- **Most embedding failures are silent configuration bugs**, not model quality.
- **Check first:** chunk size vs. max input, same model both sides, task types, normalization.
- **Exact-identifier failure is structural** — add BM25, don't change models.
- **Changing the model = full re-embed.** Version the index; cut over, don't migrate in place.
- **Evaluate candidates on your own data.** Leaderboards filter, they don't predict.
