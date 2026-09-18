# How Do You Evaluate a RAG System?

> **Phase 12 · RAG EVALUATION · Topic 16**

## 1. Definition

Evaluate the **stages separately**, because they fail differently and have different fixes. Retrieval quality, generation faithfulness, and end-to-end usefulness are three distinct measurements, and an aggregate score tells you something is wrong without telling you where.

## 2. Simple Explanation

The instinct is to measure "is the answer good." That's necessary and insufficient.

A bad answer could be retrieval failing, generation hallucinating, or the prompt being off-target — three completely different fixes. Measuring per stage localizes the failure in one evaluation pass.

## 3. How It Works

**The complete evaluation stack:**

```
INGESTION
  · chunks per document (alert on zero)
  · corpus coverage: % of source docs producing chunks

RETRIEVAL
  · recall@k at several k   ← the ceiling
  · precision@k / context relevance
  · MRR for ranking quality

GENERATION
  · groundedness / faithfulness
  · answer relevance
  · citation validity

END-TO-END
  · human-rated correctness on a sample
  · escalation rate, thumbs-down (online)

OPERATIONAL
  · p95 latency, cost per query
  · abstention rate (both directions)
```

**The diagnostic table — the reason for measuring separately:**

| Context rel. | Groundedness | Answer rel. | Fix |
|---|---|---|---|
| Low | — | — | Retrieval: chunking, hybrid, embeddings |
| High | Low | — | Generation: prompt, abstention, temperature |
| High | High | Low | Prompt focus |
| High | High | High | Working |

## 4. Practical Example

**The evaluation cadence that works in practice:**

```
Every commit  (free, deterministic)
  recall@k, MRR, exact-figure checks, latency, token counts

Every PR / nightly  (judge-based, sampled)
  groundedness, answer relevance, context relevance
  gate: absolute floors + no >2pp regression vs. production baseline

Weekly  (human, ~200 stratified samples)
  correctness, compliance, judge calibration

Continuously  (production)
  escalation rate, abstention rate, coverage gaps,
  clustered failure analysis
```

**The golden dataset composition that makes this work:**

```
40%  common factual lookups
15%  multi-part / comparison      → tests decomposition
10%  exact identifiers            → tests hybrid retrieval
10%  conversational follow-ups    → tests query rewriting
15%  out-of-scope (should abstain) → tests abstention  ← don't skip
10%  edge cases / rare products

Split: 70% dev (iterate freely) / 30% test (touch once per release)
```

## 5. Why It Matters

- **Per-stage measurement is what makes failures diagnosable** rather than mysterious.
- **The out-of-scope portion is what makes abstention measurable**, and abstention is the highest-value safety behavior.
- **Offline gates changes; online validates impact.** Neither alone is sufficient.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Only measuring end-to-end** | Tells you something is wrong, not where |
| **No out-of-scope questions** | Over-answering is invisible |
| **Eval questions written from documents** | Vocabulary leakage inflates retrieval metrics |
| **No dev/test split** | Reported metrics optimistic by an unknown amount |
| **Uncalibrated LLM judge** | Reporting a number with unknown error |
| **No guardrails** | Shipping a quality win that doubled latency |
| **Offline only** | Optimizing an unvalidated proxy |

**The single most common gap:** teams measure answer quality and nothing else, so when quality drops they don't know whether to look at chunking, the embedding model, the reranker, or the prompt — and they usually guess wrong, starting with the prompt because it's easiest to change.

## 7. Interview Answer

> "I'd evaluate the stages separately, because they fail differently and have different fixes. Measuring only end-to-end answer quality tells me something is wrong without telling me where — and teams usually guess wrong, starting with the prompt because it's easiest to change.
>
> Retrieval I'd measure with recall@k at several k values against a golden dataset. Recall is the hard ceiling — if the right chunk isn't retrieved, nothing downstream fixes it. Measuring at multiple k also separates ranking problems from retrieval problems: a large gap between recall@20 and recall@5 means reranking will help, while both being low means the problem is upstream.
>
> Generation I'd measure with groundedness — the fraction of claims supported by the retrieved context — and answer relevance, whether the response addressed the question. Those catch different failures: an answer can be perfectly grounded and useless if it faithfully summarizes irrelevant context.
>
> Together with context relevance, those three localize any failure. Low context relevance means retrieval. High context relevance with low groundedness means hallucination. High on both with low answer relevance means the prompt is off-target.
>
> The golden dataset matters more than the metrics. Questions sampled from production logs, not written from the documents — writing them from the source leaks vocabulary and inflates retrieval scores. And about fifteen percent deliberately out-of-scope questions, because without those, over-answering is invisible and you'll tune away abstention without noticing.
>
> Then a dev/test split, deterministic metrics in CI every commit, judge-based metrics per PR, human evaluation weekly to calibrate the judges, and production monitoring for escalation and abstention rates."

## 8. Likely Follow-ups

**Q: What's the single most important metric?**
Recall@k, because it's the hard ceiling — everything downstream is bounded by whether the right information was retrieved. But it's insufficient alone: high recall with terrible precision, or with a model that ignores the context, still produces bad answers. If forced to two, recall@k and groundedness.

**Q: How do you build the evaluation dataset?**
Sample questions from production logs so the phrasing is real, have a domain expert identify the correct source sections and write expected answers, and deliberately include out-of-scope questions. Tag by query type so you can slice. Split into dev and test. And label ground truth at section or span level rather than chunk IDs, so re-chunking doesn't invalidate everything.

**Q: How do you know a change actually helped?**
Offline first — run the eval set, compare to the production baseline, check both absolute floors and relative regression across all metrics plus guardrails. Then online, ideally an A/B test on a primary business metric like escalation rate, with latency and cost as guardrails. Offline gates; online validates.

**Q: What do you monitor in production?**
Escalation rate and thumbs-down as quality proxies, abstention rate in both directions, the fraction of queries retrieving nothing above threshold as a coverage signal, and p95 latency and cost per query. Plus sampled LLM judging for groundedness. And I'd cluster failures monthly into a prioritized backlog.

**Q: How do you catch regressions before users do?**
Automated evaluation in CI with gates — deterministic metrics on every commit, judge-based metrics on every PR, checking both absolute thresholds and regression against the current production baseline. The relative check is the important one: a floor of 0.85 passes a drop from 0.88 to 0.86, and that gradual decay is how systems degrade.

## 9. Common Mistakes

- Measuring only end-to-end answer quality.
- Writing eval questions from the source documents.
- Omitting out-of-scope questions, making over-answering invisible.
- Using an uncalibrated LLM judge.
- Optimizing offline metrics without validating online impact.

## 10. What to Remember

- **Measure per stage** — retrieval, generation, end-to-end. Aggregates don't localize failures.
- **The triad diagnoses:** context relevance → retrieval; groundedness → hallucination; answer relevance → prompt focus.
- **recall@k is the ceiling.** Measure at several k to separate ranking from retrieval problems.
- **15% out-of-scope questions** so abstention is measurable.
- **Offline gates every change; online validates it mattered.** Both are needed.
