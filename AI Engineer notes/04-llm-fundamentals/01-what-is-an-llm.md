# What Is an LLM?

> **Phase 04 · LLM FUNDAMENTALS · Topic 01**

## 1. Definition

A large decoder-only transformer trained by self-supervised next-token prediction on web-scale text, then adapted through instruction tuning and alignment. At its core it models `P(next token | previous tokens)`.

## 2. Simple Explanation

An LLM is a very good next-token predictor.

That sounds reductive, and the interesting question is why it isn't: predicting the next token well across a huge diverse corpus turns out to require modeling syntax, factual associations, and some structure of reasoning. Capability emerged from an objective that never mentioned it.

## 3. How It Works

**The three training stages:**

```
1. PRETRAINING           self-supervised next-token prediction
                         trillions of tokens, months of compute
                         → a model that predicts plausible text
                         → NOT yet useful as an assistant

2. INSTRUCTION TUNING    supervised fine-tuning on human-written
                         (instruction, ideal response) pairs
                         → follows instructions instead of
                           continuing text

3. ALIGNMENT             RLHF or DPO on human preference data
                         → helpful, harmless, honest behavior
```

**Stage 1 gives capability; stages 2 and 3 make it usable.** A raw pretrained model given "What is the capital of France?" might continue with more questions rather than answering — it's completing text, not responding.

**Inference:**

```
prompt → tokenize → forward pass → logits over vocabulary
      → sampling (temperature, top-p) → token → append → repeat
```

## 4. Practical Example

**Why the training objective explains the failure modes:**

```
The objective is PLAUSIBILITY, not truth.

That single fact explains:
  · hallucination — a fluent invented fact is plausible text
  · confidence on uncertainty — hedging is less common in
    training data than assertion
  · knowledge cutoff — nothing after training exists
  · no source attribution — it's not retrieving, it's generating

RAG addresses the first, third, and fourth by supplying
facts at inference and requiring citation.
```

**What an LLM is not:**

| Not | Why |
|---|---|
| A database | It generates; it doesn't look up |
| A reasoner with guarantees | Chain-of-thought helps; it isn't verification |
| Deterministic by default | Sampling introduces variation unless temperature is 0 |
| Aware of its own uncertainty | Confidence and correctness correlate weakly |

## 5. Why It Matters

- **The plausibility-not-truth framing** explains hallucination mechanically rather than treating it as a mysterious defect.
- **Knowing the three stages** distinguishes capability (pretraining) from usability (tuning), which matters when deciding between prompting, RAG, and fine-tuning.
- **It positions your work** — you build on top of stage 3, you don't run stages 1 or 2.

## 6. Trade-offs / Failure Modes

| Limitation | Consequence | Mitigation |
|---|---|---|
| **Knowledge cutoff** | Nothing after training | RAG |
| **No private data** | Never saw your documents | RAG |
| **Hallucination** | Plausible invented facts | Grounding, citation, verification |
| **No attribution** | Can't say where an answer came from | RAG with citations |
| **Poor calibration** | Confident when wrong | Abstention instructions, verification |
| **Cost and latency** | Per-token pricing, sequential decode | Caching, smaller models, shorter context |
| **Non-determinism** | Same input, different output | Temperature 0 (and even then, not fully guaranteed) |

**On determinism:** temperature 0 makes sampling greedy but doesn't fully guarantee identical outputs across runs — batching, hardware, and floating-point non-associativity can introduce variation. Worth knowing because "just set temperature to 0" is often stated as if it fully solves reproducibility.

## 7. Interview Answer

> "An LLM is a large decoder-only transformer trained by self-supervised next-token prediction on web-scale text, then adapted through instruction tuning and alignment. At its core it models the probability of the next token given the previous ones.
>
> That sounds reductive, and the interesting part is why it isn't. Predicting the next token well across a huge diverse corpus turns out to require modeling syntax, factual associations, and some structure of argument — so capability emerged from an objective that never mentioned it.
>
> There are three stages and they do different things. Pretraining is self-supervised next-token prediction over trillions of tokens — that's where capability comes from, but the result isn't a useful assistant. A raw pretrained model asked 'what is the capital of France' might continue with more questions rather than answering, because it's completing text. Instruction tuning is supervised fine-tuning on human-written instruction-response pairs, which makes it respond rather than continue. Alignment with RLHF or DPO makes it helpful and honest.
>
> The framing I find most useful is that the objective is plausibility, not truth. That single fact explains the failure modes mechanically: hallucination is what you get when a fluent invented fact is plausible text; overconfidence follows from training data where assertion is more common than hedging; the knowledge cutoff is just the training boundary; and there's no attribution because it's generating rather than retrieving.
>
> That's exactly what RAG addresses — supplying facts at inference, requiring citation, and grounding answers in retrievable sources.
>
> One precision point: temperature zero makes sampling greedy but doesn't fully guarantee reproducibility. Batching and floating-point non-associativity can still introduce variation, which matters if you're writing regression tests."

## 8. Likely Follow-ups

**Q: Is an LLM just predicting the next token?**
Mechanically, yes. But predicting well across a diverse corpus requires modeling grammar, factual associations, and enough structure to continue an argument coherently. So the objective is simple and what it forces the model to learn isn't. Whether that constitutes understanding is genuinely contested, and I'd present it that way rather than assert either side.

**Q: What are the training stages?**
Pretraining by self-supervised next-token prediction, which produces capability. Instruction tuning by supervised fine-tuning on instruction-response pairs, which makes it follow instructions rather than continue text. Then alignment via RLHF or DPO on preference data, which shapes helpfulness and honesty. Stage one gives capability; two and three give usability.

**Q: Why do LLMs hallucinate?**
Because the training objective rewards plausibility, not truth. A fluent invented fact is exactly what the objective optimizes for. It isn't a bug bolted on later — it's what the model was trained to do, which is why grounding it in retrieved evidence is the structural fix rather than a patch.

**Q: What can't an LLM do?**
Access anything after its training cutoff, access your private data, tell you where an answer came from, or reliably know when it's uncertain. Those four are exactly what RAG addresses. It also can't guarantee reasoning correctness — chain-of-thought improves it but isn't verification.

**Q: Is temperature 0 deterministic?**
It makes sampling greedy — always the highest-probability token — but it doesn't fully guarantee identical outputs. Batching, hardware differences, and floating-point non-associativity can produce variation. Worth knowing if you're writing regression tests that assume exact-match reproducibility.

## 9. Common Mistakes

- Describing an LLM as a knowledge database it looks things up in.
- Not distinguishing pretraining (capability) from instruction tuning (usability).
- Treating hallucination as a defect rather than a consequence of the objective.
- Claiming temperature 0 guarantees reproducibility.
- Asserting that LLMs do or don't "understand" as if it were settled.

## 10. What to Remember

- **Decoder-only transformer modeling `P(next token | context)`.**
- **Three stages:** pretraining (capability) → instruction tuning (follows instructions) → alignment (helpful, honest).
- **The objective is plausibility, not truth** — that explains hallucination mechanically.
- **Four limitations RAG addresses:** cutoff, private data, attribution, grounding.
- **Temperature 0 is greedy, not fully deterministic.**
