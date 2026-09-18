# Embedding Models

> **Phase 06 · EMBEDDINGS · Topic 11**

## 1. Definition

The models that produce text embeddings — hosted APIs like Vertex AI's `text-embedding` family and OpenAI's, or open models like E5, BGE, and the sentence-transformers family. The choice determines retrieval quality, cost, and data residency.

## 2. Simple Explanation

Every embedding in your vector store came from one specific model, and the choice is more consequential than it looks.

It determines retrieval quality, the input length you can chunk to, the storage and search cost, whether your data leaves your environment, and — because vectors from different models are incomparable — how hard it will be to change your mind later.

## 3. How It Works

**The main families:**

| Model | Dims | Notes |
|---|---|---|
| **Vertex AI `text-embedding-005`** | 768 | Google Cloud native; task types; Matryoshka support |
| **OpenAI `text-embedding-3-small/large`** | 1536 / 3072 | Matryoshka; widely used |
| **E5 family** (open) | 384–1024 | `query:` / `passage:` prefixes required |
| **BGE family** (open) | 384–1024 | Strong multilingual variants |
| **all-MiniLM-L6-v2** (open) | 384 | Small, fast, the common baseline |

**Selection criteria, in order of practical importance:**

```
1. RETRIEVAL QUALITY ON YOUR DATA   ← measure it; don't infer it
2. Max input length vs. your chunk size
3. Language coverage
4. Dimensions (storage, memory, latency cost)
5. Hosted vs. self-hosted (residency, cost model)
6. Query/document asymmetry support
7. Matryoshka support (adjustable dimensions later)
```

## 4. Practical Example

**How to actually choose:**

```
1. Build an eval set: 100+ real questions with known correct chunks
2. Index the corpus with each candidate (2-3 models)
3. Measure recall@k, SLICED by query type
4. Weigh quality against storage, latency, and cost at your scale

  model              recall@5   dims   storage(10M)   notes
  MiniLM-L6           0.79      384      15 GB        fast, cheap
  text-embedding-005  0.88      768      31 GB        GCP native
  text-embedding-3-lg 0.89     3072     123 GB        4× storage
                                                       for +0.01

That last row is the decision. One point of recall is not
worth four times the storage and slower search.
```

**Why leaderboards are a filter, not an answer:**

```
MTEB rankings are aggregate performance across diverse tasks
and domains. Your corpus is one domain with specific jargon.

A model ranked 15th can outperform the model ranked 3rd on
YOUR data, because it happened to see more relevant hard
negatives during training.

Use the leaderboard to shortlist 3 candidates. Then measure.
```

**The Google Cloud consideration:**

```
For a Vertex AI-based system, text-embedding-005 is worth
serious consideration beyond quality:
  · data stays in your GCP project — a residency argument
  · native integration with Vertex AI Vector Search
  · task types (RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT) handled
  · one vendor relationship for procurement and support

In a bank those non-quality factors often dominate.
```

## 5. Why It Matters

- **It's a high-switching-cost decision** — changing means re-embedding the entire corpus.
- **Leaderboards don't predict domain performance**, and knowing that prevents a common mistake.
- **Non-quality factors — residency, integration, cost — often dominate** in a regulated context.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Choosing from a leaderboard** | Aggregate rank doesn't predict domain performance |
| **Ignoring max input length** | Chunks over the limit are silently truncated |
| **Ignoring asymmetry support** | Real recall loss with no error |
| **Not pinning the version** | A provider update shifts quality silently |
| **Underestimating switching cost** | A change means re-embedding everything |
| **Maximizing dimensions** | Linear cost for marginal quality |

**On hosted vs. self-hosted:**

```
HOSTED       no infrastructure; per-call cost; data leaves your
             environment; provider can update the model
SELF-HOSTED  data stays in your VPC; fixed GPU cost; you pin the
             version absolutely; you own the serving

For a bank, residency often decides it before quality does.
```

