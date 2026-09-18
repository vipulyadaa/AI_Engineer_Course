# Groundedness

> **Phase 22 · AI EVALUATION · Topic 07**

## 1. Definition

Whether every factual claim in an answer is supported by the retrieved context. It's the primary safety metric in a RAG system and the one most directly measurable.

## 2. Simple Explanation

Take the answer apart into claims. For each one, find the passage in the retrieved context that supports it. Claims with no supporting passage are ungrounded.

That's it — and it's checkable, which is what makes it the metric worth building the evaluation around.

## 3. How It Works

```
1. DECOMPOSE the answer into atomic claims
2. For each claim, locate the supporting passage
3. CLASSIFY: supported / partially supported / unsupported
4. SCORE: proportion supported, or a per-claim pass/fail

Implementations:
  LLM judge with the context       most common
  NLI entailment model            cheap, good for direct claims
  citation validation at generation  free, weakest, always on
```

**Per-claim scoring beats an overall rating.** An answer with three supported claims and one unsupported looks grounded in aggregate, and the unsupported one is usually the number the customer will act on.

## 4. Practical Example

**Derived claims, which naive checks get wrong:**

```
"You were overcharged $20."

That sentence appears in no retrieved passage. A naive
groundedness check marks it unsupported.

But it IS grounded, if the derivation is shown:
  charged $45.00          [transaction record]
  Premier rate is $25.00  [fee schedule v4.2 §3.1]
  tier is Premier         [account record]
  difference: $20.00      [arithmetic]

So the check must verify that each PREMISE is supported and
the derivation is valid — not that the conclusion appears
verbatim.

A groundedness evaluation that doesn't handle derivations
flags correct reasoning as hallucination, and the system
ends up abstaining on its best answers.
```

**That's the subtlety worth knowing**, because it's a failure in the evaluation rather than the system.

**Tolerance by claim type:**

```
NUMBERS, DATES, ELIGIBILITY CONDITIONS
  zero tolerance — exact support required, or abstain.
  A wrong fee figure is worse for a customer than no answer.

EXPLANATORY PROSE
  a sentence that paraphrases or contextualizes doesn't
  need a verbatim source. Requiring it produces stilted
  answers and false failures.

Treating all claims identically either over-flags harmless
phrasing or under-flags the figure that matters.
```

**What groundedness does NOT tell you:** whether the retrieved context was the right source, or whether it was current. An answer grounded in a superseded fee schedule scores perfectly. Groundedness is a hallucination check; correctness needs effective-date filtering and independent labelling.

## 5. Why It Matters

- **It's the primary safety metric** in RAG and the most directly measurable.
- **Per-claim scoring** catches the unsupported figure an aggregate hides.
- **Derived conclusions need premise-level checking**, or correct reasoning is flagged.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Aggregate score** | Hides the one unsupported material claim |
| **Derived claims flagged** | Correct reasoning marked as hallucination |
| **Uniform tolerance** | Over-flags prose or under-flags numbers |
| **Treated as correctness** | Passes on superseded sources |
| **Judge not calibrated** | The score may track nothing |
| **No abstention on failure** | Detecting it without acting on it |

**On acting on the result:** measuring groundedness and not gating on it is common and pointless. The value comes from the answer being withheld or the claim removed when support is missing — so the verification step belongs in the request path, not only in the offline evaluation.

**On cost:** verifying every answer roughly doubles per-answer LLM cost. Applying it to answers containing numbers or eligibility determinations, rather than universally, covers the cases where being wrong matters at a fraction of the cost.

## 7. Interview Answer

> "Groundedness is whether every factual claim in the answer is supported by the retrieved context. It's the primary safety metric in a RAG system because it's the one most directly measurable — decompose the answer into claims, find the supporting passage for each, and classify.
>
> I'd score per claim rather than overall. An answer with three supported claims and one unsupported looks grounded in aggregate, and the unsupported one is usually the number the customer will act on.
>
> The subtlety that catches people out is derived claims. 'You were overcharged twenty dollars' appears in no retrieved passage, so a naive check marks it unsupported. But it is grounded — charged forty-five per the transaction record, Premier rate twenty-five per the fee schedule, tier is Premier per the account record, difference is twenty. The check has to verify each premise is supported and the derivation is valid, not that the conclusion appears verbatim. An evaluation that doesn't handle derivations flags correct reasoning as hallucination, and the system ends up abstaining on its best answers — which is a failure in the evaluation rather than the system.
>
> I'd also vary tolerance by claim type. Numbers, dates, and eligibility conditions get zero tolerance: exact support or abstain, because a wrong fee figure is worse for a customer than no answer. Explanatory prose that paraphrases or contextualizes doesn't need a verbatim source, and requiring it produces stilted answers and false failures. Treating all claims identically either over-flags harmless phrasing or under-flags the figure that matters.
>
> The limitation to state clearly: groundedness doesn't tell you whether the retrieved context was the right source or whether it was current. An answer grounded in a superseded fee schedule scores perfectly. It's a hallucination check, not a correctness check — correctness needs effective-date filtering and golden-set labels derived independently of the corpus.
>
> Two practical points. Measuring groundedness without gating on it is common and pointless — the value comes from the answer being withheld or the claim removed when support is missing, so the verification step belongs in the request path, not only in offline evaluation.
>
> And cost: verifying every answer roughly doubles per-answer LLM cost, so I'd apply it to answers containing numbers or eligibility determinations rather than universally. That covers the cases where being wrong matters at a fraction of the cost."

## 8. Likely Follow-ups

**Q: How is groundedness measured?**
Decompose the answer into atomic claims, locate the supporting passage for each in the retrieved context, and classify as supported, partially supported, or unsupported. Per-claim rather than overall, because an aggregate hides the single unsupported claim that matters.

**Q: How do you handle derived conclusions?**
By verifying premises rather than looking for the conclusion verbatim. "You were overcharged twenty dollars" isn't in any passage, but it's grounded if the charged amount, the policy rate, and the tier are each cited and the arithmetic is shown.

**Q: Should tolerance be uniform?**
No. Numbers, dates, and eligibility conditions need exact support or abstention, because a wrong figure is worse than no answer. Explanatory prose that paraphrases doesn't need verbatim sourcing, and requiring it produces stilted answers and false failures.

**Q: What does groundedness not catch?**
Whether the source was right or current. An answer grounded in a superseded fee schedule scores perfectly while telling the customer the wrong fee. It's a hallucination check, and correctness needs effective-date filtering plus independently labelled golden-set answers.

**Q: Where should the check run?**
In the request path, not only offline. Measuring groundedness without gating on it achieves nothing — the value is in withholding the answer or removing the claim when support is missing. Offline evaluation tells you the rate; the in-path check prevents the individual failure.

## 9. Common Mistakes

- Scoring groundedness in aggregate rather than per claim.
- Flagging correct derived conclusions as unsupported.
- Applying the same tolerance to numbers and to prose.
- Treating a high groundedness score as correctness.
- Measuring it offline without gating answers on it.

## 10. What to Remember

- **Per-claim, not aggregate** — the one unsupported claim is usually the figure.
- **Verify premises for derived conclusions**, not verbatim text.
- **Zero tolerance on numbers; latitude on prose.**
- **It's a hallucination check, not correctness** — superseded sources pass.
- **Gate on it in the request path**, not just measure it offline.
