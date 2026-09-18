# Gemini Model Selection

> **Phase 19 · GOOGLE GEMINI · Topic 16**

## 1. Definition

Choosing which Gemini tier to use for a given task, based on measured quality, latency, and cost on that task — rather than on published benchmarks or the assumption that the strongest model is needed.

## 2. Simple Explanation

The instinct is to pick the most capable model. Usually that's wrong, because most tasks in a RAG system don't need it.

The right method is boringly empirical: build a golden set for the task, run every tier, measure three things, pick the cheapest one that clears the bar.

## 3. How It Works

```
1. DEFINE THE TASK precisely
   "Generate a grounded answer from retrieved context with
    citations" — not "answer banking questions"

2. BUILD A GOLDEN SET from real queries
   50-200 cases with expected outcomes

3. RUN EVERY TIER
   measure quality, p95 latency, cost per request

4. PICK the cheapest tier meeting the quality bar

5. RE-RUN on each new release
```

**Step 1 matters more than it looks.** Model selection is per task, not per system — the right answer for classification differs from the right answer for complex reconciliation.

## 4. Practical Example

**A decision table worth building:**

```
TASK                     TIER          REASONING
classification/routing   smallest      short input, enum output,
                                       no reasoning
query rewriting          smallest      mechanical transformation
RAG generation           Flash-class   constrained by context;
                                       synthesis not reasoning
complex reconciliation   Pro-class     multi-step reasoning IS
                                       the task
verification/grading     Flash-class   checking claims against
                                       given text
reranking                cross-encoder wrong job for an LLL
                                       at any tier
```

**The claim worth testing explicitly:**

```
"RAG generation doesn't need the flagship model."

The reasoning: generation is constrained by retrieved
context. The model synthesizes faithfully from what it was
given rather than reasoning from scratch. So the extra
capability of the top tier often doesn't show up in
groundedness or answer-correctness scores, while the cost
difference is large.

That's a measurable claim. Measure it — on a golden set,
comparing groundedness and correctness across tiers at the
same temperature and prompt.

If it holds, it's typically the single largest cost
reduction available in a RAG system.
```

**What not to select on:**

```
· PUBLIC BENCHMARKS — measure general capability on tasks
  that aren't yours
· VIBES from a handful of manual tests — too few samples,
  and you'll remember the impressive cases
· THE NEWEST MODEL — new doesn't mean better for your task,
  and version churn has real cost
```

## 5. Why It Matters

- **Selection is per task**, not per system — that's the reframe.
- **RAG generation rarely needs the flagship**, and it's a measurable claim.
- **Re-running on each release** is a recurring cost reduction nobody prompts you to take.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Defaulting to the flagship** | Paying for capability the task doesn't use |
| **Smallest tier for reasoning** | Multi-step tasks fail |
| **Selecting on public benchmarks** | Measures a different task |
| **Selecting on a few manual tests** | Sample too small; biased recall |
| **Never re-evaluating** | Cheaper tiers catch up between generations |
| **Not pinning after choosing** | Behaviour drifts under a floating alias |

**On comparing fairly:** the comparison is only valid if the prompt, temperature, and retrieved context are identical across tiers. A weaker model with a better-tuned prompt can beat a stronger one, which tells you about the prompt, not the model. Fix everything else before comparing.

**On latency as a selection criterion:** cost usually dominates the discussion, but if the p95 latency target is tight, a faster tier may be required regardless of quality, and the question becomes whether the quality gap can be closed with better retrieval instead. That's often achievable — improving context quality helps a smaller model more than a larger one.

## 7. Interview Answer

> "The reframe I'd start with is that model selection is per task, not per system. The right answer for classification is different from the right answer for complex reconciliation, so a single 'which model do we use' decision is already the wrong shape.
>
> The method is boringly empirical: define the task precisely, build a golden set of fifty to two hundred cases from real queries, run every candidate tier, measure quality and p95 latency and cost per request, and pick the cheapest tier that clears the quality bar.
>
> The specific claim I'd want to test is that RAG generation doesn't need the flagship model. The reasoning is that generation is constrained by the retrieved context — the model is synthesizing faithfully from what it was given, not reasoning from scratch — so the extra capability often doesn't show up in groundedness or answer-correctness scores while the cost difference is large. That's measurable, and if it holds it's typically the single largest cost reduction available in a RAG system.
>
> Across a full system I'd expect: smallest tier for classification and query rewriting, Flash-class for generation and for verification, Pro-class only where multi-step reasoning is genuinely the task, and a cross-encoder rather than an LLM for reranking.
>
> What I'd avoid selecting on: public benchmarks, which measure general capability on tasks that aren't mine — a higher reasoning score doesn't imply better faithful synthesis from policy documents. Vibes from a handful of manual tests, because the sample is too small and you remember the impressive cases. And newness, because new doesn't mean better for a specific task and version churn has real cost.
>
> One methodological point: the comparison is only valid if prompt, temperature, and retrieved context are identical across tiers. A weaker model with a better-tuned prompt beating a stronger one tells you about the prompt, not the model.
>
> And if the p95 latency target is tight, a faster tier may be required regardless of quality — in which case the question becomes whether the gap can be closed with better retrieval instead. That's often achievable, because improving context quality helps a smaller model more than a larger one.
>
> Last thing: re-run the comparison on each new release. Tier capability improves substantially between generations, so a task needing Pro-class a year ago may run fine on Flash-class now. Nothing prompts you to check, so it has to be scheduled."

## 8. Likely Follow-ups

**Q: How do you select a model?**
Define the task precisely, build a golden set from real queries, run every candidate tier measuring quality, p95 latency, and cost, then pick the cheapest tier meeting the quality bar. Selection is per task, so a system usually ends up using several tiers.

**Q: Does RAG generation need the flagship?**
Usually not, and it's worth testing explicitly. Generation is constrained by retrieved context — faithful synthesis rather than reasoning from scratch — so the extra capability often doesn't show in groundedness scores while the cost difference is large. It's typically the biggest available saving.

**Q: Why not use public benchmarks?**
They measure general capability on tasks that aren't yours. A model scoring higher on a reasoning benchmark may be no better at faithful synthesis from banking policy documents. The only benchmark that answers your question is a golden set built from your own queries.

**Q: What makes a comparison valid?**
Holding everything else constant — identical prompt, temperature, and retrieved context across tiers. Otherwise a weaker model with a better-tuned prompt beats a stronger one, and you've learned something about the prompt rather than about model selection.

**Q: What if latency is the constraint?**
A faster tier may be required regardless of quality, and then the question becomes whether the gap can be closed with better retrieval. That's often possible — improving context quality helps a smaller model more than a larger one, since the smaller model benefits more from being told exactly what it needs.

## 9. Common Mistakes

- Making one model decision for the whole system.
- Defaulting to the flagship for grounded generation.
- Selecting on public benchmarks or a handful of manual tests.
- Comparing tiers with different prompts or contexts.
- Never re-evaluating after new releases.

## 10. What to Remember

- **Selection is per task**, so a system uses several tiers.
- **Measure quality, p95 latency, and cost** on a real golden set.
- **Test the claim that generation doesn't need the flagship** — usually the biggest saving.
- **Hold prompt, temperature, and context constant** when comparing.
- **Re-run on each release** and pin the version once chosen.
