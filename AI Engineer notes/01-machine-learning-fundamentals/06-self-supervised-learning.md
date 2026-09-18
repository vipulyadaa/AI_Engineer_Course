# Self-Supervised Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 06**

## 1. Definition

Learning from data with **no human labels**, by deriving the label from the data itself. You hide part of the input and train the model to predict it. This is how every LLM and every embedding model is pretrained.

## 2. Simple Explanation

Cover the last word of a sentence and try to guess it. You just created a labeled example without anyone annotating anything — the sentence supplied both the input and the answer.

That's the whole trick, and it's why LLMs exist. Someone noticed the internet is an infinite supply of free labels: **every token in every document is a label for the tokens before it.** That side-stepped the human-labeling bottleneck that capped supervised learning for decades.

## 3. How It Works

1. **Define a pretext task** — a prediction problem whose answer is already in the data.
2. **Mask or corrupt part of the input** — hide a token, a patch of an image, a span of audio.
3. **Train the model to reconstruct it** using ordinary supervised machinery (cross-entropy, gradient descent). The label just came from the data instead of a human.
4. **Discard the pretext head** — you didn't want the predictions. You wanted the *representations* learned along the way.
5. **Transfer** — fine-tune on a small labeled set, or use the representations directly (embeddings).

**The main pretext tasks:**

| Task | Model | What it does |
|---|---|---|
| **Next-token prediction** (causal LM) | GPT, Gemini, Claude, Llama | Predict token `t+1` from tokens `1..t` |
| **Masked language modeling** | BERT | Hide ~15% of tokens, predict them from both directions |
| **Contrastive learning** | Embedding models, CLIP | Pull related pairs together, push unrelated pairs apart |
| **Masked image modeling** | MAE, vision transformers | Hide image patches, reconstruct them |

## 4. Practical Example

**Next-token prediction:**

```
Text:  "The customer's account balance was insufficient"

Training examples generated automatically:
  "The"                              → "customer's"
  "The customer's"                   → "account"
  "The customer's account"           → "balance"
  "The customer's account balance"   → "was"
  ...
```

One sentence produced six labeled examples. A trillion-token corpus produces a trillion. No annotator involved.

**Contrastive learning — the one that matters for RAG.** Embedding models are trained on triples: `(query, relevant passage, irrelevant passage)`. The objective pulls the query and relevant passage together in vector space and pushes the irrelevant one away. That's *why* cosine similarity between your query embedding and a chunk embedding means anything at all — the model was explicitly trained to make that geometry meaningful.

## 5. Why It Matters

- **It's the mechanism behind everything you build on.** Both halves of your RAG stack — the embedding model and the LLM — are products of self-supervised pretraining.
- **It broke the data bottleneck.** Supervised learning was capped by annotation budgets. Self-supervision scales with raw text, which is effectively free, and that's what made scaling laws possible.
- **It explains capability *and* limitation.** The model learned to predict plausible continuations of text, not to be correct. Hallucination isn't a bug bolted on later — it's what the training objective actually rewards.

## 6. Trade-offs / Failure Modes

| Trade-off | Detail |
|---|---|
| **Compute-expensive, data-cheap** | Inverts the classical cost profile. Pretraining a frontier model costs millions; the data is scraped |
| **The objective isn't truthfulness** | Next-token prediction rewards plausibility. Factual accuracy is a downstream fix — RAG, grounding, RLHF |
| **Inherits everything in the corpus** | Biases, errors, and outdated facts are learned faithfully. No labeling step filters them |
| **Knowledge cutoff** | Frozen at training time. This is precisely the gap RAG fills |
| **Pretext task shapes the representation** | Causal LM is good at generation; masked LM is good at understanding. Pick the right base for the job |

## 7. Interview Answer

> "Self-supervised learning creates labels from the data itself instead of from humans. You hide part of the input and train the model to predict it — cover the next word in a sentence and you've made a labeled example with no annotator involved.
>
> That's the reason LLMs exist. Supervised learning was capped by annotation budgets, and someone realized the internet is an infinite supply of free labels: every token is a label for the tokens before it. That broke the bottleneck and made scaling possible.
>
> Mechanically it's still ordinary supervised training — cross-entropy, gradient descent — the label just comes from the data. And the predictions aren't the point; you throw away the prediction head and keep the *representations* learned along the way, then fine-tune on a small labeled set.
>
> The part I'd emphasize is that it explains both the capability and the limitation. The model was trained to produce plausible continuations, not correct ones. Hallucination isn't a bug bolted on afterwards — it's what the objective rewards. That's exactly why RAG matters: I'm grounding a plausibility engine in retrieved facts."

## 8. Likely Follow-ups

**Q: Is self-supervised learning the same as unsupervised learning?**
It's usually treated as a subset. Both use unlabeled data, but self-supervised learning manufactures an explicit prediction target and then uses standard supervised machinery. Classic unsupervised methods like k-means have no target at all. The practical distinction: self-supervised learning produces a model you transfer to other tasks.

**Q: How does this relate to fine-tuning?**
Sequential stages. Self-supervised pretraining learns general representations from massive unlabeled data. Supervised fine-tuning then adapts them to a specific task with a small labeled set. Instruction tuning is exactly that second stage — supervised fine-tuning on human-written prompt/response pairs.

**Q: Why does next-token prediction produce reasoning ability?**
Honestly, it's still debated. The working argument is that predicting the next token well over a huge diverse corpus *requires* modeling syntax, facts, and some structure of arguments — to predict the token after "therefore" you need to have tracked the reasoning. Whether that constitutes reasoning or very good pattern completion is an open question, and I'd say that rather than overclaim.

**Q: How are embedding models trained?**
Contrastively, on triples of query, relevant passage, and irrelevant passage — pulling related pairs together and pushing unrelated ones apart. That's why cosine similarity in my vector store is meaningful: the model was explicitly optimized to make that geometry correspond to semantic relatedness.

**Q: BERT vs. GPT — what's the difference in objective?**
BERT uses masked language modeling: hide ~15% of tokens and predict them using context from both directions, which makes it strong for understanding tasks like classification. GPT uses causal next-token prediction, seeing only the left context, which makes it a generator. The bidirectionality is why BERT-style models are still common backbones for embeddings.

## 9. Common Mistakes

- Calling it unsupervised without qualification — there *is* a prediction target, it's just derived not annotated.
- Saying "it learns without any supervision signal" — the signal is the data's own structure.
- Claiming the pretraining objective optimizes for truth. It optimizes for plausibility.
- Confusing pretraining with fine-tuning, or with RAG. Pretraining learns representations, fine-tuning adapts behavior, RAG injects facts at inference.
- Overclaiming that next-token prediction "is" reasoning.

## 10. What to Remember

- **Labels derived from the data itself.** Hide part of the input, predict it.
- **It's why LLMs exist** — it broke the human-annotation bottleneck.
- **You keep the representations, not the predictions.**
- **Objective = plausibility, not truth.** That's the root of hallucination and the reason for RAG.
- **Both halves of your RAG stack** — the embedding model and the LLM — come from this.
