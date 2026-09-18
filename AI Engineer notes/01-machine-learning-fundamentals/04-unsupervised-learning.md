# Unsupervised Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 04**

## 1. Definition

Finding structure in data that has **no labels** — grouping similar items, reducing dimensions, detecting anomalies, or modeling the data distribution itself. There's no ground truth to check against, which makes evaluation the hard part.

## 2. Simple Explanation

Someone hands you a box of 10,000 unlabeled mechanical parts and says "organize these."

You group ones that resemble each other (clustering). You notice that although you measured twelve properties, really only three things vary independently (dimensionality reduction). You spot one part that looks like nothing else (anomaly detection).

The catch: you might sort by *color*, which is a valid grouping and completely useless if the engineer needed them sorted by thread size. **The algorithm can't tell you that.**

## 3. How It Works

1. **Define similarity** — choose a distance metric. This *is* your definition of "similar."
2. **Define an objective** over it — minimize within-cluster variance, maximize retained variance, minimize reconstruction error.
3. **Optimize** — Lloyd's algorithm, eigendecomposition, gradient descent.
4. **Interpret** — the step with no algorithm. The output is integers; the *meaning* is your hypothesis.
5. **Validate externally** — the step that separates seniors (see §5).

**The four families:**

| Family | Methods | Used for |
|---|---|---|
| **Clustering** | k-means, HDBSCAN, GMM | Grouping similar items |
| **Dimensionality reduction** | PCA (preprocess), UMAP/t-SNE (visualize) | Compression, visualization |
| **Anomaly detection** | Isolation Forest, autoencoder error | Finding the unusual |
| **Density / generative** | GMM, VAE, diffusion, **LLMs** | Modeling `P(x)` — the GenAI link |

## 4. Practical Example

**Scaling is non-negotiable.** Two customers, raw Euclidean distance:

```
A = (age 30, income 50000, orders 12)
B = (age 55, income 52000, orders 11)

Raw:  √[625 + 4,000,000 + 1] ≈ 2000   ← income completely dominates.
                                        You're clustering on income alone.
Scaled (z-scores): ≈ 1.70              ← age is now the main difference,
                                        which is probably what you meant.
```

This bug produces *plausible-looking* output — you get clusters, they have different average incomes, you write a deck — which is exactly why it survives to production.

**In your RAG work:** cluster a month of production queries, then look at clusters where retrieval confidence is low. That's a prioritized list of documents to write — derived with zero labeling effort.

## 5. Why It Matters

- **Unlabeled data is free; labeled data is expensive.** This is how you extract value from millions of unlabeled records, and how you decide *what's worth paying to label*.
- **It's the bridge to GenAI.** An LLM computing `P(next token | context)` is density estimation over text, trained without human labels. Embedding models are trained the same way.
- **It finds categories you didn't know existed.** You can't label a class you haven't conceived of. Clustering 200,000 support tickets and finding a coherent complaint type nobody catalogued is value no supervised approach reaches.

## 6. Trade-offs / Failure Modes

| Failure | Why it happens | Fix |
|---|---|---|
| **Unscaled features** | Distance dominated by the largest-unit feature | Standardize; use QuantileTransformer for skewed money features |
| **Wrong k** | No ground truth determines it | Elbow + silhouette + stability — and often the business decides ("marketing can run 4 campaigns") |
| **Curse of dimensionality** | At high `d`, all distances converge and "nearest" is noise | Reduce dimensions first, or use cosine on learned embeddings |
| **Reading t-SNE distances** | t-SNE preserves local, not global structure | Use it for hypotheses only, never conclusions |
| **Anomaly ≠ problem** | Unusual is not the same as bad | It's a candidate generator for human review, not a decision-maker |
| **No external validation** | Internal metrics measure geometric tidiness, not usefulness | Require an outcome check before acting |

**The evaluation problem:** silhouette score tells you clusters are geometrically tidy. It can't tell you they're useful. A perfect clustering of customers by account age is geometrically excellent and commercially worthless.

**External validation — the only thing that resolves it:**
- Do the groups differ on an outcome nobody used to build them (e.g. 6-month churn)?
- Are assignments stable quarter over quarter?
- Does adding `cluster_id` improve a supervised model?
- Do domain experts recognize the groups as real?

