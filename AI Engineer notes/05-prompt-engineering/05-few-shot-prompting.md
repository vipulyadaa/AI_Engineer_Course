# Few-Shot Prompting

> **Phase 05 · PROMPT ENGINEERING · Topic 05**

## 1. Definition

Including worked examples in the prompt to demonstrate the task. It relies on **in-context learning** — the model infers the pattern from examples without any weight updates.

## 2. Simple Explanation

Show, don't just tell.

When a format is unusual or edge cases are hard to describe, a few examples communicate it faster than a paragraph of instructions. The model pattern-matches from what it sees in the context.

The cost is that those examples are in the prompt on every single request.

## 3. How It Works

```
Classify the banking message. Examples:

Message: my card isn't in my wallet anymore
Label: card_lost

Message: how much is in my account
Label: balance_inquiry

Message: this is the third time this has happened, unacceptable
Label: complaint

Message: {the actual query}
Label:
```

**What examples teach that instructions struggle with:**

| Communicated better by example | Why |
|---|---|
| Unusual output format | Faster to show than to specify |
| Edge-case handling | "This ambiguous case → this label" |
| Domain conventions | Register, phrasing, abbreviations |
| Implicit boundaries | Where one category ends and another begins |

**What examples don't fix:** a vague task description. If the instruction is unclear, examples produce inconsistent pattern-matching rather than clarity.

## 4. Practical Example

**Example selection matters more than example count:**

```
❌ 5 examples, all typical easy cases
   → teaches the easy path; the model already handled those

✅ 5 examples covering the DECISION BOUNDARY
   · a clear card_lost
   · a complaint that mentions a lost card    ← the confusable pair
   · an ambiguous case with the tie-break rule shown
   · an out-of-scope message → 'other'
   · a multi-intent message with the priority rule shown

The examples should cover where the model actually fails,
which you find from your eval set — not from what's typical.
```

**Dynamic few-shot — retrieving examples per query:**

```
Instead of a fixed set, embed the incoming query and retrieve
the k most similar labeled examples from a pool.

  → examples are relevant to THIS query
  → the pool can be large without inflating any single prompt
  → new examples are added without touching the prompt

It's RAG applied to examples rather than to documents, and
it consistently outperforms a fixed set when you have a
reasonable pool of labeled data.
```

**The costs, stated plainly:**

```
5 examples × 150 tokens = 750 input tokens on EVERY request

At 100k requests/day:  75M tokens/day of examples alone.

Also: examples consume context that could hold retrieved chunks,
and they can bias the model toward the phrasing patterns shown.
```

## 5. Why It Matters

- **In-context learning is the capability that made prompting an adaptation method** — no weight updates required.
- **Example selection at the decision boundary** is the practical insight that most improves few-shot quality.
- **Dynamic few-shot** is a genuinely better pattern than a fixed set when you have labeled data.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Token cost on every request** | Permanent, and scales with volume |
| **Examples of only typical cases** | Teaches the easy path, not the failures |
| **Label imbalance in examples** | The model over-predicts the majority shown |
| **Recency bias** | The last example has disproportionate influence |
| **Examples consuming retrieval budget** | In RAG, they compete with chunks for context |
| **Stale examples** | They encode conventions that may have changed |
| **Format inconsistency across examples** | The model learns the inconsistency |

**On ordering effects:** in-context learning is sensitive to example order, with the final example often having outsized influence. Balancing label distribution and, where possible, randomizing or evaluating multiple orderings reduces this. It's a real source of unexplained variance.

**On the alternative:** if you need many examples to get acceptable quality, that's often a signal to distill instead — fine-tune a small model on those examples once, rather than paying for them in every request forever. The break-even comes fast at volume.

## 7. Interview Answer

> "Few-shot prompting includes worked examples in the prompt to demonstrate the task. It relies on in-context learning — the model infers the pattern from examples with no weight updates.
>
> It's worth using when the output format is unusual, when edge cases are easier to demonstrate than describe, or when zero-shot performance on my eval set is insufficient. What it doesn't fix is a vague task description — if the instruction is unclear, examples produce inconsistent pattern-matching rather than clarity.
>
> The insight that matters most is example selection. Five examples of typical easy cases teach the model the path it already handled. The examples should cover the decision boundary — a clear case, the confusable pair that's actually causing errors, an ambiguous case showing the tie-break rule, an out-of-scope case, a multi-intent case showing the priority rule. You find those from your eval set's failures, not from what's typical.
>
> A better pattern where you have labeled data is dynamic few-shot: embed the incoming query and retrieve the most similar labeled examples from a pool. Examples become relevant to that specific query, the pool can be large without inflating any single prompt, and adding examples doesn't require touching the prompt. It's RAG applied to examples rather than documents, and it consistently beats a fixed set.
>
> The cost is real and permanent — five examples at a hundred and fifty tokens is seven hundred and fifty input tokens on every request, which at a hundred thousand requests a day is seventy-five million tokens daily just for examples. And in RAG they compete with retrieved chunks for context budget.
>
> One thing I'd flag: if I need many examples to get acceptable quality, that's usually a signal to distill instead — fine-tune a small model on those examples once rather than paying for them in every request forever. The break-even comes fast at volume.
>
> And in-context learning is sensitive to example ordering, with the last example often having outsized influence — so I'd balance the label distribution and evaluate a couple of orderings rather than assuming order is neutral."

## 8. Likely Follow-ups

**Q: How many examples should you use?**
Enough to cover the decision boundary, typically three to eight. Beyond that returns diminish while token cost grows linearly. If you need many more than that for acceptable quality, it's a signal to distill into a fine-tuned small model rather than paying per request.

**Q: How do you choose examples?**
From your eval set's failures, not from typical cases. Cover the decision boundary: a clear case, the confusable pair actually causing errors, an ambiguous case with the tie-break rule shown, an out-of-scope case, and a multi-intent case showing priority. Typical easy examples teach a path the model already handled.

**Q: What is dynamic few-shot?**
Retrieving the most similar labeled examples for each incoming query rather than using a fixed set. It's RAG applied to examples — you embed the query, search a pool of labeled examples, and include the top-k. Examples become query-relevant, the pool scales without inflating prompts, and adding examples doesn't require prompt changes.

**Q: What's the cost of few-shot?**
Input tokens on every request, permanently — five examples at 150 tokens is 750 tokens per call. At scale that's a substantial recurring bill. In a RAG system they also compete with retrieved chunks for context budget, so adding examples may mean retrieving fewer documents.

**Q: Does example order matter?**
Yes — in-context learning is sensitive to ordering, and the final example often has disproportionate influence. I'd balance the label distribution across examples so the model isn't biased toward whichever appears most, and evaluate a couple of orderings rather than assuming it's neutral. It's a real source of unexplained variance.

## 9. Common Mistakes

- Choosing typical examples rather than decision-boundary ones.
- Imbalanced labels across examples, biasing predictions.
- Ignoring ordering effects.
- Using a fixed set when dynamic retrieval of examples would be better.
- Paying few-shot token costs at volume when distillation would be cheaper.

## 10. What to Remember

- **In-context learning** — the model infers the pattern with no weight updates.
- **Select examples at the decision boundary**, from your eval set's failures.
- **Dynamic few-shot beats a fixed set** when you have a labeled pool.
- **Cost is per request, forever** — and competes with retrieved chunks for context.
- **Needing many examples signals distillation** is the better answer.
