# LLM-as-a-Judge

> **Phase 12 · RAG EVALUATION · Topic 10**

## 1. Definition

Using an LLM to score or compare system outputs against a rubric. It's how RAG evaluation scales, because qualities like groundedness and answer relevance can't be measured with string matching.

## 2. Simple Explanation

You can't compute groundedness with a regex. Judging whether "unlimited free transfers" is supported by "first two per calendar month waived" requires understanding both.

An LLM can do that at scale and low cost. The catch is that the judge is itself a model with biases, and if you don't calibrate it you're reporting a number whose error you don't know.

## 3. How It Works

1. **Write a structured rubric** — explicit criteria and score definitions.
2. **Ask for claim-level or criterion-level verdicts**, not a holistic score.
3. **Request a reason** before the score — it improves reliability and makes errors diagnosable.
4. **Use a different model than the generator.**
5. **Calibrate against human labels** on a sample; know the agreement rate.
6. **Pin the judge's model version.**

**A rubric that works:**

```
You are evaluating whether an answer is supported by the provided context.

For EACH factual claim in the answer:
  1. State the claim
  2. Quote the supporting text from the context, or write "NOT FOUND"
  3. Verdict: SUPPORTED / PARTIALLY_SUPPORTED / NOT_SUPPORTED

Do not use outside knowledge. A claim that is true but absent
from the context is NOT_SUPPORTED.

Output JSON: {"claims": [{"claim": ..., "evidence": ..., "verdict": ...}]}
```

**The "quote the evidence" requirement is the single biggest reliability improvement** — it forces the judge to locate support rather than pattern-match on plausibility.

## 4. Practical Example

**The known biases, and what to do about each:**

| Bias | Effect | Mitigation |
|---|---|---|
| **Self-preference** | Over-approves its own model's output | Use a different model as judge |
| **Position** | In pairwise comparison, favours the first (or last) option | Randomize order; evaluate both orders and average |
| **Verbosity** | Prefers longer answers | Rubric explicitly says length isn't a criterion |
| **Style** | Prefers confident, fluent phrasing | Require evidence quotes, not impressions |
| **Leniency** | Tends to approve borderline cases | Calibrate against humans; apply a correction |

**Calibration is the step that makes it usable:**

```
200 answers labeled by both humans and the judge:

  judge agrees with human:  176/200 = 88%
  judge says grounded, human says not:  18   ← lenient
  judge says not, human says grounded:   6

→ The judge under-reports failures by roughly a third.
  Now I know that, and can report groundedness with a caveat
  or tighten the rubric and re-calibrate.
```

**Pairwise comparison is more reliable than absolute scoring:**

```
❌ "Rate this answer 1-5 for groundedness."
   → scores drift over time and across sessions

✅ "Which answer is better grounded, A or B?"
   → more consistent; and it's what you actually need for
     comparing two system versions
```

## 5. Why It Matters

- **It's how RAG evaluation scales** — the qualities that matter can't be string-matched.
- **It's cheap enough for continuous use** on sampled traffic, unlike human evaluation.
- **Knowing its biases and calibrating** is what separates using it well from trusting a number.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Uncalibrated** | You're reporting a number with unknown error |
| **Same model as generator** | Self-preference bias inflates scores |
| **Holistic scoring** | Less reliable and less actionable than criterion-level verdicts |
| **Judge version drift** | A provider update shifts your metric with no system change |
| **Optimizing against the judge** | You get answers the judge likes, not answers users need — reward hacking |
| **Cost at scale** | An LLM call per evaluated answer; sample rather than evaluating everything |

**The reward-hacking risk is the one to name explicitly.** If you iterate prompts against an LLM judge's scores, you'll optimize for what that judge rewards — which may be verbosity, confident phrasing, or a particular structure. That's the same failure as tuning against a proxy metric in classical ML. The defense is periodic human evaluation and a held-out set you don't iterate against.

## 7. Interview Answer

> "LLM-as-a-judge is using a model to score outputs against a rubric. It's how RAG evaluation scales, because the qualities that matter — groundedness, answer relevance — can't be measured with string matching. Judging whether 'unlimited free transfers' is supported by 'first two per month waived' requires understanding both.
>
> The single biggest reliability improvement is requiring the judge to quote its evidence. Instead of 'rate groundedness one to five,' I'd ask it to list each claim, quote the supporting text from the context or write NOT FOUND, and give a per-claim verdict. That forces it to locate support rather than pattern-match on plausibility, and it makes errors diagnosable.
>
> Three biases I'd design around. Self-preference — a model over-approves its own output, so I'd use a different model as judge, and it can be smaller and cheaper since verification is easier than generation. Position bias in pairwise comparisons, so I'd randomize order or evaluate both orders. And verbosity bias, which the rubric should explicitly address.
>
> But the step that makes it usable at all is calibration. I'd label a couple hundred answers with both humans and the judge and measure agreement. If the judge catches only two-thirds of the failures humans find, I need to know that before reporting the number.
>
> The risk I'd flag hardest is reward hacking. If I iterate prompts against the judge's scores, I'll optimize for what that judge rewards — verbosity, confident phrasing, a particular structure — not for what users need. That's the same failure as tuning against a proxy in classical ML. The defenses are periodic human evaluation and a held-out set I don't iterate against."

## 8. Likely Follow-ups

**Q: Can a model judge its own output?**
It can, but it's biased toward approving it — self-preference is a documented effect. I'd use a different model, and it can be smaller and cheaper because verifying a claim against provided context is a much easier task than generating the answer was.

**Q: How do you make the judge reliable?**
Structured rubric with explicit criteria, claim-level or criterion-level verdicts rather than a holistic score, a requirement to quote supporting evidence, reasoning before the score, low temperature, and a pinned model version. Then calibrate against human labels so you know the agreement rate.

**Q: Absolute scoring or pairwise comparison?**
Pairwise is more reliable — absolute scores drift across sessions and are harder to anchor consistently. And pairwise is usually what you actually need, since the question is typically "is the new version better than the old one." I'd use pairwise for system comparison and absolute claim-level verdicts for tracking a metric like groundedness over time.

**Q: What's the biggest risk?**
Reward hacking. Iterating against the judge's scores optimizes for what the judge rewards rather than what users need — typically verbosity and confident phrasing. It's the proxy-metric problem from classical ML. The defense is periodic human evaluation to check that judge scores still correlate with human judgment, plus a held-out set you never iterate against.

**Q: How do you handle judge model updates?**
Pin the version explicitly. A provider update changes your metric with no change to your system, which makes historical comparisons invalid. When you do upgrade, re-run the calibration set against both versions so you can quantify the shift and decide whether to rebaseline.

## 9. Common Mistakes

- Deploying a judge without calibrating against human labels.
- Using the same model for generation and judging.
- Asking for a holistic score instead of criterion-level verdicts with evidence.
- Iterating prompts against judge scores without a held-out human check.
- Not pinning the judge's model version.

## 10. What to Remember

- **How RAG evaluation scales** — groundedness and relevance can't be string-matched.
- **Require evidence quotes** — the single biggest reliability improvement.
- **Different, smaller model as judge.** Self-preference is real.
- **Calibrate against humans** or you're reporting a number with unknown error.
- **Reward hacking is the main risk** — keep a held-out set and periodic human review.
