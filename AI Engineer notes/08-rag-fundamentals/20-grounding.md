# Grounding

> **Phase 08 · RAG FUNDAMENTALS · Topic 20**

## 1. Definition

The property that every claim in a generated answer is supported by the retrieved context. Grounding is both the goal of RAG and a measurable metric — the fraction of claims in an answer that the provided sources actually support.

## 2. Simple Explanation

Grounded means: everything the answer says, the documents said first.

An ungrounded claim is a hallucination even if it happens to be true, because the system had no basis for it. That distinction matters — you're not just asking "is this answer correct," you're asking "did this system have evidence for what it said."

## 3. How It Works

**Grounding is enforced at three layers, and all three are needed:**

1. **Retrieval** — put the supporting evidence in the context. Nothing else works if this fails.
2. **Prompt** — instruct the model to use only the context and to abstain when it can't.
3. **Verification** — check the output after generation. The instruction is a request, not a guarantee.

**Measuring it:**

```
groundedness = (claims supported by context) / (total claims in answer)
```

1. Decompose the answer into atomic claims.
2. For each, check whether the retrieved context entails it.
3. Report the ratio, and log the unsupported claims for review.

**The related metrics, and why they're distinct:**

| Metric | Question |
|---|---|
| **Groundedness / faithfulness** | Is every claim supported by the context? |
| **Answer relevance** | Does the answer address the question asked? |
| **Context relevance** | Was the retrieved context relevant to the question? |

An answer can be perfectly grounded and useless — correctly summarizing irrelevant context. All three need measuring.

## 4. Practical Example

**Degrees of grounding failure:**

```
Context: "International wire transfers: $45 retail, $25 Premier.
          Premier customers receive fee waivers on the first two
          international transfers per calendar month."

✅ Grounded:
   "International wires cost $45 for retail accounts and $25 for
    Premier, with Premier's first two per month waived."

⚠️ Partially grounded — extrapolation:
   "International wires cost $45. Domestic transfers are cheaper."
    └─ second claim has no support in the context at all

❌ Ungrounded — contradiction:
   "Premier customers get unlimited free international transfers."
    └─ the context says "first two per month"

❌ Ungrounded — parametric leakage:
   "International wires cost $45 and typically settle in 3–5 business days."
    └─ the settlement time came from training data, not the context.
       It may even be correct — it's still ungrounded.
```

**That last case is the subtle one.** A plausible, possibly-true fact the model supplied from its own knowledge is still a grounding failure, because your system can't cite it and can't guarantee it.

## 5. Why It Matters

- **It's the metric that tells you whether RAG is actually working**, as distinct from the model producing plausible text.
- **It's the compliance-facing number** — "what fraction of our answers are supported by source documents" is a question auditors ask.
- **It separates retrieval failures from generation failures** when measured alongside context relevance.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Parametric leakage** | Model adds facts from training data | Explicit grounding instruction; verification |
| **Extrapolation** | Model infers beyond what the context states | Instruct "state only what the sources say" |
| **Over-summarization** | Nuance and conditions dropped ("first two per month" → "free") | Instruct preservation of qualifiers and exact figures |
| **Grounded but irrelevant** | Faithful summary of the wrong context | Measure context relevance separately |
| **Judge disagreement** | LLM-as-judge groundedness scores vary | Calibrate against human labels on a sample |
| **Over-strict grounding** | Model refuses reasonable synthesis across provided chunks | Permit reasoning across sources; forbid outside facts |

**On measurement cost:** full claim-level groundedness with an LLM judge is expensive per answer. The practical pattern is cheap inline checks — exact figures appearing in the context — on every request, plus sampled LLM-judge evaluation for a running metric.

## 7. Interview Answer

> "Grounding means every claim in the answer is supported by the retrieved context. It's both the goal of RAG and a metric — the fraction of claims the sources actually support.
>
> The definition I'd be precise about is that an ungrounded claim is a hallucination even if it's true. If the model adds 'international wires typically settle in three to five business days' from its training data, that may well be correct, but my system had no evidence for it and can't cite it. That's still a grounding failure.
>
> I'd enforce it at three layers, because any one alone is insufficient. Retrieval has to put the supporting evidence in the context — nothing else works if that fails. The prompt has to instruct the model to use only that context and abstain when it can't. And then verification, because the prompt instruction is a request, not a guarantee.
>
> For measurement, I'd decompose the answer into atomic claims and check whether the context entails each one. Practically that means cheap inline checks on every answer — do the figures in the answer actually appear in the cited chunks — plus a sampled LLM judge for a running groundedness metric, because full claim-level judging on every request is expensive.
>
> The thing I'd pair it with is context relevance. An answer can be perfectly grounded and useless if it faithfully summarizes irrelevant retrieved context. Measuring groundedness alone tells you the generator behaved; measuring both tells you whether the system works."

## 8. Likely Follow-ups

**Q: How do you measure groundedness?**
Decompose the answer into atomic claims, then check entailment of each against the retrieved context. An NLI model does this cheaply; an LLM judge handles subtler cases like an overstated qualifier. I'd run exact-figure matching inline on every answer since it's free and catches the highest-risk errors, and sample with an LLM judge for the tracked metric.

**Q: Is a grounded answer necessarily a good answer?**
No. It can be grounded and irrelevant — faithfully summarizing context that doesn't address the question. That's why groundedness, answer relevance, and context relevance are measured separately. Groundedness tells you the generator behaved; context relevance tells you retrieval behaved; answer relevance tells you the whole thing was useful.

**Q: What if the model is right but ungrounded?**
It's still a failure. The system had no evidence, can't cite it, and can't guarantee the next such claim will also be right. In a regulated domain that's not a technicality — the value proposition is that answers trace to source documents. I'd treat a correct-but-ungrounded claim as a defect and investigate why the grounding instruction didn't hold.

**Q: How do you improve groundedness?**
In order of leverage: fix retrieval so the supporting evidence is actually present, because the model gap-fills when context is partial. Add an explicit abstention instruction. Require per-claim citations, which makes unsupported claims structurally visible. Lower the temperature. And verify post-hoc, blocking or flagging answers that fail. Most groundedness problems I'd expect to trace back to retrieval rather than to the generator.

**Q: Can you use an LLM to judge groundedness?**
Yes, and it's the standard approach, but with care. Calibrate the judge against human labels on a sample so you know its agreement rate. Don't use the same model as both generator and judge without checking for self-preference bias. Give the judge a structured rubric and ask for claim-level verdicts rather than a holistic score, which is more reliable and more actionable.

## 9. Common Mistakes

- Treating a correct-but-ungrounded claim as acceptable.
- Measuring groundedness alone without context relevance and answer relevance.
- Assuming the grounding instruction worked, without verification.
- Using an LLM judge without calibrating it against human labels.
- Trying to fix low groundedness with prompt changes when the cause is incomplete retrieval.

## 10. What to Remember

- **Every claim supported by the context.** Ungrounded is a failure even when true.
- **Three layers:** retrieval puts evidence there, prompt constrains, verification checks.
- **Measure at claim level** — decompose the answer, check entailment per claim.
- **Pair with context relevance** — grounded-but-irrelevant is a real failure mode.
- **Most groundedness problems are retrieval problems.** Fix upstream first.
