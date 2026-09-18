# Guardrails

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 19**

## 1. Definition

Checks applied to inputs, retrieved context, or outputs that block or modify behaviour independently of the model. Their defining property is that they're code, not instructions — which is what makes them a control rather than a request.

## 2. Simple Explanation

A prompt saying "never give financial advice" is a request the model can be argued out of. A classifier on the output that blocks advice-like language is a check it can't.

That distinction — request versus check — is what separates a guardrail from a prompt.

## 3. How It Works

```
INPUT GUARDRAILS
  scope classification      is this in-scope at all?
  rate and budget limits    per user, per session

CONTEXT GUARDRAILS
  permission filter         enforced in the retrieval engine
  effective-date filter     no superseded sources
  relevance threshold       enables abstention

OUTPUT GUARDRAILS
  grounding verification    claims supported by context
  advice / guarantee check  prohibited language
  PII provenance check      no identifiers without a source
  citation validation       cited chunks exist and are relevant
```

**Output guardrails matter most** because they check what was actually produced, which makes them indifferent to how the model was persuaded.

## 4. Practical Example

**The four output checks worth building, in order:**

```
1. GROUNDING
   Every factual claim supported by retrieved context, with
   zero tolerance on numbers and dates.
   → abstain if a material claim is unsupported

2. PII PROVENANCE
   Every identifier in the answer came from the session or
   a permitted tool result.
   → fail and alert if not, because that indicates a
     retrieval filter failure upstream

3. PROHIBITED LANGUAGE
   Advice ("you should"), guarantees ("you'll definitely"),
   commitments the bank hasn't made.
   → rewrite or abstain

4. CITATION VALIDITY
   Cited chunk IDs exist in the retrieved set and contain
   relevant text.
   → cheap, deterministic, catches fabricated citations
```

**Check 4 is free and often missing:** validating that a cited chunk ID actually exists is a dictionary lookup, and it catches the model inventing a citation — which otherwise looks exactly like a good answer.

**Guardrails have to fail in the right direction:**

```
GROUNDING FAILURE      → abstain (safe)
PII PROVENANCE FAILURE → fail the request AND alert
                         (it's an upstream control failure,
                         not a generation problem)
ADVICE DETECTED        → rewrite or abstain
CITATION INVALID       → abstain

Treating a PII provenance failure as something to suppress
at the output would hide a breach rather than prevent one.
That differentiation matters.
```

**The cost and false-positive trade:**

```
Every guardrail adds latency and can block legitimate
output. An over-tuned advice classifier blocks a legitimate
explanation of options.

So: measure the false positive rate on the golden set, and
tune with the consequence in mind. Zero tolerance on
numbers is correct because a wrong figure is unrecoverable.
Aggressive blocking of explanatory prose is not, because
the cost of a false positive there is a worse customer
experience for no safety gain.
```

## 5. Why It Matters

- **Guardrails are code, not instructions** — that's what makes them controls.
- **Output checks are indifferent to technique** — they check what was produced.
- **Failing in the right direction** distinguishes a suppressed symptom from a prevented harm.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Prompt instructions called guardrails** | Requests, not controls |
| **Input filtering only** | Endless bypass variations |
| **Over-tuned classifiers** | Legitimate answers blocked |
| **All failures handled identically** | A breach suppressed like a style issue |
| **Latency accumulation** | Several checks per request |
| **No false-positive measurement** | Tuning by intuition |

**On latency:** four output guardrails run sequentially add up. The deterministic ones — citation validity, PII provenance — are microseconds and should always run. The model-based ones — grounding verification, advice classification — are the expensive ones, and applying those selectively by stakes rather than universally keeps the cost proportionate.

**On what guardrails can't do:** they check the output against available context and rules. They can't tell you the retrieved document was superseded, or that the corpus is missing information. Guardrails bound generation failures; they don't fix retrieval or content problems, and expecting them to is how a system accumulates checks that never fire while the real failure continues.

## 7. Interview Answer