## 7. Interview Answer

> "Unsupervised learning finds structure in data with no labels — clustering, dimensionality reduction, anomaly detection, or modeling the data distribution itself.
>
> What makes it genuinely harder than supervised learning isn't the algorithms, it's evaluation. There's no correct answer to check against, so I get internal metrics like silhouette score that tell me whether clusters are geometrically tidy — and geometric tidiness isn't usefulness. I could cluster customers perfectly on account age and have something commercially worthless.
>
> So what I'd insist on is external validation. Do the segments differ on an outcome nobody used to build them, like six-month churn? Are assignments stable across quarters? Does the cluster ID improve a downstream model? Without at least one of those, I have colours on a scatter plot, not a result.
>
> Two practical traps. Scaling — distance methods are completely dominated by whichever feature has the largest raw units, so an unscaled customer clustering is usually a clustering on income and nothing else. And choosing k — elbow plots on real data are smooth and ambiguous, and honestly the business often decides: if marketing can run four campaigns, k is four.
>
> For my work the connection is direct — embedding models are trained without labels, and cosine similarity in a vector store is exactly this distance-metric choice."

## 8. Likely Follow-ups

**Q: How do you choose k in k-means?**
Three inputs, none sufficient alone: the elbow on inertia (usually ambiguous — inertia decreases monotonically with k, so it can't decide alone), silhouette score (more objective but biased toward spherical equal-sized clusters, which is what k-means produces, so it's partly self-confirming), and the business constraint, which is often the real answer. I'd also check stability across time periods.

**Q: k-means vs. DBSCAN?**
k-means partitions everything into exactly k roughly spherical clusters. DBSCAN finds dense regions of arbitrary shape, doesn't need k, and explicitly labels sparse points as noise. I'd use k-means for large data with convex similar-sized groups, and HDBSCAN when shapes are irregular or "belongs to nothing" is a meaningful answer.

**Q: Why PCA before clustering?**
Noise reduction, and the curse of dimensionality — at high dimensions all pairwise distances converge, so distance-based clustering stops meaning anything. The caveat is PCA is linear, so if the structure is non-linear it can destroy what you're looking for; UMAP handles that case.

**Q: PCA vs. t-SNE?**
PCA is linear, deterministic, preserves global variance, and can project new points. t-SNE is non-linear, stochastic, preserves local neighbourhoods at the expense of global structure, and can't project new points without refitting. PCA for preprocessing, t-SNE strictly for visualization — and never read meaning into the distance *between* clusters in a t-SNE plot.

**Q: Your anomaly detector flags 5,000/day and the team can review 200.**
`contamination` is an operations parameter, not a modeling one — set it from review capacity. But rank rather than threshold, and send the top 200 by score weighted by exposure. Then measure the precision of that queue, because reviewed items generate labels. Within weeks you have a labeled dataset and can train a supervised model to reorder by *probability of being actionable* rather than *degree of unusualness* — very different rankings.

**Q: How do you cluster text?**
Embed with a sentence transformer, reduce with UMAP, cluster with HDBSCAN — essentially the BERTopic recipe. What goes wrong: using TF-IDF directly (clusters on shared vocabulary, so paraphrases split), using Euclidean instead of cosine on embeddings, and skipping dimensionality reduction so you cluster in 768 dimensions where distances have collapsed.

## 9. Common Mistakes

- Not scaling before any distance-based method.
- Treating cluster names as output — they're your interpretation of arbitrary integers.
- Using inertia alone to choose k (it decreases monotonically).
- Reading distances between clusters in a t-SNE plot.
- Saying "anomaly detected" when you mean "unusual" — most anomalies are legitimate.
- Comparing cluster IDs across runs without Hungarian matching — IDs are arbitrary.
- Shipping a clustering with no external validation.

## 10. What to Remember

- **Structure in `x` with no `y`.** No ground truth → evaluation is an argument, not a metric.
- **The two choices that ARE the model:** which features, which distance metric. The algorithm validates neither.
- **Always scale.** Unscaled distance = clustering on the biggest-unit feature.
- **Validate externally or don't ship** — outcome differentiation, stability, downstream lift, expert recognition.
- **It's a generator, not a product** — of candidates, features, and hypotheses feeding something else.
