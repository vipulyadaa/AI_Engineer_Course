# SFT (Supervised Fine-Tuning)

> **Phase 04 · LLM FUNDAMENTALS · Topic 23**

## 1. Definition

Training a pretrained model on labeled (input, desired output) pairs with standard cross-entropy loss. Instruction tuning is the most common form of SFT; the term also covers any task-specific supervised adaptation.

## 2. Simple Explanation

SFT is ordinary supervised learning applied to an LLM.

You show it inputs paired with the outputs you want, and it learns to produce those outputs. The only thing that distinguishes it from any other supervised training is that you're starting from a pretrained model rather than random weights.

## 3. How It Works

```
Training example:
  prompt:   "Summarize this policy in two sentences: {text}"
  response: "{the ideal two-sentence summary}"

Loss: cross-entropy on the RESPONSE tokens only.
      The prompt is context, not a prediction target.
      (Masking the prompt from the loss is the standard setup.)
```

**Where it sits in the pipeline:**

```
Pretraining  →  SFT  →  Alignment (RLHF / DPO)
                 ↑
        Instruction tuning is SFT.
        Task-specific adaptation is also SFT.
```

**SFT vs. alignment — the distinction that matters:**

| | SFT | RLHF / DPO |
|---|---|---|
| Data | (prompt, ideal response) | (prompt, better response, worse response) |
| Signal | "Do this" | "This is better than that" |
| Teaches | What good output looks like | Relative preferences |
| Limitation | Only as good as the demonstrations | Needs a good SFT model to start from |

**Why both are needed:** SFT can only teach what a human wrote down. Preference data captures judgments that are easy to make and hard to demonstrate — "this response is too verbose," "this one hedges appropriately."

## 4. Practical Example

**The implementation detail people get wrong — loss masking:**

```
❌ Loss on the whole sequence:
   The model is trained to predict the PROMPT tokens too,
   which wastes capacity and can degrade instruction-following.

✅ Loss on response tokens only:
   labels = [-100, -100, ..., -100, resp_tok_1, resp_tok_2, ...]
                    prompt masked out        response scored

The prompt is context. You're teaching the model what to
OUTPUT, not to reproduce the input.
```

**A realistic SFT recipe for a banking assistant:**

```
Goal: consistent format, correct refusal behavior, domain register

Data:  ~2,000 examples
       · 1,200 typical answered questions in house format
       ·   400 out-of-scope questions with correct refusals
       ·   200 ambiguous questions asking for clarification
       ·   200 general instruction-following (prevents forgetting)

Method: LoRA (r=16), lr 1e-4, 2-3 epochs
Held out: 300 examples, never trained on
```

**The refusal and clarification examples are what people omit**, and they're often the highest-value part — demonstrating *not answering* is hard to achieve by prompting alone.

**The general-instruction mix-in prevents catastrophic forgetting** on narrow fine-tuning sets.

## 5. Why It Matters

- **It's the mechanism behind instruction tuning**, so the terms need distinguishing precisely.
- **Loss masking is a concrete implementation detail** that shows hands-on familiarity.
- **Including refusal examples** is the practical insight most SFT datasets miss.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No loss masking** | Wastes capacity predicting prompt tokens |
| **Only positive examples** | No demonstration of refusal or clarification |
| **Catastrophic forgetting** | Narrow data degrades general capability |
| **Too few examples** | Hundreds to low thousands are typically needed |
| **No held-out set** | Can't tell whether it helped |
| **Demonstrations cap quality** | SFT can't exceed the quality of its reference responses |

**On the ceiling:** SFT is bounded by the demonstrations. If the reference responses are mediocre, the model learns mediocre behavior. That's precisely what preference-based alignment addresses — humans can reliably judge which of two responses is better even when they couldn't write the better one themselves.