> "The defining property of a guardrail is that it's code rather than an instruction. A prompt saying 'never give financial advice' is a request the model can be argued out of; a classifier on the output that blocks advice-like language is a check it can't. That's what separates a guardrail from a prompt.
>
> They apply at three points. Input — scope classification and rate limits. Context — permission filters enforced in the retrieval engine, effective-date filters, and a relevance threshold that enables abstention. And output, which matters most because it checks what was actually produced, making it indifferent to how the model was persuaded.
>
> The four output checks I'd build, in order. Grounding, with zero tolerance on numbers and dates — abstain if a material claim is unsupported. PII provenance — every identifier in the answer came from the session or a permitted tool result. Prohibited language — advice, guarantees, commitments the bank hasn't made. And citation validity.
>
> That last one is free and often missing. Validating that a cited chunk ID actually exists in the retrieved set is a dictionary lookup, and it catches the model inventing a citation — which otherwise looks exactly like a good answer, because a fabricated citation is indistinguishable from a real one unless you check.
>
> The design point I'd emphasize is that guardrails must fail in the right direction. A grounding failure means abstain — that's safe. But a PII provenance failure should fail the request and alert, because it indicates a retrieval filter failure upstream rather than a generation problem. Treating it as something to suppress at the output would hide a breach rather than prevent one. Handling all failures identically is how a control that should have escalated quietly becomes a filter.
>
> On cost and false positives: every guardrail adds latency and can block legitimate output. An over-tuned advice classifier blocks a legitimate explanation of options. So I'd measure the false positive rate on the golden set and tune with the consequence in mind — zero tolerance on numbers is correct because a wrong figure is unrecoverable, but aggressive blocking of explanatory prose isn't, because a false positive there is a worse customer experience for no safety gain.
>
> For latency, the deterministic checks — citation validity, PII provenance — are microseconds and should always run. The model-based ones are expensive, so I'd apply those selectively by stakes rather than universally.
>
> And the limit: guardrails bound generation failures. They can't tell you the retrieved document was superseded or that the corpus is missing information. Expecting them to fix retrieval or content problems is how a system accumulates checks that never fire while the real failure continues."

## 8. Likely Follow-ups

**Q: What makes something a guardrail rather than a prompt?**
That it's code. A prompt instruction is a request the model can be argued out of or overridden by an injection; a check on the output runs regardless of what the model was persuaded to do. Request versus check is the whole distinction.

**Q: Which output checks matter most?**
Grounding with zero tolerance on numbers, PII provenance, prohibited advice and guarantee language, and citation validity. The last is free — verifying a cited chunk ID exists is a dictionary lookup — and it catches fabricated citations that otherwise look like good answers.

**Q: Should all guardrail failures be handled the same?**
No. A grounding failure means abstain. A PII provenance failure should fail the request and alert, because it signals an upstream retrieval filter failure rather than a generation problem — suppressing it at the output would hide a breach instead of preventing one.

**Q: What's the cost consideration?**
Latency and false positives. Deterministic checks like citation validity are microseconds and should always run; model-based checks like grounding verification are expensive and worth applying selectively by stakes. And an over-tuned classifier blocks legitimate answers for no safety gain.

**Q: What can't guardrails do?**
Fix retrieval or content problems. They check output against available context and rules, so they can't tell you the retrieved document was superseded or the corpus is incomplete. Expecting them to is how you accumulate checks that never fire while the real failure continues.

## 9. Common Mistakes

- Calling prompt instructions guardrails.
- Relying on input filtering, which has endless bypass variations.
- Handling every guardrail failure with the same response.
- Not validating that cited chunk IDs exist.
- Tuning classifiers without measuring the false positive rate.

## 10. What to Remember

- **Code, not instructions** — that's what makes it a control.
- **Output checks are indifferent to technique.**
- **Four checks:** grounding, PII provenance, prohibited language, citation validity.
- **Fail in the right direction** — a provenance failure escalates, it doesn't suppress.
- **They bound generation failures**, not retrieval or content problems.
