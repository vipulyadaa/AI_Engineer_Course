# Citations

> **Phase 08 · RAG FUNDAMENTALS · Topic 19**

## 1. Definition

Attributing each claim in a generated answer to the specific source chunk that supports it. Citations make RAG answers verifiable, and in regulated domains they're usually a requirement rather than a feature.

## 2. Simple Explanation

An LLM answer without a citation is an assertion. With a citation, it's a claim someone can check.

That difference is what makes RAG deployable in banking, legal, and healthcare. A compliance reviewer doesn't need to trust the model — they need to be able to open the referenced policy section and confirm it says what the answer claims.

## 3. How It Works

1. **Label each chunk** in the context with a stable identifier — `[1]`, `[2]`.
2. **Instruct the model** to cite that identifier after every factual claim.
3. **Resolve identifiers to sources** after generation — map `[1]` back to a document URI, page, and section.
4. **Validate** that the cited chunk actually supports the claim.
5. **Render** as a link the user can open at the right location.

```
Context:
  [1] Retail Fees Schedule § 3.2 (effective 2026-01-01) → fees.pdf#page=14
  [2] Premier Benefits § 1.4 (effective 2025-11-15)     → premier.pdf#page=3

Answer:
  "International wires cost $45 for retail accounts [1]. Premier customers
   pay $25 and get two free transfers per month [1][2]."

Rendered:
  [1] Retail Fees Schedule § 3.2 ↗
  [2] Premier Account Benefits § 1.4 ↗
```

**The metadata that makes this possible** — `source_uri` with a page or section anchor — has to be captured at ingestion. It can't be reconstructed later.

## 4. Practical Example

**Citation validation is the step most systems skip**, and it's where the real risk sits:

```
Answer:  "International wires cost $45 [1]."
Chunk [1]: "Domestic wire transfers: $25. International: $45 retail."
→ ✅ supported

Answer:  "Premier customers get unlimited free transfers [2]."
Chunk [2]: "Premier customers receive fee waivers on the first two
            international transfers per calendar month."
→ ❌ NOT supported. "Unlimited" is invented.
   The citation is present and looks authoritative. That's worse than
   no citation, because it manufactures false confidence.
```

**How to validate:**

| Method | Catches | Cost |
|---|---|---|
| Exact-figure matching | Numbers and dates that don't appear in the cited chunk | Free |
| String/n-gram overlap | Claims with no lexical support | Free |
| NLI entailment model | Semantic non-support | Cheap, fast |
| LLM judge | Subtle overstatement like "unlimited" vs. "first two" | Per-call cost |

A practical stack: exact-figure matching on every answer (free, catches the highest-risk errors), plus an LLM judge sampled asynchronously for a groundedness metric.

## 5. Why It Matters

- **It's a compliance requirement** in banking, legal, healthcare — often the difference between shippable and not.
- **It's a hallucination control.** Requiring a source per claim makes unsupported claims structurally visible.
- **It builds user trust** — and a wrong citation destroys it faster than a wrong answer without one.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Citation doesn't support the claim** | The dangerous case — false confidence | Post-hoc validation against chunk text |
| **Over-citation** | Every clause tagged; unreadable | Instruct citation per factual claim, not per sentence |
| **Under-citation** | Whole paragraph, one citation at the end | Require inline attribution |
| **Citing the wrong chunk number** | Off-by-one in the model's tracking | Validate identifiers resolve; clear labeling |
| **Source URI missing** | Can't link to anything | Capture at ingestion, including page anchors |
| **Overlapping chunks → duplicate citations** | Same section cited three times | Deduplicate; cite at section level |
| **Citations to stale documents** | Correct attribution to superseded policy | Include effective date; filter or flag old sources |

**The counterintuitive risk:** a plausible answer with an authoritative-looking but wrong citation is *more* dangerous than an obviously wrong answer, because the citation signals verification that didn't happen. Validation isn't optional polish.

## 7. Interview Answer

> "Citations attribute each claim in the answer to the source chunk that supports it. In banking that's usually a requirement rather than a feature — a compliance reviewer needs to open the referenced policy section and confirm it says what the answer claims.
>
> Mechanically: label each chunk in the context with a stable number, instruct the model to cite that number after every factual claim, then resolve the numbers back to document URIs with page or section anchors after generation. Those URIs have to be captured at ingestion — you can't reconstruct them later.
>
> The step most systems skip is validating that the cited chunk actually supports the claim. I've seen answers where the chunk says 'fee waivers on the first two transfers per month' and the answer says 'unlimited free transfers' with a citation attached. The citation is present and looks authoritative, and that's worse than no citation, because it manufactures false confidence — it signals a verification that didn't happen.
>
> The validation stack I'd build: exact-figure matching on every answer, which is free and catches the highest-risk errors like a dollar amount that doesn't appear in the cited chunk. Then an LLM judge sampled asynchronously to track groundedness as an ongoing metric, since that catches subtler overstatement.
>
> One formatting note: I'd instruct citation per factual claim rather than per sentence. Over-citation makes answers unreadable, and users stop looking at citations entirely, which defeats the purpose."

## 8. Likely Follow-ups

**Q: How do you verify a citation is correct?**
Layered. Exact matching for figures and dates — if the answer says $45 and the cited chunk doesn't contain it, that's a definite error, and it's free to check. String or n-gram overlap catches claims with no lexical support. An NLI entailment model catches semantic non-support cheaply. An LLM judge catches subtle overstatement. I'd run the cheap checks inline on every answer and the expensive ones on a sample for a running groundedness metric.

**Q: What if the model cites a source that doesn't support the claim?**
That's a groundedness failure and it should be caught, logged, and ideally surfaced. Options: block the answer and retry with a stronger grounding instruction, strip the unsupported claim, or return the answer with a warning. In a high-stakes domain I'd lean toward blocking and falling back to abstention, because a confidently wrong cited answer is the worst outcome.

**Q: How granular should citations be?**
Per factual claim, not per sentence and not per paragraph. Per sentence is unreadable and trains users to ignore citations. Per paragraph is unverifiable, because you can't tell which source supports which claim. The practical target is that any specific number, date, or policy statement carries its own reference.

**Q: How do you handle a claim synthesized from multiple sources?**
Cite all of them — `[1][2]` — and make sure the prompt permits synthesis across provided sources. Validation gets harder, because you need to check that the combination is supported rather than any single chunk. An LLM judge handles that better than lexical matching. If the synthesis requires an inferential leap neither source supports, that's a hallucination even though both citations are individually real.

**Q: How do you cite when chunks overlap?**
Deduplicate first, and attribute at the section level rather than the chunk level so overlapping chunks from the same section collapse into one reference. Otherwise the same fact gets three citations pointing at nearly identical text, which is noise. Section-level attribution is also more useful to the reader, who wants to find the policy section, not the chunk.

## 9. Common Mistakes

- Trusting citations without validating them against the chunk text.
- Citing per sentence, making answers unreadable.
- Not capturing source URIs with page anchors at ingestion.
- Treating an unsupported citation as a minor issue rather than a hallucination.
- Not deduplicating overlapping chunks, producing redundant citations.

## 10. What to Remember

- **Number chunks in context, instruct citation per claim, resolve to URIs after.**
- **Capture `source_uri` with page/section anchors at ingestion** — unreconstructable later.
- **Validate that the cited chunk supports the claim.** This is the step people skip.
- **A wrong citation is worse than none** — it manufactures false confidence.
- **Cite per factual claim**, deduplicate overlapping sources, attribute at section level.
