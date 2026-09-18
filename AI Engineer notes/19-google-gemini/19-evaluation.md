# Evaluation (Gemini)

> **Phase 19 · GOOGLE GEMINI · Topic 19**

## 1. Definition

Measuring whether Gemini's outputs are good enough for the task — through the Vertex AI Gen AI Evaluation Service, custom metrics, or both — with groundedness being the metric that matters most in a RAG system.

## 2. Simple Explanation

You need a number that tells you whether a change made things better or worse. Without one, every prompt tweak and model swap is a guess.

For a banking RAG system the most important number is groundedness — whether each claim traces to the retrieved context.

## 3. How It Works

```
VERTEX AI GEN AI EVALUATION SERVICE
  · groundedness      — claims supported by provided context
  · question answering quality
  · summarization quality
  · safety
  · fluency, coherence
  · custom metrics via your own rubric

Runs in-project, so evaluation data doesn't leave the
environment — which matters for the same reason the Vertex
AI path matters generally.
```

**Pointwise versus pairwise:** pointwise scores one response against a rubric; pairwise compares two responses and picks a winner. Pairwise is more reliable for comparing a prompt or model change, because relative judgments are easier than absolute ones.

## 4. Practical Example

**The metrics that matter for banking RAG, in order:**

```
1. GROUNDEDNESS      every claim supported by context
                     → the primary safety metric

2. ANSWER CORRECTNESS vs a labelled expected answer
                     → what the customer actually needed

3. RETRIEVAL RECALL@K did the right chunk get retrieved
                     → separates retrieval failures from
                       generation failures

4. ABSTENTION ACCURACY abstained when it should, answered
                     when it could
                     → both directions matter

5. CITATION ACCURACY  do the citations resolve and support
                     the claims
```

**Separating 2 and 3 is what makes evaluation actionable:** an end-to-end score tells you something is wrong; retrieval recall tells you whether it was retrieval or generation.

**The trap with groundedness metrics:**

```
An answer that states the general rule when asked a specific
question scores WELL on groundedness. It's true, relevant,
and correctly cited — it just doesn't answer what was asked.

So groundedness alone is insufficient. It needs pairing with
answer correctness against a labelled expectation, and for
multi-hop questions a specific metric scoring a general-rule
answer as zero.

That's the most important evaluation insight for RAG, and
it's easy to miss because the number looks good.
```

**Building the golden set:**

```
· from REAL queries — sampled production traffic, support
  tickets, actual customer questions
· covering the question types in production proportions
· including known-unanswerable questions, to test abstention
· 50-200 cases is enough to detect meaningful regressions

Invented test sets are systematically easier than reality
and produce numbers that don't hold in production.
```

## 5. Why It Matters

- **Groundedness is the primary safety metric** in a banking RAG system.
- **A high groundedness score can hide a wrong answer** — the key insight.
- **Separating retrieval and generation metrics** is what makes results actionable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Groundedness alone** | Passes general-rule answers to specific questions |
| **Aggregate scores only** | Hides which question types fail |
| **Invented golden sets** | Systematically easier than reality |
| **No abstention cases** | Over-abstention undetected |
| **Uncalibrated judge** | Confident numbers that don't track quality |
| **Evaluation after launch** | No baseline for any change |

**On judge calibration:** an LLM-as-judge metric produces a number whether or not it correlates with human judgment. Before trusting it, score a sample of cases by hand and check agreement. An uncalibrated judge gives confident numbers that may not track quality at all, which is worse than no metric because it directs effort.

**On CI gating:** the evaluation run should block deploys that regress on groundedness or answer correctness. That turns evaluation from a report someone reads into a control that prevents a regression reaching customers — and it's what makes the investment pay off continuously rather than once.

## 7. Interview Answer

> "The Vertex AI Gen AI Evaluation Service provides groundedness, question-answering quality, summarization quality, safety, and custom rubric metrics, running in-project so evaluation data stays in the environment.
>
> For a banking RAG system the metrics I'd prioritize are groundedness first, as the primary safety metric; answer correctness against a labelled expectation; retrieval recall at k; abstention accuracy in both directions; and citation accuracy.
>
> Separating retrieval recall from answer correctness is what makes results actionable. An end-to-end score tells me something is wrong; retrieval recall tells me whether it was retrieval or generation, which are completely different fixes.
>
> The most important insight, and the easiest to miss, is that a high groundedness score can hide a wrong answer. If someone asks 'do I qualify for the fee waiver' and the system answers with the general waiver policy, that's true, relevant, and correctly cited — groundedness passes. It just doesn't answer what was asked. So groundedness alone is insufficient; it needs pairing with answer correctness against a labelled expectation, and for multi-hop questions a specific metric that scores a general-rule answer as zero rather than partial credit.
>
> On the golden set, I'd build it from real queries — sampled production traffic, support tickets, actual customer questions — covering the question types in production proportions, and including known-unanswerable questions to test abstention. Fifty to two hundred cases is enough to detect meaningful regressions. Invented test sets are systematically easier than reality and produce numbers that don't hold in production.
>
> On methodology, pairwise comparison is more reliable than pointwise scoring when comparing a prompt or model change, because relative judgments are easier than absolute ones.
>
> And if I'm using an LLM judge, I'd calibrate it first — score a sample by hand and check agreement. An uncalibrated judge produces confident numbers that may not track quality at all, which is worse than no metric because it actively directs effort in the wrong direction.
>
> Finally, I'd gate CI on it. Blocking deploys that regress on groundedness or answer correctness turns evaluation from a report someone reads into a control that stops regressions reaching customers."

## 8. Likely Follow-ups

**Q: What's the most important metric for RAG?**
Groundedness, as the primary safety metric — but paired with answer correctness. Groundedness alone passes an answer that states the general rule to a specific question, which is true, cited, and useless to the customer who asked.

**Q: Why separate retrieval and generation metrics?**
Because they have different fixes. An end-to-end score tells you something is wrong; retrieval recall at k tells you whether the right chunk was even retrieved. Without that split, you can spend weeks tuning generation when retrieval never surfaced the answer.

**Q: Where does the golden set come from?**
Real queries — sampled production traffic, support tickets, actual customer questions — in production proportions, including known-unanswerable cases to test abstention. Invented test sets are systematically easier than reality, so they produce numbers that don't survive contact with production.

**Q: Pointwise or pairwise?**
Pairwise for comparing a prompt or model change, because relative judgments are more reliable than absolute ones. Pointwise scoring against a rubric is right when you need a standalone number to gate on, but it's noisier for detecting a small improvement.

**Q: How do you trust an LLM judge?**
Calibrate it. Score a sample of cases by hand and check agreement with the judge before relying on its numbers. An uncalibrated judge produces confident scores that may not correlate with quality, which is worse than no metric because it directs effort in the wrong direction.

## 9. Common Mistakes

- Relying on groundedness alone.
- Reporting aggregate scores without a question-type breakdown.
- Building the golden set from imagination rather than real queries.
- Omitting unanswerable cases, so over-abstention goes undetected.
- Using an LLM judge without calibrating against human labels.

## 10. What to Remember

- **Groundedness first**, but never alone — pair it with answer correctness.
- **A general-rule answer to a specific question scores well** and is wrong.
- **Separate retrieval recall from generation quality** to localize failures.
- **Golden set from real queries**, including unanswerable ones.
- **Calibrate the judge; gate CI on the results.**
