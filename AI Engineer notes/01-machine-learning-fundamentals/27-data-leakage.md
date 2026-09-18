# Data Leakage

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 27**

## 1. Definition

When information that wouldn't be available at prediction time gets into training — either through a feature that encodes the answer, or through preprocessing that saw the evaluation data. The result is offline metrics that look excellent and production performance that doesn't match.

## 2. Simple Explanation

You accidentally showed the model the exam answers while it was studying. Its practice scores are spectacular and completely meaningless.

Leakage is the most dangerous bug in applied ML because it produces **better-looking results**, not worse ones. Nothing errors, nothing alerts. You celebrate, ship, and then production disagrees.

## 3. How It Works

**The three main routes:**

1. **Target leakage** — a feature that only exists because the outcome already happened. `collections_agency_assigned` for default prediction; `num_days_in_hospital` for a diagnosis model.
2. **Preprocessing leakage** — scalers, imputers, or encoders fit on the full dataset, so statistics from validation and test flow into training.
3. **Split leakage** — the same entity, or near-duplicate records, appearing in both train and test. Random splits on time-series or grouped data.

**The test that catches most of it:** for every feature, ask *"is this computable at the exact moment the prediction is made?"*

## 4. Practical Example

**Feature availability audit:**

| Feature | Available at decision time? | Verdict |
|---|---|---|
| `credit_score` | Yes | ✅ |
| `num_late_payments_on_this_loan` | No — the loan doesn't exist yet | ❌ catastrophic |
| `collections_agency_assigned` | No — happens after default | ❌ basically the label |
| `account_closed_date` | No | ❌ |
| `interest_rate_offered` | Yes, but set by the previous risk model | ⚠️ legitimate, but creates a feedback loop |

**Preprocessing leakage, in code:**

```python
# ❌ WRONG — scaler sees test statistics
X_scaled = StandardScaler().fit_transform(X)
X_tr, X_te = train_test_split(X_scaled, ...)

# ✅ RIGHT — split first, preprocessing inside the Pipeline
X_tr, X_te, y_tr, y_te = train_test_split(X, y, ...)
model = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression())])
model.fit(X_tr, y_tr)   # scaler fit on train folds only
```

**In RAG:** if your eval questions were written by reading the same chunks the retriever will return, you've leaked. The questions are phrased using the documents' own vocabulary, so retrieval looks far better than it will on real user phrasing.

## 5. Why It Matters

- **It's the top explanation for "great offline, no lift online."**
- **It's invisible to every normal check.** Cross-validation doesn't catch it; the leak is inside every fold.
- **It wastes the most time**, because you only find out after deployment, having built decisions on the inflated number.

## 6. Trade-offs / Failure Modes

**How to detect it:**

| Signal | What to do |
|---|---|
| **Suspiciously high metric** | AUC jumps to 0.98 — suspect leakage before celebrating |
| **One feature dominating importance** | Inspect it. Ask a domain expert when it gets populated |
| **Offline/online gap** | Log served feature vectors, re-score offline, compare |
| **Duplicate records across splits** | Hash for exact, embedding similarity for near-duplicates |
| **Same entity in both splits** | Check ID overlap; use `GroupKFold` |

**How to prevent it:**
1. Split before you look at the data.
2. All preprocessing inside a `Pipeline`.
3. Temporal split for anything time-ordered; `GroupKFold` for repeated entities.
4. Audit every feature for availability at decision time — with a domain expert.
5. Check for near-duplicates across splits.

## 7. Interview Answer

> "Data leakage is when information that wouldn't be available at prediction time gets into training. It's the most dangerous bug in applied ML because it makes results look *better*, not worse — nothing errors, nothing alerts, and you find out after you've shipped.
>
> It comes in three forms. Target leakage, where a feature only exists because the outcome already happened — 'collections agency assigned' for a default model is essentially the label. Preprocessing leakage, where a scaler or imputer is fit on the full dataset so test statistics flow into training. And split leakage, where the same entity or a near-duplicate appears in both train and test.
>
> The check that catches most of it is asking, for every feature, whether it's computable at the exact moment the prediction is made. That's a conversation with a domain expert rather than a statistical test.
>
> Prevention is mostly discipline: split before touching the data, put all preprocessing inside a Pipeline so it's fit on train folds only, use temporal splits for time data and GroupKFold when there are multiple rows per entity, and check for near-duplicates across splits.
>
> The tell I'd act on is a suspiciously high metric. If AUC jumps to 0.98, my first move is to suspect leakage, not celebrate."

## 8. Likely Follow-ups

**Q: Why doesn't cross-validation catch leakage?**
Because the leak is inside every fold. If a feature encodes the answer, it encodes it in all folds equally, so every fold reports the same inflated score and the consistency looks reassuring. Cross-validation measures variance across samples, not whether the information should have been available.

**Q: Give an example of subtle leakage.**
A model predicting loan default that uses the interest rate offered. It's legitimately available at application time, so it passes the availability check — but that rate was set by the previous risk model, so it encodes a prior risk judgment. That's not strictly leakage, but it means the new model partly learns to imitate the old one and their errors will be correlated. Worth flagging explicitly rather than silently accepting.

**Q: How do you check for it after the fact?**
Look at feature importance and investigate anything unexpected at the top. Ask a domain expert when each suspicious field actually gets populated in the source system. Compare offline predictions against live predictions on the same inputs. And check for ID or near-duplicate overlap across splits.

**Q: Is duplicate data leakage?**
If the duplicates straddle the split, yes. A record appearing in both train and test means the model gets credit for memorizing rather than generalizing. Exact duplicates are easy to hash out; near-duplicates — the same document with minor edits, or the same transaction logged twice — need similarity-based detection and are much more common in scraped or merged datasets.

**Q: How does leakage show up in a RAG system?**
Most commonly in the eval set. If evaluation questions were written by someone reading the source chunks, they'll use the documents' own vocabulary, so retrieval looks far better than it will against real user phrasing. The fix is to sample eval questions from production logs. There's also a contamination version for LLMs: public benchmark data appearing in pretraining corpora, which is why I'd trust an eval set on my own data over a public benchmark score.

## 9. Common Mistakes

- Fitting scalers, imputers, or encoders before splitting.
- Target encoding computed on the full dataset rather than inside folds.
- Random splits on time-series or grouped data.
- Celebrating an unusually high metric instead of investigating it.
- Assuming cross-validation protects against leakage.
- Writing RAG eval questions from the source documents.

## 10. What to Remember

- **Information at training time that won't exist at prediction time.**
- **It makes results look better** — which is why it survives review and reaches production.
- **The test:** is this feature computable at the exact moment of decision?
- **Prevention:** split first → Pipeline for preprocessing → temporal/group splits → duplicate check.
- **Cross-validation doesn't catch it.** The leak is in every fold.
