# Gemini Model Families

> **Phase 19 · GOOGLE GEMINI · Topic 02**

## 1. Definition

The tiers within the Gemini family — broadly a capable flagship tier, a fast cost-efficient tier, and a compact tier — differing in capability, latency, and price by roughly an order of magnitude between ends.

## 2. Simple Explanation

Google publishes several Gemini variants at once. The pattern is consistent across generations: a **Pro**-class model for hard reasoning, a **Flash**-class model for speed and cost, and smaller variants below that.

The engineering skill isn't knowing today's version numbers — it's knowing how to pick a tier and how to prove the choice.

## 3. How It Works

```
PRO-class      strongest reasoning, highest cost and latency
               → complex analysis, planning, hard multi-step
                 reasoning

FLASH-class    much faster and cheaper, very capable
               → the default for most production workloads,
                 including RAG generation

FLASH-LITE /   smallest, cheapest, fastest
SMALLER        → classification, routing, extraction, simple
                 transformation
```

**Version numbers change frequently.** The durable knowledge is the tier structure and the selection method — naming a specific version in an interview risks being out of date, while explaining the tiering doesn't.

## 4. Practical Example

**Tiering within one system, which is the real answer:**

```
Classification / routing        → smallest tier
  "is this a simple lookup or investigative?"
  Short input, constrained output, no reasoning required.

RAG generation                  → Flash-class
  Grounded answering from retrieved context. The task is
  faithful synthesis, not reasoning from scratch.

Complex investigation           → Pro-class
  Multi-step reconciliation across sources where the
  reasoning is the hard part.

Reranking                       → a cross-encoder, not an LLM
  Wrong tool for the job at any tier.
```

**Using one model everywhere is the common mistake** — either paying flagship prices for classification, or getting flagship-level answers wrong by using the smallest tier for reasoning.

**How to actually choose:**

```
1. Build a golden set for the specific task
2. Run every candidate tier against it
3. Measure quality, p95 latency, and cost per request
4. Pick the cheapest tier meeting the quality bar

Most teams assume they need the strongest model. In RAG
specifically, generation is constrained by retrieved context
— the model isn't reasoning from scratch — so a Flash-class
model often matches Pro-class on groundedness at a fraction
of the cost.

That's a measurable claim, and measuring it is the answer.
```

## 5. Why It Matters

- **Tiering within one system** is the cost lever most teams don't use.
- **RAG generation rarely needs the flagship tier**, because context constrains the task.
- **Measuring on a task-specific golden set** turns model choice from assumption to evidence.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **One model for everything** | Overpaying or underperforming somewhere |
| **Defaulting to the flagship** | Often unnecessary for grounded generation |
| **Smallest tier for reasoning** | Fails on multi-step tasks |
| **Choosing on benchmarks** | Public benchmarks aren't your task |
| **Not re-evaluating on new releases** | Cheaper tiers catch up quickly |
| **Version drift** | Behaviour changes between releases |

**On public benchmarks:** they measure general capability on tasks that aren't yours. A model that scores higher on a reasoning benchmark may be no better at faithful synthesis from retrieved banking policy. The only benchmark that matters is a golden set built from your actual queries.

**On re-evaluating:** the capability of a given tier improves substantially between generations, so a task that required Pro-class a year ago may run fine on Flash-class now. Re-running the tier comparison on each release is a recurring cost reduction that's easy to forget, because nothing prompts you to.

## 7. Interview Answer

> "The pattern is consistent across generations: a Pro-class model for hard reasoning, a Flash-class model for speed and cost, and smaller variants below that for simple tasks. Version numbers change frequently, so what's durable is the tier structure and how you choose between them.
>
> The real answer is that you tier *within* one system rather than picking one model. Classification and routing — is this a simple lookup or an investigative question — is short input, constrained output, no reasoning, so the smallest tier. RAG generation is Flash-class. Complex multi-step investigation reconciling several sources is where Pro-class earns its cost. And reranking should be a cross-encoder rather than an LLM at any tier — wrong tool for the job.
>
> Using one model everywhere is the common mistake, and it fails in both directions: paying flagship prices for classification, or using the smallest tier for reasoning and getting wrong answers.
>
> The point I'd make about RAG specifically is that generation is constrained by the retrieved context. The model isn't reasoning from scratch — it's synthesizing faithfully from what it was given. So a Flash-class model often matches Pro-class on groundedness at a fraction of the cost. That's a measurable claim, and measuring it is the answer.
>
> How I'd actually choose: build a golden set for the specific task, run every candidate tier against it, and measure quality, p95 latency, and cost per request. Then pick the cheapest tier that meets the quality bar. Most teams assume they need the strongest model and never test the assumption.
>
> I'd avoid choosing on public benchmarks. They measure general capability on tasks that aren't mine — a model scoring higher on a reasoning benchmark may be no better at faithful synthesis from banking policy documents.
>
> And I'd re-run the comparison on each new release. Tier capability improves substantially between generations, so a task needing Pro-class a year ago may run fine on Flash-class now. That's a recurring cost reduction that's easy to miss because nothing prompts you to check."

## 8. Likely Follow-ups

**Q: How do you choose a model tier?**
Build a golden set for the specific task, run each candidate against it, and measure quality, p95 latency, and cost per request. Pick the cheapest tier meeting the quality bar. Assuming you need the flagship without testing is the most common and most expensive mistake.

**Q: Which tier for RAG generation?**
Usually Flash-class. Generation in RAG is constrained by the retrieved context — the model synthesizes faithfully rather than reasoning from scratch — so the extra capability of the flagship tier often doesn't show up in groundedness scores while the cost difference is large.

**Q: Should you use one model throughout?**
No. Tier within the system — the smallest model for classification and routing, Flash-class for generation, Pro-class only where multi-step reasoning is genuinely the hard part. One model everywhere means overpaying somewhere or underperforming somewhere.

**Q: Are public benchmarks useful for this?**
Not really. They measure general capability on tasks that aren't yours, and a higher reasoning score doesn't imply better faithful synthesis from your policy documents. A golden set from your own queries is the only benchmark that answers the actual question.

**Q: Do you revisit the choice?**
On every release. Tier capability improves substantially between generations, so a task that needed the flagship a year ago may run fine on a cheaper tier now. Re-running the comparison is a recurring cost reduction nobody prompts you to look for.

## 9. Common Mistakes

- Using one model for every task in the system.
- Defaulting to the flagship for grounded generation.
- Choosing on public benchmark scores.
- Using an LLM for reranking instead of a cross-encoder.
- Never re-evaluating tier choice after new releases.

## 10. What to Remember

- **Pro for reasoning, Flash for production, smaller for classification.**
- **Tier within the system** — that's the cost lever.
- **RAG generation rarely needs the flagship** — context constrains the task.
- **Choose on a task-specific golden set**, not public benchmarks.
- **Re-evaluate on each release** — cheaper tiers catch up.