**On version pinning:** a provider updating a model behind the same name changes retrieval quality with no code change on your side, and may make new query vectors inconsistent with indexed document vectors. Pin explicitly and run a golden eval set on any announced update.

## 7. Interview Answer

> "The embedding model determines retrieval quality, chunk size limits, storage and search cost, and data residency — and it's a high-switching-cost decision, because vectors from different models are incomparable, so changing means re-embedding the entire corpus.
>
> How I'd choose: build an eval set of a hundred or more real questions with known correct chunks, index the corpus with two or three candidates, and measure recall@k sliced by query type. Then weigh the measured quality against storage, latency, and cost at my actual scale.
>
> That last weighing is where the decision usually is. I might see a 768-dimension model at 0.88 recall and a 3072-dimension model at 0.89 — one point of recall for four times the storage and slower search. At ten million chunks that's thirty-one gigabytes versus a hundred and twenty-three, plus graph overhead. That's not a close call.
>
> The mistake I'd avoid is choosing from a leaderboard. MTEB rankings are aggregate performance across diverse tasks and domains, and my corpus is one domain with specific jargon. A model ranked fifteenth can beat one ranked third on my data, because it happened to see more relevant hard negatives in training. I'd use the leaderboard to shortlist three candidates and then measure.
>
> For a Vertex AI-based system, text-embedding-005 is worth serious consideration for reasons beyond quality — data stays in the GCP project, which is a residency argument that often decides things in a bank before quality does; native integration with Vertex AI Vector Search; task types handled properly; and one vendor relationship for procurement.
>
> Two operational things regardless of choice: check that max input length exceeds my chunk size, because exceeding it truncates silently. And pin the model version, because a provider updating behind the same name shifts quality with no code change and can make new query vectors inconsistent with indexed documents."

## 8. Likely Follow-ups

**Q: How do you choose an embedding model?**
Build an eval set of real questions with known correct chunks, index with two or three candidates, measure recall@k sliced by query type, then weigh quality against storage, latency, and cost at your scale. Leaderboards shortlist candidates; they don't decide.

**Q: Why aren't leaderboards sufficient?**
Because they measure aggregate performance across diverse tasks and domains, and your corpus is one domain with specific vocabulary. A lower-ranked model can outperform a higher-ranked one on your data if it saw more relevant hard negatives during training. Domain fit isn't predicted by aggregate rank.

**Q: Hosted or self-hosted?**
Hosted means no infrastructure and per-call cost, but data leaves your environment and the provider can update the model. Self-hosted keeps data in your VPC with fixed GPU cost and absolute version control, at the cost of owning the serving. In a bank, data residency often decides it before quality enters the conversation.

**Q: What if you need to change models later?**
Re-embed the entire corpus, because vectors from different models aren't comparable. I'd store the embedding model version in chunk metadata, build the new index alongside the old, evaluate both on a golden set, and cut over by changing a query filter — so cutover and rollback are both instant. Migrating in place gives you a window where retrieval is silently broken.

**Q: What would you pick for a Google Cloud RAG system?**
Vertex AI's text-embedding family is a strong default — native integration with Vertex AI Vector Search, proper task-type support for query-document asymmetry, data staying in the GCP project for residency, and a single vendor relationship. I'd still validate it against one or two alternatives on my own eval set rather than adopting it by default.

## 9. Common Mistakes

- Choosing from a leaderboard without evaluating on your data.
- Not checking max input length against chunk size.
- Ignoring query-document asymmetry support.
- Not pinning the model version.
- Maximizing dimensions without weighing the linear cost.

## 10. What to Remember

- **High switching cost** — a model change means re-embedding the whole corpus.
- **Measure on your own eval set**; leaderboards shortlist, they don't decide.
- **Check max input length** against chunk size — exceeding it truncates silently.
- **Weigh dimensions against storage and latency** — one recall point rarely justifies 4× storage.
- **Residency and integration often dominate quality** in a regulated context.
