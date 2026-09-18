# Failure Mode: Conflicting Documents

> **Phase 13 · RAG FAILURE MODES · Topic 08**

## 1. Definition

Retrieved chunks that contradict each other — an old and a new fee schedule, a general policy and a product-specific exception, two sources that disagree. The model picks one, usually arbitrarily, and presents it confidently.

## 2. Simple Explanation

When two retrieved chunks say different things, the model has no principled way to choose. It picks whichever it attends to more — often just whichever ranked higher, which is arbitrary with respect to correctness.

So the answer is right about half the time, with full confidence and a real citation.

## 3. How It Works

**Four kinds of conflict, with different correct resolutions:**

| Type | Example | Correct resolution |
|---|---|---|
| **Temporal** | 2025 fee schedule vs. 2026 | Prefer the currently effective version |
| **Specificity** | General policy vs. product exception | Prefer the more specific |
| **Jurisdictional** | EU terms vs. US terms | Filter by the user's jurisdiction |
| **Genuine inconsistency** | Two current sources disagree | Surface it; escalate — this is a content bug |

**The resolution stack, in order:**

```
1. PREVENT — filter by effective_date so superseded versions
             aren't candidates at all.  ← the real fix
2. SIGNAL  — include effective dates and specificity in the context
             so the model can reason about precedence
3. INSTRUCT— explicit precedence rule in the prompt
4. SURFACE — when genuine, say so rather than choosing silently
```

## 4. Practical Example

**The temporal conflict, which metadata prevents entirely:**

```
Without date filtering:
  Q: "What's the international wire fee?"
  Retrieved: [1] 2025 schedule: $40
             [2] 2026 schedule: $45
  The model picks whichever ranked higher. Arbitrary.
  Confidently wrong ~50% of the time.

With date filtering:
  effective_date <= today AND (expiry IS NULL OR expiry > today)
  → only the 2026 schedule is a candidate. Deterministic.
```

**The specificity conflict, which filtering can't prevent:**

```
[1] "International transfers: $45." (general fee schedule)
[2] "Premier customers: first two international transfers per
     month waived." (Premier benefits)

Both are current. Both are correct. They're not contradictory —
[2] is an exception to [1].

This needs the prompt to handle it:
  "If a general rule and a specific exception both apply,
   state the general rule and then the exception."
```

**The prompt instruction for genuine conflicts:**

```
If sources conflict:
  · prefer the one with the later effective date
  · prefer the more specific over the more general
  · if they genuinely disagree and neither rule resolves it,
    say so explicitly and cite both
```

## 5. Why It Matters

- **It produces confident wrong answers with real citations**, which is the most dangerous failure shape.
- **The temporal case is entirely preventable with metadata**, and most systems don't do it.
- **Genuine conflicts are a content bug** your system can surface — that's useful output.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No effective_date metadata** | Temporal conflicts can't be prevented |
| **No expiry handling** | Superseded documents stay retrievable forever |
| **Silent resolution** | The model picks one and nobody knows a conflict existed |
| **Over-filtering by date** | A question about a past period needs the historical version |
| **No precedence rule in the prompt** | Specificity conflicts resolved arbitrarily |
| **Genuine conflicts hidden** | A real content inconsistency never gets fixed |

**On historical questions:** date filtering must not be unconditional. "What was the fee in 2025?" legitimately needs the superseded document. The filter should default to current but be relaxable when the query references a past period — which is a case for self-query extraction of a date constraint.

**On detection:** log when retrieved chunks have conflicting effective dates for the same topic, or when a generated answer's figures don't all appear in a single chunk. Both are cheap signals that a conflict was present.

## 7. Interview Answer

> "Conflicting documents means retrieved chunks that contradict each other, and the model picks one — usually whichever ranked higher, which is arbitrary with respect to correctness. So the answer is right about half the time, with full confidence and a real citation. That's the most dangerous failure shape.
>
> There are four types with different resolutions. Temporal — an old and a new fee schedule. Specificity — a general policy and a product-specific exception. Jurisdictional. And genuine inconsistency where two current sources actually disagree.
>
> The temporal case is entirely preventable and most systems don't prevent it. Filtering by effective date so superseded versions aren't candidates makes it deterministic instead of arbitrary. That requires effective and expiry dates in chunk metadata, captured at ingestion — which is cheap and not reconstructable later.
>
> The specificity case can't be filtered away, because both documents are current and both are correct — the exception isn't a contradiction. That needs a prompt rule: state the general rule and then the exception.
>
> For genuine conflicts, the right behavior is surfacing rather than choosing. If two current sources disagree and no precedence rule resolves it, the answer should say so and cite both. That's also useful output — it's a content bug someone should fix, and the system just found it.
>
> One caveat on date filtering: it shouldn't be unconditional. 'What was the fee in 2025' legitimately needs the superseded document, so the filter defaults to current but should be relaxable when the query references a past period."

## 8. Likely Follow-ups

**Q: How do you prevent temporal conflicts?**
Effective and expiry dates in chunk metadata, filtered at retrieval so only currently-effective versions are candidates. That makes the resolution deterministic rather than dependent on which version happened to rank higher. It requires capturing those dates at ingestion, which is cheap then and impossible to backfill accurately later.

**Q: What about a general policy and a specific exception?**
That's not really a conflict — the exception is a refinement. Filtering can't help because both are current and both are correct. The resolution is a prompt rule: state the general rule and then the applicable exception. And structurally, parent-child retrieval helps, because the exception often lives in the same section as the rule.

**Q: What should the system do with a genuine conflict?**
Surface it rather than choosing silently. Say that sources disagree, cite both with their dates, and let the user decide or escalate. That's the honest answer, and it's also useful output — the system has found a content inconsistency someone should fix.

**Q: How do you detect that a conflict occurred?**
Log when retrieved chunks for the same topic carry different effective dates, and when the figures in a generated answer don't all appear in a single source chunk. Both are cheap signals. Clustering those over time surfaces which topics have conflicting documentation, which is a fixable content problem.

**Q: Isn't date filtering always right?**
Not unconditionally. A question about a past period legitimately needs the superseded version — "what was the fee in 2025" should retrieve the 2025 schedule. So the filter should default to currently-effective but be relaxable when the query references a specific past period, which is a case for extracting a date constraint from the query.

## 9. Common Mistakes

- No effective_date metadata, making temporal conflicts unpreventable.
- Unconditional date filtering, breaking legitimate historical questions.
- Letting the model resolve conflicts silently.
- No precedence rule in the prompt for specificity conflicts.
- Not logging conflicts, so content inconsistencies never get fixed.

## 10. What to Remember

- **The model picks arbitrarily** and answers confidently with a real citation.
- **Temporal conflicts are preventable** with effective_date filtering. Most systems don't.
- **Specificity conflicts aren't contradictions** — state the rule, then the exception.
- **Surface genuine conflicts** rather than choosing; it's a content bug worth reporting.
- **Date filtering defaults to current but must be relaxable** for historical questions.
