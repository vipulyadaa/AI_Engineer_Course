# Faithfulness

> **Phase 12 · RAG EVALUATION · Topic 05**

## 1. Definition

The fraction of claims in a generated answer that are supported by the retrieved context. Also called groundedness. It measures whether the model stayed within the evidence it was given.

## 2. Simple Explanation

Did the answer say anything the documents didn't?

An unfaithful claim is a hallucination **even if it happens to be true**. If the model adds "international wires typically settle in 3–5 business days" from its training data, that may be correct — but your system had no evidence for it, can't cite it, and can't guarantee the next such claim is right.

## 3. How It Works

```
faithfulness = (claims supported by context) / (total claims in answer)
```

1. **Decompose** the answer into atomic claims.
2. **For each claim**, check whether the retrieved context entails it.
3. **Report the ratio**, and log the unsupported claims.

**Checking methods, cheapest first:**

| Method | Catches | Cost |
|---|---|---|
| Exact-figure matching | Numbers and dates not in the context | Free |
| String / n-gram overlap | Claims with no lexical support | Free |
| NLI entailment model | Semantic non-support | Cheap, fast |
| LLM judge | Subtle overstatement, missing qualifiers | Per-call cost |

**The practical stack:** exact-figure matching inline on every answer, plus a sampled LLM judge asynchronously for the tracked metric.

## 4. Practical Example

**Degrees of unfaithfulness:**

```
Context: "Premier customers receive fee waivers on the first two
          international transfers per calendar month. Additional
          transfers are charged at the standard $25 Premier rate."

✅ Faithful:
   "Premier customers get their first two international transfers
    waived each month; additional ones cost $25."

❌ Overstatement — the most common failure:
   "Premier customers get unlimited free international transfers."
   └─ Dropped "first two per month." Materially wrong.

❌ Parametric leakage — the subtle one:
   "Premier customers get two free transfers monthly, and transfers
    typically settle in 3-5 business days."
   └─ Settlement time came from training data, not the context.
      May be true. Still unfaithful.

❌ Extrapolation:
   "Premier customers get two free transfers monthly, so domestic
    transfers are presumably also free."
   └─ Inference not supported by the provided text.
```

**Faithfulness alone isn't sufficient:**

```
An answer can be perfectly faithful and useless — a correct
summary of context that doesn't address the question.

Measure alongside:
  context relevance  → was the retrieved context relevant?
  answer relevance   → does the answer address the question?
```

## 5. Why It Matters

- **It's the metric that tells you RAG is actually working**, as distinct from producing plausible text.
- **It's the compliance-facing number** — "what fraction of our answers are supported by source documents."
- **It's what makes citation meaningful** — a citation on an unsupported claim is worse than none.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Claim decomposition is hard** | What counts as one atomic claim is ambiguous |
| **Judge self-preference** | A model judging its own output over-approves |
| **Over-strict judging** | Correct answers phrased differently from the source marked unfaithful |
| **Expensive per answer** | Full claim-level judging on every request is costly |
| **Measured alone** | Faithful-but-irrelevant is a real failure mode |
| **Judge drift** | A provider model update shifts your metric with no system change |

**On self-preference:** use a *different* model as the judge than the one generating. It can be smaller and cheaper — verification against provided context is easier than generation — and it removes the bias toward approving one's own output.

**Most faithfulness problems are retrieval problems.** If the context only partially answers the question, the model gap-fills. Fixing retrieval usually improves faithfulness more than prompt changes do.

## 7. Interview Answer

> "Faithfulness is the fraction of claims in the answer that the retrieved context actually supports. It's also called groundedness.
>
> The definition I'd be precise about: an unfaithful claim is a hallucination even if it's true. If the model adds 'international wires typically settle in three to five business days' from training data, that may be correct — but my system had no evidence for it, can't cite it, and can't guarantee the next such claim is right. In a regulated domain that's not a technicality.
>
> To measure it, I'd decompose the answer into atomic claims and check entailment of each against the context. Practically that means cheap inline checks on every answer — do the figures in the answer actually appear in the cited chunks, which is free and catches the highest-risk errors — plus a sampled LLM judge asynchronously for the tracked metric, since full claim-level judging on every request is expensive.
>
> Two things about the judge. Use a different model than the generator, because self-evaluation is measurably biased toward approval. And calibrate it against human labels on a sample, so you know its agreement rate before trusting the number.
>
> The most common failure I'd watch for is overstatement — 'fee waivers on the first two transfers per month' becoming 'unlimited free transfers.' The claim looks supported and drops a material qualifier.
>
> And I'd pair it with context relevance, because an answer can be perfectly faithful and useless if it faithfully summarizes irrelevant context. Faithfulness tells me the generator behaved; it doesn't tell me the system worked."

## 8. Likely Follow-ups

**Q: How do you measure it in practice?**
Layered. Exact matching of figures and dates inline on every answer — free, deterministic, and catches the highest-risk errors. An NLI entailment model for cheap semantic checking. And a sampled LLM judge for the tracked metric, catching subtle overstatement. I'd run the cheap checks always and the expensive one on a sample.

**Q: Is a faithful answer necessarily good?**
No. It can faithfully summarize context that doesn't address the question. That's why faithfulness, context relevance, and answer relevance are measured separately — they tell you whether the generator behaved, whether retrieval behaved, and whether the whole thing was useful.

**Q: What if the model is right but unfaithful?**
Still a failure. The system had no evidence, can't cite it, and can't guarantee the next such claim is correct. The value proposition of RAG is that answers trace to source documents, so a correct-but-ungrounded claim undermines that. I'd treat it as a defect and investigate why the grounding instruction didn't hold.

**Q: How do you improve faithfulness?**
In order of leverage: fix retrieval so the supporting evidence is actually present, because partial context is what invites gap-filling. Add an explicit abstention instruction. Require per-claim citations, which makes unsupported claims structurally visible. Lower the temperature. And verify post-hoc, blocking or flagging answers that fail. Most faithfulness problems trace back to retrieval.

**Q: Can you trust an LLM judge?**
With care. Calibrate it against human labels on a sample so you know its agreement rate. Use a different model than the generator to avoid self-preference bias. Give it a structured rubric and ask for claim-level verdicts rather than a holistic score — that's both more reliable and more actionable. And pin the judge's model version, because a provider update shifts your metric with no system change.

## 9. Common Mistakes

- Treating a correct-but-ungrounded claim as acceptable.
- Using the generating model as its own judge.
- Measuring faithfulness alone, without context or answer relevance.
- Not calibrating the judge against human labels.
- Trying to fix low faithfulness with prompt changes when the cause is incomplete retrieval.

## 10. What to Remember

- **Fraction of claims supported by the retrieved context.** Unfaithful ≠ false — true-but-ungrounded still fails.
- **Overstatement is the most common failure** — dropped qualifiers.
- **Cheap figure-matching inline + sampled LLM judge** for the tracked metric.
- **Use a different, smaller model as judge**, and calibrate it against humans.
- **Most faithfulness problems are retrieval problems.** Fix upstream first.
