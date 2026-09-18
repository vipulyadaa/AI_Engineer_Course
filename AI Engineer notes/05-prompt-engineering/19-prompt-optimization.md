# Prompt Optimization

> **Phase 05 · PROMPT ENGINEERING · Topic 19**

## 1. Definition

Systematically improving a prompt against measured objectives — quality, cost, and latency — rather than by intuition. It includes both manual iteration against an eval set and automated search methods.

## 2. Simple Explanation

Optimization has three axes and they trade against each other: quality, cost, and latency.

A longer prompt with more examples may improve quality and costs tokens on every request. Chain-of-thought improves reasoning and costs output tokens. The job is finding the point on that surface that fits your constraints — which requires measuring all three, not just quality.

## 3. How It Works

**The three axes:**

| Axis | Levers |
|---|---|
| **Quality** | Instructions, examples, structure, reasoning |
| **Cost** | Prompt length, few-shot count, output length, caching |
| **Latency** | Prompt length (TTFT), output length (total), model size |

**Manual optimization, which is what you'll do:**

```
1. Establish a baseline on the eval set
2. Form a hypothesis about a specific failure
3. Change ONE thing
4. Measure quality AND cost AND latency
5. Keep if the trade is favourable; revert otherwise
```

**Automated methods worth knowing by name:**

| Method | Idea |
|---|---|
| **DSPy** | Treats prompts as parameters; optimizes them against a metric programmatically |
| **APE** | An LLM generates candidate instructions; the best-scoring is selected |
| **OPRO** | An LLM iteratively proposes improved prompts given prior scores |

These are real and useful when you have a solid eval set and a well-defined metric. Without those, automated optimization optimizes noise.

## 4. Practical Example

**The cost optimizations that are free or nearly free:**

```
1. Cap max_output_tokens
   → decode dominates latency; often halves total time
   → free

2. Prompt caching on the fixed system prompt
   → skips its prefill on every request after the first
   → nearly free, improves TTFT and cost

3. Fewer, better retrieved chunks (rerank + similarity floor)
   → cuts input tokens AND improves quality (less distraction)
   → the rare change that improves both axes

4. Drop few-shot examples if zero-shot measures equivalent
   → 750 tokens/request saved permanently
```

**These come before anything clever.** They typically deliver more than a prompt-rewriting project and cost nothing.

**The quality/cost trade made explicit:**

```
Baseline:     zero-shot, 4 chunks    → groundedness 0.88, $0.0021
+5 examples:                         → groundedness 0.91, $0.0032
+CoT:                                → groundedness 0.93, $0.0048

At 10k requests/day:  the CoT version costs ~$100/day more
                      than baseline for 5 points of groundedness.

Whether that's worth it is a product decision — but you can
only make it if you measured all three axes.
```

**The reward-hacking risk in automated optimization:**

```
Optimizing against an LLM judge produces prompts the JUDGE likes —
typically verbose and confidently phrased, not necessarily correct.

Same failure as optimizing any proxy metric. Defenses: periodic
human evaluation confirming the judge still correlates with
human judgment, and a held-out set the optimizer never sees.
```

## 5. Why It Matters

- **Optimizing quality alone produces expensive, slow systems** that score well.
- **The free cost levers** deliver more than most prompt rewrites and are routinely skipped.
- **Automated optimization needs a solid eval set** — knowing that precondition is the judgment.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Optimizing quality only** | Cost and latency degrade unnoticed |
| **Skipping free levers** | Output caps and caching before clever prompt work |
| **Changing several things at once** | Unattributable |
| **Automated optimization without a good eval set** | Optimizes noise |
| **Reward hacking against a judge** | Verbose, confident, not more correct |
| **No held-out set** | Overfit prompts that don't generalize |
| **Over-optimizing for one model** | A provider update invalidates the work |

**On model-specific over-optimization:** a heavily tuned prompt can become brittle to model updates, since the tuning fits that model's particular tendencies. A robustly-specified prompt — explicit constraints, enforced schema, clear structure — generalizes better across model versions than one tuned to exploit a specific model's quirks.

