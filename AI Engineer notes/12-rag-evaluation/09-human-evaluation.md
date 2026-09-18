# Human Evaluation

> **Phase 12 · RAG EVALUATION · Topic 09**

## 1. Definition

People judging system outputs against a rubric. It's the ground truth every automated metric is calibrated against, and the only reliable measure for qualities automation can't assess — tone, usefulness, and domain correctness.

## 2. Simple Explanation

Automated metrics measure proxies. Humans measure the thing.

An LLM judge tells you whether an answer *looks* grounded. A compliance officer tells you whether it would survive an audit. Those aren't the same question, and only one of them is what you're actually accountable for.

## 3. How It Works

1. **Define the rubric explicitly** — what each score level means, with examples.
2. **Sample representatively** — stratified by query type, not purely random, so rare-but-important categories are covered.
3. **Use multiple annotators** on an overlapping subset.
4. **Measure agreement** (Cohen's/Fleiss' kappa). Below ~0.6 means the *rubric* is ambiguous, not that the system is bad.
5. **Adjudicate disagreements** and refine the rubric.
6. **Use the result as ground truth** to calibrate automated judges.

**A workable rubric structure:**

```
For each answer, rate 1-5 and give a one-line reason:

  Correctness   — is the information factually right per the source?
  Groundedness  — is every claim supported by the cited context?
  Completeness  — does it fully answer the question?
  Clarity       — would a customer understand it?
  Safety        — any compliance, privacy, or tone concerns?

Plus binary flags:
  [ ] should have abstained
  [ ] citation does not support the claim
  [ ] contains PII
```

## 4. Practical Example

**Calibrating an LLM judge against humans — the highest-value use:**

```
200 answers rated by both humans and the LLM judge on groundedness:

                  Human: grounded   Human: not grounded
Judge: grounded         142                 18          ← judge too lenient
Judge: not grounded       6                 34

Judge precision on "grounded" = 142/160 = 0.89
Judge recall  on "not grounded" = 34/52  = 0.65  ← misses 35% of failures

→ The judge under-reports groundedness failures. Either tighten
  its rubric, or apply a correction factor when reporting.
```

Without this, you're reporting a number whose error you don't know.

**Sampling strategy matters:**

```
❌ Random 200 from production
   → dominated by the common easy query types

✅ Stratified: 50 common lookups, 50 complex, 50 abstentions,
   50 low-confidence — plus all answers flagged by inline checks
   → covers the categories where failures actually live
```

## 5. Why It Matters

- **It's the ground truth automated metrics are calibrated against.** Without it, your metrics have unknown error.
- **It catches what automation can't** — domain correctness, tone, compliance risk, real usefulness.
- **It's required for launch approval** in regulated contexts, regardless of what your metrics say.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expensive and slow** | Can't run on every change; typically weekly or per release |
| **Annotator disagreement** | Low kappa means the rubric is ambiguous — fix the rubric first |
| **Doesn't scale** | 200 answers is feasible; 200,000 isn't |
| **Annotator fatigue and drift** | Standards shift over a long session; rotate and re-calibrate |
| **Domain expertise required** | A generalist can't judge whether a policy answer is compliant |
| **Position and verbosity bias** | Annotators favour longer, more confident-sounding answers |
| **Random sampling misses failures** | Failures concentrate in rare query types |

**The operating model that works:** automated metrics run continuously on every change and catch regressions; human evaluation runs periodically on a stratified sample and calibrates the automated metrics. Neither replaces the other.

## 7. Interview Answer

> "Human evaluation is people judging outputs against a rubric. Its main role isn't to be the primary metric — it's too slow and expensive for that — it's to be the ground truth that automated metrics are calibrated against.
>
> That calibration is the highest-value use. If I have an LLM judge reporting groundedness, I need to know its error rate. Rating two hundred answers with both humans and the judge might show the judge catches only sixty-five percent of the failures humans find — it's systematically lenient. Without that, I'm reporting a number whose error I don't know, and optimizing against it could be making things worse.
>
> On process: define the rubric explicitly with examples, use multiple annotators on an overlapping subset, and measure agreement with kappa. If kappa is below about 0.6, the rubric is ambiguous — that's a rubric problem, not a system problem, and I'd fix the guidelines before drawing any conclusions about quality.
>
> Sampling matters more than people expect. Random sampling from production is dominated by common easy queries, so it misses where failures actually live. I'd stratify — common lookups, complex questions, abstentions, low-confidence answers — plus everything flagged by inline checks.
>
> And it catches things automation can't. An LLM judge tells me whether an answer looks grounded; a compliance officer tells me whether it would survive an audit. In banking those aren't the same question, and only one of them is what we're accountable for.
>
> The operating model is: automated metrics continuously on every change, human evaluation periodically on a stratified sample to calibrate them."

## 8. Likely Follow-ups

**Q: How much human evaluation do you need?**
Enough to calibrate the automated judges and to spot-check categories automation handles poorly — typically 100–300 answers per evaluation round, run weekly or per release. It's not the primary metric because it can't scale; it's the reference that makes the primary metrics trustworthy.

**Q: What if annotators disagree?**
Measure it with kappa first. Below about 0.6 the rubric is ambiguous rather than the system being inconsistent — so I'd adjudicate the disagreements, find the pattern, refine the rubric with clearer examples, and re-annotate. Trying to improve the system based on low-agreement labels is chasing noise.

**Q: How do you sample for evaluation?**
Stratified, not random. Random sampling is dominated by common easy queries and misses the rare high-stakes categories where failures concentrate. I'd stratify by query type, include abstentions and low-confidence answers deliberately, and add everything flagged by inline automated checks.

**Q: Who should annotate?**
For correctness and compliance, someone with domain expertise — a generalist can't judge whether a banking policy answer is compliant. For clarity and usefulness, people closer to the end user. Splitting the rubric by annotator type is often better than asking one person to judge everything.

**Q: How does it relate to LLM-as-judge?**
Complementary, in a specific relationship: human evaluation is the ground truth, LLM judging is the scalable approximation calibrated against it. I'd never deploy an LLM judge without knowing its agreement rate with humans, and I'd re-calibrate periodically because judge model updates shift that agreement silently.

## 9. Common Mistakes

- Using human evaluation as the primary continuous metric — it can't scale.
- Deploying an LLM judge without calibrating it against human labels.
- Random sampling instead of stratified, missing rare failure categories.
- Blaming the system when low kappa says the rubric is ambiguous.
- Using generalist annotators for domain-specific correctness judgments.

## 10. What to Remember

- **The ground truth automated metrics are calibrated against.**
- **Calibrating the LLM judge is its highest-value use** — you need to know the judge's error rate.
- **Kappa below ~0.6 means fix the rubric**, not the system.
- **Stratify the sample.** Random sampling misses where failures concentrate.
- **Operating model:** automation continuously, humans periodically to calibrate.
