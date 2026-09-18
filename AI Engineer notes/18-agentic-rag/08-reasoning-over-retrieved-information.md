# Reasoning Over Retrieved Information

> **Phase 18 · AGENTIC RAG · Topic 08**

## 1. Definition

Deriving an answer that isn't stated directly in any retrieved chunk — combining facts, applying a rule to a specific case, or reconciling sources. It's where agentic RAG produces value beyond extraction.

## 2. Simple Explanation

Standard RAG mostly extracts: the answer is in a chunk, and the model restates it with a citation.

Reasoning is when the answer isn't in any chunk. The policy says Premier customers pay $25. The transaction says $45 was charged. Neither chunk says "you were overcharged" — that conclusion comes from combining them.

## 3. How It Works

**Three kinds, in increasing risk:**

```
1. COMBINATION      facts from separate sources joined
                    "$45 charged, policy says $25" → discrepancy

2. RULE APPLICATION a general rule applied to specifics
                    "waivers: 2/month" + "you've used 2"
                    → no waiver available

3. INFERENCE        a conclusion not entailed by the sources
                    "the policy doesn't mention X, so X
                     probably isn't covered"    ← DANGEROUS
```

**Kinds 1 and 2 are grounded** — every input is cited and the derivation is checkable. **Kind 3 is not**, and in banking it should be blocked explicitly.

## 4. Practical Example

**Grounding a derived conclusion:**

```
The answer "you were overcharged $20" appears in no document.
It's still fully grounded IF the derivation is shown:

  "The fee charged on TXN-88213 was $45.00 [transaction record].
   The fee schedule (v4.2 §3.1) states Premier customers pay
   $25.00 for international wire transfers [policy document].
   Your account tier is Premier [account record].
   The difference is $20.00."

Every INPUT is cited. The arithmetic is explicit and
checkable. That's what grounding means for a derived answer
— not that the conclusion appears verbatim somewhere.
```

**This distinction matters for evaluation:** a naive groundedness check that looks for the answer text in the retrieved context will mark correct derived answers as hallucinations. The check has to verify that each *premise* is supported and the derivation is valid, not that the conclusion is quoted.

**The failure to prevent — absence reasoning:**

```
"The policy doesn't mention cryptocurrency transfers,
 so they're probably not permitted."

WRONG, twice over:
  · the policy might cover it in a section not retrieved
  · not being mentioned isn't the same as not permitted

Retrieval returning nothing is evidence about RETRIEVAL,
not about the world.

Instruction: "If the retrieved context does not address the
question, say so. Do not infer from absence."
```

**That's a specific, high-value instruction** because absence reasoning produces confident wrong answers that look well-reasoned.

## 5. Why It Matters

- **Derived answers are where agentic RAG adds value** over extraction.
- **Grounding means cited premises and a shown derivation**, not a quoted conclusion.
- **Absence reasoning** is a distinct failure that needs an explicit instruction.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Absence reasoning** | Treating retrieval gaps as facts about the world |
| **Arithmetic errors** | Models miscalculate; verify in code where possible |
| **Silent conflict resolution** | Picking a source without surfacing the conflict |
| **Unstated intermediate steps** | Unverifiable conclusion |
| **Applying stale rules** | Correct reasoning over a superseded policy |
| **Over-generalizing a rule** | Applying a Premier rule to all customers |

**On arithmetic:** if a fee difference or a total matters, compute it in code rather than trusting the model. It's a small change and it removes a real error source — a derivation with correct premises and wrong arithmetic is especially dangerous because everything around it looks right.

**On stale rules:** reasoning is only as good as the retrieved policy version. An effective-date filter at retrieval is what stops a correct derivation being performed over a superseded rule — the reasoning step can't detect that.

## 7. Interview Answer

> "Reasoning over retrieved information is deriving an answer that isn't stated in any chunk. Standard RAG mostly extracts — the answer is there and the model restates it with a citation. Reasoning is when the conclusion comes from combining things: the policy says Premier pays twenty-five, the transaction says forty-five was charged, and neither chunk says 'you were overcharged'.
>
> I'd separate three kinds by risk. Combination, joining facts from separate sources. Rule application, applying a general rule to a specific case. And inference — concluding something not entailed by the sources. The first two are grounded and checkable; the third isn't, and in banking it should be blocked explicitly.
>
> The important point is what grounding means for a derived answer. 'You were overcharged twenty dollars' appears in no document, but it's fully grounded if the derivation is shown: the fee charged was forty-five per the transaction record, the schedule says Premier pays twenty-five per policy version 4.2 section 3.1, your tier is Premier per the account record, so the difference is twenty. Every input is cited and the arithmetic is explicit. Grounding means cited premises and a shown derivation, not a conclusion quoted verbatim.
>
> That has an evaluation consequence people miss: a naive groundedness check looking for the answer text in the retrieved context will mark correct derived answers as hallucinations. The check has to verify each premise is supported and the derivation is valid.
>
> The failure I'd specifically instruct against is absence reasoning — 'the policy doesn't mention cryptocurrency transfers, so they're probably not permitted'. That's wrong twice: the policy might cover it in a section that wasn't retrieved, and not being mentioned isn't the same as not permitted. Retrieval returning nothing is evidence about retrieval, not about the world. So: if the context doesn't address the question, say so; never infer from absence.
>
> Two smaller things. If a number matters, compute it in code rather than trusting the model — a derivation with correct premises and wrong arithmetic is especially dangerous because everything around it looks right. And reasoning is only as good as the policy version retrieved, so an effective-date filter at retrieval is what stops a correct derivation over a superseded rule. The reasoning step can't detect that itself."

## 8. Likely Follow-ups

**Q: How can a derived answer be grounded?**
By citing every premise and showing the derivation. "You were overcharged twenty dollars" isn't in any document, but if the charged amount, the policy rate, and the account tier are each cited and the arithmetic is explicit, the conclusion is fully supported and checkable.

**Q: What does that mean for groundedness evaluation?**
A naive check looking for the answer text in the retrieved context will flag correct derived answers as hallucinations. The evaluation has to verify that each premise is supported by a retrieved chunk and that the derivation from those premises is valid.

**Q: What's absence reasoning?**
Concluding something from what wasn't retrieved — "the policy doesn't mention it, so it isn't permitted." It's wrong because retrieval gaps are evidence about retrieval, not about the world, and because absence of mention isn't prohibition. It needs an explicit instruction to prevent.

**Q: How do you handle arithmetic in derivations?**
Compute it in code where the number matters. Models make arithmetic errors, and a derivation with correct cited premises and wrong arithmetic is especially dangerous — everything around the number looks rigorous, so the error is unlikely to be questioned.

**Q: What if the retrieved policy is outdated?**
The reasoning step can't detect that, so it has to be prevented at retrieval with an effective-date filter. Otherwise you get a perfectly valid derivation performed over a superseded rule, which produces a confident, well-cited, wrong answer.

## 9. Common Mistakes

- Treating derived answers as ungrounded because they aren't quoted.
- Allowing inference from what wasn't retrieved.
- Trusting the model's arithmetic on figures that matter.
- Resolving source conflicts silently instead of surfacing them.
- Reasoning over policy without an effective-date filter at retrieval.

## 10. What to Remember

- **Combination and rule application are grounded; inference isn't.**
- **Grounding = cited premises + shown derivation**, not a quoted conclusion.
- **Naive groundedness checks flag correct derivations** — evaluate premises.
- **Never infer from absence** — retrieval gaps aren't facts about the world.
- **Compute numbers in code**; filter by effective date at retrieval.
