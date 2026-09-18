# Groundedness

> **Phase 12 · RAG EVALUATION · Topic 08**

## 1. Definition

The property that every claim in an answer is supported by the retrieved context — and the metric measuring what fraction are. Used interchangeably with faithfulness; Google Cloud's Vertex AI evaluation tooling uses "groundedness" specifically.

## 2. Simple Explanation

Everything the answer says, the documents said first.

It's both the goal of RAG and the number that tells you whether RAG is actually doing its job, as opposed to the model producing plausible text that happens to sit next to some retrieved documents.

## 3. How It Works

**Enforced at three layers, all of which are needed:**

```
1. RETRIEVAL   — put the supporting evidence in the context.
                 Nothing else works if this fails.
2. PROMPT      — instruct: use only the context; abstain if it's absent;
                 cite every factual claim.
3. VERIFICATION— check the output. The instruction is a request,
                 not a guarantee.
```

**Measuring:**

```
groundedness = supported claims / total claims
```

```
1. Decompose the answer into atomic claims
2. Check entailment of each against the retrieved context
3. Report the ratio; log unsupported claims for review
```

**Vertex AI provides groundedness as a built-in evaluation metric**, which is worth knowing for a Google Cloud interview — it's part of the Gen AI Evaluation Service rather than something you have to build from scratch.

## 4. Practical Example

**The measurement pipeline in production:**

```
INLINE (every request, free):
  - extract figures and dates from the answer
  - verify each appears in the cited chunks
  - if a figure isn't present → flag, and optionally block

ASYNC (sampled, ~5% of traffic):
  - LLM judge, claim-level, with a rubric
  - produces the tracked groundedness metric
  - alerts on regression

WEEKLY (human):
  - review a sample of flagged answers
  - calibrate the judge against human labels
```

**What each catches:**

```
Inline figure check:
  Answer: "The fee is $40."   Context: "$45."
  → caught, free, deterministic

LLM judge:
  Answer: "unlimited free transfers"
  Context: "first two per calendar month waived"
  → caught only by semantic judging
```

**Interpreting the number:**

```
groundedness 0.95  →  5% of claims unsupported. In banking that's
                      significant — investigate which claims.
groundedness 1.00  →  suspicious if the answers are non-trivial;
                      check whether the judge is too lenient.
```

## 5. Why It Matters

- **It's the compliance-facing metric** — "what fraction of our answers are supported by source documents" is an auditor's question.
- **It distinguishes RAG working from RAG-shaped output.**
- **It's a built-in Vertex AI metric**, which matters for a Google Cloud role.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Parametric leakage** | Model adds true-but-unsourced facts from training data |
| **Overstatement** | Qualifiers dropped: "first two per month" → "unlimited" |
| **Judge self-preference** | The generating model over-approves its own output |
| **Over-strict judging** | Correct answers phrased differently marked ungrounded |
| **Cost of full judging** | Claim-level LLM judging on every request is expensive |
| **Judge version drift** | A provider model update shifts the metric with no system change |
| **Measured alone** | Grounded-but-irrelevant is a real failure |

**The strongest lever on groundedness is retrieval, not prompting.** If the context only partially answers the question, the model gap-fills — and that's a retrieval problem presenting as a generation metric. When groundedness drops, check context relevance before rewriting the prompt.

## 7. Interview Answer

> "Groundedness means every claim in the answer is supported by the retrieved context. It's both the goal of RAG and the metric that tells you whether RAG is actually working, as opposed to producing plausible text next to some retrieved documents.
>
> I'd enforce it at three layers. Retrieval has to put the supporting evidence in the context — nothing else works if that fails. The prompt has to instruct the model to use only that context and abstain when it can't. And then verification, because the prompt instruction is a request, not a guarantee.
>
> In production I'd measure it in two tiers. Inline on every request, extract the figures and dates from the answer and verify they appear in the cited chunks — that's free, deterministic, and catches the highest-risk errors in a banking context. Then an LLM judge on maybe five percent of traffic asynchronously for the tracked metric, because it catches subtler failures like 'unlimited free transfers' when the context said 'first two per month,' and full claim-level judging on every request is too expensive.
>
> For the judge, I'd use a different model than the generator — self-evaluation is measurably biased toward approval — and calibrate it against human labels on a sample so I know its agreement rate.
>
> The thing I'd emphasize is that the strongest lever on groundedness is retrieval, not prompting. If the context only partially answers the question, the model gap-fills. So when groundedness drops, I'd check context relevance before rewriting the prompt.
>
> And on Vertex AI it's a built-in metric in the Gen AI Evaluation Service, so you don't have to build the harness from scratch."

## 8. Likely Follow-ups

**Q: Groundedness or faithfulness — is there a difference?**
They're used interchangeably in practice. "Faithfulness" is the more common term in the RAGAS framework and academic literature; "groundedness" is what Vertex AI's evaluation service calls it. Both measure the fraction of answer claims supported by the retrieved context. I'd use whichever term the audience uses.

**Q: What if the model is right but ungrounded?**
Still a failure. The system had no evidence, can't cite it, and can't guarantee the next such claim is correct. In a regulated domain the value proposition is that answers trace to sources, so a correct-but-ungrounded claim undermines the whole architecture. I'd treat it as a defect and investigate why the grounding instruction didn't hold.

**Q: How do you improve it?**
Fix retrieval first, because partial context is what invites gap-filling and that's usually the root cause. Then the prompt: explicit grounding instruction, abstention clause, and per-claim citation requirements, which make unsupported claims structurally visible. Then lower the temperature. Then post-hoc verification that blocks or flags failures.

**Q: Can you trust an LLM judge?**
With calibration. Measure its agreement against human labels on a sample so you know the error rate. Use a different model than the generator to avoid self-preference bias — a smaller cheaper model is fine, since verification is easier than generation. Give it a structured rubric and claim-level verdicts rather than a holistic score. And pin the version, because provider updates shift your metric silently.

**Q: What's a good groundedness score?**
Context-dependent, but in banking I'd want it very high — 0.95 means five percent of claims are unsupported, which on financial figures is significant. I'd also be suspicious of exactly 1.0 on non-trivial answers, because that often means the judge is too lenient rather than the system being perfect. I'd validate against human labels before trusting either extreme.

## 9. Common Mistakes

- Treating correct-but-ungrounded claims as acceptable.
- Using the generating model as its own judge.
- Rewriting the prompt when the cause is incomplete retrieval.
- Not calibrating the judge against human labels.
- Reporting groundedness alone without context relevance and answer relevance.

## 10. What to Remember

- **Every claim supported by the retrieved context.** Ungrounded fails even when true.
- **Three layers:** retrieval provides evidence, prompt constrains, verification checks.
- **Two-tier measurement:** free inline figure checks + sampled LLM judge.
- **Different, smaller model as judge**, calibrated against humans.
- **Retrieval is the strongest lever.** Check context relevance before touching the prompt.
