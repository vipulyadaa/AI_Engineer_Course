# How Do You Measure Hallucination?

> **Phase 12 · RAG EVALUATION · Topic 19**

## 1. Definition

In RAG, hallucination is measured as the inverse of groundedness: the fraction of claims in an answer that the retrieved context does **not** support. Crucially, a claim that is true but unsupported still counts.

## 2. Simple Explanation

You can't measure "is this false" without knowing the truth about everything. You *can* measure "is this supported by the documents we gave it," which is a closed, checkable question.

That reframing is what makes hallucination measurable in RAG at all. The definition becomes: **did the model say anything the context didn't?**

## 3. How It Works

```
hallucination_rate = unsupported claims / total claims
                   = 1 − groundedness
```

1. **Decompose the answer into atomic claims.**
2. **Check entailment** of each against the retrieved context.
3. **Classify** as supported / partially supported / not supported.
4. **Report the rate**, and log the unsupported claims for review.

**The detection ladder, cheapest first:**

| Method | Catches | Cost |
|---|---|---|
| Figure / date matching | A number in the answer not in the context | Free |
| Entity matching | Named entities not in the context | Free |
| N-gram overlap | Claims with no lexical support | Free |
| NLI entailment model | Semantic non-support | Cheap |
| LLM judge with evidence quotes | Overstatement, dropped qualifiers | Per-call |

**The practical stack:** figure and entity matching inline on every answer, sampled LLM judging asynchronously for the tracked metric.

## 4. Practical Example

**The four hallucination types, with the same context:**

```
Context: "Premier customers receive fee waivers on the first two
          international transfers per calendar month."

1. OVERSTATEMENT (most common)
   "Premier customers get unlimited free international transfers."
   └─ dropped the limit. Detectable by an LLM judge, not by
      figure matching.

2. PARAMETRIC LEAKAGE (most subtle)
   "...and transfers typically settle in 3-5 business days."
   └─ probably TRUE, from training data, not from the context.
      Still a hallucination by this definition.

3. FABRICATED SPECIFICS (highest risk in banking)
   "The waiver applies to transfers under $50,000."
   └─ a threshold that appears nowhere. Figure matching catches it.

4. UNSUPPORTED INFERENCE
   "So domestic transfers are presumably also free."
   └─ a reasonable-sounding leap the context doesn't license.
```

**Why figure matching is disproportionately valuable in banking:**

```python
def check_figures(answer, cited_chunks):
    figures = extract_currency_and_percentages(answer)
    context = " ".join(c.text for c in cited_chunks)
    return [f for f in figures if f not in context]

# Free, deterministic, runs on 100% of traffic, and catches
# type 3 — fabricated monetary specifics — which is the
# highest-consequence failure in a fee-answering assistant.
```

## 5. Why It Matters

- **It's the safety metric** for a RAG system, and the one a compliance reviewer asks about.
- **The "true but unsupported" definition** is what makes it measurable and what makes citation meaningful.
- **Reducing it is mostly a retrieval problem**, which is counterintuitive and worth stating.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Claim decomposition is ambiguous** | What counts as one atomic claim varies |
| **Judge self-preference** | The generating model over-approves its own output |
| **Over-strict judging** | Valid paraphrase marked unsupported |
| **Measuring only fabricated facts** | Misses overstatement, which is more common |
| **Full judging on every request** | Too expensive; sample instead |
| **Judge version drift** | A provider update shifts the metric with no system change |

**The counterintuitive point about reduction:** the largest lever on hallucination is retrieval quality, not prompting. When the context only partially answers the question, the model gap-fills — that's the mechanism behind most parametric leakage. So a rising hallucination rate should send you to check context relevance before rewriting the prompt.

**Reduction levers, in order of effect:**

```
1. Retrieval quality — complete context removes the gap to fill
2. Abstention instruction — explicit permission to say "I don't know"
3. Per-claim citation requirement — makes unsupported claims visible
4. Temperature 0
5. Post-hoc verification — block or flag failures
```

## 7. Interview Answer

> "In RAG, I'd measure hallucination as the inverse of groundedness — the fraction of claims the retrieved context doesn't support. The reframing matters: you can't measure 'is this false' without knowing the truth about everything, but you can measure 'is this supported by the documents we provided,' which is a closed checkable question.
>
> The definition includes true-but-unsupported claims. If the model adds 'transfers typically settle in three to five days' from training data, that may be correct — but the system had no evidence, can't cite it, and can't guarantee the next such claim. That still counts.
>
> There are four types worth distinguishing. Overstatement is the most common — dropping a qualifier so 'first two per month waived' becomes 'unlimited free transfers.' Parametric leakage is the most subtle. Fabricated specifics — an invented threshold or amount — are the highest risk in banking. And unsupported inference, a reasonable-sounding leap the context doesn't license.
>
> For measurement I'd run two tiers. Inline on every request, extract every monetary figure and date from the answer and verify it appears in a cited chunk. That's free, deterministic, and it catches fabricated specifics, which is the highest-consequence failure in a fee-answering assistant. Then a sampled LLM judge asynchronously with a requirement to quote evidence per claim, which catches overstatement that figure matching can't.
>
> The counterintuitive point I'd make is that the largest lever on hallucination is retrieval quality, not prompting. When the context only partially answers the question, the model gap-fills — that's the mechanism. So a rising hallucination rate should send me to check context relevance before I touch the prompt."

## 8. Likely Follow-ups

**Q: Why measure against the context rather than against truth?**
Because measuring against truth requires knowing the truth about every possible claim, which isn't tractable. Measuring against the provided context is closed and checkable. And it's the right standard anyway — a RAG system's contract is that answers trace to sources, so an unsupported claim is a failure regardless of whether it happens to be correct.

**Q: How do you detect it cheaply?**
Figure and date matching — extract every number from the answer and verify it appears in a cited chunk. Free, deterministic, runs on all traffic, and it catches fabricated specifics, which are the highest-consequence failure in a financial context. Entity matching adds a bit more coverage for the same cost.

**Q: What's the most common type?**
Overstatement — dropping a qualifier. "Fee waivers on the first two transfers per calendar month" becoming "unlimited free transfers." It's common because the claim looks supported, all the vocabulary is present, and only the limiting condition is gone. Figure matching won't catch it; a semantic judge will.

**Q: How do you reduce it?**
Retrieval quality first, because partial context is what invites gap-filling. Then an explicit abstention instruction. Then a per-claim citation requirement, which makes unsupported claims structurally visible. Then temperature zero. Then post-hoc verification that blocks or flags. Most hallucination problems trace to retrieval rather than to the prompt, which surprises people.

**Q: Can you get it to zero?**
Not reliably. You can get it very low with complete retrieval, strong grounding instructions, and verification that blocks failures — but a generative model can always produce an unsupported claim. The practical target is a low rate with the highest-consequence failures blocked deterministically, plus an abstention path so the system can decline rather than guess.

## 9. Common Mistakes

- Defining hallucination as "false" rather than "unsupported."
- Only checking for fabricated facts, missing overstatement.
- Using the generating model as its own judge.
- Rewriting the prompt when the cause is incomplete retrieval.
- Not running free inline figure checks on every request.

## 10. What to Remember

- **hallucination_rate = 1 − groundedness.** Measured against context, not against truth.
- **True-but-unsupported still counts** — that's what makes citation meaningful.
- **Four types:** overstatement (most common), parametric leakage, fabricated specifics, unsupported inference.
- **Inline figure matching is free** and catches the highest-consequence failures.
- **The biggest reduction lever is retrieval quality**, not prompting.
