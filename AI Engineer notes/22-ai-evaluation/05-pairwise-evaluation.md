# Pairwise Evaluation

> **Phase 22 · AI EVALUATION · Topic 05**

## 1. Definition

Comparing two outputs for the same input and choosing which is better, rather than scoring each independently. It produces more reliable judgments because relative comparison is an easier task than absolute rating.

## 2. Simple Explanation

"Which of these two answers is better?" is a question both humans and models answer consistently.

"Rate this answer from one to five" is not — different raters anchor differently, and the same rater drifts over a session.

## 3. How It Works

```
INPUT     one query, two candidate answers (A and B)
JUDGE     picks A, B, or tie — with a reason
AGGREGATE win rate across the dataset

Reported as: "configuration B wins 62% of comparisons,
ties 18%, loses 20%"
```

**Mandatory: run each comparison in both orders.** Judges favour whichever option appears first, so A-then-B and B-then-A must both be run and the results averaged. Without that, the measured win rate includes a position effect of unknown size.

## 4. Practical Example

**Where pairwise is the right tool:**

```
· comparing two prompt versions
· comparing two model tiers
· comparing two retrieval configurations
· A/B analysis of a proposed change

Anything where the question is "did this change help"
rather than "is this good enough".
```

**Where pointwise is required instead:**

```
· a CI gate needs an absolute threshold — "groundedness
  must exceed 0.9" — and a win rate can't express that
· monitoring over time needs a stable number, not a
  comparison against something that also changed
· reporting to stakeholders who need "how good is it"

So both are needed, for different purposes. Pairwise for
choosing; pointwise for gating and monitoring.
```

**That split is the practical answer**, and treating pairwise as strictly better misses that it can't gate.

**Interpreting a win rate:**

```
62% wins, 18% ties, 20% losses

That's a real improvement — but it also means 20% of cases
got WORSE. For a banking system that matters: a change
improving the average while degrading a fifth of cases may
not be acceptable if the degraded fifth is a high-stakes
category.

So I'd break the win rate down by question type rather than
reporting it in aggregate.
```

**Ties matter:** a high tie rate means the change made little difference, which is useful information — it says the effort should go elsewhere. Forcing a binary choice by removing the tie option hides that.

## 5. Why It Matters

- **Relative judgment is more reliable** than absolute rating, for humans and models.
- **Position bias requires running both orders** — non-negotiable.
- **Pairwise chooses; pointwise gates.** Both are needed.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Position bias unaddressed** | Win rate includes an unknown effect |
| **No tie option** | Forces a distinction where none exists |
| **Aggregate win rate only** | Hides which categories got worse |
| **Used as a CI gate** | A win rate can't express an absolute threshold |
| **Comparing against a moving baseline** | Both sides changed; result uninterpretable |
| **Length bias** | Longer answers win regardless of quality |

**On the moving baseline:** comparing this week's configuration against last week's, when last week's also changed, tells you only about the relative difference and nothing about the trajectory. A fixed reference configuration — the current production version, held constant — is what makes a series of pairwise results interpretable over time.

**On what the win rate doesn't tell you:** it says B beats A more often; it doesn't say by how much or whether either is acceptable. A configuration winning 70% of comparisons against a bad baseline is still bad. Pairwise measures direction, not level, and that's why it can't replace an absolute metric.

## 7. Interview Answer

> "Pairwise evaluation compares two outputs for the same input and picks the better one, rather than scoring each independently. It's more reliable because relative comparison is an easier task than absolute rating — different raters anchor differently on a one-to-five scale, and the same rater drifts over a session, whereas 'which of these is better' is answered consistently.
>
> One thing is mandatory: run each comparison in both orders. Judges favour whichever option appears first, so A-then-B and B-then-A both get run and averaged. Without that, the win rate includes a position effect of unknown size and the result isn't trustworthy.
>
> Pairwise is the right tool for comparing prompt versions, model tiers, or retrieval configurations — anything where the question is 'did this change help.' But it can't do everything: a CI gate needs an absolute threshold like 'groundedness must exceed 0.9,' and a win rate can't express that. Monitoring over time needs a stable number rather than a comparison against something that also changed. So pairwise for choosing, pointwise for gating and monitoring — both are needed.
>
> On interpreting the result, I'd break it down rather than report an aggregate. Sixty-two percent wins with twenty percent losses is a real improvement — and it also means a fifth of cases got worse. For a banking system that matters: a change improving the average while degrading a fifth of cases may be unacceptable if the degraded fifth is a high-stakes category. So I'd want the win rate by question type.
>
> Ties are informative too. A high tie rate means the change made little difference, which says the effort should go elsewhere. Forcing a binary choice by removing the tie option hides that, so I'd always include it.
>
> Two things that undermine the method. A moving baseline — comparing this week against last week when last week also changed tells you only about the relative difference and nothing about the trajectory. A fixed reference configuration, held constant, is what makes a series of results interpretable.
>
> And the fundamental limit: a win rate says B beats A more often, not by how much or whether either is acceptable. A configuration winning seventy percent against a bad baseline is still bad. Pairwise measures direction, not level."

## 8. Likely Follow-ups

**Q: Why is pairwise more reliable?**
Because relative comparison is an easier judgment than absolute rating. Raters anchor differently on a numeric scale and drift over a session, whereas "which of these is better" is answered consistently — by humans and by judge models alike.

**Q: What's mandatory when running it?**
Both orders. Judges favour whichever option appears first, so each comparison runs as A-then-B and B-then-A with the results averaged. Without that, the win rate contains a position effect of unknown magnitude and can't be trusted.

**Q: Can pairwise replace pointwise scoring?**
No. A CI gate needs an absolute threshold, and a win rate can't express one. Monitoring over time needs a stable number rather than a comparison against something that also moved. Pairwise chooses between options; pointwise gates and tracks.

**Q: How do you interpret a win rate?**
By breaking it down by question type. Sixty-two percent wins with twenty percent losses means a fifth of cases got worse, which may be unacceptable if those are high-stakes categories. An aggregate win rate hides that entirely.

**Q: What's the fundamental limit?**
It measures direction, not level. A win rate says B beats A more often — not by how much, and not whether either is acceptable. A configuration winning seventy percent against a bad baseline is still bad, which is why an absolute metric is still needed.

## 9. Common Mistakes

- Not running both orders, leaving position bias in the result.
- Removing the tie option and forcing a distinction.
- Reporting an aggregate win rate with no breakdown.
- Using pairwise as a CI gate.
- Comparing against a baseline that also changed.

## 10. What to Remember

- **Relative comparison beats absolute rating** for consistency.
- **Run both orders** — position bias is real and unaddressed otherwise.
- **Pairwise chooses; pointwise gates.** Both.
- **Break the win rate down by question type** — losses may concentrate.
- **It measures direction, not level** — winning against a bad baseline is still bad.
