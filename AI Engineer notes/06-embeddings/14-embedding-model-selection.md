# Embedding Model Selection

> **Phase 06 · EMBEDDINGS · Topic 14**

## 1. Definition

Choosing which embedding model to use, based on measured retrieval quality on your own data weighed against dimensions, input length, language coverage, residency, and cost. It's a high-switching-cost decision made once and lived with.

## 2. Simple Explanation

You can't infer which model is best for your corpus from a leaderboard, and you can't cheaply change your mind — switching means re-embedding everything.

So the selection process is: shortlist from public benchmarks, then measure on your own eval set, then weigh quality against the costs that scale with your corpus.

## 3. How It Works

**The selection process:**

```
1. SHORTLIST      3 candidates from MTEB / provider docs
2. HARD FILTERS   max input ≥ chunk size
                  language coverage
                  residency and deployment constraints
3. MEASURE        index with each; recall@k on YOUR eval set,
                  sliced by query type
4. WEIGH          quality vs. storage, latency, cost at your scale
5. VERIFY         asymmetry support; Matryoshka support
```

**The criteria, in practical priority order:**

| Criterion | Why it matters |
|---|---|
| **Recall on your data** | The only quality signal that counts |
| **Max input length** | Below your chunk size = silent truncation |
| **Residency / deployment** | Often decides it before quality in a bank |
| **Dimensions** | Linear storage, memory, and latency cost |
| **Language coverage** | Monolingual models can't match cross-language |
| **Asymmetry support** | Task types or prefixes for queries vs. documents |
| **Matryoshka support** | Lets you adjust dimensions later without re-embedding |

## 4. Practical Example

**The decision table that actually resolves it:**

```
Eval set: 150 banking questions with known correct chunks
Corpus: 10M chunks

model                recall@5  dims  storage  latency  residency
MiniLM-L6-v2           0.79     384   15 GB    fastest  self-host
text-embedding-005     0.88     768   31 GB    fast     in-project
text-embedding-3-large 0.89    3072  123 GB    slower   external

Decision: text-embedding-005.
  · +0.09 recall over MiniLM justifies the cost
  · +0.01 over the 3072-dim model does NOT justify 4× storage
  · in-project residency is a hard requirement in banking
```

**Slice before deciding:**

```
Overall recall@5 comparison hides this:

                    overall  factual  identifiers  comparison
model A              0.88     0.94       0.61         0.72
model B              0.86     0.89       0.83         0.71

Model A wins overall. Model B is far better on identifier
queries — which, in a banking corpus, may be the category
that matters most.

And note: identifier performance is largely a hybrid-retrieval
concern anyway, so this slice might argue for adding BM25
rather than switching models.
```

**Test the pipeline, not just the model:**

```
Model choice interacts with chunk size, enrichment, and whether
you use hybrid retrieval. Evaluate the CONFIGURATION:

  model + chunk size + breadcrumb enrichment + hybrid on/off

A model that loses standalone may win once breadcrumbs are
prepended, because the added context suits it better.
```

## 5. Why It Matters

- **High switching cost** makes this a decision worth getting right rather than iterating on.
- **Leaderboard rank doesn't predict domain performance**, and knowing that is the core judgment.
- **Non-quality criteria — residency, input length — are hard filters** that often decide it first.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Choosing by leaderboard rank** | Aggregate performance ≠ domain performance |
| **Ignoring max input length** | Silent truncation of every long chunk |
| **Comparing overall recall only** | Category differences hidden |
| **Testing the model in isolation** | Ignores interaction with chunking and enrichment |
| **Maximizing dimensions** | Linear cost for marginal gain |
| **Not checking asymmetry support** | Silent recall loss after deployment |
| **Underestimating switching cost** | A change means re-embedding the full corpus |

**On the identifier slice:** if a model underperforms specifically on identifier queries, adding BM25 is usually a better fix than switching models — because that weakness is structural to dense retrieval rather than specific to one model. Recognizing that distinction avoids an unnecessary migration.

