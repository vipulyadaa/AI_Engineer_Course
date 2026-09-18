# Smaller Models

> **Phase 25 · LLM COST OPTIMIZATION · Topic 10**

## 1. Definition

Using a smaller or cheaper model where it measurably suffices — either a lower tier of the same family, or a specialized model that does one job better than a general LLM.

## 2. Simple Explanation

"Use a smaller model" usually means a cheaper tier of the same family. The more interesting version is using a *different kind* of model entirely.

A cross-encoder reranker isn't a smaller LLM — it's a model built for one task, and it beats any LLM at that task while costing a fraction.

## 3. How It Works

```
TIER DOWNGRADE          Pro-class → Flash-class → smallest
                        same family, less capability, less cost

SPECIALIZED MODEL       a different architecture for one job
  cross-encoder reranker    ranking — better AND cheaper
  embedding model           retrieval — not an LLM at all
  NLI entailment model      grounding checks — cheap, fast
  a trained classifier      routing — cheapest of all

SELF-HOSTED OPEN MODEL  Gemma or similar on a dedicated
                        endpoint — per-uptime cost, not
                        per-token
```

**The specialized-model row is the one worth leading with**, because it's not a quality compromise — a purpose-built model is genuinely better at its task.

## 4. Practical Example

**The reranker, which is the clearest case:**

```
Reranking with an LLM:
  · a model call per candidate, or a long prompt with all
    candidates
  · slow, expensive, and worse at ranking

Reranking with a cross-encoder:
  · scores query-document pairs jointly, which is what
    ranking actually requires
  · a fraction of the cost
  · faster
  · better results

Cheaper AND better, which is rare. Using an LLM for
reranking is the most expensive avoidable mistake in a RAG
pipeline, and it happens because the LLM is already there.
```

**The classifier, which is the cheapest of all:**

```
Query routing — simple, multi-part, out of scope — is a
classification problem.

A small model with enum-constrained output works. A trained
classifier on labelled production queries is cheaper still,
and once you have a few thousand labelled examples it's
usually more accurate too, because it's fit to your actual
query distribution.

That's the cheapest component in the pipeline doing one of
the highest-value jobs.
```

**Grounding checks with an NLI model:**

```
"Is this claim entailed by this passage" is a natural
language inference task, and NLI models do it at a fraction
of an LLM judge's cost.

Good for direct claims; weaker on derived conclusions where
the check is whether premises support an inference. So:
NLI for the bulk, LLM judge for the harder cases — which
is itself a routing decision.
```

**Where NOT to go smaller:** the final customer answer, if the golden set shows a measurable quality drop. And any step whose failure is a safety property rather than a quality one — saving there trades a control for a small cost reduction.

## 5. Why It Matters

- **Specialized models are cheaper *and* better** — not a quality compromise.
- **LLM reranking is the most expensive avoidable mistake** in a RAG pipeline.
- **A trained classifier** is the cheapest component doing a high-value job.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Using an LLM for ranking** | Slower, costlier, and worse |
| **Downgrading without measuring** | Cheaper and worse isn't cheaper |
| **Self-hosted endpoint left idle** | Billed per uptime regardless of use |
| **A specialized model per task** | Operational sprawl |
| **Smaller model on safety-critical steps** | Trading a control for pennies |
| **Assuming open models match on generation** | Usually they don't |

**On self-hosted economics:** an open model on a dedicated endpoint is billed for uptime, not per request. That's cheaper at sustained high volume and more expensive at low or spiky volume — so the break-even depends on utilization, and an idle GPU endpoint bills continuously whether or not anything calls it.

**On operational sprawl:** every specialized model is another thing to deploy, version, monitor, and patch. A reranker is worth that because the quality gain is large. Adding four specialized models each saving a little is a maintenance burden that outweighs the saving, and the decision should account for the operational cost rather than only the inference cost.

## 7. Interview Answer

> "'Use a smaller model' usually means a cheaper tier of the same family. The more interesting version is using a different kind of model entirely — and that's not a quality compromise, because a purpose-built model is genuinely better at its task.
>
> The clearest case is reranking. Using an LLM means a call per candidate or a long prompt with all of them — slow, expensive, and worse at ranking. A cross-encoder scores query-document pairs jointly, which is what ranking actually requires, at a fraction of the cost, faster, with better results. Cheaper and better, which is rare. Using an LLM for reranking is the most expensive avoidable mistake in a RAG pipeline, and it happens because the LLM is already in the stack.
>
> The cheapest component doing a high-value job is the router. Classifying a query as simple, multi-part, or out of scope is a classification problem. A small model with enum-constrained output works, and a trained classifier on labelled production queries is cheaper still — and once you have a few thousand labelled examples it's usually more accurate too, because it's fit to your actual query distribution rather than being general-purpose.
>
> For grounding checks, an NLI entailment model handles 'is this claim entailed by this passage' at a fraction of an LLM judge's cost. It's good for direct claims and weaker on derived conclusions where the check is whether premises support an inference — so NLI for the bulk and an LLM judge for the harder cases, which is itself a routing decision.
>
> Where I wouldn't go smaller: the final customer answer if the golden set shows a measurable quality drop, and any step whose failure is a safety property rather than a quality one. Saving there trades a control for a small cost reduction, which is the wrong trade at any price.
>
> Two operational points. Self-hosted open models are billed per uptime rather than per request, so the economics depend entirely on utilization — cheaper at sustained high volume, more expensive at low or spiky volume, and an idle GPU endpoint bills continuously whether anything calls it or not.
>
> And operational sprawl. Every specialized model is another thing to deploy, version, monitor, and patch. A reranker is worth that because the quality gain is large. Adding four specialized models each saving a little is a maintenance burden that outweighs the saving — so the decision should account for operational cost, not just inference cost."

## 8. Likely Follow-ups

**Q: What's the clearest case for a specialized model?**
A cross-encoder reranker. It scores query-document pairs jointly, which is what ranking requires, at a fraction of an LLM's cost — faster and with better results. Cheaper and better simultaneously, which is rare enough to be worth leading with.

**Q: What's the most expensive avoidable mistake?**
Using an LLM for reranking. It's slower, costlier, and worse than a purpose-built cross-encoder, and it happens because the LLM is already in the stack so reaching for it feels natural.

**Q: What about routing?**
A trained classifier on labelled production queries is the cheapest component in the pipeline, and once you have a few thousand examples it's usually more accurate than a general model too — because it's fit to your actual query distribution rather than being general-purpose.

**Q: When shouldn't you go smaller?**
On the final customer answer if the golden set shows a measurable quality drop, and on any step whose failure is a safety property rather than a quality one. Trading a control for a small cost reduction is the wrong trade at any price.

**Q: What's the catch with self-hosted models?**
They're billed per uptime rather than per request, so an idle GPU endpoint bills continuously. The economics depend entirely on utilization — cheaper at sustained high volume, more expensive at low or spiky volume — and every one adds operational burden.

## 9. Common Mistakes

- Using an LLM where a cross-encoder or classifier fits.
- Downgrading a tier without measuring quality.
- Leaving self-hosted endpoints idle.
- Adding specialized models whose maintenance exceeds the saving.
- Economizing on steps whose failure is a safety property.

## 10. What to Remember

- **Specialized models are cheaper *and* better** — not a compromise.
- **LLM reranking is the most expensive avoidable mistake.**
- **A trained classifier** is the cheapest component doing a high-value job.
- **Self-hosted is per-uptime** — the break-even depends on utilization.
- **Count operational cost**, not just inference cost, per specialized model.
