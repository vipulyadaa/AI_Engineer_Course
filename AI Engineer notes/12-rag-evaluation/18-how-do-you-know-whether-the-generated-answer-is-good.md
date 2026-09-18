# How Do You Know Whether the Generated Answer Is Good?

> **Phase 12 · RAG EVALUATION · Topic 18**

## 1. Definition

A good RAG answer satisfies four separate properties: it's **grounded** in the retrieved context, **relevant** to the question, **complete**, and **correctly abstains** when the context doesn't support an answer. Each is measured differently.

## 2. Simple Explanation

"Is the answer good" decomposes into four questions that come apart:

- Did it stay within the evidence? (**groundedness**)
- Did it answer what was asked? (**answer relevance**)
- Did it answer *all* of what was asked? (**completeness**)
- Did it say "I don't know" when it should have? (**abstention**)

An answer can pass three and fail one, and each failure needs a different fix.

## 3. How It Works

| Property | Measured by | Catches |
|---|---|---|
| **Groundedness** | Claim-level entailment vs. context | Hallucination, overstatement, parametric leakage |
| **Answer relevance** | Reverse-question generation, or a judge | Off-target answers |
| **Completeness** | Judge against the expected answer | Partial answers to multi-part questions |
| **Abstention correctness** | Rate on known out-of-scope questions | Over-answering and over-abstention |
| **Citation validity** | Does the cited chunk support the claim? | Authoritative-looking wrong citations |

**The two-tier measurement stack:**

```
INLINE (every request, free, deterministic)
  · every monetary figure in the answer appears in a cited chunk
  · every citation number resolves to a retrieved chunk
  · answer isn't empty and isn't over the length limit

ASYNC (sampled ~5%, LLM judge)
  · claim-level groundedness with evidence quotes
  · answer relevance
  · completeness vs. expected answer
```

## 4. Practical Example

**The four failures, on the same context:**

```
Context: "Premier customers receive fee waivers on the first two
          international transfers per calendar month. Additional
          transfers are charged at the standard $25 Premier rate."

Q: "What do international transfers cost for Premier, and how long
    do they take?"

❌ Ungrounded:   "Premier gets unlimited free international transfers."
                 └─ dropped "first two per month"

❌ Irrelevant:   "Premier accounts offer priority customer service."
                 └─ didn't address the question

❌ Incomplete:   "$25 after the first two free each month."
                 └─ correct on cost, silent on timing — and the
                    context didn't cover timing, so it should have
                    SAID so rather than omitting it

❌ Should have abstained (partially):
                 "...and transfers typically settle in 3-5 days."
                 └─ timing came from training data, not the context

✅ Good:         "$25 per transfer, with the first two each calendar
                  month waived [1]. I don't have information about
                  processing times in our documentation."
```

**That last one is the target behavior** — answer what the context supports, explicitly flag what it doesn't.

## 5. Why It Matters

- **The four properties come apart**, so a single "quality" score hides which one failed.
- **Partial abstention is the underrated behavior** — answering the part you can and flagging the part you can't.
- **Citation validity is the check most systems skip**, and a wrong citation is worse than none.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Measuring one property only** | Groundedness alone misses faithful-but-useless answers |
| **Scoring correct abstentions as failures** | Penalizes the behavior you want |
| **Trusting citations without validating** | A wrong citation manufactures false confidence |
| **Uncalibrated judge** | You don't know the error on your quality number |
| **Not checking completeness on multi-part questions** | Half-answers pass groundedness and relevance |
| **No inline figure check** | The highest-risk errors in banking go undetected |

**On partial answers:** a multi-part question answered half-way passes both groundedness and answer relevance — every claim is supported and the answer is on topic. Only a completeness check against the expected answer catches it, which is why the golden dataset needs expected answers, not just correct chunk IDs.

**On citations:** validating that a cited chunk actually supports its claim is the step most systems omit. An answer saying "unlimited free transfers [2]" where chunk 2 says "first two per month" is worse than an uncited wrong answer, because the citation signals a verification that didn't happen.

## 7. Interview Answer

> "I'd decompose it into four properties, because they come apart and each needs a different fix.
>
> Groundedness — is every claim supported by the retrieved context. That catches hallucination, and specifically overstatement, which is the most common failure: 'fee waivers on the first two transfers per month' becoming 'unlimited free transfers.'
>
> Answer relevance — does the response address the question. An answer can be perfectly grounded and useless if retrieval brought the wrong context and the model faithfully summarized it.
>
> Completeness — did it answer *all* of what was asked. A multi-part question answered halfway passes both groundedness and relevance, because every claim is supported and the answer is on topic. Only a completeness check against an expected answer catches it.
>
> And abstention correctness — did it say 'I don't know' when it should have, and not when it shouldn't. Correct abstentions have to be evaluated separately, or you penalize exactly the behavior you want.
>
> The target behavior I'd aim for is partial abstention: answer the part the context supports and explicitly flag the part it doesn't. 'Twenty-five dollars, first two waived each month — I don't have information about processing times.' That's better than either silently omitting timing or filling it in from training data.
>
> On measurement, two tiers. Inline on every request, deterministic checks — every monetary figure in the answer must appear in a cited chunk, every citation number must resolve. Free, and in banking it catches the errors that matter most. Then a sampled LLM judge asynchronously for claim-level groundedness, relevance, and completeness.
>
> The step most systems skip is validating that a cited chunk actually supports its claim. A wrong citation is worse than none, because it signals a verification that didn't happen."

## 8. Likely Follow-ups

**Q: What's the most important property?**
Groundedness, because it's what distinguishes RAG working from the model producing plausible text next to some documents. But it's insufficient alone — a grounded answer to the wrong question is still a failure, which is why answer relevance is measured alongside it.

**Q: How do you check completeness?**
Against an expected answer in the golden dataset, judged by an LLM or a human. This is why the golden dataset needs expected answers, not just correct chunk IDs — completeness can't be measured without knowing what a complete answer contains. It's the property most often omitted from evaluation.

**Q: How do you evaluate abstentions?**
Separately, and in both directions. Measure the abstention rate on known out-of-scope questions — that should be high — and on answerable questions, where it should be near zero. A single aggregate quality score treats a correct abstention as a failure, which pushes you toward a system that never abstains.

**Q: How do you validate citations?**
Map each citation number back to its chunk and check whether the claim is supported by that text. Exact matching for quoted figures is free and catches the high-risk cases. Semantic checking for subtler support needs an NLI model or a judge. Citations that don't check out should be logged and alerted on, because they're the most dangerous failure mode.

**Q: What does a good answer look like when the context is partial?**
It answers what the context supports and explicitly says what it doesn't cover — rather than silently omitting the unanswered part or filling it in from parametric knowledge. That partial-abstention behavior is worth prompting for explicitly, and worth measuring, because both alternatives are failures that look like successes on most metrics.

## 9. Common Mistakes

- Measuring groundedness alone and missing faithful-but-useless answers.
- Scoring correct abstentions as quality failures.
- Not checking completeness, so half-answers pass.
- Trusting citations without validating they support their claims.
- No inline figure check, so unsupported monetary amounts reach users.

## 10. What to Remember

- **Four properties:** groundedness, answer relevance, completeness, abstention correctness.
- **They come apart** — an answer can pass three and fail one.
- **Partial abstention is the target** — answer what's supported, flag what isn't.
- **Validate citations** — a wrong citation is worse than none.
- **Inline figure checks are free** and catch the highest-risk banking errors.