**On the ordering discipline:** cheapest intervention first. Cap output tokens, enable prompt caching, reduce retrieved chunks — all free or nearly free — before investing in prompt rewriting or automated search. Teams routinely skip these because they're less interesting.

## 7. Interview Answer

> "Prompt optimization is improving a prompt against measured objectives rather than intuition, and the framing I'd use is that there are three axes — quality, cost, and latency — and they trade against each other. Optimizing quality alone produces expensive, slow systems that score well.
>
> Before any clever prompt work, I'd take the free levers. Capping max output tokens, because decode dominates latency and it often halves total time. Prompt caching on the fixed system prompt, which skips its prefill on every request after the first and improves both TTFT and cost. And reducing retrieved chunks through reranking and a similarity floor, which cuts input tokens *and* improves quality because there's less distraction — the rare change that moves both axes the right way. Those typically deliver more than a prompt-rewriting project and teams routinely skip them.
>
> Then manual iteration: establish a baseline on the eval set, form a hypothesis about a specific failure, change one thing, and measure quality, cost, and latency together. Making the trade explicit is the point — going from zero-shot to five examples to chain-of-thought might take groundedness from 0.88 to 0.93 while more than doubling cost per request. At ten thousand requests a day that's a hundred dollars a day for five points. Whether that's worth it is a product decision, but you can only make it if you measured all three.
>
> On automated methods — DSPy treats prompts as parameters and optimizes them against a metric, APE generates candidate instructions and selects the best-scoring, OPRO iteratively proposes improvements. They're genuinely useful when you have a solid eval set and a well-defined metric. Without those, they optimize noise.
>
> The risk with any automated approach is reward hacking. Optimizing against an LLM judge produces prompts the judge likes — typically verbose and confidently phrased rather than more correct. Same failure as optimizing any proxy. The defenses are periodic human evaluation confirming the judge still correlates, and a held-out set the optimizer never sees.
>
> And I'd avoid over-tuning to one model. A heavily tuned prompt becomes brittle to provider updates, whereas explicit constraints and an enforced schema generalize across versions."

## 8. Likely Follow-ups

**Q: What do you optimize for?**
Quality, cost, and latency together — they trade against each other, and optimizing quality alone produces expensive slow systems that score well. Every change should be measured on all three, with the trade made explicit so it's a product decision rather than an accident.

**Q: What are the free optimizations?**
Capping max output tokens, which often halves latency since decode dominates. Prompt caching on the fixed system prompt, which eliminates its prefill on every subsequent request. And reducing retrieved chunks via reranking, which cuts cost and improves quality simultaneously. All three come before any prompt rewriting.

**Q: What are the automated methods?**
DSPy treats prompts as optimizable parameters against a metric. APE has an LLM generate candidate instructions and selects the best-scoring. OPRO iteratively proposes improved prompts given prior scores. They work when you have a solid eval set and a well-defined metric — without those they optimize noise.

**Q: What's the risk in automated optimization?**
Reward hacking. Optimizing against an LLM judge produces prompts the judge prefers, which usually means verbose and confidently phrased rather than more correct. It's the general proxy-metric problem. Defenses are periodic human evaluation confirming the judge still correlates with human judgment, and a held-out set the optimizer never sees.

**Q: Can you over-optimize a prompt?**
Yes, in two ways. Overfitting to the eval set, which a held-out test portion catches. And over-tuning to a specific model's quirks, which makes the prompt brittle to provider updates. A robustly-specified prompt — explicit constraints, enforced schema, clear structure — generalizes better across model versions than one exploiting a particular model's tendencies.

## 9. Common Mistakes

- Optimizing quality without measuring cost and latency.
- Skipping the free levers to do clever prompt work.
- Running automated optimization without a solid eval set.
- Optimizing against a judge without human-evaluation checks.
- Over-tuning to one model version.

## 10. What to Remember

- **Three axes: quality, cost, latency.** They trade; measure all three.
- **Free levers first:** cap output tokens, prompt caching, fewer better chunks.
- **Fewer chunks improves cost AND quality** — the rare both-directions win.
- **Automated optimization needs a solid eval set**, or it optimizes noise.
- **Reward hacking against a judge** produces verbose, confident, not-more-correct prompts.
