# Prompt Optimization (Cost)

> **Phase 25 · LLM COST OPTIMIZATION · Topic 07**

## 1. Definition

Reducing the token cost of the prompt itself — the system instruction, few-shot examples, and output formatting instructions. Genuinely useful and consistently over-prioritized relative to its share of the bill.

## 2. Simple Explanation

The prompt is the part of the request engineers wrote and can see, so it's where optimization instinctively starts.

In a RAG system it's typically two to three percent of input tokens. Shortening it while sending twenty retrieved chunks is optimizing the wrong thing.

## 3. How It Works

```
WHERE PROMPT TOKENS GO

  system instruction     300-600
  few-shot examples      0-3,000   ← often the largest part
  output format spec     50-200
                        ─────────
                        ~400-3,800 of ~17,000 input tokens

THE ORDER THAT ACTUALLY WORKS
  1. cache the prefix         → most of the cost, no quality loss
  2. replace few-shot with a response schema
  3. remove accumulated instructions and measure
  4. tighten wording          ← smallest, and where people start
```

**Caching before shortening.** Caching removes most of the prefix cost while keeping every instruction; shortening trades quality for a fraction of that.

## 4. Practical Example

**Few-shot examples replaced by structured output:**

```
Three worked examples showing the desired JSON shape:
~2,000 tokens, sent on every request.

A response schema constrains the output by construction:
  · zero tokens per request
  · more reliable than examples
  · enums prevent invented categories entirely

That's the largest prompt saving available in most systems,
and it improves reliability at the same time — the schema
enforces what the examples were only demonstrating.
```

**Instruction accumulation, which is the quiet cost:**

```
Prompts grow as cases get fixed. After a year:

  "Always mention applicable waivers."
  "Be concise."
  "Always cite sources."
  "Don't repeat the question."
  "If unsure, say so."
  "Mention the effective date where relevant."
  ... 18 more

Twenty competing instructions behave WORSE than five
well-chosen ones, and they cost tokens on every request.

The discipline: periodically remove instructions and
measure whether quality drops. Most were added for a
single case and never re-examined — and removing them is
both cheaper and better.
```

**That's the counterintuitive move**, because the instinct is that every instruction was added for a reason and removing it is risky.

**What not to cut:**

```
· the grounding rule — use only the provided context
· the abstention rule — say so if the context doesn't answer
· the prohibitions — no advice, no guarantees
· the citation requirement

Those are safety properties. They're a few dozen tokens and
cutting them saves nothing meaningful while removing a
control.
```

## 5. Why It Matters

- **The prompt is 2–3% of input** — prioritize accordingly.
- **Replacing few-shot with a response schema** is the largest prompt saving and improves reliability.
- **Removing accumulated instructions** is cheaper *and* better.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Optimizing the prompt first** | 2–3% of the bill |
| **Shortening instead of caching** | Quality traded for a fraction of the saving |
| **Few-shot examples kept unnecessarily** | Often the largest prompt component |
| **Instructions accumulating** | Worse behaviour and higher cost |
| **Cutting safety instructions** | Saves nothing, removes a control |
| **Changing prompts without evaluation** | An untested deploy |

**On the evaluation requirement:** any prompt change — including one made purely for cost — needs an evaluation run before merge. A shortened prompt that saves 200 tokens and loses two points of groundedness is a bad trade, and that's not visible from reading the diff.

**On agent systems specifically:** the prompt is sent on every step, so in a six-step agent a 2,000-token prompt is 12,000 tokens per run. Prompt size matters more in agents than in single-call RAG by roughly the step count — which is one place where prompt optimization genuinely is worth prioritizing.

## 7. Interview Answer

> "The prompt is the part engineers wrote and can see, so it's where optimization instinctively starts. In a RAG system it's typically two to three percent of input tokens — the retrieved context is the rest. Shortening the prompt while sending twenty chunks is optimizing the wrong thing.
>
> When it is worth doing, the order matters. Cache the prefix first — that removes most of the prefix cost while keeping every instruction, whereas shortening trades quality for a fraction of the same saving.
>
> Then replace few-shot examples with a response schema. Three worked examples showing a desired JSON shape might be two thousand tokens sent on every request, and a schema constrains the output by construction at zero tokens per request. It's more reliable too — enums prevent invented categories entirely, where examples only demonstrate the intent. That's the largest prompt saving available in most systems and it improves reliability at the same time.
>
> Then the counterintuitive one: remove accumulated instructions and measure. Prompts grow as cases get fixed, and after a year you have twenty competing instructions that behave worse than five well-chosen ones — and cost tokens on every request. Most were added for a single case and never re-examined. Removing them is both cheaper and better, which runs against the instinct that every instruction was added for a reason.
>
> Tightening wording is last, because it's the smallest lever and it's where people start.
>
> What I wouldn't cut: the grounding rule, the abstention rule, the prohibitions on advice and guarantees, and the citation requirement. Those are safety properties, they're a few dozen tokens, and cutting them saves nothing meaningful while removing a control.
>
> Two things I'd insist on. Any prompt change, including one made purely for cost, needs an evaluation run before merge. A shortened prompt saving two hundred tokens and losing two points of groundedness is a bad trade, and that isn't visible from reading the diff.
>
> And there's one place prompt optimization genuinely is a priority: agents. The prompt is sent on every step, so a two-thousand-token prompt in a six-step agent is twelve thousand tokens per run. Prompt size matters more there than in single-call RAG by roughly the step count — which flips the prioritization entirely."

## 8. Likely Follow-ups

**Q: How much of the bill is the prompt?**
Typically two to three percent of input tokens in a RAG system — the retrieved context is almost all of it. That's why prompt optimization, while genuinely useful, is consistently over-prioritized relative to its share.

**Q: What's the largest prompt saving?**
Replacing few-shot examples with a response schema. Examples can be two thousand tokens per request; a schema costs nothing per request and constrains output more reliably, since enums prevent invented values rather than just discouraging them.

**Q: Should you shorten the system prompt?**
Cache it first. Caching removes most of the prefix cost while keeping every instruction, whereas shortening trades quality for a fraction of that saving. Shortening is worth doing after caching, not instead of it.

**Q: What's the counterintuitive optimization?**
Removing accumulated instructions. Prompts grow as cases get fixed, and twenty competing instructions behave worse than five well-chosen ones while costing more. Removing them and measuring is usually both cheaper and better, though the instinct says it's risky.

**Q: When does prompt size really matter?**
In agents, because the prompt is sent on every step. A two-thousand-token prompt in a six-step agent is twelve thousand tokens per run, so it matters by roughly the step count more than in single-call RAG — which flips the prioritization.

## 9. Common Mistakes

- Optimizing the prompt before the retrieved context.
- Shortening rather than caching the fixed prefix.
- Keeping few-shot examples where a schema would serve.
- Letting instructions accumulate unexamined.
- Changing prompts for cost without an evaluation run.

## 10. What to Remember

- **The prompt is 2–3% of input** — prioritize the retrieved context first.
- **Cache before shortening** — same saving, no quality loss.
- **Replace few-shot with a response schema** — cheaper and more reliable.
- **Remove accumulated instructions and measure** — usually better *and* cheaper.
- **In agents the prompt is sent every step** — there it genuinely matters.
