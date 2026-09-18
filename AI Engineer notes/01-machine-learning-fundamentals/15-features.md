# Features

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 15**

## 1. Definition

The measurable inputs a model sees — the columns of `X`. Feature engineering is transforming raw data into representations that make the pattern easier for the model to find.

## 2. Simple Explanation

Features are what you show the model. Get them wrong and no algorithm can recover.

A raw timestamp and "hours since last transaction" carry identical information, but the second one hands the model the structure instead of making it discover it. That's the whole craft: **features encode your assumptions about what matters.**

## 3. How It Works

Common transformations:

1. **Numeric** — scale (standardize or quantile-transform), log-transform skewed values, bin when the relationship is non-monotonic.
2. **Categorical** — one-hot for low cardinality, target/frequency encoding for high cardinality, learned embeddings when cardinality is very high.
3. **Temporal** — derive recency, frequency, rolling aggregates, day-of-week, time-since-last-event. Never feed a raw timestamp.
4. **Text** — TF-IDF for lexical matching, embeddings for semantic meaning.
5. **Interactions** — ratios and products that encode domain knowledge (`loan_amount / income` is more informative than either alone).

**The rule that prevents most bugs:** every feature must be computable **at decision time**. If it requires information that only exists after the event you're predicting, it's leakage.

## 4. Practical Example

**Feature availability audit** for loan default — the check that catches leakage:

| Feature | Available at application? | Verdict |
|---|---|---|
| `credit_score` | Yes | ✅ |
| `loan_amount / income` | Yes | ✅ good interaction |
| `num_late_payments_on_this_loan` | No — the loan doesn't exist yet | ❌ catastrophic leakage |
| `collections_agency_assigned` | No — happens after default | ❌ essentially the label |
| `interest_rate_offered` | Yes, but… | ⚠️ set by the *previous* risk model, so it encodes a prior risk judgement and creates a feedback loop |

That third category separates experienced practitioners. It isn't a bug, but it means your new model partly learns to imitate the old one.

**In RAG, your "features" are the chunk and its metadata.** Chunk size, overlap, whether you prepend the document title and section heading — those choices affect retrieval quality more than the embedding model does. Prepending a section heading to each chunk is feature engineering, and it usually helps.

## 5. Why It Matters

- **Feature quality beats model choice.** Good features with logistic regression usually beat bad features with a transformer.
- **Deep learning reduced but didn't eliminate this.** Networks learn features from unstructured data; on tabular data you're still engineering them, which is part of why gradient boosting stays competitive there.
- **Features are where leakage enters.** The availability-at-decision-time audit is the highest-value 20 minutes in a modeling project.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Leakage** | Feature encodes post-decision information | Audit availability at decision time for every feature |
| **Training/serving skew** | Transform implemented twice, differently | One shared transform; log served vectors and compare |
| **High-cardinality one-hot** | 50,000 columns from user IDs | Target encoding (fit inside CV folds) or learned embeddings |
| **Unseen categories at serving** | A value absent from training arrives | `handle_unknown="ignore"` plus an explicit fallback |
| **Correlated features** | Destabilizes coefficients and importance | Fine for trees; drop or regularize for linear models |
| **Proxy for a protected attribute** | Postcode encodes demographics | Fairness review; drop or test slices explicitly |

**Feature importance caveat:** high importance means the model relied on it, not that it's causal. Correlated features split importance arbitrarily between themselves.

## 7. Interview Answer

> "Features are the measurable inputs the model sees, and feature engineering is transforming raw data so the pattern is easier to find. The craft is that features encode assumptions — a raw timestamp and 'hours since last transaction' carry the same information, but the second one hands the model the structure instead of making it discover it.
>
> The rule I apply first is availability at decision time. Every feature has to be computable at the moment the prediction is made. On a loan model, 'number of late payments on this loan' is catastrophic leakage because the loan doesn't exist yet. There's also a subtler category — the interest rate offered was set by the previous risk model, so it's legitimate but it means my new model partly learns to imitate the old one, and their errors will be correlated.
>
> The other thing I'd flag is training/serving skew. If the transform is implemented once in the training pipeline and again in the serving path, they drift, and the offline metrics stop describing the deployed system. I'd share one transform and verify by logging served feature vectors and re-scoring them offline.
>
> In my RAG work the equivalent is chunk construction — chunk size, overlap, and whether I prepend the document title and section heading. Those choices move retrieval quality more than swapping the embedding model does."

## 8. Likely Follow-ups

**Q: How do you handle high-cardinality categoricals?**
One-hot doesn't scale past a few hundred values. Target encoding — replacing the category with its mean target value — works well but leaks badly if you fit it on all data, so it must be computed inside each CV fold. Frequency encoding is a simple robust alternative. For very high cardinality, a learned embedding layer is the right tool, which is exactly what recommender systems do with user and item IDs.

**Q: Does deep learning eliminate feature engineering?**
For unstructured data largely yes — a network learns better visual and textual features than anyone hand-designs. For tabular data no, and that's part of why gradient boosting remains competitive there. Even in deep learning, how you construct the input matters: tokenization choices, chunking strategy, and what metadata you attach are all feature engineering by another name.

**Q: How do you detect leakage in features?**
Three checks. A suspiciously high metric — if AUC jumps to 0.99, suspect leakage before celebrating. Feature importance dominated by one unexpected column. And the availability audit: for each feature, ask whether it's computable at the moment of decision. The last one catches most of it, and it's a conversation with a domain expert, not a statistical test.

**Q: What does feature importance actually tell you?**
That the model relied on a feature, not that the feature is causal. Correlated features split importance arbitrarily between themselves, and tree-based importance is biased toward high-cardinality features. SHAP gives per-prediction attributions which are more interpretable, but still describe the model's behavior rather than the world's.

**Q: What's a feature store and why would you use one?**
A central service that computes and serves features consistently to both training and inference, with point-in-time correctness so training never sees future values. The main value is eliminating training/serving skew and letting teams reuse feature definitions instead of reimplementing them. It's worth the complexity at organizational scale, and usually not for a single model.

## 9. Common Mistakes

- Using features that don't exist at decision time.
- Fitting target encoding or scalers outside cross-validation folds.
- Feeding raw timestamps or raw IDs directly.
- Assuming high feature importance implies causality.
- Implementing the transform twice, once for training and once for serving.
- Ignoring that a feature may proxy a protected attribute.

## 10. What to Remember

- **Features encode your assumptions.** Good features with a simple model beat bad features with a complex one.
- **Availability at decision time** is the leakage test — apply it to every feature.
- **One shared transform** for training and serving, or skew is inevitable.
- **High cardinality** → target/frequency encoding inside folds, or learned embeddings.
- **In RAG, chunk construction is feature engineering** — and it matters more than the embedding model.
