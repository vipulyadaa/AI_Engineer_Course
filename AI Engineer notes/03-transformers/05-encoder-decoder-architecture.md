# Encoder-Decoder Architecture

> **Phase 03 · TRANSFORMERS · Topic 05**

## 1. Definition

The original 2017 transformer: an encoder that reads the input bidirectionally, and a decoder that generates output while attending to both its own prior tokens (self-attention) and the encoder's output (**cross-attention**).

## 2. Simple Explanation

Two stacks with a bridge between them.

The encoder builds a complete representation of the input. The decoder generates the output one token at a time, and at each step it can look back at the full encoded input through cross-attention.

It was designed for translation, where input and output are genuinely different sequences in different languages.

## 3. How It Works

```
INPUT                                  OUTPUT (generated)
  │                                          │
  ▼                                          ▼
┌──────────┐                        ┌──────────────────┐
│ ENCODER  │                        │ DECODER          │
│ bidirect.│───── cross-attention ─▶│ causal self-attn │
│ attention│      (K,V from encoder)│ + cross-attn     │
│ × N      │      (Q from decoder)  │ + FFN  × N       │
└──────────┘                        └──────────────────┘
```

**Three attention types, which is the thing to be able to name:**

| Type | Where | Q from | K, V from | Masked? |
|---|---|---|---|---|
| Encoder self-attention | Encoder | Encoder | Encoder | No |
| Decoder self-attention | Decoder | Decoder | Decoder | **Yes (causal)** |
| **Cross-attention** | Decoder | **Decoder** | **Encoder** | No |

Cross-attention is the bridge: the decoder asks questions (queries) of the encoded input (keys and values).

## 4. Practical Example

**Why it fits translation and why that mattered less than expected:**

```
"the bank charged a fee"  →  "la banque a facturé des frais"

Encoder: builds a representation of the ENGLISH sentence,
         bidirectionally — "bank" disambiguated by context.
Decoder: generates FRENCH tokens one at a time, at each step
         attending to the full English representation.

Clean separation of "understand the source" and "produce the target."
```

**Why decoder-only won anyway:**

```
Any seq2seq task can be framed as continuation:

  "Translate to French: the bank charged a fee\nFrench:"
                        └──── the "encoder" is just the prompt ────┘

· One stack instead of two + cross-attention
· Fewer architectural choices to tune at scale
· In-context learning generalizes to tasks never trained on
· Unified pretraining objective: next-token prediction on everything
```

**Where encoder-decoder still appears:**

| Model | Use |
|---|---|
| T5 / Flan-T5 | Text-to-text tasks; still used for fine-tuned task-specific models |
| Whisper | Speech → text (audio encoder, text decoder) |
| Many multimodal models | Image/audio encoder + text decoder |

**That last row is the practical relevance today:** multimodal architectures are often encoder-decoder in spirit — a vision encoder producing representations that a text decoder cross-attends to.

## 5. Why It Matters

- **It's the original architecture**, so interviewers use it to check you know how modern models differ.
- **Cross-attention is the concept to be able to explain** — decoder queries against encoder keys and values.
- **It's still the shape of multimodal models**, which makes it current rather than historical.

## 6. Trade-offs / Failure Modes

| Encoder-decoder | Decoder-only |
|---|---|
| Bidirectional input understanding | Causal only, even over the prompt |
| Clean input/output separation | Input and output are one sequence |
| More parameters and complexity | Simpler, scales more predictably |
| Strong on fixed seq2seq tasks | Strong on open-ended generation and in-context learning |
| Two stacks to size and tune | One stack |

**The honest summary:** encoder-decoder isn't worse, it's more specialized. For a fixed transformation task with abundant paired data, it's efficient. For a general model expected to handle arbitrary tasks from a prompt, decoder-only's simplicity and in-context learning won decisively.

**On multimodal:** when the input modality genuinely differs from the output — audio in, text out — a dedicated encoder makes sense again. That's why Whisper and many vision-language models use this shape.

## 7. Interview Answer

> "Encoder-decoder is the original 2017 transformer. The encoder reads the input bidirectionally and builds a representation; the decoder generates output autoregressively while attending to both its own prior tokens and the encoder's output through cross-attention.
>
> Cross-attention is the bridge and it's the concept worth being precise about: queries come from the decoder, keys and values come from the encoder. So the decoder is effectively asking questions of the encoded input at each generation step. That gives you three distinct attention types in the architecture — bidirectional encoder self-attention, causally-masked decoder self-attention, and unmasked cross-attention.
>
> It was designed for translation, where input and output are genuinely different sequences, and the separation of 'understand the source' from 'produce the target' is natural.
>
> Decoder-only won for general models because any sequence-to-sequence task can be reframed as continuation — 'Translate to French: {text}, French:' — where the prompt plays the encoder's role. One stack instead of two plus cross-attention, fewer architectural choices at scale, a single unified pretraining objective, and in-context learning that generalizes to tasks never explicitly trained on.
>
> But I wouldn't call encoder-decoder obsolete. It's still the right shape when the input modality genuinely differs from the output — Whisper is an audio encoder with a text decoder, and many vision-language models are a vision encoder with a text decoder cross-attending to it. So it's very much alive in multimodal work, which is where I'd expect to encounter it."

## 8. Likely Follow-ups

**Q: What is cross-attention?**
Attention where the queries come from the decoder and the keys and values come from the encoder output. It lets each decoder position look at the entire encoded input while generating. It's not masked, because the full input is available — only the decoder's self-attention is causally masked.

**Q: How many attention types are in an encoder-decoder transformer?**
Three. Bidirectional self-attention in the encoder, causally-masked self-attention in the decoder, and cross-attention in the decoder against encoder outputs. Being able to name all three and say which are masked is a clean way to show you understand the architecture rather than the diagram.

**Q: Why did decoder-only models win?**
Simplicity and generality. One stack scales more predictably than two plus cross-attention. Any seq2seq task reframes as continuation with the prompt acting as the encoder. And in-context learning lets one model handle tasks it was never explicitly trained on, which a task-specific encoder-decoder can't match.

**Q: Is encoder-decoder obsolete?**
No — it's specialized rather than outdated. T5 and Flan-T5 are still used for fine-tuned task-specific models. And it's the natural shape for multimodal architectures where the input modality differs from the output: Whisper is an audio encoder with a text decoder, and many vision-language models follow the same pattern.

**Q: Could you build a RAG system with an encoder-decoder model?**
You could — put retrieved context through the encoder and generate the answer with the decoder. In practice decoder-only is used because in-context learning handles the retrieved-context-in-prompt pattern naturally, and the ecosystem of instruction-tuned decoder models is far richer. There's no architectural obstacle, just an ecosystem one.

## 9. Common Mistakes

- Describing modern LLMs as encoder-decoder.
- Getting cross-attention's Q/K/V sources backwards.
- Saying cross-attention is masked — it isn't; only decoder self-attention is.
- Treating encoder-decoder as obsolete rather than specialized.
- Not connecting it to multimodal architectures, where it's current.

## 10. What to Remember

- **Two stacks plus cross-attention.** The original 2017 design, built for translation.
- **Cross-attention: Q from decoder, K and V from encoder.** Unmasked.
- **Three attention types:** encoder self (bidirectional), decoder self (causal), cross (unmasked).
- **Decoder-only won** on simplicity, scaling, and in-context learning.
- **Still current in multimodal** — audio or vision encoder, text decoder.
