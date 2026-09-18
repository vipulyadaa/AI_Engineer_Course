# Tool Call Evaluation

> **Phase 22 · AI EVALUATION · Topic 15**

## 1. Definition

Measuring whether an agent chose the right tool and constructed the right arguments — evaluated in isolation, because it's the largest single contributor to agent failure and the cheapest to test.

## 2. Simple Explanation

Before evaluating whether an agent solved the task, evaluate whether it picked the right tool for a single step.

That's a labelled classification problem: given a query, which tool should be called. It runs in seconds, needs no agent loop, and usually explains most of the end-to-end failure.

## 3. How It Works

```
SELECTION EVALUATION
  input:    a query
  expected: the correct tool name
  measure:  accuracy, plus a confusion matrix

ARGUMENT EVALUATION
  given the correct tool, are the arguments right?
  · types and format valid
  · values correct
  · identifiers have provenance

Both run WITHOUT the agent loop — one model call each.
Fast, cheap, and directly diagnostic.
```

**The confusion matrix is the useful output**, not the accuracy number. It shows *which* tools are confused with which, and that points straight at the docstrings that need disambiguating.

## 4. Practical Example

**What a confusion matrix tells you:**

```
                    predicted
              get_fee_schedule  get_transaction_fee
actual
get_fee_schedule        41              9
get_transaction_fee     17             33

Those two are confused in both directions — 26 errors
between them, and almost none elsewhere.

That's not a model problem. Their descriptions don't
distinguish "what the published rate is" from "what this
customer was charged."

The fix is one sentence of negative guidance in each
docstring: "NOT for what a customer was actually charged —
use get_transaction_fee for that."

Then re-run and watch that cell.
```

**That loop — measure, read the matrix, rewrite descriptions, re-measure — is the whole method**, and it's fast enough to do several times in an afternoon.

**Argument evaluation, where provenance matters:**

```
Given the right tool, three failure types:

  FORMAT      malformed — caught by schema validation
  WRONG VALUE plausible but incorrect — needs labelling
  FABRICATED  well-formed, non-existent identifier
              → the dangerous one

Fabrication is measurable: check whether each identifier in
the arguments appeared in a prior tool result or in the
user's message. That's a provenance rate, and it's a
direct measure of how often the agent invents values.
```

**Scaling behaviour, worth measuring deliberately:**

```
Run selection accuracy with 5, 10, 15, 20, 30 tools
available.

Accuracy typically degrades past 15-20. Knowing YOUR
system's curve tells you when to consolidate tools or
split by domain — rather than applying a rule of thumb
that may not fit your tool set.
```

## 5. Why It Matters

- **It's the largest contributor to agent failure** and the cheapest to measure.
- **The confusion matrix points at the docstrings**, not at the model.
- **Provenance rate directly measures fabrication**, which schema validation can't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Only end-to-end evaluation** | The main failure source unmeasured |
| **Accuracy without a confusion matrix** | Doesn't say what to fix |
| **Schema validation treated as sufficient** | Fabricated IDs pass |
| **No scaling measurement** | Tool count chosen by rule of thumb |
| **Labelled set from imagination** | Doesn't match real query phrasing |
| **Blaming the model** | The fix is almost always descriptions |

**On the labelled set:** the queries should be real — production traffic and support tickets — because tool selection is sensitive to phrasing, and invented queries tend to use the vocabulary the docstrings already contain. That makes selection look better than it is, which is the opposite of useful.

**On what this doesn't cover:** selection accuracy per step says nothing about whether the agent called tools in a sensible order, or called three when one would do. Those are process and efficiency questions measured at the agent level. This is the per-step diagnostic, and it's complementary rather than sufficient.

## 7. Interview Answer

> "Tool call evaluation measures whether the agent picked the right tool and constructed the right arguments, in isolation. I'd do it first, because it's the largest single contributor to agent failure and the cheapest to test — it's a labelled classification problem, one model call per case, no agent loop needed.
>
> The output that matters isn't the accuracy number, it's the confusion matrix. If get_fee_schedule and get_transaction_fee are confused in both directions with twenty-six errors between them and almost none elsewhere, that's not a model problem. Their descriptions don't distinguish 'what the published rate is' from 'what this customer was charged.' The fix is one sentence of negative guidance in each docstring, and then you re-run and watch that specific cell.
>
> That loop — measure, read the matrix, rewrite descriptions, re-measure — is the whole method, and it's fast enough to do several times in an afternoon. Whereas blaming the model and reaching for a larger tier would cost more and fix less.
>
> For argument evaluation there are three failure types given the right tool. Format errors, which schema validation catches. Wrong but plausible values, which need labelling. And fabrication — a well-formed identifier that doesn't exist, which is the dangerous one because it passes every structural check.
>
> Fabrication is directly measurable: check whether each identifier in the arguments appeared in a prior tool result or in the user's message. That gives a provenance rate, which is a direct measure of how often the agent invents values — and it's the thing schema validation fundamentally cannot tell you.
>
> One measurement I'd do deliberately: run selection accuracy with five, ten, fifteen, twenty, and thirty tools available. Accuracy typically degrades past fifteen to twenty, but knowing my system's actual curve tells me when to consolidate or split by domain, rather than applying a rule of thumb that may not fit this particular tool set.
>
> On the labelled set, the queries have to be real — production traffic and support tickets. Tool selection is sensitive to phrasing, and invented queries tend to use the vocabulary the docstrings already contain, which makes selection look better than it is.
>
> And the limit: per-step selection accuracy says nothing about whether the agent called tools in a sensible order or called three when one would do. Those are agent-level process and efficiency questions. This is the per-step diagnostic — complementary, not sufficient."

## 8. Likely Follow-ups

**Q: Why evaluate tool calls separately?**
Because it's the largest contributor to agent failure and the cheapest to measure — a labelled classification problem needing one model call per case, no agent loop. It usually explains most of the end-to-end failure, and you learn that in minutes rather than weeks.

**Q: What's the useful output?**
The confusion matrix, not the accuracy number. It shows which tools are confused with which, which points directly at the descriptions needing disambiguation. An accuracy figure tells you there's a problem; the matrix tells you which sentence to rewrite.

**Q: How do you measure argument fabrication?**
By checking whether each identifier in the arguments appeared in a prior tool result or in the user's message — a provenance rate. Schema validation can't catch a fabricated identifier because it's well-formed, so this is the only direct measure of invention.

**Q: How do you decide the tool count limit?**
By measuring it — run selection accuracy with five, ten, fifteen, twenty, and thirty tools and observe where it degrades. The usual rule of thumb is fifteen to twenty, but your own curve is what tells you when to consolidate or split by domain.

**Q: What does this not cover?**
Whether tools were called in a sensible order, or whether three were called when one would do. Those are agent-level process and efficiency questions. Per-step selection accuracy is complementary to those rather than a substitute.

## 9. Common Mistakes

- Evaluating only end-to-end, leaving the main failure source unmeasured.
- Reporting accuracy without a confusion matrix.
- Assuming schema validation catches fabricated identifiers.
- Choosing tool count by rule of thumb rather than measurement.
- Using invented queries that echo the docstring vocabulary.

## 10. What to Remember

- **Cheapest, highest-yield agent diagnostic** — one call per case, no loop.
- **The confusion matrix points at docstrings**, not at the model.
- **Provenance rate measures fabrication** — schema validation can't.
- **Measure the tool-count degradation curve** for your own system.
- **Use real queries** — invented ones echo the docstrings and flatter the result.
