# Golden Datasets

> **Phase 22 · AI EVALUATION · Topic 02**

## 1. Definition

A curated set of test cases with known correct outcomes, used as the fixed reference for measuring quality. Every quality claim about the system rests on it, which makes it the highest-leverage artifact in evaluation.

## 2. Simple Explanation

A golden set is a list of questions with the answers you expect and the documents those answers should come from.

Its value depends entirely on whether it represents the questions people actually ask. An invented set is systematically easier than reality and produces numbers that don't survive production.

## 3. How It Works

```json
{
  "id": "fee-premier-001",
  "query": "What's the international transfer fee for Premier?",
  "question_type": "simple_lookup",
  "expected_chunk_ids": ["fee-schedule-v4.2-c07"],
  "expected_answer": "$25.00 per transfer, with the first two
                      per calendar month waived.",
  "must_contain": ["$25", "two per", "waived"],
  "must_not_contain": ["$45"],
  "expected_behaviour": "answer"
}
```

**`expected_chunk_ids` separates retrieval from generation**, which is what makes a failure localizable. Without it, a wrong answer could be either stage and you can't tell.

## 4. Practical Example

**Composition, which determines what the numbers mean:**

```
· REAL QUERIES — production traffic, support tickets,
  actual customer questions
· PRODUCTION PROPORTIONS — if 80% of traffic is simple
  lookups, the set should reflect that, or the aggregate
  score describes a workload you don't have
· QUESTION TYPES LABELLED — simple, multi-part, multi-hop,
  ambiguous, out of scope
· UNANSWERABLE CASES — where the correct behaviour is
  abstention
· ADVERSARIAL CASES — prompt injection attempts, requests
  for advice, other customers' data

The unanswerable and adversarial cases are the ones teams
omit, and they test the behaviours with the worst failure
consequences.
```

**Structure: fixed core plus growing set:**

```
FIXED CORE     never changes. This is what makes drift
               detection valid — if recall drops and nothing
               changed on your side, the cause is external.
GROWING SET    refreshed from production, especially failures
               and abstentions, so it tracks reality.

If the whole set changes over time, a score change can't be
attributed to the system rather than the test. That's the
mistake that quietly invalidates months of measurement.
```

**Size:** 100–200 cases is usually enough to detect meaningful regressions. Below about 50, a two-point difference is within noise. More matters less than composition — 500 cases all of one type is worse than 150 covering the real distribution.

**Label quality:** a wrong expected answer produces confident wrong conclusions — a change that genuinely improved things scores worse and gets reverted. Labels deserve review like code, and disagreement between two labellers usually means the case is ambiguous and shouldn't be in the set.

## 5. Why It Matters

- **Every quality claim rests on it** — composition determines what the numbers mean.
- **A fixed core** is what makes drift attributable.
- **Unanswerable and adversarial cases** test the highest-consequence behaviours.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Invented cases** | Systematically easier than reality |
| **Wrong proportions** | The aggregate describes a workload you don't have |
| **Whole set changing** | Score changes unattributable |
| **No unanswerable cases** | Over-answering undetected |
| **Wrong labels** | Real improvements score worse and get reverted |
| **Real queries as customer data** | Retention and erasure apply |

**On PII:** a golden set built from real queries contains account numbers, names, and amounts, so it's a customer data store needing IAM restriction, retention policy, and coverage by erasure requests. Redacting values that don't affect the test case usually costs nothing — "the fee on TXN-XXXXXXXX" exercises the same retrieval path as the real identifier.

**On maintenance:** a golden set built once and never refreshed stops representing production as the product evolves. Sampling new cases from production failures and abstentions continuously is what keeps it honest — those are precisely where the cases the set doesn't cover are concentrated.

## 7. Interview Answer

> "A golden set is curated test cases with known correct outcomes, and every quality claim about the system rests on it. Its value depends entirely on whether it represents the questions people actually ask — an invented set is systematically easier than reality and produces numbers that don't survive production.
>
> Each case needs the query, the expected answer, and critically the expected chunk IDs. That last one separates retrieval failure from generation failure, which is what makes a wrong answer localizable. Without it you know something went wrong and not which stage.
>
> On composition: real queries from production traffic and support tickets, in production proportions — if eighty percent of traffic is simple lookups, the set should reflect that, or the aggregate score describes a workload you don't have. Question types labelled so results can be broken down. And two categories teams omit: unanswerable cases where the correct behaviour is abstention, and adversarial cases — injection attempts, requests for financial advice, requests for another customer's data. Those test the behaviours with the worst failure consequences, which is exactly why leaving them out is dangerous.
>
> Structurally I'd split it into a fixed core that never changes and a growing set refreshed from production. The fixed core is what makes drift detection valid — if recall drops and nothing changed on our side, the cause is external, like a model update. If the whole set changes over time, a score change can't be attributed to the system rather than the test, and that quietly invalidates months of measurement.
>
> On size, a hundred to two hundred cases is usually enough to detect meaningful regressions. Below about fifty, a two-point difference is within noise. But composition matters more than size — five hundred cases all of one type is worse than a hundred and fifty covering the real distribution.
>
> Label quality deserves emphasis. A wrong expected answer produces confident wrong conclusions: a change that genuinely improved things scores worse and gets reverted. So labels get reviewed like code, and disagreement between two labellers usually means the case is genuinely ambiguous and probably shouldn't be in the set.
>
> And the compliance point — a set built from real queries contains account numbers and names, so it's a customer data store with retention and erasure obligations. Redacting values that don't affect the test usually costs nothing, since a placeholder transaction ID exercises the same retrieval path."

## 8. Likely Follow-ups

**Q: What goes in a golden set case?**
The query, the expected answer, the expected chunk IDs, the question type, and the expected behaviour — answer or abstain. The chunk IDs matter most, because they separate retrieval failure from generation failure and make a wrong answer localizable.

**Q: Why a fixed core plus a growing set?**
The fixed core makes drift attributable — if recall drops and the test hasn't changed, the cause is external. The growing set keeps the evaluation representative as the product evolves. Changing the whole set means score movements can't be attributed to the system.

**Q: What cases are usually missing?**
Unanswerable ones where abstention is correct, and adversarial ones — injection attempts, requests for financial advice, requests for another customer's data. Those test the behaviours with the worst consequences, so omitting them means the highest-stakes failures go unmeasured.

**Q: How big should it be?**
A hundred to two hundred cases detects meaningful regressions; below fifty, small differences are within noise. But composition matters more than size — five hundred cases of one type is worse than a hundred and fifty matching the real query distribution.

**Q: What about label quality?**
It's critical and under-attended. A wrong expected answer means a genuine improvement scores worse and gets reverted. Labels deserve review like code, and disagreement between two labellers usually signals an ambiguous case that shouldn't be in the set at all.

## 9. Common Mistakes

- Inventing cases rather than sampling real queries.
- Proportions that don't match production traffic.
- Replacing the whole set over time.
- Omitting unanswerable and adversarial cases.
- Storing real customer queries without access control or retention.

## 10. What to Remember

- **Real queries, production proportions** — invented sets flatter the system.
- **Expected chunk IDs** separate retrieval failure from generation failure.
- **Fixed core + growing set** — the core makes drift attributable.
- **Include unanswerable and adversarial cases** — the highest-consequence behaviours.
- **Review labels like code**; it's a customer data store.
