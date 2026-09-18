# Sampling

> **Phase 04 · LLM FUNDAMENTALS · Topic 17**

## 1. Definition

The process of choosing the next token from the model's output distribution. The model produces probabilities; sampling decides which token to actually emit, and the strategy determines whether generation is deterministic, focused, or diverse.

## 2. Simple Explanation

The model gives you a probability for every token in the vocabulary. Sampling is the decision rule for picking one.

Always take the most likely token, and you get deterministic but potentially repetitive output. Sample proportionally to probability and you get variety, occasionally including a bad token from the tail.

## 3. How It Works

**The pipeline, in order:**

```
logits
  ↓ temperature       scale: logits / T
  ↓ repetition penalty  down-weight already-generated tokens
  ↓ top-k             keep the k highest
  ↓ top-p             keep the smallest set reaching cumulative p
  ↓ softmax → sample
token
```

**Strategies:**

| Strategy | Behavior | Use |
|---|---|---|
| **Greedy (T=0)** | Always argmax | **Factual tasks, RAG** |
| **Pure sampling (T=1, no filters)** | Proportional to probability | Rarely — tail junk appears |
| **Top-k** | Fixed candidate count | Legacy; useful as a bound |
| **Top-p (nucleus)** | Adaptive candidate set | **Standard for generative tasks** |
| **Beam search** | Track several sequences, pick the best | Translation; bland for open-ended text |

**Beam search is worth knowing about and rarely using:** it explores multiple candidate sequences and picks the highest-probability complete one. That's right for translation, where there's a correct answer. For open-ended generation it produces bland, repetitive text — high-probability sequences are boring ones.

## 4. Practical Example

**The config that actually matters for RAG:**

```python
response = model.generate(
    prompt,
    temperature=0,              # greedy — the only one that matters here
    max_output_tokens=500,      # caps latency and cost
    stop_sequences=["</answer>"],
)
```

**Everything else is irrelevant at temperature 0**, because greedy decoding ignores the distribution's shape entirely.

**Where sampling parameters genuinely matter — self-consistency:**

```
Generate N reasoning paths at moderate temperature, take the
majority final answer.

  temperature 0.7, top_p 0.9, n = 5

The method REQUIRES the paths to differ — at temperature 0
you'd get five identical outputs and the majority vote would
be meaningless.

Cost is N× per query, so it's reserved for high-stakes
reasoning questions rather than applied by default.
```

**Repetition and frequency penalties:**

```
repetition_penalty  divides logits of already-generated tokens
frequency_penalty   subtracts proportional to occurrence count
presence_penalty    subtracts a flat amount if the token appeared

Useful when greedy decoding loops. But if a model is looping
on a well-formed prompt, the prompt or the retrieved context
is usually the real problem — penalties treat the symptom.
```

## 5. Why It Matters

- **It's the layer between the model's output and what the user sees**, and it's frequently left at defaults.
- **Knowing the pipeline order** explains why most parameters are moot at temperature 0.
- **Self-consistency is a concrete case** where sampling diversity is the mechanism, not a nuisance.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Inheriting defaults** | Typically 0.7 temperature — wrong for factual tasks |
| **Tuning several parameters at once** | They interact; results become unattributable |
| **Beam search for open-ended text** | Produces bland, repetitive output |
| **Uncapped output length** | Unbounded latency and cost |
| **Penalties masking a prompt problem** | Looping usually indicates bad context or a bad prompt |
| **Assuming greedy is fully reproducible** | Batching and float non-associativity |

**On the reproducibility caveat:** temperature 0 gives greedy decoding, but batching changes floating-point reduction order and floating-point addition isn't associative — so near-ties can resolve differently across runs. Directionally deterministic, not byte-guaranteed. It matters if you're writing exact-match regression tests.

**On stop sequences:** an underused control. Defining an explicit stop sequence is more reliable than hoping the model stops on its own, and it caps runaway generation deterministically rather than via a token limit that truncates mid-sentence.

## 7. Interview Answer

> "Sampling is how you choose the next token from the model's output distribution. The model gives probabilities; sampling is the decision rule.
>
> The pipeline has a specific order: temperature scales the logits, then repetition penalties adjust them, then top-k filters by count, then top-p filters by cumulative mass, then you sample. Knowing that order matters because it explains why at temperature zero the rest is moot — greedy decoding takes the argmax and ignores distribution shape entirely.
>
> For a RAG system that's the whole answer: temperature zero, capped max output tokens, and explicit stop sequences. Stop sequences are underused — defining one is more reliable than hoping the model stops on its own, and it terminates deterministically rather than truncating mid-sentence at a token limit.
>
> Where sampling diversity is genuinely the mechanism rather than a nuisance is self-consistency prompting: generate several reasoning paths at moderate temperature and take the majority answer. That requires the paths to differ — at temperature zero you'd get five identical outputs and the vote would be meaningless. It costs N times per query, so it's for high-stakes reasoning rather than a default.
>
> Beam search is worth knowing and rarely using. It tracks several candidate sequences and picks the highest-probability complete one, which is right for translation where there's a correct answer. For open-ended generation it produces bland repetitive text, because the highest-probability sequences are the boring ones.
>
> On repetition penalties: they help when greedy decoding loops, but if a model loops on a well-formed prompt, the prompt or the retrieved context is usually the real problem. Penalties treat the symptom.
>
> And one caveat — greedy isn't byte-reproducible. Batching changes floating-point reduction order, so near-ties can resolve differently across runs."

## 8. Likely Follow-ups

**Q: What's the order of sampling operations?**
Temperature scales the logits, then repetition or frequency penalties adjust them, then top-k filters by count, then top-p filters by cumulative probability over what remains, then softmax and sample. The order matters because each stage operates on the previous stage's output — which is why at temperature 0 everything downstream is irrelevant.

**Q: What sampling config for a RAG system?**
Temperature 0, a capped max output length, and explicit stop sequences. Nothing else matters, because greedy decoding ignores distribution shape. The main thing is explicitly overriding provider defaults rather than inheriting a 0.7 temperature.

**Q: When do you want sampling diversity?**
When the method depends on it. Self-consistency generates several reasoning paths and takes the majority — identical paths would make the vote meaningless. Also brainstorming and creative generation. For factual retrieval answering, diversity is purely a liability.

**Q: Why isn't beam search used for chat?**
Because the highest-probability complete sequence tends to be bland and repetitive. Beam search is right when there's a correct answer, like translation. For open-ended generation, optimizing for sequence probability produces safe, generic text — people describe it as the model saying nothing interesting very confidently.

**Q: What about repetition penalties?**
They down-weight already-generated tokens, which helps when greedy decoding falls into a loop. But a well-instruction-tuned model looping on a good prompt usually indicates a problem with the prompt or the retrieved context — degenerate or contradictory context, for instance. I'd treat a penalty as a symptom fix and look upstream first.

## 9. Common Mistakes

- Leaving sampling parameters at provider defaults for factual tasks.
- Tuning temperature, top-p, and penalties simultaneously.
- Using beam search for open-ended generation.
- Not setting explicit stop sequences.
- Treating repetition penalties as the fix for a prompt or context problem.

## 10. What to Remember

- **Pipeline order:** temperature → penalties → top-k → top-p → sample.
- **At temperature 0, everything downstream is moot.** Greedy takes the argmax.
- **RAG config:** temperature 0, capped output, explicit stop sequences.
- **Self-consistency is where diversity is the mechanism** — N paths, majority vote, N× cost.
- **Beam search is for tasks with a correct answer**, not open-ended generation.
