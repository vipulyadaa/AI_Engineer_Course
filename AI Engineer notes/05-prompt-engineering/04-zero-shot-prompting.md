# Zero-Shot Prompting

> **Phase 05 · PROMPT ENGINEERING · Topic 04**

## 1. Definition

Asking the model to perform a task from instructions alone, with no worked examples. It's the default approach and it works for most tasks, because instruction tuning trained the model to follow instructions rather than pattern-match examples.

## 2. Simple Explanation

Just describe what you want.

Before instruction tuning, models needed examples to infer the task from a pattern. Instruction-tuned models were explicitly trained on instruction-response pairs, so a clear description is usually enough — and examples become an optimization rather than a requirement.

## 3. How It Works

```
Classify this banking message into exactly one of:
card_lost, balance_inquiry, loan_application, complaint, other.

Message: my card isn't in my wallet anymore

Respond with only the label.
```

No examples. The instruction carries the task.

**What makes a zero-shot prompt work:**

| Element | Why |
|---|---|
| **Explicit task verb** | "Classify," "extract," "summarize" — not "look at this" |
| **Enumerated options** | For classification, list the exact allowed labels |
| **Output format stated** | "Respond with only the label," or a schema |
| **Constraints** | Length, tone, what to do when uncertain |
| **Edge-case handling** | "If none apply, respond `other`" |

**When to escalate to few-shot:**

```
· The output format is unusual and hard to describe
· Edge cases need demonstrating rather than explaining
· Zero-shot performance measured on an eval set is insufficient
· The task has domain conventions that are easier to show
```

## 4. Practical Example

**Zero-shot with explicit constraints usually beats few-shot with vague instructions:**

```
❌ Weak zero-shot:
   "Look at this message and tell me what it's about."

✅ Strong zero-shot:
   "Classify the message into exactly one of: card_lost,
    balance_inquiry, loan_application, complaint, other.
    If the message spans multiple categories, choose the one
    requiring the most urgent action.
    If none apply, respond 'other'.
    Respond with only the label, lowercase, no punctuation."

The second doesn't need examples. The first wouldn't be
saved by them.
```

**Zero-shot chain-of-thought — the one-line upgrade:**

```
Adding "Let's think step by step" before the answer improves
reasoning on multi-step problems without providing any examples.

Kojima et al. (2022) showed this works zero-shot — you don't
need demonstrated reasoning chains to elicit reasoning.

For RAG factual lookup it's usually unnecessary and adds
output tokens. For multi-hop or comparison questions it helps.
```

**The cost argument for zero-shot:**

```
Few-shot examples consume input tokens on EVERY request.

5 examples × 150 tokens = 750 tokens per request.
At 100k requests/day that's 75M tokens/day of examples.

If zero-shot performs within a point or two on your eval set,
the cost difference makes it the right default.
```

## 5. Why It Matters

- **It's the default**, and reaching for few-shot before measuring zero-shot is a common inefficiency.
- **Instruction tuning is why it works** — that's the mechanistic explanation.
- **The token cost of few-shot examples** is a real recurring expense that zero-shot avoids.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Vague instructions** | "Tell me about this" — examples won't save it |
| **Unenumerated labels** | The model invents categories |
| **No output format specified** | Inconsistent structure; hard to parse |
| **No edge-case handling** | Undefined behavior on ambiguous inputs |
| **Skipping to few-shot** | Paying token cost before measuring whether it's needed |
| **Assuming instructions were followed** | Measure; the prompt is a request |

**On the ordering discipline:** measure zero-shot on an eval set first. If it's sufficient, you've avoided a permanent per-request token cost. If it isn't, you now know the gap few-shot needs to close, which also tells you how many examples are worth adding.

**On format specification:** for anything machine-parsed, a JSON schema with structured output enforcement beats describing the format in prose. Zero-shot with a schema is more reliable than few-shot with a described format.

## 7. Interview Answer

> "Zero-shot prompting is asking the model to do a task from instructions alone, with no worked examples. It's the default, and it works for most tasks because instruction tuning trained the model on instruction-response pairs — so a clear description is usually enough, and examples become an optimization rather than a requirement.
>
> What makes it work is specificity. An explicit task verb, enumerated options for classification, a stated output format, constraints, and explicit edge-case handling. A weak zero-shot prompt like 'look at this message and tell me what it's about' wouldn't be saved by adding examples — the problem is the instruction, not the absence of demonstrations.
>
> The cost argument is worth making. Few-shot examples consume input tokens on every single request. Five examples at a hundred and fifty tokens each is seven hundred and fifty tokens per request, which at a hundred thousand requests a day is seventy-five million tokens a day just for examples. If zero-shot performs within a point or two on my eval set, that cost difference makes it clearly right.
>
> So my discipline is: measure zero-shot on the eval set first. If it's sufficient, I've avoided a permanent per-request cost. If it isn't, I now know the gap few-shot needs to close, which also tells me how many examples are worth adding.
>
> One upgrade worth knowing: zero-shot chain-of-thought — adding 'let's think step by step' — improves multi-step reasoning without any examples. For RAG factual lookup it's usually unnecessary and just adds output tokens, but for multi-hop or comparison questions it helps.
>
> And for anything machine-parsed, I'd use a JSON schema with structured output enforcement rather than describing the format in prose. Zero-shot with an enforced schema is more reliable than few-shot with a described one."

## 8. Likely Follow-ups

**Q: Why does zero-shot work at all?**
Because of instruction tuning. Base models needed examples to infer a task from a pattern; instruction-tuned models were explicitly trained on instruction-response pairs, so following a described task is the behavior they were optimized for. That's the mechanistic reason examples became optional.

**Q: When do you need few-shot instead?**
When the output format is unusual and hard to describe, when edge cases are easier to demonstrate than explain, when the task has domain conventions that would take a paragraph to specify, or simply when zero-shot performance measured on your eval set is insufficient. The last one is the only justification I'd accept without the others.

**Q: What makes a zero-shot prompt effective?**
Specificity. An explicit task verb, enumerated allowed outputs, a stated format, explicit edge-case handling, and constraints. A vague prompt isn't rescued by examples — if "tell me about this" is failing, adding demonstrations papers over an instruction problem rather than fixing it.

**Q: What's zero-shot chain-of-thought?**
Adding a phrase like "let's think step by step" to elicit reasoning without providing demonstrated reasoning chains. Kojima and colleagues showed it works zero-shot. It helps on multi-step problems and costs output tokens, so I'd apply it selectively — for RAG factual lookup it's usually unnecessary.

**Q: Why not just always use few-shot?**
Cost. Examples consume input tokens on every request, permanently. At high volume that's a substantial recurring bill for something that may buy a point or two of accuracy. I'd measure zero-shot first and only pay for examples when the eval set shows they're needed.

## 9. Common Mistakes

- Reaching for few-shot before measuring zero-shot.
- Vague instructions that examples can't rescue.
- Not enumerating allowed outputs for classification.
- Describing output format in prose instead of enforcing a schema.
- No explicit edge-case handling.

## 10. What to Remember

- **Instructions only, no examples.** The default, because instruction tuning made it work.
- **Specificity is what makes it work** — task verb, enumerated options, format, edge cases.
- **Few-shot costs tokens on every request, forever.** Measure zero-shot first.
- **Zero-shot CoT** ("think step by step") helps multi-step reasoning without examples.
- **Enforce a schema** rather than describing format in prose.
