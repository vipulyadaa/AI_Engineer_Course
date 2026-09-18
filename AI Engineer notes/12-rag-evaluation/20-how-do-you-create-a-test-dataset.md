# How Do You Create a Test Dataset?

> **Phase 12 · RAG EVALUATION · Topic 20**

## 1. Definition

Building a curated set of questions with verified correct answers and source references, sourced from real user queries, composed to cover the failure modes you care about, and split so you retain an honest final number.

## 2. Simple Explanation

The dataset is the harder half of evaluation. Metrics are easy to compute; knowing what the right answer is takes domain expertise and care.

And the single biggest mistake is writing the questions by reading the documents — that produces questions using the documents' own vocabulary, which inflates every retrieval metric.

## 3. How It Works

**Step by step:**

1. **Source questions from production logs.** Real phrasing, real typos, real vocabulary gaps. If not live yet, get them from support agents or relationship managers — not from whoever wrote the documents.
2. **Have a domain expert label each** — the correct source section and an expected answer.
3. **Deliberately add out-of-scope questions** marked `should_abstain: true`. Target ~15%.
4. **Tag by query type and difficulty** so you can slice.
5. **Split dev/test**, roughly 70/30. Iterate against dev; touch test once per release.
6. **Label at section or span level**, not chunk IDs — so re-chunking doesn't invalidate everything.
7. **Refresh continuously** from production failures and abstentions.

**A record:**

```json
{
  "id": "q-0142",
  "question": "how much to wire money overseas from my premier account",
  "expected_answer": "$25 per transfer, with the first two per
                      calendar month waived.",
  "correct_sections": ["policy-fees-2026#3.2", "premier-benefits#1.4"],
  "query_type": "factual_lookup",
  "should_abstain": false,
  "source": "production_log",
  "added": "2026-02-01"
}
```

## 4. Practical Example

**The leakage trap, concretely:**

```
❌ Written by reading the source:
   Source: "International transfers incur a $45 fee for retail accounts."
   Question: "What fee do international transfers incur for retail
              accounts?"
   → Uses the document's exact words. recall@5 looks like 0.97.

✅ Sampled from production:
   "how much to send money abroad"
   "is there a charge for international transfers"
   "whats it cost to wire money to india"
   → Real vocabulary gap. recall@5 is 0.84 — which is the truth.
```

**Composition that catches the failures you actually have:**

```
40%  common factual lookups        the bulk of traffic
15%  multi-part / comparison       tests decomposition
10%  exact identifiers             tests hybrid retrieval
10%  conversational follow-ups     tests query rewriting
15%  out-of-scope → should abstain tests abstention  ← don't skip
10%  edge cases, rare products     where failures concentrate
```

**Using an LLM to bootstrap — with the obvious caveat:**

```
Generate candidate questions from each document with an LLM,
then have a human review and rewrite them into natural phrasing.

The LLM-generated version WILL carry vocabulary leakage, so the
human rewrite step isn't optional — it's the point. Use the LLM
for coverage, the human for realism.
```

## 5. Why It Matters

- **Every metric depends on it.** A leaky dataset makes every number optimistic.
- **The out-of-scope portion is what makes abstention measurable**, and without it you'll tune abstention away.
- **Labeling at section level** is what lets you sweep chunk size — the parameter you most want to tune.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Questions written from documents** | Vocabulary leakage; every retrieval metric inflated |
| **No out-of-scope questions** | Over-answering invisible |
| **No dev/test split** | Reported metrics optimistic by an unknown amount |
| **Labeled by chunk ID** | Re-chunking invalidates every label |
| **Too small per slice** | Can't measure a category with 5 examples |
| **Never refreshed** | Drifts from the production distribution |
| **No expected answers** | Completeness can't be measured |

**On size:** composition matters more than total count. If you want to report recall on exact-identifier queries, you need enough of those for stability — say 30–50 per category, putting a useful set at 200–500 total. A thousand questions all of one type is worse than two hundred well-distributed.

**On expected answers:** they're needed for completeness measurement, which is the property most often omitted. Correct chunk IDs alone let you measure retrieval but not whether the answer covered everything asked.

## 7. Interview Answer

> "The dataset is the harder half of evaluation — metrics are easy to compute, knowing the right answer takes domain expertise.
>
> The biggest mistake is writing the questions by reading the documents. That produces questions in the documents' own vocabulary — 'what fee do international transfers incur for retail accounts' — and recall looks like 0.97. Real users say 'how much to send money abroad,' and the honest number is 0.84. That's a subtle form of leakage that inflates every retrieval metric. So I'd sample from production logs, with the real phrasing and typos.
>
> Composition matters more than size. About forty percent common lookups, fifteen percent multi-part questions to test decomposition, ten percent exact identifiers to test hybrid retrieval, ten percent conversational follow-ups to test rewriting, ten percent edge cases — and fifteen percent deliberately out-of-scope questions marked should-abstain. That last category is the one teams skip, and without it over-answering is invisible; you'd tune the similarity threshold down, see recall improve, and not notice you'd built a system that answers everything confidently.
>
> Two details that save pain later. Label at section or text-span level rather than chunk IDs — if I record chunk IDs and then change chunk size, every label is invalidated, and chunk size is exactly the parameter I'll want to sweep. And include expected answers, not just correct sources, because completeness can't be measured without knowing what a complete answer contains.
>
> Then a dev/test split — iterate against dev, touch test once per release — and refresh continuously from production failures and abstentions so the set tracks reality."

## 8. Likely Follow-ups

**Q: How big should it be?**
Composition matters more than count. Each slice you want to report on needs enough examples for stability — 30 to 50 per category — which puts a useful set at 200 to 500 total. A thousand questions all of one type is less useful than two hundred well-distributed across the failure modes you care about.

**Q: Can you use an LLM to generate the questions?**
For coverage, yes — generate candidates from each document to ensure you're not missing topics. But the generated questions carry vocabulary leakage by construction, so a human rewrite into natural phrasing isn't optional. Use the LLM for breadth and a human for realism.

**Q: Why include out-of-scope questions?**
Because abstention is a behavior you have to measure, and without questions that *should* produce "I don't know," over-answering is invisible. You'd lower the similarity threshold, watch recall improve, and ship a system that confidently answers questions it has no basis for.

**Q: Why not label by chunk ID?**
Because chunk IDs are tied to a specific chunking configuration, and chunk size is the parameter you most want to sweep. Label at section or text-span level and map to whatever chunks currently cover that span — then changing chunk size doesn't invalidate the dataset.

**Q: How do you keep it current?**
Continuously add from production — sampled real queries, and preferentially the ones the system failed on or abstained from. That makes the set grow toward where the system actually struggles rather than staying frozen at launch-day assumptions. I'd also review composition quarterly to check it still matches the production query mix.

## 9. Common Mistakes

- Writing questions by reading the source documents.
- Omitting out-of-scope questions.
- Labeling by chunk ID, which re-chunking breaks.
- No expected answers, so completeness is unmeasurable.
- No dev/test split, making reported metrics optimistic.

## 10. What to Remember

- **Source questions from production logs**, not from the documents. Leakage inflates everything.
- **15% out-of-scope questions** so abstention is measurable.
- **Label at section/span level**, not chunk IDs, so you can sweep chunk size.
- **Include expected answers**, not just sources — completeness needs them.
- **Dev/test split, and refresh from production failures** continuously.
