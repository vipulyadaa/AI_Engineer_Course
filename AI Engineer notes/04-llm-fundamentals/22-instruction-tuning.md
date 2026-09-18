# Instruction Tuning

> **Phase 04 · LLM FUNDAMENTALS · Topic 22**

## 1. Definition

Supervised fine-tuning on (instruction, ideal response) pairs that converts a base model from a text *continuer* into an instruction *follower*. It's the stage that makes a pretrained model usable as an assistant.

## 2. Simple Explanation

A pretrained model completes documents. Ask it "What is the capital of France?" and it might continue with "What is the capital of Germany? What is the capital of Spain?" — because that's a plausible document.

Instruction tuning teaches it that a question should be answered, not continued. It doesn't add knowledge; it changes the response format entirely.

## 3. How It Works

```
Training data: human-written pairs

  instruction: "Summarize this in two sentences: {text}"
  response:    "{a good two-sentence summary}"

  instruction: "What's the capital of France?"
  response:    "The capital of France is Paris."

Standard supervised fine-tuning — cross-entropy on the response
tokens, with the instruction as context.
```

**Where it sits:**

```
1. PRETRAINING       capability, from raw text            (months, $millions)
2. INSTRUCTION TUNING  usability, from instruction pairs   (hours-days, thousands of examples)
3. ALIGNMENT (RLHF/DPO) helpfulness and honesty, from preferences
```

**The key empirical finding:** instruction tuning needs surprisingly little data. Work like LIMA suggested that roughly a thousand carefully-curated examples can produce strong instruction-following — because the capability was already there from pretraining. Instruction tuning is unlocking it, not teaching it.

## 4. Practical Example

**What it changes and what it doesn't:**

```
Base model, prompt "What is the capital of France?"
  → "What is the capital of Germany? What is the capital of..."
     (continuing a plausible list of questions)

Instruction-tuned, same prompt
  → "The capital of France is Paris."

The model always KNEW Paris. Instruction tuning changed the
response format, not the knowledge.
```

**Instruction diversity matters more than volume:**

```
1,000 examples covering many task TYPES —
  summarize, classify, extract, explain, rewrite, compare,
  refuse, ask for clarification
  → generalizes to unseen task types

10,000 examples all of one type
  → good at that type, poor generalization

That's why instruction-tuning datasets emphasize breadth of
task format rather than depth in any one.
```

**Chat templates are part of this:**

```
<|im_start|>system
You are a helpful banking assistant.<|im_end|>
<|im_start|>user
What's the wire fee?<|im_end|>
<|im_start|>assistant

Instruction tuning teaches the model this structure. Using
the WRONG template for a model degrades quality noticeably —
it's a real and easily-made mistake when self-hosting.
```

## 5. Why It Matters

- **It explains why a base model isn't an assistant** — a clean distinction between capability and usability.
- **The "little data needed" finding** supports the view that pretraining did the real work.
- **Chat template mismatch** is a concrete, common self-hosting bug.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Low instruction diversity** | Narrow generalization to unseen task types |
| **Wrong chat template** | Noticeable quality degradation; easy to get wrong when self-hosting |
| **Catastrophic forgetting** | Over-tuning on narrow instructions degrades general capability |
| **Sycophancy** | Trained to be agreeable, models over-accommodate incorrect premises |
| **Confusing it with alignment** | Instruction tuning teaches format; RLHF/DPO shapes preferences |
| **Data quality** | Poor reference responses teach poor behavior |

**On sycophancy:** instruction tuning and alignment together can produce models that agree with a user's incorrect premise rather than correcting it. It's a documented behavior and it matters in a banking assistant — a user asserting "my transfers are free, right?" should get a correction, not accommodation. Worth testing for explicitly.

**On the instruction/alignment distinction:** instruction tuning is supervised learning on demonstrations of good responses. Alignment is preference learning on comparisons between responses. Different data, different objective, different stage — and conflating them is a common imprecision.

## 7. Interview Answer

> "Instruction tuning is supervised fine-tuning on instruction-response pairs that converts a base model from a text continuer into an instruction follower.
>
> The clearest illustration: ask a base model 'what is the capital of France' and it might continue with 'what is the capital of Germany, what is the capital of Spain' — because that's a plausible document. It always knew Paris. Instruction tuning changed the response format, not the knowledge.
>
> That's the distinction worth being precise about: pretraining gives capability, instruction tuning gives usability. And the empirical finding that supports it is that instruction tuning needs surprisingly little data — work like LIMA suggested roughly a thousand carefully curated examples can produce strong instruction-following. Because the capability was already there; you're unlocking it rather than teaching it.
>
> What matters in that data is diversity of task type rather than volume. A thousand examples spanning summarization, classification, extraction, explanation, rewriting, refusal, and asking for clarification generalizes to unseen task types. Ten thousand examples all of one type doesn't.
>
> Chat templates are part of this and they're a concrete self-hosting gotcha. Instruction tuning teaches the model a specific structure — role markers, turn delimiters — and using the wrong template for a model degrades quality noticeably. It's easy to get wrong and the symptom is just 'the model seems worse than benchmarks suggest.'
>
> I'd distinguish it from alignment, because they're often conflated. Instruction tuning is supervised learning on demonstrations of good responses. Alignment — RLHF or DPO — is preference learning on comparisons between responses. Different data, different objective, different stage.
>
> And one behavior worth testing for: sycophancy. These stages can produce models that agree with a user's incorrect premise rather than correcting it. In a banking assistant, someone asserting 'my transfers are free, right?' should get a correction, not accommodation."

## 8. Likely Follow-ups

**Q: Why isn't a base model useful as an assistant?**
Because it was trained to continue text, not respond to instructions. Asked a question, it may continue with more questions since that's a plausible document. The knowledge is there; the response format isn't. Instruction tuning supplies the format.

**Q: How much data does instruction tuning need?**
Surprisingly little — roughly a thousand carefully curated examples can produce strong instruction-following, per findings like LIMA. That supports the view that pretraining did the real work and instruction tuning is unlocking capability rather than teaching it. Diversity of task type matters far more than volume.

**Q: How is it different from alignment?**
Instruction tuning is supervised learning on demonstrations — here's an instruction, here's a good response. Alignment is preference learning on comparisons — this response is better than that one. Different data format, different objective, different stage. Instruction tuning teaches format and task-following; alignment shapes helpfulness, harmlessness, and honesty.

**Q: What's a chat template and why does it matter?**
The structured format with role markers and turn delimiters that instruction tuning taught the model to expect. Using the wrong template for a model degrades quality noticeably, and the symptom is vague — the model just seems worse than expected. It's an easy and common mistake when self-hosting, and it's worth verifying against the model card.

**Q: What is sycophancy?**
A tendency to agree with the user's stated premise rather than correcting it, arising from training that rewards agreeable responses. In a banking assistant that's a real risk — a user asserting "my transfers are free, right?" should get a correction. It's worth testing for explicitly with an eval set containing incorrect premises.

## 9. Common Mistakes

- Conflating instruction tuning with alignment.
- Using the wrong chat template when self-hosting.
- Assuming instruction tuning adds knowledge — it changes format.
- Optimizing for data volume over task-type diversity.
- Not testing for sycophancy on incorrect premises.

## 10. What to Remember

- **Turns a text continuer into an instruction follower.** Format, not knowledge.
- **Needs surprisingly little data** — ~1,000 curated examples — because pretraining did the work.
- **Task-type diversity beats volume** for generalization.
- **Chat template mismatch is a real self-hosting bug** with a vague symptom.
- **Distinct from alignment:** demonstrations vs. preference comparisons.
