# Pretraining

> **Phase 04 · LLM FUNDAMENTALS · Topic 03**

## 1. Definition

The first and by far most expensive training stage: self-supervised next-token prediction over trillions of tokens of raw text. It produces general capability but not a usable assistant.

## 2. Simple Explanation

Take an enormous amount of text and train the model to predict each token from the ones before it. No human labels — the text supplies both the input and the answer.

That single objective, applied at sufficient scale, is where essentially all of a model's knowledge and capability comes from. Everything after it is adaptation.

## 3. How It Works

```
1. COLLECT    web crawl, books, code, papers, filtered and deduplicated
2. TOKENIZE   text → token IDs
3. PACK       concatenate documents into fixed-length sequences
              (with document-separator masking)
4. TRAIN      cross-entropy loss on next-token prediction,
              AdamW, warmup + cosine decay, often <1 epoch
5. RESULT     a base model — capable, not instruction-following
```

**Scale, roughly:**

| | Typical for a modern model |
|---|---|
| Tokens | Trillions |
| Parameters | Billions to hundreds of billions |
| Compute | Thousands of GPUs, weeks to months |
| Cost | Millions of dollars |
| Epochs | Often **less than 1** — the corpus is seen roughly once |

**Data quality matters more than data quantity past a point.** Deduplication, filtering, and curation have been shown to matter substantially — a smaller well-curated corpus can beat a larger noisy one.

## 4. Practical Example

**The scaling laws, and the correction that mattered:**

```
Kaplan et al. (2020): performance scales predictably with
  parameters, data, and compute.

Chinchilla (Hoffmann et al., 2022): the earlier guidance
  under-weighted DATA. For a fixed compute budget, models
  should be substantially smaller and trained on substantially
  more tokens than was then standard.

Consequence: many large models of that era were
  UNDERTRAINED for their size. The field shifted toward
  smaller models trained longer.
```

**Why pretraining isn't something you'll do:**

```
Cost:     millions of dollars in compute
Data:     trillions of tokens, curated and deduplicated
Expertise: distributed training at thousands-of-GPU scale
Time:     weeks to months

What you WILL do: build on pretrained models, and possibly
parameter-efficient fine-tuning. Being clear about that
boundary is more credible than implying otherwise.
```

**What the base model is and isn't:**

```
Prompt: "What is the capital of France?"

Base model (pretrained only) might continue:
  "What is the capital of Germany? What is the capital of Spain?"
  ← it's continuing a plausible document, not answering

That's why instruction tuning exists. Pretraining gives
capability; instruction tuning makes it respond.
```

## 5. Why It Matters

- **It's where all capability comes from** — later stages shape behavior, not knowledge.
- **The Chinchilla correction is a standard reference point** and shows you know the field's history.
- **Knowing you won't do it** is a credibility point, not a gap.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Cost** | Millions of dollars; only a handful of organizations do it |
| **Data contamination** | Benchmark data in the training corpus inflates reported scores |
| **Knowledge cutoff** | Fixed at training time — the reason RAG exists |
| **Inherited biases** | Whatever is in the corpus is learned faithfully |
| **Memorization** | Rare sequences can be reproduced verbatim — a privacy concern |
| **Undertrained models** | Pre-Chinchilla sizing left capability on the table |

**On data contamination:** public benchmark data frequently appears in web-scraped pretraining corpora, so strong benchmark scores may partly reflect memorization rather than capability. It's a live concern when comparing models, and it's a good argument for evaluating on your own held-out data rather than trusting leaderboard numbers.

**On memorization and privacy:** models can reproduce verbatim sequences from training data, which matters both for copyright and for any PII that made it into the corpus. Deduplication reduces it substantially, which is one reason curation matters beyond quality.

## 7. Interview Answer

> "Pretraining is the first and by far most expensive stage — self-supervised next-token prediction over trillions of tokens of raw text. No human labels; the text supplies both input and answer. That objective at scale is where essentially all of a model's knowledge and capability comes from, and everything after it is adaptation.
>
> The scale is worth stating concretely: trillions of tokens, thousands of GPUs, weeks to months, millions of dollars. And often less than one epoch — the corpus is large enough that most of it is seen roughly once, which surprises people used to training for many epochs.
>
> The reference point I'd cite is Chinchilla. The 2020 scaling-laws work established that performance scales predictably with parameters, data, and compute. The 2022 Chinchilla paper corrected the balance — it showed the earlier guidance under-weighted data, and that for a fixed compute budget models should be substantially smaller and trained on substantially more tokens. So many large models of that era were undertrained for their size, and the field shifted toward smaller models trained longer.
>
> I'd also be clear that pretraining isn't something I'd do — the cost, data curation, and distributed-training expertise put it out of reach for all but a handful of organizations. What I do is build on pretrained models and possibly parameter-efficient fine-tuning. Being explicit about that boundary is more credible than implying otherwise.
>
> Two things worth knowing about its consequences. The base model isn't an assistant — asked 'what is the capital of France' it might continue with more questions, because it's completing a plausible document. Instruction tuning is what makes it respond. And data contamination is real: public benchmark data appears in web-scraped corpora, so benchmark scores may partly reflect memorization. That's a good reason to evaluate on my own held-out data rather than trusting leaderboards."

## 8. Likely Follow-ups

**Q: What are the scaling laws?**
The 2020 Kaplan work showed performance scales predictably with parameters, data, and compute. The 2022 Chinchilla paper corrected the balance, finding the earlier guidance under-weighted data — for a fixed compute budget, models should be smaller and trained on more tokens. That shifted the field toward smaller, longer-trained models.

**Q: How many epochs does pretraining run?**
Often less than one. The corpus is large enough that most of it is seen roughly once. That's counterintuitive coming from supervised learning where many epochs are normal, and it reflects that with trillions of tokens, unique data is more valuable than repeated passes.

**Q: Why isn't a pretrained model useful as an assistant?**
Because it was trained to continue text, not to respond to instructions. Asked "what is the capital of France," a base model might continue with more questions, since that's a plausible document continuation. Instruction tuning on human-written instruction-response pairs is what converts continuation into response.

**Q: What is data contamination?**
Public benchmark data appearing in web-scraped pretraining corpora, so a model may have memorized test items. It inflates reported benchmark scores in a way that doesn't reflect genuine capability. It's a reason to trust an eval set built on your own data over a leaderboard number.

**Q: Would you ever pretrain a model?**
Realistically no — the cost, data curation, and distributed-training expertise are out of reach for almost everyone. My work is building on pretrained models, with parameter-efficient fine-tuning where behavior needs adapting. I'd rather be clear about that boundary than imply experience I don't have.

## 9. Common Mistakes

- Claiming pretraining experience that isn't real.
- Not knowing the Chinchilla correction to the scaling laws.
- Assuming pretraining runs for many epochs.
- Treating a base model as equivalent to an instruction-tuned one.
- Trusting benchmark scores without considering contamination.

## 10. What to Remember

- **Self-supervised next-token prediction over trillions of tokens.** Where all capability comes from.
- **Often less than one epoch** — unique data beats repeated passes at this scale.
- **Chinchilla corrected the balance** — smaller models, more tokens, for a fixed compute budget.
- **A base model continues text; it doesn't respond.** Instruction tuning fixes that.
- **Data contamination inflates benchmarks** — evaluate on your own data.
