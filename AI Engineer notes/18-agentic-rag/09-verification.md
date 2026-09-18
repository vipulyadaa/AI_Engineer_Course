# Verification

> **Phase 18 · AGENTIC RAG · Topic 09**

## 1. Definition

Checking that an answer is supported by the retrieved context before returning it. In a grounded system it's the last control preventing unsupported claims reaching the user.

## 2. Simple Explanation

The agent has an answer. Before sending it, something checks that every factual claim in it traces back to a retrieved document.

Claims that can't be traced are either removed, or the whole answer is withheld — depending on how much the accuracy matters.

## 3. How It Works

```
1. EXTRACT claims from the draft answer
2. For each claim, find the supporting passage in context
3. CLASSIFY: supported / partially supported / unsupported
4. ACT: remove, revise, or abstain
```

**Three implementations, with different costs:**

| Method | Cost | Reliability |
|---|---|---|
| **LLM-as-judge with the context** | 1 extra call | Good, needs calibration |
| **NLI entailment model** | Cheap, fast | Good for direct claims |
| **Citation requirement at generation** | Free | Weakest but always on |

**Citation-at-generation is the one to have first:** requiring every claim to carry a chunk reference at generation time, then validating in code that the referenced chunk exists and contains relevant text, costs nothing per request and catches the obvious cases.

## 4. Practical Example

**A verification prompt that works:**

```
"Below is a draft answer and the source passages it should
 be based on.

 For EACH factual claim in the answer:
   - quote the exact passage that supports it, or
   - mark it UNSUPPORTED

 Numbers, dates, conditions, and eligibility rules must be
 supported exactly, not approximately."

Requiring a QUOTE rather than a yes/no is what makes this
work. A judge asked "is this supported?" says yes far too
often; a judge required to produce the supporting text
either finds it or can't.
```

**What to do with the result:**

```
ALL SUPPORTED        return the answer
SOME UNSUPPORTED     remove those claims and return the rest,
                     noting what couldn't be confirmed
KEY CLAIM UNSUPPORTED   abstain — the answer's substance
                     isn't grounded
NUMBERS UNSUPPORTED  abstain. A wrong fee figure is worse
                     than no answer.
```

**The banking-specific rule** is that last one: numbers, dates, and eligibility conditions get zero tolerance, while a general explanatory sentence that isn't directly quotable can be softened rather than removed.

**Cost:** verification roughly doubles the per-answer LLM cost. Applied to every answer that's expensive; applied to answers containing numbers or eligibility determinations, it's affordable and covers the cases that matter.

## 5. Why It Matters

- **It's the last control** before an unsupported claim reaches a customer.
- **Requiring a quote, not a verdict**, is what makes LLM verification reliable.
- **Zero tolerance on numbers** is the rule that matters in banking.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Doubles cost and latency** | An extra call per verified answer |
| **Judge says "supported" too readily** | Fixed by requiring quotes |
| **Verifies against context, not truth** | Retrieved-but-wrong passes |
| **Derived claims flagged wrongly** | Conclusions aren't quoted verbatim |
| **Uncalibrated judge** | Confident numbers that don't track quality |

**On the boundary of what verification can do:** it checks the answer against the retrieved context. If the context itself is wrong — a superseded policy version, a stale rate — verification passes it happily. So it's a defence against hallucination, not against bad source data. Corpus freshness and effective-date filtering are separate controls and neither substitutes for the other.

**On derived claims:** a conclusion like "you were overcharged $20" isn't quotable from any passage. The verification prompt has to handle derivations — checking that each premise is supported and the derivation is valid — or it will flag correct reasoning as unsupported and the system will abstain on its best answers.

## 7. Interview Answer

> "Verification checks that every factual claim in the answer is supported by the retrieved context before it's returned. It's the last control before an unsupported claim reaches a customer.
>
> The implementation detail that makes it work is requiring a quote rather than a verdict. A judge asked 'is this supported?' says yes far too often. A judge required to produce the exact supporting passage either finds it or can't — that constraint is what turns a soft check into a real one.
>
> On what to do with the result, I'd grade by claim type. Everything supported, return it. Some peripheral claims unsupported, remove them and return the rest noting what couldn't be confirmed. But numbers, dates, and eligibility conditions get zero tolerance — if a fee figure isn't exactly supported, abstain, because a wrong fee figure is worse than no answer.
>
> Before any of that I'd have citation-at-generation: require every claim to carry a chunk reference, then validate in code that the chunk exists and contains relevant text. It's free per request and catches the obvious cases, so it should be the baseline with LLM verification layered on for answers that warrant it.
>
> On cost, verification roughly doubles per-answer LLM cost. Applied to everything that's expensive; applied to answers containing numbers or eligibility determinations, it's affordable and covers exactly the cases where being wrong matters.
>
> Two limits I'd state honestly. Verification checks against the retrieved context, not against truth — if the context is a superseded policy version, verification passes it happily. So it defends against hallucination, not against bad source data, and corpus freshness with effective-date filtering is a separate control that it doesn't replace.
>
> And derived claims need handling. 'You were overcharged twenty dollars' isn't quotable from any passage, so a naive verifier flags correct reasoning as unsupported and the system abstains on its best answers. The prompt has to check that each premise is supported and the derivation is valid, rather than looking for the conclusion verbatim."

## 8. Likely Follow-ups

**Q: How do you verify an answer?**
Extract each factual claim, require the verifier to quote the exact supporting passage from the retrieved context, and classify each claim as supported or not. Requiring a quote rather than a yes-or-no judgment is what makes the check reliable.

**Q: What do you do with unsupported claims?**
It depends on the claim. Peripheral explanatory claims can be removed with a note. Numbers, dates, and eligibility conditions get zero tolerance — if those aren't exactly supported, abstain, because a wrong fee figure is worse for a customer than no answer at all.

**Q: What can't verification catch?**
Bad source data. It checks the answer against retrieved context, so if the context is a superseded policy version or a stale rate, verification passes it. It defends against hallucination, not against the corpus being wrong — freshness and effective-date filtering are separate controls.

**Q: How do you verify derived conclusions?**
By checking that each premise is supported and the derivation is valid, rather than looking for the conclusion in the text. A conclusion like "you were overcharged twenty dollars" isn't quotable anywhere, so a naive verifier would flag correct reasoning and cause abstention on the best answers.

**Q: Is it worth the cost?**
Selectively. It roughly doubles per-answer cost, which is a lot for every answer but reasonable for those containing numbers or eligibility determinations. I'd also run citation-at-generation on everything, since validating chunk references in code is free and catches the obvious failures.

## 9. Common Mistakes

- Asking the verifier for a verdict rather than a supporting quote.
- Applying the same tolerance to numbers as to explanatory prose.
- Treating verification as protection against wrong source documents.
- Flagging correct derived conclusions as unsupported.
- Running expensive verification on every answer regardless of stakes.

## 10. What to Remember

- **Require a quote, not a verdict** — that's what makes it reliable.
- **Zero tolerance on numbers, dates, and eligibility conditions.**
- **Citation-at-generation is the free baseline**; LLM verification layers on.
- **It checks against context, not truth** — freshness is a separate control.
- **Handle derived claims** by verifying premises, not the conclusion text.
