# LLM-as-a-Judge

> **Phase 22 · AI EVALUATION · Topic 04**

## 1. Definition

Using a model to score outputs against a rubric, giving evaluation that scales beyond what human review can cover — valid only once calibrated against human labels.

## 2. Simple Explanation

You give a model the question, the context, the answer, and a rubric, and it produces a score.

It produces a number whether or not that number tracks quality. So the question isn't whether it works — it's whether it agrees with humans on your task, which you have to check.

## 3. How It Works

```
1. WRITE a specific rubric — the same one humans use
2. RUN the judge over a sample humans have already labelled
3. MEASURE agreement
4. ITERATE on the prompt until agreement is acceptable
5. THEN use it at scale, re-checking periodically
```

**Step 3 is the one that gets skipped**, and skipping it means the numbers may be measuring nothing. An uncalibrated judge is worse than no metric, because it directs effort confidently in a possibly wrong direction.

## 4. Practical Example

**The prompt design that most improves reliability:**

```
REQUIRE EVIDENCE, NOT A VERDICT

Weak:   "Is this answer grounded in the context? Score 0-2."
Strong: "For each factual claim in the answer, quote the
         exact supporting passage from the context, or mark
         it UNSUPPORTED. Then score: 2 if all supported,
         1 if only minor details unsupported, 0 if a
         material claim is unsupported."

A judge asked for a verdict says yes too readily. A judge
required to produce the supporting quote either finds it
or can't — which turns a soft judgment into something
closer to a check.
```

**That requirement is the single highest-value change to a judge prompt.**

**Known biases worth designing around:**

```
POSITION BIAS    in pairwise comparison, the first option
                 is favoured → run both orders and average
LENGTH BIAS      longer answers rated higher → the rubric
                 should state that length isn't a factor
SELF-PREFERENCE  a judge may favour output from the same
                 model family → use a different model where
                 the comparison is between models
VERBOSITY        judges reward fluent confident prose,
                 including confidently wrong prose
```

**Where a judge is weakest:**

```
It verifies against the CONTEXT it's given, not against
truth. If the retrieved context is a superseded fee
schedule, the judge confirms the answer is grounded — and
the answer is wrong.

So groundedness judged by an LLM is a hallucination check,
not a correctness check. Those are different things, and
conflating them is how a system with 0.95 groundedness
still gives customers the wrong fee.
```

**Cost:** a judge run over two hundred cases is two hundred calls per metric per candidate. Five metrics across three configurations is three thousand calls — affordable but not free, so a smaller smoke set per commit and the full set for release candidates is the practical split.

## 5. Why It Matters

- **Calibration against human labels** is what makes the numbers mean anything.
- **Requiring supporting quotes** turns a soft judgment into something closer to a check.
- **A judge verifies against context, not truth** — it's a hallucination check.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Uncalibrated** | Confident numbers that may track nothing |
| **Asking for a verdict** | Judges agree too readily |
| **Position bias** | First option favoured in pairwise |
| **Length and verbosity bias** | Fluent wrong answers score well |
| **Self-preference** | Same-family output favoured |
| **Treated as correctness** | It only checks against provided context |

**On re-calibration:** a judge calibrated six months ago may have drifted, either because the model behind it was updated or because the output distribution changed. Periodically re-checking agreement against a fresh sample of human labels is what keeps it trustworthy, and it's easy to skip once the pipeline is running smoothly.

**On what to judge:** judges are much better at checking a specific property — "is this claim supported by this passage" — than at holistic quality. Decomposing the evaluation into narrow checkable questions produces higher agreement than asking for an overall rating, and it also makes disagreements diagnosable.

## 7. Interview Answer

> "LLM-as-a-judge scores outputs against a rubric using a model, which is how evaluation scales past what human review can cover. The critical point is that it produces a number whether or not that number tracks quality — so it has to be calibrated against human labels on your specific task before it's trusted.
>
> That calibration step is what gets skipped, and skipping it is worse than having no metric, because an uncalibrated judge directs effort confidently in a possibly wrong direction. I'd run the judge over a sample humans have already labelled, measure agreement, iterate on the prompt until agreement is acceptable, and re-check periodically.
>
> The single highest-value change to a judge prompt is requiring evidence rather than a verdict. 'Is this answer grounded, score zero to two' gets an agreeable yes too readily. 'For each factual claim, quote the exact supporting passage from the context or mark it unsupported, then score' either finds the quote or can't. That constraint turns a soft judgment into something closer to a check.
>
> There are known biases to design around. Position bias in pairwise comparison, where the first option is favoured — so run both orders and average. Length bias, where longer answers score higher — the rubric should state that length isn't a factor. Self-preference, where a judge may favour output from its own model family — so use a different model when comparing models. And verbosity generally: judges reward fluent confident prose, including confidently wrong prose.
>
> The limitation I'd be clearest about: a judge verifies against the context it's given, not against truth. If the retrieved context is a superseded fee schedule, the judge confirms the answer is grounded and the answer is still wrong. So LLM-judged groundedness is a hallucination check, not a correctness check — and conflating those is how a system with 0.95 groundedness still tells customers the wrong fee.
>
> Two practical points. Judges are much better at narrow checkable questions than holistic quality, so I'd decompose the evaluation into specific properties — that produces higher agreement and makes disagreements diagnosable.
>
> And cost: two hundred cases is two hundred calls per metric per candidate, so five metrics across three configurations is three thousand calls. Affordable but not free, so a smaller smoke set per commit and the full set for release candidates."

## 8. Likely Follow-ups

**Q: How do you make a judge trustworthy?**
Calibrate it — run it over cases humans have labelled, measure agreement, iterate on the prompt until agreement is acceptable, and re-check periodically. Without that, it produces confident numbers that may not correlate with quality at all.

**Q: What's the best prompt improvement?**
Requiring supporting evidence rather than a verdict. Asking for the exact quote that supports each claim, or an unsupported marker, turns a soft agreeable judgment into something closer to a mechanical check — a judge asked for a verdict says yes far too readily.

**Q: What biases should you design around?**
Position bias in pairwise comparison, handled by running both orders. Length bias, addressed in the rubric. Self-preference, avoided by using a different model family when comparing models. And verbosity generally — judges reward fluent confident prose including confidently wrong prose.

**Q: What can't a judge verify?**
Truth. It checks against the context it's given, so a superseded fee schedule in the context produces a "grounded" verdict on a wrong answer. LLM-judged groundedness is a hallucination check, not a correctness check, and conflating them hides real customer-facing errors.

**Q: How should the evaluation be structured?**
Decomposed into narrow checkable properties rather than holistic ratings. Judges agree with humans much more on "is this claim supported by this passage" than on "rate the overall quality," and narrow questions also make disagreements diagnosable rather than mysterious.

## 9. Common Mistakes

- Using a judge without calibrating against human labels.
- Asking for a verdict instead of supporting evidence.
- Ignoring position bias in pairwise comparisons.
- Treating judged groundedness as correctness.
- Never re-calibrating after the judge model updates.

## 10. What to Remember

- **Calibrate against human labels** or the numbers may mean nothing.
- **Require supporting quotes, not verdicts** — the biggest prompt improvement.
- **Design around position, length, and self-preference bias.**
- **It checks against context, not truth** — hallucination, not correctness.
- **Decompose into narrow properties**; re-calibrate periodically.
