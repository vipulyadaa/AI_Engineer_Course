# Human Evaluation

> **Phase 22 · AI EVALUATION · Topic 03**

## 1. Definition

People reviewing model outputs against a rubric. It's the ground truth that every automated metric is calibrated against, and it's expensive enough that it has to be used selectively.

## 2. Simple Explanation

Someone reads the question, the retrieved context, and the answer, and judges it.

It's slow and costly, which is why it can't be the routine measurement. Its role is producing the labels that make automated metrics trustworthy, and covering the judgments automation can't make.

## 3. How It Works

```
1. DEFINE A RUBRIC        specific, with examples per rating
2. SAMPLE                 stratified by question type and outcome
3. RATE                   two independent raters per case
4. MEASURE AGREEMENT      disagreement is a signal, not noise
5. ADJUDICATE             a third rater or discussion resolves
6. USE                    as ground truth for calibration
```

**Inter-rater agreement is the diagnostic that matters most.** Low agreement means the rubric is ambiguous, not that the raters are careless — and an ambiguous rubric produces labels nobody should trust.

## 4. Practical Example

**A rubric that works, because it's specific:**

```
GROUNDEDNESS
  2 — every factual claim is supported by a quoted passage
      in the retrieved context
  1 — main claims supported; a minor detail is not
  0 — a material claim has no support in the context

Not "is the answer well grounded, 1-5." A vague scale gives
low agreement and unusable labels.

The test of a rubric is whether two people reading it
independently reach the same rating on the same case.
```

**Where humans are irreplaceable:**

```
· CALIBRATING an LLM judge — the judge's numbers mean
  nothing until they're checked against human labels
· AMBIGUOUS CASES where the correct answer is genuinely
  arguable
· TONE and appropriateness for a customer-facing banking
  context
· COMPLIANCE judgments — is this financial advice? does
  this need a disclosure?
· DISCOVERING failure modes nobody thought to measure

That last one is the highest value. Automated metrics
measure what you already knew to look for; a human reading
fifty outputs finds the thing you didn't.
```

**The sampling strategy that makes it affordable:**

```
Don't sample uniformly. Stratify:

  · all abstentions — was abstaining correct?
  · all escalations — why did the customer want a human?
  · a sample of low-confidence and low-retrieval-score cases
  · a small random sample of ordinary successes, as a
    baseline

Uniform sampling spends most of the budget confirming that
easy cases work.
```

## 5. Why It Matters

- **It's the ground truth** that every automated metric is calibrated against.
- **Inter-rater agreement diagnoses the rubric**, not the raters.
- **Humans find failure modes nobody thought to measure** — the highest-value use.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expensive and slow** | Can't be the routine measurement |
| **Vague rubrics** | Low agreement, unusable labels |
| **Single rater** | No agreement signal; no error detection |
| **Uniform sampling** | Budget spent confirming easy cases work |
| **Raters without domain knowledge** | Can't judge banking correctness |
| **Fatigue** | Quality degrades over a long session |

**On domain knowledge:** judging whether a fee answer is correct requires knowing the fee schedule. A general-purpose rater can assess fluency and obvious hallucination but not domain correctness — so the rater pool has to include people who know the product, which constrains throughput and cost more than the rating itself does.

**On drift in the raters:** the same person rating a hundred cases becomes more lenient or stricter over the session. Periodically re-rating a few earlier cases detects it, and it's worth doing because a labelled set with drifting standards is quietly inconsistent in a way that's very hard to spot afterwards.

## 7. Interview Answer

> "Human evaluation is people rating outputs against a rubric. It's slow and expensive, so it can't be the routine measurement — its role is producing the ground truth that makes automated metrics trustworthy, and covering judgments automation can't make.
>
> The thing that determines whether it works is rubric specificity. Not 'is this well grounded, one to five' — that gives low agreement and unusable labels. Instead: two means every factual claim is supported by a quoted passage in the retrieved context, one means main claims supported but a minor detail isn't, zero means a material claim has no support. The test of a rubric is whether two people reading it independently reach the same rating.
>
> Which is why I'd use two independent raters and measure inter-rater agreement. Low agreement means the rubric is ambiguous, not that the raters are careless — and an ambiguous rubric produces labels nobody should trust. Treating disagreement as a signal about the rubric rather than noise to average away is the important instinct.
>
> Where humans are irreplaceable: calibrating an LLM judge, because the judge's numbers mean nothing until checked against human labels. Genuinely ambiguous cases. Tone and appropriateness for a customer-facing banking context. Compliance judgments like whether something constitutes financial advice. And most valuably, discovering failure modes nobody thought to measure — automated metrics measure what you already knew to look for, and a human reading fifty outputs finds the thing you didn't.
>
> On making it affordable, I'd stratify rather than sample uniformly: all abstentions, to check abstaining was correct; all escalations, to understand why the customer wanted a human; a sample of low-retrieval-score cases; and a small random sample of ordinary successes as a baseline. Uniform sampling spends most of the budget confirming that easy cases work.
>
> Two practical constraints. Domain knowledge — judging whether a fee answer is correct requires knowing the fee schedule, so the rater pool needs people who know the product. That constrains throughput and cost more than the rating itself does.
>
> And rater drift. The same person rating a hundred cases becomes more lenient or stricter over the session. Periodically re-rating a few earlier cases detects it, and it's worth doing because a labelled set with drifting standards is quietly inconsistent in a way that's very hard to spot later."

## 8. Likely Follow-ups

**Q: What's human evaluation actually for?**
Calibrating automated metrics, judging genuinely ambiguous cases, assessing tone and compliance appropriateness, and discovering failure modes nobody thought to measure. That last one is the highest value — automation only measures what you already knew to look for.

**Q: What makes a rubric work?**
Specificity with examples per rating level. "Every factual claim supported by a quoted passage" is ratable; "is this well grounded, one to five" isn't. The test is whether two people reading the rubric independently reach the same rating on the same case.

**Q: Why measure inter-rater agreement?**
Because low agreement diagnoses the rubric, not the raters. An ambiguous rubric produces labels nobody should trust, so disagreement is a signal to fix the definition rather than noise to average away — and averaging it hides the problem.

**Q: How do you make it affordable?**
Stratified sampling — all abstentions and escalations, a sample of low-retrieval-score cases, and a small random sample of successes as a baseline. Uniform sampling spends most of the budget confirming that easy cases work, which you already knew.

**Q: What limits the rater pool?**
Domain knowledge. Judging whether a fee answer is correct requires knowing the fee schedule, so general-purpose raters can only assess fluency and obvious hallucination. That constrains throughput and cost more than the rating work itself.

## 9. Common Mistakes

- Vague rubrics with numeric scales and no examples.
- A single rater, so there's no agreement signal.
- Uniform sampling instead of stratifying by outcome.
- Raters without the domain knowledge to judge correctness.
- Not checking for rater drift across a long session.

## 10. What to Remember

- **It's the ground truth** automated metrics are calibrated against.
- **Specific rubrics with per-level examples** — vague scales give unusable labels.
- **Two raters; disagreement diagnoses the rubric.**
- **Stratify sampling** — abstentions, escalations, low scores, a success baseline.
- **Humans find the failure modes you didn't know to measure.**
