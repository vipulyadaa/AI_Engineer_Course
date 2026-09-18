# "How Did You Measure Accuracy?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 18**
>
> ⚠️ **An answer framework.** The strongest move here is to question the
> word "accuracy" before answering — never to produce a number you didn't
> measure.

## 1. Definition

A question that sounds like it wants a percentage. The best answer explains why a single accuracy number for a RAG system is close to meaningless, then gives the decomposition that does mean something.

*Related: [17](17-how-did-you-evaluate-it.md) covers the evaluation harness. This one is about the metric itself.*

## 2. Simple Explanation

"Accuracy" implies one right answer per question that you can mark correct or incorrect. Free-text answers don't work that way.

An answer can be partly right, right but incomplete, or right about the wrong product — and a single percentage flattens all of that into a number that can't guide any decision.

## 3. How It Works

```
WHY ONE NUMBER FAILS

"94% accurate" doesn't say:
  · accurate on which questions
  · graded by whom, against what reference
  · what the 6% were — omissions? wrong product?
    refusals of answerable questions?
  · whether a wrong fee and a wrong opening time
    counted the same

The last one matters most. Not all errors are equal, and
averaging them hides the ones that cause harm.
```

```
WHAT TO REPORT INSTEAD

RETRIEVAL   recall@k — deterministic, genuinely a number
GROUNDED    % of claims supported by retrieved context
COMPLETE    % of answers preserving all conditions
ABSTAIN     correct-refusal rate, and wrong-refusal rate
ESCALATION  % of conversations reaching a human

Each is separately actionable. An average of them is not.
```

## 4. Practical Example

**Why error severity has to be separated:**

```
ERROR A  stated branch opening time was 9am, actually 8:30
ERROR B  stated the wire fee was $45 for a Premier
         customer, actually $25

Both count as one error in an accuracy percentage.

Only one of them is a customer complaint, a potential
remediation, and a regulatory conversation.

So the metric that matters isn't overall accuracy — it's
error rate on the high-consequence question categories,
tracked separately. Fees, eligibility, and anything a
customer could act on financially.
```

**What "correct" has to mean here:**

```
NOT exact string match against a reference — a correct
answer can be worded a hundred ways.

The workable definition is claim-level:
  · every claim in the answer is supported by the source
  · every condition in the source relevant to the question
    appears in the answer

That second half is what turns "correct" into something
that catches omission. Without it, "the fee is $45" is
marked correct against a source that says $45 with three
exceptions.
```

**The honest framing for what you measured:**

```
"I reviewed answers against source documents by hand for
 the high-traffic questions rather than computing a
 metric. I don't have a defensible accuracy number, and
 I'd rather say that than quote one.

 What I'd measure, and why a single number wouldn't be
 the thing I'd report: [the decomposition]."

That answer is stronger than "about 90%" — because the
next question is always "measured how, on what set?"
```

## 5. Why It Matters

- **A single accuracy number hides error severity** — the thing that matters most.
- **Correct must mean claim-supported *and* condition-complete.**
- **Track error rate by question category**, not overall.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| A percentage with no method | The immediate follow-up |
| Exact-match scoring | Free text has many correct forms |
| One number across all question types | Averages away the harmful errors |
| Counting a wrong fee like a wrong opening time | Severity is the point |
| Accuracy without an abstention metric | Refusing everything scores 100% |

**On the abstention loophole:** a system that refuses every question has zero wrong answers. Any accuracy metric needs a coverage counterpart — what proportion of answerable questions got an answer — or it rewards uselessness. Reporting the pair is what makes either meaningful.

**On the number that's actually defensible:** recall@k on a labelled golden set is a real, deterministic, reproducible number. If you want one figure to quote, that's the one — and it's about retrieval, not the whole system, which is worth being clear about.

## 7. Interview Answer

> "[**Be honest about what you measured.** The reframe is what carries this answer.]
>
> "I'd want to push back gently on the word accuracy, because a single accuracy number for a RAG system is close to meaningless — and I think that's the more useful answer.
>
> The problem is that free-text answers aren't right or wrong. An answer can be partly right, right but incomplete, or right about the wrong product. And more importantly, a percentage counts all errors equally. Stating a branch opens at nine when it opens at eight-thirty and stating a wire fee is forty-five dollars for a Premier customer when it's twenty-five are both one error — but only one of them is a complaint, a possible remediation, and a regulatory conversation.
>
> So what I'd report instead is a decomposition. Recall at k for retrieval, which is genuinely deterministic and reproducible. Groundedness as the percentage of claims supported by retrieved context. Completeness as the percentage of answers preserving all relevant conditions. Abstention, split into correct refusals and wrong refusals. And escalation rate to a human. Each of those is separately actionable — an average of them isn't.
>
> On what 'correct' should even mean: not exact match against a reference, because a correct answer can be worded a hundred ways. The workable definition is claim-level — every claim in the answer supported by the source, and every condition in the source relevant to the question present in the answer. That second half is what makes the definition catch omission. Without it, 'the fee is forty-five dollars' marks correct against a source that says forty-five with three exceptions.
>
> There's also a loophole worth naming: a system that refuses every question has zero wrong answers. So any accuracy metric needs a coverage counterpart — what proportion of answerable questions actually got answered. The pair is meaningful; either alone isn't.
>
> And the thing I'd actually track for a banking deployment isn't overall accuracy at all. It's error rate on the high-consequence categories — fees, eligibility, anything a customer could act on financially — kept separate from everything else. Overall accuracy averages exactly the errors you care about into the ones you don't.
>
> [**On what you measured**] To be straight about it: I reviewed answers against the source documents by hand for high-traffic questions rather than computing a metric, so I don't have a defensible accuracy number. I'd rather say that than quote one I can't stand behind."

## 8. Likely Follow-ups

**Q: So you can't give me a number?**
Recall@k on a labelled golden set is a real, reproducible number and it's the one worth quoting — with the caveat that it measures retrieval, not the whole system. A single end-to-end accuracy figure isn't something I'd stand behind without stating exactly how it was graded.

**Q: How do you define a correct answer?**
Claim-level: every claim supported by the source, and every source condition relevant to the question present in the answer. Exact match doesn't work for free text, and the second half is what makes the definition catch omission.

**Q: Why not just average your metrics?**
Because it averages away severity. A wrong fee and a wrong opening time are one error each in an average, and only one of them causes harm. High-consequence categories get tracked separately for that reason.

**Q: What's the flaw in an accuracy metric alone?**
A system that refuses everything scores perfectly. Accuracy needs a coverage counterpart — the proportion of answerable questions that actually got answered — or the metric rewards uselessness.

**Q: What would you report to a stakeholder?**
Three things: retrieval recall, error rate on high-consequence categories, and escalation rate. Those map to "can it find the answer", "is it dangerous", and "is it useful" — which are the questions a stakeholder is actually asking.

## 9. Common Mistakes

- Quoting a percentage without a method.
- Exact-match scoring for free-text answers.
- One number across all question categories.
- No coverage metric alongside accuracy.
- Defining correctness without requiring completeness.

## 10. What to Remember

- **Question the word "accuracy"** — the reframe is the strong answer.
- **Severity matters more than rate** — track high-consequence categories separately.
- **Correct = claim-supported AND condition-complete.**
- **Accuracy needs coverage** or refusing everything wins.
- **Recall@k is the one number that's genuinely defensible.**
