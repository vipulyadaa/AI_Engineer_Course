# Why Convert Text into Vectors?

> **Phase 06 · EMBEDDINGS · Topic 02**

## 1. Definition

Because vectors make semantic similarity **computable**. Text comparison is either exact-match or expensive; vector comparison is a dot product, which hardware does extremely fast and which approximate-nearest-neighbour indexes make sub-linear.

## 2. Simple Explanation

Two reasons, and the second is easy to overlook.

**Semantics:** "how much to send money abroad" and "international wire fee" mean the same thing and share no words. Comparing them as text can't detect that; comparing them as vectors can.

**Speed:** finding the nearest vector among a million is a problem with decades of optimized solutions. Finding the most semantically similar text among a million is not.

## 3. How It Works

```
Text comparison options:
  exact match        → fast, but misses paraphrase entirely
  edit distance      → O(n·m) per pair; captures spelling, not meaning
  keyword overlap    → fast via inverted index; no semantic understanding
  LLM comparison     → understands meaning; ~500ms PER PAIR
                       → 1M documents = impossible

Vector comparison:
  cosine similarity  → one dot product per pair
  with an ANN index  → sub-linear search over millions
                       → milliseconds for the whole corpus
```

**That's the computational argument**, and it's the one people underweight. Semantics is why you *want* embeddings; tractability is why they're *usable*.

## 4. Practical Example

**The scale argument, concretely:**

```
1,000,000 chunks, one query.

LLM-based relevance judgment:
  1M calls × ~500ms  →  ~6 days per query. Impossible.

Embedding + flat search:
  1M dot products of 768 dims  →  ~400ms. Usable.

Embedding + HNSW index:
  examines a few thousand vectors  →  ~8ms. Production.

The embedding is computed ONCE per chunk at ingestion.
At query time you compare vectors, not run a model per pair.
```

**That precompute property is the whole architecture:**

```
Bi-encoder (embeddings):  chunk vectors computed at INGESTION
                          → query-time cost independent of corpus size
Cross-encoder (reranker): must process each (query, chunk) pair
                          → can't precompute → only viable over
                            a small candidate set

That's exactly why retrieval is a bi-encoder and reranking is
a cross-encoder — the precompute property determines where each
can be used.
```

**Vectors also enable things text doesn't:**

```
· clustering — group similar chunks, find knowledge gaps
· deduplication — semantic near-duplicates that hashing misses
· classification — a simple classifier on top of embeddings
· anomaly detection — out-of-distribution queries
· diversity (MMR) — select results that differ from each other
```

## 5. Why It Matters

- **The tractability argument is the underweighted half** — semantics explains the want, computability explains the possible.
- **The precompute property** is what determines the two-stage retrieve-then-rerank architecture.
- **Vectors enable clustering, dedup, and anomaly detection**, not just search.

## 6. Trade-offs / Failure Modes

| Cost | Detail |
|---|---|
| **Information loss** | One vector can't capture everything in a passage |
| **Exact terms lost** | Identifiers and codes — hence hybrid retrieval |
| **Fixed dimensionality** | Long text compresses into the same vector size |
| **Model dependency** | Vectors are tied to their model; migration means re-embedding |
| **Storage** | Millions of high-dimensional vectors is real infrastructure |
| **Curse of dimensionality** | At high dimensions distances converge |

**On information loss:** compressing a 600-token chunk into 768 numbers necessarily discards detail. That's why chunk size matters so much — the larger the chunk, the more is averaged away, and the blurrier the vector becomes.

**On the honest framing:** vectors are a lossy, fast approximation of meaning. They're not a complete representation, and treating cosine similarity as a measure of truth rather than of similarity leads to over-trusting retrieval scores.

## 7. Interview Answer

> "Two reasons, and the second is the one people underweight.
>
> The obvious one is semantics. 'How much to send money abroad' and 'international wire fee' mean the same thing and share no words, so text comparison can't detect the relationship. Vectors can, because the embedding model was trained to place related meanings near each other.
>
> The underweighted one is tractability. Suppose you could ask an LLM to judge relevance directly — that's semantically ideal and completely impractical. A million chunks at five hundred milliseconds per judgment is six days per query. Embedding plus a flat search is four hundred milliseconds; embedding plus an HNSW index is around eight. So semantics is why you *want* embeddings, and computability is why they're *usable*.
>
> The property that makes that work is precomputation. Chunk vectors are computed once at ingestion, so query-time cost is independent of corpus size — you're comparing vectors, not running a model per pair. That's also exactly why the two-stage architecture exists: a bi-encoder can precompute so it handles retrieval over millions, while a cross-encoder can't precompute so it's only viable over a small candidate set. The precompute property determines where each can be used.
>
> Vectors also enable things beyond search — clustering production queries to find knowledge gaps, semantic deduplication that hashing misses, out-of-distribution detection for queries the corpus doesn't cover, and diversity selection in results.
>
> The honest framing is that a vector is a lossy fast approximation of meaning. Compressing a six-hundred-token chunk into seven hundred and sixty-eight numbers necessarily discards detail — which is why chunk size matters so much, since a larger chunk averages more away. And it's why exact identifiers are lost, which is what hybrid retrieval addresses."

## 8. Likely Follow-ups

**Q: Why not just use an LLM to judge relevance directly?**
Because it's intractable at corpus scale. A million chunks at half a second per judgment is days per query. Embeddings let you precompute chunk representations once at ingestion, so query time becomes vector comparison rather than model invocation — which is what makes the cost independent of corpus size.

**Q: What does precomputation buy?**
Query-time cost that doesn't scale with corpus size. It's also what determines the two-stage architecture: a bi-encoder precomputes and handles retrieval over millions, while a cross-encoder must process each query-document pair and so can only run over a small candidate set. Retrieve wide with one, rerank narrow with the other.

**Q: What do you lose by using vectors?**
Detail and exact form. Compressing a passage into a fixed-size vector discards information, and exact identifiers are lost because the model encodes meaning rather than surface form. That's why hybrid retrieval exists and why chunk size matters — larger chunks average more away.

**Q: What else are embeddings good for besides search?**
Clustering — grouping production queries to find knowledge-base gaps is genuinely useful. Semantic deduplication that catches near-duplicates hashing misses. Classification with a simple model on top. Out-of-distribution detection for queries the corpus doesn't cover. And diversity selection so top-k isn't five phrasings of one fact.

**Q: Is cosine similarity a measure of truth?**
No — it's a measure of similarity in a learned space, and treating it as anything stronger leads to over-trusting retrieval scores. It's also not calibrated: a cosine of 0.72 means different things in different models and corpora, so thresholds have to be tuned empirically on your own data.

## 9. Common Mistakes

- Giving only the semantic argument and omitting tractability.
- Not connecting precomputation to the two-stage retrieval architecture.
- Treating cosine similarity as calibrated or as a measure of correctness.
- Forgetting that vectors lose exact identifiers.
- Overlooking non-search uses like clustering and deduplication.

## 10. What to Remember

- **Two reasons: semantics (why you want it) and tractability (why it's usable).**
- **Precomputation makes query cost independent of corpus size** — and determines bi-encoder vs. cross-encoder roles.
- **A vector is a lossy fast approximation** of meaning, not a complete representation.
- **Exact identifiers are lost** — hence hybrid retrieval.
- **Also enables clustering, dedup, OOD detection, and diversity selection.**
