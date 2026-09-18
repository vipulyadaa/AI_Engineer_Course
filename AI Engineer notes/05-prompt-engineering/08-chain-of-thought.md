# Chain-of-Thought (CoT)

> **Phase 05 · PROMPT ENGINEERING · Topic 08**

## 1. Definition

Prompting the model to produce intermediate reasoning steps before its final answer. It improves accuracy on multi-step problems by giving the model more computation — more tokens — to work through the problem before committing.

## 2. Simple Explanation

A model has to produce its answer token by token with no lookahead. Asking for a direct answer means it commits immediately.

Chain-of-thought lets it work through the problem in the output, using those intermediate tokens as scratch space. The reasoning tokens are computation, not decoration.

## 3. How It Works

**Two forms:**

```
ZERO-SHOT CoT   append "Let's think step by step."
                (Kojima et al., 2022 — works without examples)

FEW-SHOT CoT    provide examples that include worked reasoning
                (Wei et al., 2022 — the original formulation)
```

**Why it works — the mechanistic explanation:**

```
The model generates one token at a time with no ability to revise.
A direct answer means committing after minimal computation.

Reasoning tokens give the model more forward passes to
condition on, and each intermediate conclusion becomes context
for the next step. It's effectively using the output sequence
as working memory.

That's why CoT helps most on problems requiring several
dependent steps and barely at all on direct lookup.
```

**Where it helps and where it doesn't:**

| Task | CoT helps? |
|---|---|
| Multi-step arithmetic | ✅ Substantially |
| Logical deduction | ✅ |
| Multi-hop questions over retrieved context | ✅ |
| Comparison requiring synthesis | ✅ |
| **Direct factual lookup from context** | ❌ Adds latency and cost for nothing |
| **Classification** | ❌ Usually not worth it |

## 4. Practical Example

**In RAG, apply it selectively:**

```
"What's the international wire fee?"
  → direct lookup. CoT adds output tokens, latency, and cost
    for no gain.

"Is our current wire fee higher than last year's, and does the
 Premier waiver still apply?"
  → three facts, a comparison, and a conditional.
    CoT genuinely helps.

So: route. A cheap classifier or heuristic on question
structure decides whether to request reasoning.
```

**The critical caveat — reasoning is not verification:**

```
The model can produce plausible-looking reasoning that leads
to a wrong answer, and can produce reasoning that doesn't
actually correspond to how it arrived at the answer.

CoT is not an explanation of the model's computation.
It's additional computation that tends to improve the answer.

Those are different claims, and presenting CoT output as
an explanation of the model's reasoning is an overclaim
an interviewer may probe.
```

**Hiding the reasoning:**

```
Users usually don't want to read the reasoning. Options:

· Structured output: {"reasoning": "...", "answer": "..."}
  → show only the answer, keep reasoning for logs and audit
· Delimiters: <thinking>...</thinking><answer>...</answer>
  → strip the thinking block before display

Keeping the reasoning in logs is genuinely useful for debugging
even when it's hidden from the user.
```

## 5. Why It Matters

- **It's the standard technique for multi-step reasoning**, and the mechanistic explanation distinguishes a good answer.
- **Applying it selectively** rather than universally is the cost-conscious view.
- **"Reasoning isn't explanation"** is the caveat that shows you haven't over-read the technique.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Output token cost** | Reasoning can be several times the answer's length |
| **Latency** | Decode is sequential; more tokens means proportionally more time |
| **Applied universally** | Most RAG queries are direct lookups that don't need it |
| **Treating reasoning as explanation** | It's computation, not a faithful account |
| **Plausible wrong reasoning** | Confident, well-structured, and incorrect |
| **Reasoning shown to users** | Usually unwanted; and it exposes internal process |

**On reasoning models:** newer models are trained to reason before answering, with the reasoning managed internally rather than requested through prompting. Where those are available, explicit CoT prompting is largely redundant — the behavior is built in. Worth knowing so you don't apply a technique the model already does.

