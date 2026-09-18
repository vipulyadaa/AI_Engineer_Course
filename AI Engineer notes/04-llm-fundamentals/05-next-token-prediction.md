# Next-Token Prediction

> **Phase 04 · LLM FUNDAMENTALS · Topic 05**

## 1. Definition

The training objective and the generation mechanism of every LLM: given a sequence of tokens, produce a probability distribution over the vocabulary for what comes next. Everything else — knowledge, reasoning, instruction-following — is downstream of this one task.

## 2. Simple Explanation

At every step the model outputs a probability for every token in its vocabulary. You pick one, append it, and ask again.

That's generation. And it's also training — the model is scored on how much probability it assigned to the token that actually came next.

## 3. How It Works

```
context: "The international wire transfer fee is"
             │
             ▼
     forward pass → logits (one per vocabulary token, ~128,000)
             │
             ▼
     softmax → probability distribution
             "$"    0.41
             "not"  0.12
             "waived" 0.08
             "45"   0.06
             ... 127,996 others
             │
             ▼
     sampling (temperature, top-p) → pick a token
             │
             ▼
     append, repeat
```

**Training loss:**

```
cross-entropy = −log P(actual_next_token)

If the model gave the correct token probability 0.8 → loss 0.22
If it gave it 0.01                                 → loss 4.61

Confidently wrong is heavily penalized. Summed over every
position in every document, that's the entire training signal.
```

**Perplexity** is `exp(cross-entropy)` — the same quantity, interpretable as "how many equally-likely options is the model effectively choosing between." Comparable only within the same tokenizer and evaluation data.

## 4. Practical Example

**Why one objective produces varied capability:**

```
To predict the next token well across a diverse corpus,
the model must handle:

  "The capital of France is ___"        → factual recall
  "2 + 2 = ___"                          → arithmetic
  "def add(a, b): return ___"            → code syntax
  "She was happy because ___"            → causal plausibility
  "Therefore, the conclusion is ___"     → tracking an argument

None of these were trained as separate tasks. They're all
required to minimize one loss over enough diverse text.
```

**The consequence for generation:**

```
The model has no notion of "correct" — only "probable."

"The international wire fee is $45"  ← probable AND true
"The international wire fee is $30"  ← probable AND false

Both are fluent continuations. The objective cannot distinguish
them without evidence in the context.

That's precisely the gap RAG fills: put the true value in the
context so the probable continuation is also the correct one.
```

**Error compounding:**

```
Each generated token conditions the next. An early wrong token
shifts the distribution for everything after it.

  "The fee is $30" → the model now continues coherently ABOUT $30
                     because that's what's in its context

This is why a hallucination often produces a confident, internally
consistent wrong answer rather than an obviously broken one.
```

## 5. Why It Matters

- **It's the single mechanism behind both training and generation**, and being able to say that clearly is a good sign.
- **It explains hallucination mechanically** — probable isn't true.
- **Error compounding explains why hallucinations are internally consistent**, which is what makes them dangerous.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **Optimizes plausibility** | Truth is not part of the objective |
| **Sequential generation** | Can't parallelize decode; latency scales with output length |
| **Error compounding** | An early mistake shapes everything after it |
| **Exposure bias** | Trained on ground-truth prefixes, generates from its own output |
| **No lookahead** | Greedy local choices; can't revise an earlier token |
| **Teacher forcing at training** | Training and inference conditions differ |

**On no-lookahead:** the model commits to each token without knowing where the sequence is going. Beam search partially addresses this by keeping several candidate sequences, but it's rarely used for open-ended generation because it tends to produce bland, repetitive text. Chain-of-thought works partly by giving the model more tokens to work through a problem before committing to an answer.

**On exposure bias:** during training the model always sees a correct prefix; during generation it sees its own output, which may contain errors. The mismatch is a known issue in autoregressive models, mitigated in practice by scale and alignment training rather than solved.

## 7. Interview Answer

> "Next-token prediction is both the training objective and the generation mechanism. At every step the model produces a probability distribution over its entire vocabulary for what comes next. During training it's scored by cross-entropy on how much probability it assigned to the token that actually came next. During generation you sample from that distribution, append, and repeat.
>
> The interesting thing is how much varied capability falls out of one objective. To predict well across a diverse corpus, the model has to handle factual recall, arithmetic, code syntax, causal plausibility, and tracking an argument — none of which were trained as separate tasks. They're all required to minimize one loss.
>
> The consequence I'd emphasize is that the model has no notion of correct, only probable. 'The international wire fee is forty-five dollars' and 'the fee is thirty dollars' are both fluent continuations, and the objective can't distinguish them without evidence in the context. That's exactly the gap RAG fills — put the true value in the context so the probable continuation is also the correct one.
>
> There's a second-order effect worth knowing: error compounding. Each generated token conditions the next, so an early wrong token shifts the distribution for everything after it. If the model says thirty dollars, it then continues coherently *about* thirty dollars, because that's what's in its context. That's why hallucinations tend to be internally consistent and confident rather than obviously broken — which is what makes them dangerous.
>
> And there's no lookahead. The model commits to each token without knowing where the sequence is going. Beam search partially addresses that but produces bland text for open-ended generation. Part of why chain-of-thought helps is that it gives the model more tokens to work through a problem before committing to an answer."

## 8. Likely Follow-ups

**Q: How does one objective produce reasoning, arithmetic, and factual recall?**
Because predicting the next token well over a diverse corpus requires all of them. To continue "the capital of France is" you need facts; to continue after "therefore" you need to have tracked the argument. None were trained separately — they're prerequisites for minimizing one loss. Whether the result constitutes reasoning is genuinely contested.

**Q: What is perplexity?**
`exp(cross-entropy)` — the same quantity on a more interpretable scale, roughly "how many equally likely options is the model effectively choosing between at each token." A perplexity of 10 means about as uncertain as picking uniformly among 10 tokens. Comparable only within the same tokenizer and evaluation data.

**Q: Why are hallucinations internally consistent?**
Error compounding. Each token conditions the next, so once the model has generated a wrong fact, that fact is in its context and it continues coherently about it. You get a fluent, self-consistent wrong answer rather than something obviously broken — which is exactly what makes hallucination dangerous rather than merely annoying.

**Q: Can the model revise an earlier token?**
Not within a single generation pass — it commits to each token without lookahead. Beam search keeps multiple candidate sequences and can prefer a different path, but it's rarely used for open-ended generation because it produces bland repetitive text. Chain-of-thought partly compensates by letting the model work through a problem in tokens before committing to an answer.

**Q: What is exposure bias?**
During training the model conditions on ground-truth prefixes; during generation it conditions on its own output, which may contain errors. So the inference distribution differs from the training distribution. It's a known limitation of autoregressive models, mitigated in practice by scale and alignment training rather than fully solved.

## 9. Common Mistakes

- Not connecting the training objective to the generation mechanism — they're the same thing.
- Saying the model "knows" facts rather than assigning probability to plausible continuations.
- Missing error compounding as the explanation for internally consistent hallucinations.
- Assuming the model can revise earlier tokens.
- Comparing perplexity across different tokenizers.

## 10. What to Remember

- **One mechanism for both training and generation:** distribution over the vocabulary for the next token.
- **Cross-entropy on the actual next token** is the entire training signal; perplexity is its exponential.
- **Probable ≠ true.** That's hallucination, and RAG supplies the evidence that closes the gap.
- **Error compounding** makes hallucinations internally consistent and confident.
- **No lookahead** — the model can't revise; chain-of-thought partly compensates.
