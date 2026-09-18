# Hallucination

> **Phase 22 · AI EVALUATION · Topic 11**

## 1. Definition

The model generating content not supported by its sources — an invented figure, a fabricated citation, a condition that doesn't exist. In RAG it's measured as ungroundedness, and the dangerous variants are the small ones.

## 2. Simple Explanation

The dramatic hallucination — an entirely invented policy — is rare in a grounded system and easy to catch.

The dangerous one is a mostly-correct answer where one number is wrong, or a real condition has been slightly altered. It looks right, it's cited, and it's what the customer acts on.

## 3. How It Works

```
TYPES, by detectability

FABRICATION       content with no source at all
                  → easiest to catch; grounding check finds it

ALTERATION        a real fact with a changed detail
                  "$25" → "$35", "two per month" → "two per year"
                  → hardest; superficially supported

OMISSION          a condition dropped, changing the meaning
                  "waived for Premier" → "waived"
                  → subtle and consequential

OVERGENERALIZATION a specific rule stated as universal
                  → common, and reads as a confident answer

FABRICATED CITATION a real-looking reference to nothing
                  → trivially catchable and often unchecked
```

**Omission is the one most likely to cause harm** in banking, because dropping a qualifying condition turns a conditional rule into an unconditional promise.

## 4. Practical Example

**The omission failure, concretely:**

```
SOURCE   "International transfer fees are waived for the
          first two transactions per calendar month for
          Premier and Private tier customers."

ANSWER   "The first two international transfers each month
          are free."

Every word is derived from the source. The tier condition
is gone.

A Standard-tier customer reads that and expects a free
transfer. The answer passes a naive groundedness check
because every phrase traces back to the passage.

Catching it requires checking that CONDITIONS were
preserved, not just that claims were supported — which is
a different question and needs asking explicitly in the
verification prompt.
```

**That distinction — supported versus complete — is the substantive point.**

**Measuring, by type:**

```
FABRICATION        grounding check per claim
ALTERATION         numeric and date comparison against source
OMISSION           condition preservation check
CITATION           chunk ID exists and contains relevant text
                   → deterministic, free, often missing

The citation check is a dictionary lookup. It catches a
whole hallucination class for no cost, and most systems
don't do it.
```

**Reducing it, in order of effectiveness:**

```
1. BETTER RETRIEVAL — most hallucination follows from the
   answer not being in the context. The model fills a gap.
2. ABSTENTION — a relevance threshold so weak context
   produces no answer rather than an invented one
3. LOW TEMPERATURE — 0 to 0.2 for grounded answering
4. EXPLICIT INSTRUCTION — use only the context, say so if
   it doesn't contain the answer
5. VERIFICATION — catch what the above missed

Point 1 matters most and is the least discussed.
Hallucination is usually a retrieval symptom.
```

## 5. Why It Matters

- **The small hallucinations are the dangerous ones** — altered figures and dropped conditions.
- **Omission passes naive groundedness checks** — every phrase traces back.
- **Hallucination is usually a retrieval symptom**, not a generation problem.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Checking support but not completeness** | Omitted conditions pass |
| **No citation validity check** | Fabricated citations look real |
| **Treating it as a generation problem** | The fix is usually retrieval |
| **No abstention path** | The model fills gaps by design |
| **High temperature** | Unnecessary variation in grounded answering |
| **Aggregate groundedness score** | The one bad claim is averaged away |

**On why retrieval is the root cause:** if the answer isn't in the retrieved context, the model has two options — abstain or generate something plausible. Without an abstention path it will generate. So a system with a hallucination problem usually has a retrieval problem plus a missing abstention path, and tuning the prompt addresses neither.

**On verification cost:** checking every answer roughly doubles per-answer LLM cost. Applying it to answers containing numbers, dates, or eligibility conditions — the claim types where an alteration or omission actually harms — covers the consequential cases at a fraction of the cost.

## 7. Interview Answer

> "The dramatic hallucination — an entirely invented policy — is rare in a grounded system and easy to catch. The dangerous one is a mostly-correct answer where one number is wrong or a condition has been dropped. It looks right, it's cited, and it's what the customer acts on.
>
> I'd separate the types by detectability. Fabrication, with no source at all, is easiest — a grounding check finds it. Alteration, where a real fact has a changed detail, is harder because it's superficially supported. Omission, where a condition is dropped, is the most consequential in banking. And fabricated citations are trivially catchable and usually unchecked.
>
> Omission is worth an example. The source says international transfer fees are waived for the first two transactions per calendar month for Premier and Private tier customers. The answer says the first two international transfers each month are free. Every word derives from the source — and the tier condition is gone. A Standard-tier customer reads that and expects a free transfer.
>
> That answer passes a naive groundedness check, because every phrase traces back to the passage. Catching it requires checking that conditions were preserved, not just that claims were supported. Supported versus complete is a different question and it has to be asked explicitly in the verification prompt.
>
> On the citation check — validating that a cited chunk ID exists and contains relevant text is a dictionary lookup. It's free, deterministic, catches a whole hallucination class, and most systems don't do it.
>
> But the point I'd emphasize most is that hallucination is usually a retrieval symptom rather than a generation problem. If the answer isn't in the retrieved context, the model has two options: abstain or generate something plausible. Without an abstention path it generates. So a system with a hallucination problem usually has a retrieval problem plus a missing abstention path — and tuning the prompt addresses neither.
>
> So the order of effectiveness is: better retrieval first, then a relevance threshold enabling abstention, then low temperature, then explicit instruction, then verification to catch what got through. Teams usually start at the fourth item, which is why hallucination work often doesn't converge.
>
> On cost, verification roughly doubles per-answer spend, so I'd apply it to answers containing numbers, dates, or eligibility conditions — the claim types where an alteration or omission actually causes harm."

## 8. Likely Follow-ups

**Q: What's the most dangerous type?**
Omission — a real rule with a qualifying condition dropped, turning a conditional into an unconditional promise. It's the most consequential in banking and it passes naive groundedness checks because every phrase traces back to the source.

**Q: How do you catch omission?**
By checking that conditions were preserved, not just that claims were supported. Those are different questions, and the verification prompt has to ask the second one explicitly — "were any qualifying conditions in the source dropped in the answer?"

**Q: What's the cheapest useful check?**
Citation validity — verifying a cited chunk ID exists in the retrieved set and contains relevant text. It's a dictionary lookup, it's deterministic and free, it catches fabricated citations entirely, and most systems don't do it.

**Q: What's the root cause of hallucination?**
Usually retrieval. If the answer isn't in the context, the model either abstains or generates something plausible — and without an abstention path it generates. So a hallucination problem is typically a retrieval problem plus a missing threshold, and prompt tuning addresses neither.

**Q: What order would you fix things in?**
Retrieval quality first, then a relevance threshold enabling abstention, then low temperature, then explicit instruction, then verification. Teams usually start at explicit instruction, which is why hallucination work often fails to converge — they're tuning the last lever first.

## 9. Common Mistakes

- Checking claim support without checking condition preservation.
- Not validating that cited chunk IDs exist.
- Treating hallucination as a prompt problem.
- No abstention path, so the model fills gaps by design.
- Reporting groundedness in aggregate, averaging away the one bad claim.

## 10. What to Remember

- **The small ones are dangerous** — altered figures, dropped conditions.
- **Omission passes naive grounding checks** — check completeness separately.
- **Citation validity is free** and catches a whole class.
- **Hallucination is usually a retrieval symptom.**
- **Fix order:** retrieval → abstention → temperature → instruction → verification.