**On self-consistency:** generating several reasoning paths at moderate temperature and taking the majority final answer improves reliability further, at N times the cost. That's the natural extension of CoT and it's covered in its own topic.

## 7. Interview Answer

> "Chain-of-thought prompts the model to produce intermediate reasoning steps before its final answer. Two forms: zero-shot, where you just append 'let's think step by step,' and few-shot, where the examples include worked reasoning.
>
> The mechanistic explanation is the useful one. The model generates tokens one at a time with no ability to revise, so a direct answer means committing after minimal computation. Reasoning tokens give it more forward passes, and each intermediate conclusion becomes context for the next step — it's effectively using the output sequence as working memory. That's why it helps substantially on multi-step problems and barely at all on direct lookup.
>
> In a RAG system that means applying it selectively. 'What's the international wire fee' is a direct lookup; chain-of-thought adds output tokens, latency, and cost for no gain. 'Is our current fee higher than last year's and does the Premier waiver still apply' needs three facts, a comparison, and a conditional — there it genuinely helps. So I'd route based on question structure rather than applying it universally.
>
> The caveat I'd give is that reasoning is not verification, and it's not an explanation. The model can produce plausible, well-structured reasoning that leads to a wrong answer, and the reasoning it writes doesn't necessarily correspond to how it actually arrived at the answer. Chain-of-thought is additional computation that tends to improve the answer — that's a different claim from it being an account of the model's process, and conflating them is an overclaim.
>
> Operationally I'd hide the reasoning from users — structured output with separate reasoning and answer fields, showing only the answer — while keeping the reasoning in logs, because it's genuinely useful for debugging.
>
> And one current note: newer reasoning models handle this internally, so explicit chain-of-thought prompting is largely redundant with them. Worth knowing so you don't apply a technique the model already does."

## 8. Likely Follow-ups

**Q: Why does chain-of-thought work?**
Because the model generates tokens sequentially with no lookahead or revision, so a direct answer means committing after minimal computation. Reasoning tokens give it more forward passes, and each intermediate conclusion becomes context for the next. It's using the output sequence as working memory, which is why it helps on multi-step problems and not on lookup.

**Q: Does the reasoning explain the model's thinking?**
No, and that's an important caveat. The reasoning is additional computation that tends to improve the answer; it isn't a faithful account of how the model arrived at it. The model can produce plausible reasoning that leads to a wrong answer, and reasoning that doesn't correspond to its actual computation. Treating it as an explanation is an overclaim.

**Q: When would you use it in a RAG system?**
Selectively, on multi-hop questions, comparisons, and anything requiring synthesis across several retrieved facts. Not on direct lookups, which are most queries — there it adds output tokens and latency for nothing. A cheap classifier or heuristic on question structure can route it.

**Q: What does it cost?**
Output tokens, which are the expensive and latency-dominant half. Reasoning can be several times the length of the answer, so a request that would take 300 output tokens might take 900 — roughly tripling both the decode time and the output cost. That's why selective application matters.

**Q: What about reasoning models?**
Newer models are trained to reason internally before answering, so explicit chain-of-thought prompting is largely redundant with them — the behavior is built in and often better-calibrated than what you'd elicit by prompting. Worth checking whether the model already does it before adding the instruction.

## 9. Common Mistakes

- Applying chain-of-thought to every query regardless of type.
- Treating the reasoning as an explanation of the model's process.
- Showing reasoning to users who don't want it.
- Not logging reasoning, losing a useful debugging signal.
- Adding explicit CoT prompting to a model that reasons internally.

## 10. What to Remember

- **Intermediate reasoning tokens are computation**, giving the model more forward passes before committing.
- **Helps on multi-step; useless on direct lookup.** Route selectively.
- **Reasoning ≠ explanation.** Plausible reasoning can lead to wrong answers.
- **Costs output tokens** — the expensive, latency-dominant half.
- **Reasoning models do this internally** — check before adding the instruction.
