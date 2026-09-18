# Tuning

> **Phase 20 · VERTEX AI · Topic 17**

## 1. Definition

Adapting a foundation model to a task using your own examples — supervised fine-tuning on Vertex AI, typically parameter-efficient — producing a tuned model version served from your project.

## 2. Simple Explanation

Tuning changes how the model behaves by training it on examples of the behaviour you want.

The critical distinction, and the one that saves the most wasted effort: tuning teaches **behaviour**, retrieval supplies **knowledge**. Most problems people bring to tuning are knowledge problems.

## 3. How It Works

```
1. prepare examples — JSONL of input/output pairs
2. run the tuning job against a base model version
3. evaluate the tuned model against the base on a held-out set
4. deploy to an endpoint if it wins
5. re-tune when the base model version is superseded
```

**Step 5 is the recurring cost** nobody puts in the original business case: a tuned model is tied to the base version it was tuned from.

## 4. Practical Example

**The distinction that matters most:**

```
KNOWLEDGE PROBLEM — tuning does NOT fix this
  "The model doesn't know our international transfer fee."
  → It never will reliably. Facts learned through tuning
    are absorbed imperfectly, can't be updated without
    re-tuning, and can't be cited.
  → RAG. Always.

BEHAVIOUR PROBLEM — tuning may fix this
  "The model won't consistently produce our answer format."
  "Our classification taxonomy has 40 internal categories."
  "Responses don't match our tone and disclosure style."
  → Try prompting and few-shot first. Tune if that plateaus.
```

**The citation argument is decisive in banking:**

```
A fact learned through tuning has no source. The model
states the fee and there's nothing to cite.

A fact retrieved from the fee schedule cites the fee
schedule, with a version and a section.

In a regulated environment where an answer must be
traceable to an approved document, tuning facts is
structurally wrong regardless of how well it works.
```

**When tuning genuinely fits in a banking RAG system:**

```
· a query classifier with a domain-specific taxonomy
· consistent formatting and disclosure language
· a domain vocabulary the base model handles poorly

Note these are all narrow, behavioural, and evaluable — and
none of them are the main generation step, which should be
prompted and grounded.
```

**The honest ordering:** prompt, few-shot, grounding, then tuning. Most teams that tried tuning first found the problem was retrieval.

## 5. Why It Matters

- **Tuning teaches behaviour; retrieval supplies knowledge.** Confusing them wastes months.
- **Tuned facts can't be cited**, which is structurally disqualifying in banking.
- **Re-tuning on base model changes** is a recurring cost missing from most business cases.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Tuning to add knowledge** | Doesn't work; can't be cited or updated |
| **Tied to a base version** | Re-tuning when it's superseded |
| **Training data quality** | Bad examples teach bad behaviour |
| **Overfitting** | Fails on inputs unlike the training set |
| **Evaluation on training data** | Meaningless result |
| **Skipping prompting first** | Expensive solution to a cheap problem |

**On training data quality:** tuning amplifies whatever is in the examples, including inconsistencies. A hundred examples where the format varies teaches the model that the format varies. Curation matters more than volume, and a smaller consistent set usually beats a larger inconsistent one.

**On the maintenance commitment:** a tuned model needs its dataset maintained, re-tuning when base versions change, its own evaluation, its own deployment and endpoint, and its own monitoring. That's a standing commitment, and it needs to be worth more than the prompting alternative on an ongoing basis rather than just at the moment of comparison.

## 7. Interview Answer

> "Tuning adapts a foundation model to a task using your own examples. The distinction I'd lead with, because it saves the most wasted effort, is that tuning teaches behaviour and retrieval supplies knowledge — and most problems people bring to tuning are knowledge problems.
>
> If the issue is 'the model doesn't know our international transfer fee', tuning won't fix that reliably. Facts learned through tuning are absorbed imperfectly, can't be updated without re-tuning, and — decisively for banking — can't be cited. A fact learned through tuning has no source; the model states the fee and there's nothing to point at. A fact retrieved from the fee schedule cites the schedule with a version and a section. In a regulated environment where answers must trace to an approved document, tuning facts is structurally wrong regardless of how well it works.
>
> Where tuning genuinely fits is behaviour: a query classifier with a domain-specific taxonomy, consistent formatting and disclosure language, or a domain vocabulary the base model handles poorly. All of those are narrow, behavioural, and evaluable — and none of them are the main generation step, which should be prompted and grounded.
>
> The ordering I'd follow is prompt, few-shot, grounding, then tuning. Most teams that tried tuning first found the problem was retrieval.
>
> On cost, the thing missing from most business cases is that a tuned model is tied to the base version it was tuned from. When that's deprecated or superseded, the tuning has to be redone — data curated again, job re-run, quality re-validated. Plus the dataset to maintain, its own evaluation, its own endpoint, and its own monitoring. That's a standing commitment, and it has to be worth more than the prompting alternative on an ongoing basis, not just at the moment of comparison.
>
> And on data: tuning amplifies whatever is in the examples, including inconsistencies. A hundred examples where the format varies teaches the model that the format varies. Curation matters more than volume — a smaller consistent set usually beats a larger inconsistent one, which is the opposite of the instinct."

## 8. Likely Follow-ups

**Q: When would you tune rather than use RAG?**
When the problem is behaviour — output format, a domain-specific classification taxonomy, tone and disclosure style. Never for knowledge. If the model doesn't know your fee schedule, tuning won't fix it, and the resulting facts can't be cited or updated.

**Q: Why can't tuned knowledge be cited?**
Because a fact absorbed during tuning has no source attached — the model states it and there's nothing to point at. In a regulated environment where answers must trace to an approved document with a version and section, that's structurally disqualifying regardless of accuracy.

**Q: What's the hidden cost of tuning?**
Re-tuning. The tuned model is tied to its base version, so when that's superseded the whole job repeats — data curated, job re-run, quality re-validated. Plus a dataset to maintain, its own evaluation, endpoint, and monitoring. That standing commitment rarely features in the original case.

**Q: What order should adaptation be attempted in?**
Prompting, then few-shot examples, then grounding, then tuning. Prompting is free and reversible, grounding fixes the usual problem, and tuning is expensive and recurring. Most teams that started with tuning discovered the real problem was retrieval.

**Q: How much training data do you need?**
Less than people expect, but of higher quality than they expect. Tuning amplifies whatever's in the examples including inconsistencies, so a hundred varied-format examples teach the model that the format varies. A smaller consistent set usually beats a larger inconsistent one.

## 9. Common Mistakes

- Tuning to teach the model facts.
- Skipping prompting and grounding before tuning.
- Not budgeting for re-tuning when base models change.
- Prioritizing dataset volume over consistency.
- Evaluating the tuned model on data used in tuning.

## 10. What to Remember

- **Tuning teaches behaviour; retrieval supplies knowledge.**
- **Tuned facts can't be cited** — disqualifying in banking.
- **Tied to a base version** — re-tuning is a recurring cost.
- **Prompt → few-shot → ground → tune**, in that order.
- **Curation beats volume** — inconsistent examples teach inconsistency.
