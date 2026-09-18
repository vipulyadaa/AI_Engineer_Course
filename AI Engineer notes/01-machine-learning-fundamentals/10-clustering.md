# Clustering

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 10**

## 1. Definition

Unsupervised grouping of similar items. You supply a distance metric and the algorithm partitions the data into groups where items within a group are more similar to each other than to items in other groups.

## 2. Simple Explanation

Sorting a pile of unlabeled things into piles that "go together" without being told what the categories are.

The critical caveat: **you decide what "similar" means** by choosing the features and the distance metric. The algorithm just optimizes your choice. Cluster customers on income and you'll get income tiers; cluster them on behavior and you'll get something else entirely. Neither is "the" answer.

## 3. How It Works

**k-means**, the default starting point:

1. Pick `k` and initialize `k` centroids (k-means++ does this smartly).
2. **Assign** each point to its nearest centroid.
3. **Update** each centroid to the mean of its assigned points.
4. **Repeat** 2–3 until assignments stop changing.
5. Restart from several initializations (`n_init`) and keep the best, because k-means is sensitive to where it started.

It minimizes within-cluster sum of squares (inertia).

**Algorithm selection:**

| Algorithm | Decides by | Use when | Watch for |
|---|---|---|---|
| **k-means** | Distance to k centroids | Large data, roughly spherical clusters | Must pick k; sensitive to scale and outliers |
| **HDBSCAN** | Density, across varying densities | Messy real data, irregular shapes | Slower; more hyperparameters |
| **GMM** | Probability under a Gaussian mixture | You need soft membership probabilities | Assumes Gaussian components |
| **Hierarchical** | Iterative merging, gives a dendrogram | Small data where the tree is the insight | O(n²)+; won't scale past ~10k |

## 4. Practical Example

**Clustering production RAG queries to find knowledge gaps** — a genuinely useful thing to build:

```python
from sentence_transformers import SentenceTransformer
import umap, hdbscan

emb = SentenceTransformer("all-MiniLM-L6-v2").encode(queries)   # (n, 384)
red = umap.UMAP(n_components=10, metric="cosine").fit_transform(emb)
labels = hdbscan.HDBSCAN(min_cluster_size=25).fit_predict(red)
```

Then join `labels` against your retrieval confidence and answer-quality scores. Clusters with low scores are **topics your knowledge base doesn't cover** — a prioritized content backlog derived with zero labeling effort.

Note the three steps: embed → reduce → cluster. Clustering raw 384-dimensional vectors directly works poorly because distances have largely collapsed at that dimensionality.

## 5. Why It Matters

- **It finds categories you didn't know existed.** You can't label a class you haven't conceived of.
- **It's directly useful in RAG** — query gap analysis, semantic deduplication of chunks, and result diversification when top-k returns ten phrasings of one fact.
- **It's the standard first move on unlabeled data**, before you decide what's worth paying to label.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Unscaled features** | Largest-unit feature dominates the distance entirely | Standardize; QuantileTransformer for skewed money features |
| **Wrong k** | No ground truth determines it | Elbow + silhouette + stability; often the business decides |
| **Non-spherical clusters** | k-means assumes isotropic blobs and will split or merge real shapes | HDBSCAN or GMM with full covariance |
| **Outliers** | Centroids are means, so extremes drag whole clusters | Robust scaling, k-medoids, or winsorize first |
| **High dimensions** | All distances converge; clusters are noise | Reduce dimensions first |
| **Unstable across runs** | Random initialization | High `n_init`, fixed `random_state` |
| **IDs compared across runs** | Cluster IDs are arbitrary integers with no cross-run meaning | Hungarian matching before comparing |

**Evaluation:** silhouette and Davies-Bouldin measure *geometric tidiness*, not usefulness — and both are biased toward the convex equal-sized clusters k-means produces. Inertia decreases monotonically with k, so it can never choose k alone. Only external validation settles it: do the groups differ on an outcome nobody used to build them?

## 7. Interview Answer

> "Clustering groups similar items without labels. k-means is the usual starting point — pick k, assign points to the nearest centroid, move centroids to the mean of their points, repeat until stable.
>
> Two things determine the answer and neither is chosen by the algorithm: the features and the distance metric. That's why scaling is non-negotiable — if I cluster customers without standardizing, income has the largest raw units and I'm effectively clustering on income alone, while getting output that looks perfectly reasonable.
>
> On choosing k, I'd use the elbow plot and silhouette score, but I'd be honest that both are weak. Inertia decreases monotonically so it can't pick k by itself, and silhouette is biased toward the spherical equal-sized clusters k-means produces, which makes it partly self-confirming. In practice the business constraint often decides.
>
> The thing I'd insist on is external validation, because clustering produces a hypothesis, not a result. Do the groups differ on an outcome nobody used to build them? Are assignments stable across time periods? Without that I have colours on a scatter plot.
>
> Concretely, I'd use this to cluster production RAG queries and find which topics have low retrieval confidence — that gives a prioritized list of documents to write, with no labeling at all."

## 8. Likely Follow-ups

**Q: How do you pick k?**
Elbow on inertia, silhouette score, and stability across time periods — plus the business constraint, which is often the real answer. None of the internal metrics is decisive: inertia always decreases with k, and silhouette favours the cluster shape k-means happens to produce.

**Q: k-means vs. HDBSCAN?**
k-means forces every point into one of exactly k roughly spherical clusters. HDBSCAN finds dense regions of arbitrary shape, infers the number of clusters, and explicitly marks sparse points as noise. I'd default to k-means for speed on large well-behaved data, and HDBSCAN for messy real data or when "belongs to no cluster" is a meaningful answer.

**Q: How do you cluster text?**
Embed with a sentence transformer, reduce dimensions with UMAP using cosine distance, then HDBSCAN. Clustering raw TF-IDF groups by shared vocabulary rather than meaning, so paraphrases split apart. And clustering directly in 384 or 768 dimensions works badly because distances have converged — the dimensionality reduction step isn't optional.

**Q: How do you know your clusters are good?**
Internal metrics tell me they're geometrically tidy, which isn't the same as useful. I'd validate externally: do the clusters differ on an outcome not used to build them, are they stable quarter over quarter after matching cluster IDs, does adding the cluster ID improve a downstream supervised model, and do domain experts recognize the groups?

**Q: Why does k-means need multiple initializations?**
It converges to a local optimum that depends on where the centroids started. Different seeds give different answers, sometimes substantially. `n_init` runs it several times and keeps the lowest-inertia result. k-means++ initialization also helps by spreading the initial centroids out rather than picking them uniformly at random.

## 9. Common Mistakes

- Not scaling features before clustering.
- Presenting cluster names as algorithm output — they're your interpretation of arbitrary integers.
- Using inertia alone to choose k.
- Clustering high-dimensional embeddings without reducing dimensions first.
- Comparing cluster IDs across runs or time periods without matching them.
- Shipping a segmentation nobody externally validated.

## 10. What to Remember

- **k-means:** assign to nearest centroid, move centroid to mean, repeat. Needs k, needs scaling, needs multiple inits.
- **You choose "similar"** via features and distance metric. The algorithm only optimizes your choice.
- **Text clustering = embed → UMAP → HDBSCAN.** Don't skip the reduction step.
- **Internal metrics measure tidiness, not usefulness.** External validation is the only thing that settles it.
- **Best RAG use:** cluster production queries to find knowledge-base gaps.
