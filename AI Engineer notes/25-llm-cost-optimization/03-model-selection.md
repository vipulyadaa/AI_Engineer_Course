# Model Selection (Cost)

> **Phase 25 · LLM COST OPTIMIZATION · Topic 03**

## 1. Definition

Choosing the cheapest model tier that meets the quality bar for each specific task — which usually means several tiers across one system rather than one model everywhere.

> Selection methodology is in [19-google-gemini/16](../19-google-gemini/16-gemini-model-selection.md). This topic is the cost argument.

## 2. Simple Explanation

Tier pricing differs by a large multiple. Using the flagship for every task in a system means paying reasoning prices for classification.

The saving comes from noticing that most tasks in a RAG system don't need reasoning at all.

## 3. How It Works

```
TASK                      TIER            WHY
classification/routing    smallest        short input, enum
                                          output, no reasoning
query rewriting           smallest        mechanical transform
RAG generation            Flash-class     synthesis, constrained
                                          by context
verification/grading      Flash-class     checking text against
                                          text
complex reconciliation    Pro-class       reasoning IS the task
reranking                 cross-encoder   not an LLM at all
```

**Reranking with an LLM is the most expensive mistake** on that list — a cross-encoder does it better and at a fraction of the cost.

## 4. Practical Example

**The claim worth testing, because it's the largest saving:**

```
"RAG generation doesn't need the flagship tier."

The reasoning: generation is constrained by retrieved
context. The model synthesizes faithfully from what it was
given rather than reasoning from scratch. So the extra
capability of the top tier often doesn't appear in
groundedness or answer-correctness scores, while the cost
difference is a large multiple.

Test it properly:
  · same prompt, same temperature, same retrieved context
  · the golden set, per question type
  · measure groundedness, answer correctness, latency, cost

If it holds, it's typically the single largest cost
reduction available in a RAG system — larger than any
prompt or retrieval optimization.
```

**Tiering within the pipeline, quantified:**

```
Say a request involves:
  1 classification call
  1 query rewrite call
  1 generation call
  1 verification call

All on the flagship: 4 expensive calls.
Tiered: 2 cheapest + 2 Flash-class.

Classification and rewriting are short, mechanical, and
constrained — they gain nothing from a stronger model, and
they're half the calls.
```

**Where NOT to economize:**

```
· the final answer to a customer, if quality measurably
  drops
· complex reconciliation where reasoning is the task
· any step whose failure is a safety property rather than
  a quality one

The test is whether the golden set shows a difference. If
it does, the cheaper tier isn't cheaper — it's worse.
```

## 5. Why It Matters

- **Tier choice is typically the largest single cost lever** in a RAG system.
- **RAG generation rarely needs the flagship** — a measurable claim worth testing.
- **Half the calls in a pipeline are mechanical** and belong on the smallest tier.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **One tier throughout** | Paying reasoning prices for classification |
| **LLM reranking** | A cross-encoder is better and far cheaper |
| **Downgrading without measuring** | Cheaper and worse isn't cheaper |
| **Comparing with different prompts** | Measures the prompt, not the model |
| **Never re-evaluating on new releases** | Cheaper tiers catch up |
| **Economizing on safety-critical steps** | The wrong place to save |

**On re-evaluating:** tier capability improves substantially between generations, so a task that needed Pro-class a year ago may run fine on Flash-class now. Re-running the comparison on each release is a recurring cost reduction that nothing prompts you to take — it needs scheduling, because no signal tells you the cheaper tier has caught up.

**On the comparison being valid:** prompt, temperature, and retrieved context must be identical across tiers. A weaker model with a better-tuned prompt beating a stronger one tells you about the prompt. And the comparison is best run in the isolated setting — perfect context supplied — because retrieval variance otherwise swamps the model difference.

## 7. Interview Answer

> "Tier pricing differs by a large multiple, so using the flagship for every task means paying reasoning prices for classification. The saving comes from noticing that most tasks in a RAG system don't need reasoning at all.
>
> Across a pipeline I'd expect: the smallest tier for classification and query rewriting, Flash-class for generation and verification, Pro-class only where multi-step reasoning is genuinely the task, and a cross-encoder rather than an LLM for reranking. That last one is the most expensive mistake on the list — a cross-encoder does reranking better and at a fraction of the cost, and using an LLM for it is the wrong tool at any tier.
>
> Quantified: a request involving classification, query rewriting, generation, and verification is four calls. All on the flagship, that's four expensive calls. Tiered, it's two on the cheapest tier and two on Flash-class — and classification and rewriting are short, mechanical, constrained tasks that gain nothing from a stronger model. Half the calls, essentially free.
>
> But the claim worth testing explicitly is that RAG generation doesn't need the flagship tier. The reasoning is that generation is constrained by retrieved context — the model synthesizes faithfully from what it was given rather than reasoning from scratch — so the extra capability often doesn't appear in groundedness or answer-correctness scores while the cost difference is a large multiple. If that holds, it's typically the single largest cost reduction available in the system, larger than any prompt or retrieval optimization.
>
> Testing it properly means identical prompt, temperature, and retrieved context across tiers, measured on the golden set per question type. A weaker model with a better-tuned prompt beating a stronger one tells you about the prompt, not the model. And I'd run it in the isolated setting — perfect context supplied — because retrieval variance otherwise swamps the model difference.
>
> Where I wouldn't economize: the final customer answer if quality measurably drops, complex reconciliation where reasoning is the task, and any step whose failure is a safety property rather than a quality one. The test is whether the golden set shows a difference — if it does, the cheaper tier isn't cheaper, it's worse.
>
> One recurring saving people miss: tier capability improves substantially between generations, so a task needing Pro-class a year ago may run fine on Flash-class now. Nothing prompts you to check, so re-running the comparison on each release has to be scheduled."

## 8. Likely Follow-ups

**Q: What's the biggest cost lever in model selection?**
Testing whether RAG generation needs the flagship tier. Generation is constrained by retrieved context, so the extra capability often doesn't show in groundedness scores while costing a large multiple. If it holds, it's the single largest saving available.

**Q: How do you tier within a pipeline?**
Smallest tier for classification and query rewriting, Flash-class for generation and verification, Pro-class only where reasoning is genuinely the task, and a cross-encoder for reranking. Classification and rewriting are typically half the calls and gain nothing from a stronger model.

**Q: What's the most expensive mistake?**
Using an LLM for reranking. A cross-encoder does it better and at a fraction of the cost — it's the wrong tool at any tier, and it's an easy one to reach for because the LLM is already in the pipeline.

**Q: How do you make the comparison valid?**
Identical prompt, temperature, and retrieved context across tiers, on the golden set, per question type. And ideally in the isolated setting with perfect context supplied, because retrieval variance otherwise swamps the model difference you're trying to measure.

**Q: Where shouldn't you economize?**
The final customer answer if quality measurably drops, complex reconciliation where reasoning is the task, and any step whose failure is a safety property. The test is the golden set — if it shows a difference, the cheaper tier is worse rather than cheaper.

## 9. Common Mistakes

- One model tier across the whole pipeline.
- Using an LLM for reranking.
- Downgrading a tier without measuring the quality effect.
- Comparing tiers with different prompts or contexts.
- Never re-evaluating after new model releases.

## 10. What to Remember

- **Tier within the pipeline** — classification and rewriting on the smallest.
- **Test whether generation needs the flagship** — usually the largest saving.
- **A cross-encoder for reranking**, never an LLM.
- **Hold prompt, temperature, and context constant** when comparing.
- **Schedule re-evaluation on releases** — nothing else prompts it.