**On learning rate:** SFT uses a much lower learning rate than pretraining — typically 1e-5 to 1e-4 versus 1e-3 — because you're adapting good representations rather than building them. Using a pretraining-scale rate on an SFT run is a common way to destroy the model.

## 7. Interview Answer

> "SFT is supervised fine-tuning — training a pretrained model on labeled input-output pairs with standard cross-entropy loss. Instruction tuning is the most common form of it; the term also covers task-specific adaptation.
>
> The implementation detail that matters is loss masking. You compute loss on the response tokens only, not on the prompt — the prompt is context, and you're teaching the model what to output, not to reproduce the input. Training on the whole sequence wastes capacity and can degrade instruction-following. In practice that means setting the prompt token labels to the ignore index.
>
> The distinction from alignment is the data format. SFT uses prompt-and-ideal-response pairs — 'do this.' RLHF and DPO use preference comparisons — 'this response is better than that one.' They teach different things, and both are needed because SFT is capped by the quality of its demonstrations. Humans can reliably judge which of two responses is better even when they couldn't write the better one themselves, and preference learning captures that.
>
> For a banking assistant I'd build maybe two thousand examples: the bulk typical answered questions in house format, but crucially a few hundred out-of-scope questions with correct refusals and a couple hundred ambiguous questions asking for clarification. Those refusal examples are what most SFT datasets omit, and they're often the highest-value part — demonstrating *not answering* is hard to achieve reliably by prompting alone.
>
> I'd also mix in a couple hundred general instruction-following examples to prevent catastrophic forgetting on a narrow dataset.
>
> And the learning rate is much lower than pretraining — one-e-minus-five to one-e-minus-four rather than one-e-minus-three — because you're adapting good representations rather than building them. Using a pretraining-scale rate on an SFT run destroys the model."

## 8. Likely Follow-ups

**Q: What is loss masking in SFT?**
Computing the loss only on response tokens, with prompt tokens excluded by setting their labels to the ignore index. The prompt is context — you're teaching the model what to produce, not to reproduce the input. Training on the full sequence wastes capacity and can degrade instruction-following.

**Q: How is SFT different from RLHF?**
Data format and signal. SFT uses prompt-and-ideal-response pairs and teaches "do this." RLHF uses preference comparisons and teaches "this is better than that." SFT is capped by the quality of its demonstrations; preference learning captures judgments humans can make but couldn't demonstrate, which is why both stages exist.

**Q: How much data do you need?**
Hundreds to a few thousand high-quality examples for behavioral adaptation. Quality and diversity matter far more than volume. And I'd deliberately include negative-space examples — refusals and clarification requests — which most datasets omit and which are often the highest-value portion.

**Q: What learning rate?**
Much lower than pretraining — typically 1e-5 to 1e-4 with LoRA, versus around 1e-3 for pretraining. You're adapting representations that are already good rather than building them from random initialization. A pretraining-scale learning rate on an SFT run is one of the most common ways to destroy a model.

**Q: How do you prevent catastrophic forgetting?**
Mix general instruction-following examples into the fine-tuning set, use a low learning rate and few epochs, and prefer parameter-efficient methods like LoRA that leave the base weights untouched. Then evaluate on general capability, not just your task — otherwise you won't notice that the model got better at one thing and worse at everything else.

## 9. Common Mistakes

- Not masking the prompt from the loss.
- Including only positive examples, with no refusals or clarification requests.
- Using a pretraining-scale learning rate.
- No held-out evaluation set.
- Evaluating only on the target task, missing catastrophic forgetting.

## 10. What to Remember

- **Supervised learning on (prompt, ideal response) pairs.** Instruction tuning is SFT.
- **Mask the prompt from the loss** — score response tokens only.
- **SFT teaches "do this"; alignment teaches "this is better."** Both needed.
- **Include refusal and clarification examples** — the most-omitted, highest-value part.
- **Low learning rate (1e-5 to 1e-4)** and a general-data mix-in to prevent forgetting.
