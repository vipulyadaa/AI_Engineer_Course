# Temperature

> **Phase 04 · LLM FUNDAMENTALS · Topic 14**

## 1. Definition

A parameter that scales the logits before softmax, controlling how sharp or flat the next-token distribution is. Low temperature concentrates probability on the top tokens; high temperature spreads it out.

## 2. Simple Explanation

Temperature controls how willing the model is to pick a less-likely token.

At 0 it always takes the highest-probability token. At 1 it samples from the distribution as the model produced it. Above 1 it flattens the distribution, making unlikely tokens more likely to appear.

For RAG and any factual task, the right setting is 0.

## 3. How It Works

```
                    exp(logitᵢ / T)
P(tokenᵢ) = ───────────────────────────
              Σⱼ exp(logitⱼ / T)
```

**Dividing logits by T before softmax:**

```
logits = [4.0, 2.0, 1.0]

T = 0.1   → [0.9999, 0.0000, 0.0000]   near-deterministic
T = 0.5   → [0.867,  0.117,  0.016]
T = 1.0   → [0.705,  0.095,  0.035]... (normalized) sharp-ish
T = 2.0   → [0.506,  0.186,  0.113]    flatter
T = 5.0   → [0.399,  0.267,  0.219]    approaching uniform
```

- **T → 0** is greedy decoding (argmax).
- **T = 1** samples from the model's actual distribution.
- **T > 1** flattens; **T < 1** sharpens.

## 4. Practical Example

**Settings by task:**

| Task | Temperature | Why |
|---|---|---|
| **RAG factual answering** | **0** | Determinism; no creativity with figures |
| Classification / extraction | 0 | One correct answer |
| Structured output (JSON) | 0 | Format must be exact |
| Code generation | 0–0.2 | Correctness matters more than variety |
| Summarization | 0–0.3 | Faithfulness over style |
| Creative writing | 0.7–1.0 | Variety is the point |
| Brainstorming / diverse candidates | 0.8–1.2 | Explicitly want different outputs |

**Why 0 for RAG specifically:**

```
The task is extracting and synthesizing facts from provided
context. There is no value in varying the phrasing of a fee.

And determinism makes the system TESTABLE — the same question
with the same context should give the same answer, which you
need for regression testing.
```

**The caveat on determinism, which people state too strongly:**

```
Temperature 0 makes sampling greedy. It does NOT guarantee
byte-identical outputs across runs.

Batching changes the order of floating-point reductions.
Floating-point addition isn't associative. Different batch
compositions can produce marginally different logits, and
near-ties can resolve differently.

So "set temperature to 0 for reproducibility" is directionally
right and not an absolute guarantee. Worth knowing if you're
writing exact-match regression tests.
```

## 5. Why It Matters

- **It's the first sampling parameter to set correctly**, and leaving it at a default of 0.7 for factual work is a common real mistake.
- **The temperature-0-isn't-fully-deterministic point** is a precision detail that shows depth.
- **It interacts with top-p and top-k**, and knowing the order of operations matters.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Default 0.7 for factual tasks** | Non-deterministic answers about money |
| **Temperature 0 with repetition** | Greedy decoding can loop; needs a repetition penalty or a stop condition |
| **Too high** | Incoherent output; the distribution approaches uniform |
| **Assuming full determinism at 0** | Batching and floating-point non-associativity |
| **Tuning temperature to fix a grounding problem** | It's a retrieval or prompt issue |
| **Combining with top-p carelessly** | They interact; tune one at a time |

**Order of operations:** temperature is applied to logits first, then top-k and top-p filter the resulting distribution, then sampling occurs. So at temperature 0 the other parameters are effectively irrelevant — greedy decoding ignores the distribution shape entirely.

**On greedy repetition:** at temperature 0, models can fall into loops, repeating a phrase indefinitely. A repetition penalty or a frequency penalty addresses it, as do explicit stop sequences. It's uncommon in instruction-tuned models on well-formed prompts but it does happen.

## 7. Interview Answer

> "Temperature scales the logits before softmax, controlling how sharp or flat the next-token distribution is. Dividing logits by a value below one sharpens the distribution toward the top tokens; above one flattens it. At zero it's greedy decoding — always the argmax.
>
> For RAG and any factual task the answer is zero. The job is extracting and synthesizing facts from provided context, and there's no value in varying the phrasing of a fee. Determinism also makes the system testable, which you need for regression tests — the same question with the same context should give the same answer.
>
> Leaving it at a default of 0.7 for factual work is a common real mistake, and it produces non-deterministic answers about money, which is not acceptable in banking.
>
> The precision point I'd add: temperature zero makes sampling greedy, but it does not guarantee byte-identical outputs across runs. Batching changes the order of floating-point reductions, and floating-point addition isn't associative — so different batch compositions can produce marginally different logits, and near-ties can resolve differently. So 'set temperature to zero for reproducibility' is directionally right and not an absolute guarantee, which matters if you're writing exact-match regression tests.
>
> On interaction: temperature is applied to the logits first, then top-k and top-p filter the resulting distribution, then sampling happens. So at temperature zero the other parameters are effectively irrelevant, because greedy decoding ignores the distribution shape entirely. I'd tune one at a time rather than adjusting temperature and top-p together.
>
> And one failure mode worth knowing: greedy decoding can fall into repetition loops. A repetition penalty or explicit stop sequences address it — uncommon with instruction-tuned models on well-formed prompts, but it happens."

## 8. Likely Follow-ups

**Q: What temperature for a RAG system?**
Zero. The task is extracting facts from provided context, where there's no value in varied phrasing and real risk in varying figures. Determinism also makes the system testable, which you need for regression testing against a golden eval set.

**Q: Is temperature 0 fully deterministic?**
It makes sampling greedy, but it doesn't guarantee byte-identical outputs. Batching changes floating-point reduction order, and floating-point addition isn't associative, so logits can differ marginally between runs and near-ties can resolve differently. Directionally right, not an absolute guarantee.

**Q: How does temperature interact with top-p and top-k?**
Temperature is applied to logits first, then top-k and top-p filter the resulting distribution, then sampling occurs. At temperature 0 the others are effectively irrelevant, since greedy decoding ignores distribution shape. I'd tune one at a time — adjusting temperature and top-p together makes results hard to attribute.

**Q: When would you use a high temperature?**
Creative writing, brainstorming, or anywhere you deliberately want diverse candidates — self-consistency prompting, for instance, generates several reasoning paths at moderate temperature and takes the majority answer. Above roughly 1.2 the distribution flattens enough that output coherence degrades.

**Q: Can temperature fix hallucination?**
Lowering it reduces variance but doesn't fix grounding. If the model is producing unsupported claims, the cause is usually incomplete retrieval or a missing abstention instruction — the model gap-fills when the context doesn't fully answer the question. Temperature is worth setting correctly, but treating it as a hallucination fix misdiagnoses the problem.

## 9. Common Mistakes

- Leaving temperature at a default like 0.7 for factual tasks.
- Claiming temperature 0 guarantees byte-identical reproducibility.
- Tuning temperature and top-p simultaneously.
- Expecting temperature to fix a grounding problem.
- Not knowing greedy decoding can produce repetition loops.

## 10. What to Remember

- **Scales logits before softmax.** Low sharpens, high flattens, 0 is greedy argmax.
- **Use 0 for RAG and any factual task** — determinism, and no creativity with figures.
- **Temperature 0 is greedy, not byte-deterministic** — batching and float non-associativity.
- **Order: temperature → top-k/top-p → sample.** At T=0 the others don't matter.
- **It doesn't fix hallucination** — that's a retrieval or prompt problem.
