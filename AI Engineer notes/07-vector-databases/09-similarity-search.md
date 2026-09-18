# Similarity Search

> **Phase 07 · VECTOR DATABASES · Topic 09**

## 1. Definition

Retrieving the items whose vectors are closest to a query vector under a chosen distance metric. In RAG it's the retrieval step: query embedding in, ranked chunks out.

## 2. Simple Explanation

You embed the query, ask the index for the nearest k vectors, and get back chunks with similarity scores.

Everything interesting is in the details around it: which metric, how many results, whether to apply a score floor, and what to do when nothing is close enough.

## 3. How It Works

```
1. Embed the query        (same model as the documents,
                           with the query task type)
2. Apply metadata filters (permissions, dates, tenant)
3. ANN search             → top-k chunk IDs + scores
4. Fetch payloads         → text and metadata
5. Post-process           → threshold, dedupe, rerank
```

**Metric choice is determined by the model, not by preference:**

| Metric | Use when |
|---|---|
| **Cosine** | The default for text embeddings |
| **Dot product** | Vectors are normalized — then identical to cosine, and faster |
| **Euclidean (L2)** | The model was trained with it |

**If vectors are L2-normalized, cosine, dot product, and L2 rank identically.** Most text embedding models produce normalized vectors, so the metric argument is usually moot — but the index must be *configured* to match what the model expects.

## 4. Practical Example

**A realistic retrieval call:**

```python
def retrieve(query: str, user, k: int = 20):
    qv = embed(query, task_type="RETRIEVAL_QUERY")   # asymmetric

    hits = index.search(
        vector=qv,
        top_k=k,
        filter={                       # PRE-filter, in the engine
            "tenant_id": user.tenant_id,
            "acl_groups": {"$in": user.groups},
            "effective_date": {"$lte": today()},
        },
    )
    return [h for h in hits if h.score >= 0.55]      # relevance floor
```

**Three things that are easy to get wrong here:**

```
1. TASK TYPE
   Query and document embeddings must use the matching
   asymmetric task types. Embedding a query as a document
   silently costs recall.

2. FILTER PLACEMENT
   The filter belongs in the engine call, not in a list
   comprehension afterwards. Post-filtering both leaks
   and under-retrieves.

3. THRESHOLD CALIBRATION
   0.55 is not a universal number. It must be derived from
   the score distribution of known-relevant versus known-
   irrelevant pairs for YOUR model and corpus.
```

**On thresholds:** the failure is picking a round number. Sample 100 queries, label the top results, plot the score distributions for relevant and irrelevant, and choose the point that gives an acceptable false-negative rate. Different embedding models have completely different score scales — a threshold copied from a blog post is a guess.

## 5. Why It Matters

- **It's the core retrieval operation** — everything downstream depends on what it returns.
- **Filter placement is a security property**, not a performance detail.
- **Thresholds must be calibrated per model and corpus**, not copied.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Metric mismatch with the model** | Silently degraded ranking |
| **Wrong or missing task type** | Asymmetric models lose recall |
| **Post-filtering instead of pre-filtering** | Leaks and under-retrieves |
| **Uncalibrated threshold** | Either over-filters or admits noise |
| **No abstention path** | Forces an answer when nothing relevant was found |
| **Top-k too small** | Recall ceiling for everything downstream |

**On abstention:** if every result falls below the relevance floor, the correct behaviour is to say the system doesn't have the information — not to pass weak chunks to the generator and hope. In a banking context an unsupported answer is worse than no answer, so the threshold exists precisely to enable that path.

**On scores being uninterpretable across models:** a cosine score of 0.7 means different things for different embedding models. Scores are useful for *ranking within a query* and for threshold comparisons *after calibration*, and for essentially nothing else. Showing a raw similarity score to an end user as a confidence measure is misleading.

## 7. Interview Answer

> "Similarity search is the retrieval step: embed the query, filter, ask the index for the nearest k vectors, fetch the payloads, and post-process. The mechanism is simple; what matters is the details around it.
>
> On metric — it's determined by the model, not by preference. Cosine is the default for text embeddings. If vectors are L2-normalized, which most text models produce, cosine and dot product and Euclidean all rank identically, so the argument is usually moot. But the index has to be configured to match what the model expects.
>
> Three things I'd get right in the actual call. First, task type: query and document embeddings need the matching asymmetric task types, and embedding a query as a document silently costs recall. Second, filter placement — the filter goes in the engine call, not a list comprehension afterwards. Post-filtering both leaks, because ineligible documents were retrieved and scored, and under-retrieves, because top-k was computed over a population the user can't see. That's a security property, not a performance detail. Third, the threshold.
>
> On thresholds, the failure is picking a round number. Different embedding models have completely different score scales, so 0.7 means different things across models and a value copied from a blog post is a guess. I'd sample a hundred queries, label the top results, plot score distributions for relevant versus irrelevant pairs, and pick the point giving an acceptable false-negative rate.
>
> The threshold exists mainly to enable abstention. If everything falls below the floor, the right behaviour is to say the system doesn't have the information rather than passing weak chunks to the generator and hoping. In banking, an unsupported answer is worse than no answer.
>
> One thing I'd avoid: showing a raw similarity score to a user as a confidence measure. Scores are useful for ranking within a query and for calibrated threshold comparisons, and for essentially nothing else."

## 8. Likely Follow-ups

**Q: Which distance metric should you use?**
Whatever the embedding model was trained with — cosine for most text models. If the vectors are L2-normalized, which most text models produce, cosine and dot product and L2 all produce the same ranking, so it mostly matters that the index configuration matches the model rather than which you pick.

**Q: Where should the metadata filter go?**
Inside the engine call, so the index filters during the search. Filtering afterwards means ineligible documents were retrieved and scored, which is a leak, and it silently under-retrieves because top-k was computed over a population the user can't see. In an access-controlled system that's a correctness requirement.

**Q: How do you set the similarity threshold?**
Empirically. Sample around a hundred queries, label the top results relevant or not, plot the two score distributions, and choose the point with an acceptable false-negative rate. Score scales differ completely across embedding models, so a threshold from another system or a blog post is a guess.

**Q: What should happen when nothing clears the threshold?**
Abstain — say the system doesn't have that information, and ideally route to a human or offer a related topic. Passing weak chunks to the generator produces confidently wrong answers, and in a regulated context an unsupported answer is worse than no answer at all.

**Q: Can you show the similarity score to users?**
I wouldn't. It's not a calibrated confidence — a 0.7 means different things across models and doesn't correspond to a probability of being correct. It's useful for ranking within a query and for calibrated thresholds internally, but presenting it as confidence to an end user is misleading.

## 9. Common Mistakes

- Using a metric the embedding model wasn't trained for.
- Omitting query/document task types with asymmetric models.
- Filtering after retrieval instead of during.
- Copying a similarity threshold from another system.
- Treating a similarity score as a calibrated confidence value.

## 10. What to Remember

- **Embed → filter → ANN search → fetch → post-process.**
- **The metric follows the model**; normalized vectors make cosine, dot, and L2 equivalent in ranking.
- **Pre-filter in the engine.** Post-filtering leaks and under-retrieves.
- **Calibrate the threshold per model and corpus** from labelled score distributions.
- **The threshold's purpose is abstention** — no answer beats an unsupported one.
