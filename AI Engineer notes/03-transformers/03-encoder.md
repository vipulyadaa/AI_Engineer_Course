# Encoder

> **Phase 03 · TRANSFORMERS · Topic 03**

## 1. Definition

The transformer half that processes the full input sequence **bidirectionally** — every position attends to every other position, both before and after it. It produces contextual representations rather than generating text.

## 2. Simple Explanation

An encoder reads the whole sentence at once and builds a representation of each word informed by everything around it.

"Bank" in "river bank" and "bank account" gets different representations, because the encoder sees the surrounding words on both sides. That bidirectionality is what makes encoders good at *understanding* and unsuitable for *generation*.

## 3. How It Works

```
Full input sequence visible to every position:

       "the"  "bank"  "charged"  "a"  "fee"
         ↕      ↕        ↕        ↕     ↕
       every token attends to EVERY other token
       (no mask — past and future both visible)
                    │
                    ▼
       contextual representation per token
```

1. Embed tokens, add positional information.
2. N blocks of **bidirectional** self-attention + feed-forward.
3. Output: one contextual vector per input token.

**What you do with the output:**

| Use | How |
|---|---|
| Classification | Pool (mean, or `[CLS]` token) → classifier head |
| Token labeling (NER) | Per-token vector → per-token classifier |
| **Embeddings for retrieval** | Pool → normalize → the vector in your index |
| Reranking (cross-encoder) | Encode query+document together → score |

## 4. Practical Example

**Why bidirectionality can't generate:**

```
Encoder processing "the bank charged a ___":
  To fill the blank, it would attend to tokens AFTER the blank —
  which don't exist yet during generation.

Bidirectional attention requires the whole sequence up front.
Generation produces tokens one at a time.
Structurally incompatible.
```

**Where encoders are in your stack:**

```
Your RAG pipeline uses encoders twice:

1. Embedding model  → bi-encoder, encodes chunks and queries
                      SEPARATELY into vectors
2. Reranker         → cross-encoder, encodes query and document
                      TOGETHER for a relevance score

Both are encoder-only transformers. Neither generates text.
```

**Pooling matters more than people expect:**

```
[CLS] token pooling   — BERT's original approach; the [CLS]
                        representation is trained to summarize
Mean pooling          — average all token vectors; common for
                        sentence embeddings, often better
Last-token pooling    — used when adapting decoder models to embeddings

The choice must match how the model was trained. Using mean
pooling on a model trained for [CLS] pooling degrades quality
with no error.
```

## 5. Why It Matters

- **Every embedding model and reranker in your RAG stack is an encoder.**
- **Bidirectionality is exactly why encoders can't generate**, which is a clean architectural point.
- **Encoder-only models are much smaller and cheaper** than LLMs for understanding tasks — a 110M-parameter BERT beats a 7B decoder on many classification tasks per unit of compute.

## 6. Trade-offs / Failure Modes

| Property | Consequence |
|---|---|
| **Bidirectional** | Better understanding; cannot generate |
| **Fixed-length input** | Typically 512 tokens; chunks must fit |
| **Small and fast** | 110M–330M parameters is common — cheap to run |
| **Pooling strategy must match training** | Mismatch degrades quality silently |
| **Task-specific head required** | The encoder alone outputs vectors, not predictions |

**The 512-token limit is the practical gotcha in RAG.** If your chunks are 800 tokens and the embedding model caps at 512, the tail is silently truncated from the vector — content is indexed and unretrievable, with no error.

**On the decoder-as-encoder trend:** recent embedding models are sometimes adapted from decoder-only architectures with the causal mask removed or with last-token pooling. Worth knowing so you don't assume every embedding model is BERT-shaped.

## 7. Interview Answer

> "An encoder processes the full input sequence bidirectionally — every position attends to every other position, both before and after it. It produces a contextual representation per token rather than generating text.
>
> The bidirectionality is what makes it good at understanding and structurally incapable of generation. 'Bank' in 'river bank' versus 'bank account' gets different representations because the encoder sees both sides. But to fill a blank at the end of a sequence it would need to attend to tokens after the blank, which don't exist yet during generation. Bidirectional attention requires the whole sequence up front; generation produces tokens one at a time. They're incompatible.
>
> In my RAG work, encoders appear twice. The embedding model is a bi-encoder that encodes chunks and queries separately into vectors. The reranker is a cross-encoder that encodes query and document together for a relevance score. Both are encoder-only transformers and neither generates anything.
>
> Two practical points. Pooling strategy has to match how the model was trained — BERT uses the CLS token, most sentence-embedding models use mean pooling, and using the wrong one degrades quality with no error. And encoder input limits are typically 512 tokens, which is the gotcha in RAG: if chunks are 800 tokens and the model caps at 512, the tail is silently dropped from the embedding, so content is indexed and unretrievable.
>
> The efficiency argument is worth making too. A 110-million-parameter encoder beats a 7-billion-parameter decoder on many classification tasks per unit of compute. For anything that's understanding rather than generation, an encoder is usually the right tool."

## 8. Likely Follow-ups

**Q: Why can't an encoder generate text?**
Because bidirectional attention requires the entire sequence to be present. To produce the next token it would need to attend to tokens that come after it, which don't exist during generation. Generation requires causal masking so each position only sees earlier ones — that's the decoder.

**Q: Where do encoders appear in a RAG system?**
Twice. The embedding model is a bi-encoder producing vectors for chunks and queries independently. The reranker is a cross-encoder scoring query-document pairs jointly. Both are encoder-only, and neither is the LLM — which is worth being precise about, since people sometimes describe the whole pipeline as "the LLM."

**Q: What's pooling and why does it matter?**
Turning per-token vectors into one vector for the sequence. BERT uses the `[CLS]` token; most sentence-embedding models use mean pooling. The choice has to match how the model was trained — using mean pooling on a `[CLS]`-trained model degrades retrieval quality with no error, which makes it a silent bug.

**Q: BERT vs. GPT — what's the architectural difference?**
BERT is encoder-only with bidirectional attention, trained by masked language modeling — hide 15% of tokens and predict them from both directions. GPT is decoder-only with causal masking, trained by next-token prediction. Bidirectionality makes BERT stronger for understanding tasks; causal masking makes GPT able to generate.

**Q: Are encoders still relevant given how capable LLMs are?**
Very. For classification, embeddings, and reranking, a 110M-parameter encoder runs at a fraction of the cost and latency of a decoder model and often performs comparably or better. Every embedding in your vector store came from one. Using an LLM for what an encoder does well is usually paying 50× for no gain.

## 9. Common Mistakes

- Not knowing that embedding models and rerankers are encoders, not LLMs.
- Using a pooling strategy that doesn't match the model's training.
- Chunking beyond the encoder's input limit, causing silent truncation.
- Assuming decoder LLMs have made encoders obsolete.
- Saying encoders "can't generate because they weren't trained to" — it's architectural.

## 10. What to Remember

- **Bidirectional attention: every position sees every other, both directions.**
- **That's exactly why it can't generate** — generation needs causal masking.
- **Your embedding model and reranker are both encoders.**
- **Pooling must match training** — `[CLS]` vs. mean vs. last-token.
- **512-token input limits** are the silent-truncation trap in RAG.
