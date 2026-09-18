# Agent Evaluation (in Agentic RAG)

> **Phase 18 · AGENTIC RAG · Topic 13**

## 1. Definition

Measuring whether an agentic RAG system retrieves the right things, in the right number of rounds, and produces grounded answers — and whether the added complexity over a fixed pipeline actually pays for itself.

## 2. Simple Explanation

Two questions to answer. Is the agentic system good? And is it better than the simple pipeline by enough to justify three to eight times the cost?

The second question is the one that usually goes unasked, and it's the one that decides whether the system should exist.

## 3. How It Works

**What to measure, beyond standard RAG metrics:**

| Metric | Why |
|---|---|
| **Retrieval decision accuracy** | Did it retrieve when it should have? |
| **Rounds per question** | Efficiency, and a proxy for cost |
| **Per-round information gain** | Did later rounds add anything? |
| **Multi-hop completion rate** | Did it finish the chain or stop at the rule? |
| **Abstention accuracy** | Abstained when it should, answered when it could |
| **Cost and latency distribution** | p50 and p95, not averages |

**Plus all the standard ones:** recall@k, groundedness, answer correctness, citation accuracy.

## 4. Practical Example

**The comparison that decides the architecture:**

```
Golden set split by question type, both systems run:

                    Fixed pipeline   Agentic    Δ
  simple lookup          0.94          0.95    +0.01
  multi-part             0.71          0.89    +0.18
  multi-hop              0.38          0.84    +0.46
  ambiguous              0.55          0.77    +0.22

  cost per query        $0.007        $0.045     6×
  p95 latency            2.1 s        14 s

CONCLUSION  route by type. The agentic path earns its cost
on multi-hop and multi-part; on simple lookups it buys one
point for six times the money.
```

**That table is the whole argument** — it turns an architectural preference into a measured routing threshold.

**Multi-hop completion rate is the metric worth defining carefully:**

```
For a multi-hop question, score:

  2  specific determination reached ("yes, you qualify,
     1 waiver remaining")
  1  partial — some facts gathered, no conclusion
  0  general rule only ("waivers apply to Premier accounts...")

Scoring the general-rule answer as ZERO is the point.
Standard faithfulness metrics pass it — it's true, relevant,
and well-cited. Only an explicit multi-hop metric catches it.
```

**Per-round information gain:** measure how many new chunks each round contributes. If round 3 consistently adds nothing, the round cap should be 2 — which is a direct, measured cost saving rather than a guess.

## 5. Why It Matters

- **The comparison against a fixed pipeline** is what justifies the architecture.
- **Multi-hop completion** catches a failure that faithfulness metrics pass.
- **Per-round information gain** turns the round cap into a measured parameter.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No baseline comparison** | Complexity unjustified |
| **Aggregate scores only** | Hides where the agent wins and loses |
| **Faithfulness without multi-hop scoring** | The main failure passes |
| **Single run per case** | Non-determinism unmeasured |
| **Averages instead of p95** | Variable latency hidden |
| **Eval set without multi-hop cases** | The capability being paid for is untested |

**On non-determinism:** the agentic path can take different routes on the same input, so each case should run several times with a pass rate reported. A question answered correctly three times out of five is a reliability finding — and in a conversational product that variance is visible to users as inconsistent answers.

**On the eval set composition:** it must contain the question types the agentic path exists to serve, in realistic proportions. An eval set that's 90% simple lookups will show the agentic system barely winning, because the cases it was built for are barely represented — while an eval set that's 50% multi-hop overstates its value relative to production traffic.

## 7. Interview Answer

> "There are two questions. Is the agentic RAG system good, and is it better than the fixed pipeline by enough to justify three to eight times the cost. The second is the one that usually goes unasked, and it's what decides whether the system should exist.
>
> So the central artifact is a golden set split by question type, with both systems run over it. Typically you'd see the agentic path winning by a point on simple lookups, maybe eighteen points on multi-part questions, and forty-plus on multi-hop. At six times the cost and fourteen-second p95 latency, that says route by type — the agentic path earns its cost on multi-hop and multi-part and doesn't on simple lookups. That table turns an architectural preference into a measured routing threshold.
>
> Beyond standard RAG metrics I'd measure the retrieval decision — did it retrieve when it should have — rounds per question, per-round information gain, multi-hop completion, and abstention accuracy in both directions.
>
> Multi-hop completion is worth defining carefully. I'd score two for reaching a specific determination, one for gathering facts without concluding, and zero for returning only the general rule. Scoring the general-rule answer as zero is the point: it's true, relevant, and well-cited, so standard faithfulness metrics pass it. Only an explicit multi-hop metric catches the failure the system was built to fix.
>
> Per-round information gain is the cheapest useful metric — measure how many new chunks each round contributes. If round three consistently adds nothing, the cap should be two, and that's a measured cost saving rather than a guess.
>
> Two methodology points. Non-determinism means running each case three to five times and reporting a pass rate; a question answered correctly three times out of five is a reliability finding, and in a conversational product that variance shows up to users as inconsistent answers.
>
> And eval set composition matters more than usual here. An eval set that's ninety percent simple lookups will show the agentic system barely winning, because the cases it exists for are barely represented. One that's fifty percent multi-hop overstates its value against real traffic. It has to match the production mix, or the routing threshold derived from it is wrong."

## 8. Likely Follow-ups

**Q: What's the most important thing to measure?**
The comparison against the fixed pipeline, split by question type. That's what justifies the architecture and tells you where the routing threshold belongs — and if the agentic path doesn't win substantially on some category, that's evidence not to build it.

**Q: What does standard groundedness evaluation miss?**
Multi-hop failures. Answering a specific eligibility question with the general rule is true, relevant, and correctly cited, so faithfulness passes. You need an explicit multi-hop completion metric scoring general-rule answers as zero to catch it.

**Q: How do you set the round cap?**
By measuring per-round information gain — how many new chunks each round contributes. If round three consistently adds nothing, cap at two. That turns a guessed parameter into a measured one and produces a direct cost saving.

**Q: How do you handle non-determinism?**
Run each case several times and report a pass rate rather than a binary. Three correct out of five is a reliability finding, not a flaky test — and in a conversational product that variance is visible to users as inconsistent answers to the same question.

**Q: Does the eval set composition matter?**
More than usual. An eval set dominated by simple lookups understates the agentic path's value because its target cases are underrepresented; one dominated by multi-hop overstates it. It has to match production traffic mix, or the routing threshold derived from it will be wrong.

## 9. Common Mistakes

- Evaluating the agentic system without a fixed-pipeline baseline.
- Reporting aggregate scores that hide per-question-type differences.
- Relying on faithfulness metrics that pass general-rule answers.
- Running each case once and treating variance as noise.
- Using an eval set whose question mix doesn't match production.

## 10. What to Remember

- **Compare against the fixed pipeline, split by question type** — that's the decision.
- **Score multi-hop completion explicitly**; general-rule answers get zero.
- **Measure per-round information gain** to set the round cap.
- **Run cases repeatedly and report pass rates** — variance is visible to users.
- **Match the eval set's question mix to production**, or the routing threshold is wrong.