**On Matryoshka support:** choosing a Matryoshka-trained model means you can reduce dimensions later without re-embedding. Given the switching cost of this decision, that optionality has real value.

## 7. Interview Answer

> "Model selection is a high-switching-cost decision, because vectors from different models are incomparable — changing means re-embedding the entire corpus. So it's worth getting right rather than iterating on.
>
> My process: shortlist three candidates from MTEB and provider documentation, apply hard filters, measure on my own eval set, then weigh quality against the costs that scale with corpus size.
>
> The hard filters come first because they can eliminate a candidate regardless of quality. Max input length has to exceed my chunk size, or every long chunk is silently truncated. Language coverage. And residency — in a bank, whether data leaves the environment often decides it before quality enters the conversation.
>
> Then I'd measure recall@k on a hundred and fifty or so real questions with known correct chunks, sliced by query type. The slicing matters: I've seen a case where model A wins on overall recall while model B is far better on identifier queries, which in a banking corpus may be the category that matters most. Though I'd note that identifier weakness is structural to dense retrieval rather than specific to a model — so that slice might argue for adding BM25 rather than switching.
>
> The weighing is where the decision usually lands. A 768-dimension model at 0.88 recall versus a 3072-dimension model at 0.89 — one point for four times the storage, thirty-one gigabytes versus a hundred and twenty-three at ten million chunks, plus slower search. That's not close.
>
> The mistake I'd avoid is choosing by leaderboard rank. MTEB measures aggregate performance across diverse domains; my corpus is one domain with specific jargon. A model ranked fifteenth can beat one ranked third on my data.
>
> And I'd test the configuration rather than the model in isolation — model choice interacts with chunk size, breadcrumb enrichment, and whether hybrid retrieval is enabled. A model that loses standalone can win once breadcrumbs are prepended."

## 8. Likely Follow-ups

**Q: How do you evaluate candidate models?**
Build an eval set of real questions with known correct chunks, index the corpus with each candidate, and measure recall@k sliced by query type. Then weigh the measured quality against storage, latency, and cost at your actual corpus size. Leaderboards shortlist; they don't decide.

**Q: What are the hard filters?**
Max input length below your chunk size eliminates a model outright, because every long chunk would be silently truncated. Language coverage if you're multilingual. And deployment constraints — in a regulated context, whether data leaves your environment is often a requirement rather than a preference.

**Q: Why slice the recall comparison?**
Because overall recall can hide large category differences. One model may be better on factual lookups and much worse on identifier queries. And knowing *which* category differs is diagnostic — identifier weakness is structural to dense retrieval, so it argues for adding BM25 rather than switching models.

**Q: How do you weigh quality against cost?**
At your actual corpus size. One point of recall rarely justifies four times the storage and slower search — at ten million chunks that's ninety extra gigabytes plus index overhead. I'd quantify both sides concretely rather than treating quality as automatically dominant.

**Q: Why does Matryoshka support matter for selection?**
Because it preserves optionality on a decision with high switching cost. A Matryoshka-trained model lets you reduce dimensions later without re-embedding, so you can start at full dimensions and trim if storage becomes a problem. Given that changing models means a full re-embed, that flexibility is worth weighting.

## 9. Common Mistakes

- Selecting by leaderboard rank without measuring on your data.
- Not checking max input length against chunk size.
- Comparing overall recall without slicing by query type.
- Testing the model in isolation from chunking and enrichment.
- Switching models to fix an identifier weakness that hybrid retrieval addresses.

## 10. What to Remember

- **High switching cost** — a change means re-embedding everything. Get it right once.
- **Hard filters first:** input length, language, residency. They eliminate regardless of quality.
- **Measure on your eval set, sliced by query type.** Leaderboards shortlist only.
- **Weigh quality against storage and latency at your scale** — one recall point rarely justifies 4× storage.
- **Test the configuration**, not the model alone — chunking and enrichment interact with it.
