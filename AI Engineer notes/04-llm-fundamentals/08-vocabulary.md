# Vocabulary

> **Phase 04 · LLM FUNDAMENTALS · Topic 08**

## 1. Definition

The fixed set of tokens a model can represent — typically 32,000 to 256,000 entries. It determines the embedding table size, the output layer size, and how efficiently different languages and content types tokenize.

## 2. Simple Explanation

The vocabulary is the model's complete alphabet. Every input must be expressed in it, and every output is a choice from it.

Its size is a genuine trade-off: a larger vocabulary means shorter sequences (each token covers more text) but a much larger embedding and output layer.

## 3. How It Works

**Where vocabulary size shows up in the model:**

```
Embedding table:   vocab_size × d_model
Output projection: d_model × vocab_size   (often tied to the embedding)

At d_model = 4096:
  vocab   32,000  →  131M parameters per table
  vocab  128,000  →  524M
  vocab  256,000  →  1.05B

For a 7B model, a 256k vocabulary is ~15% of all parameters
in the embedding alone.
```

**The trade-off:**

| Larger vocabulary | Smaller vocabulary |
|---|---|
| Shorter sequences (fewer tokens per text) | Longer sequences |
| Better multilingual coverage | English-biased |
| Larger embedding + output layers | Fewer parameters |
| More expensive softmax over vocabulary | Cheaper output layer |
| Rarer tokens trained on less data | Every token well-trained |

**The trend is toward larger vocabularies** — 32k was common a few years ago, 128k–256k is now typical — driven largely by multilingual coverage and sequence-length efficiency.

## 4. Practical Example

**Why vocabulary size is a multilingual fairness issue:**

```
A 32k vocabulary trained mostly on English:
  · English words → mostly single tokens
  · Hindi, Thai, Arabic → fragmented into many tokens

Same meaning, 2-3× more tokens → 2-3× the cost, and context
fills faster.

A 256k vocabulary can afford dedicated tokens for more
languages, narrowing that gap. That's a substantial part
of why vocabularies grew.
```

**Special tokens, which are part of the vocabulary:**

```
<|begin_of_text|>     sequence start
<|end_of_text|>       sequence end / stop
<|pad|>               padding
<|im_start|>, <|im_end|>   chat role delimiters
<|tool_call|>         function-calling markers

These have functional meaning. A common bug is user content
containing text that collides with a special token's literal
form — which is why providers escape or reserve them.
```

**The output layer cost at inference:**

```
Every generated token requires a softmax over the FULL vocabulary.

At 256k vocabulary and d_model 4096, that's a
  (1 × 4096) × (4096 × 256,000) matmul per token

It's a meaningful share of decode compute, and it's why
very large vocabularies have a real cost beyond parameters.
```

## 5. Why It Matters

- **It's a significant share of parameters** in smaller models — worth knowing when sizing.
- **It's the mechanism behind multilingual cost disparity**, which is a real product issue.
- **Special tokens are functional**, and collisions with user content are a real bug class.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Rare tokens undertrained** | Tokens appearing seldom in the corpus have poorly-learned embeddings |
| **Glitch tokens** | Near-never-seen tokens can produce erratic behavior |
| **Special token collision** | User content resembling a control token |
| **Softmax cost at inference** | Scales with vocabulary size, per generated token |
| **Vocabulary is fixed after training** | Can't add tokens without retraining the embedding |
| **Cross-provider incomparability** | Token counts and costs don't translate |

**On extending a vocabulary:** you can add tokens to a pretrained model — initializing their embeddings and fine-tuning — which is done for domain adaptation to specialized terminology. It requires training and the new tokens start poorly represented, so it's only worth it when the domain vocabulary is genuinely unrepresented and high-volume.

**On tied embeddings:** the input embedding and output projection are both `vocab × d_model` matrices mapping between token space and hidden space in opposite directions. Tying them halves that parameter cost, at a small quality cost. It's more common in smaller models where the saving is proportionally larger.

## 7. Interview Answer

> "The vocabulary is the fixed set of tokens a model can represent — typically 32,000 to 256,000 entries. It determines the embedding table size, the output layer size, and how efficiently different content tokenizes.
>
> The size is a genuine trade-off. A larger vocabulary means each token covers more text, so sequences are shorter — which saves context and cost per request. But the embedding and output projection are both vocabulary-times-d_model, so at d_model of 4096, a 256k vocabulary is about a billion parameters in each. For a 7B model that's a substantial share.
>
> The trend has been strongly toward larger vocabularies — 32k was common a few years ago, 128k to 256k is typical now — and the main driver is multilingual coverage. A vocabulary trained mostly on English tokenizes English words as single tokens and fragments other scripts into many. That means the same meaning costs two to three times more tokens in Hindi or Thai, and fills the context faster. A larger vocabulary can afford dedicated tokens for more languages, which narrows that gap. So it's a cost and fairness issue, not just an efficiency one.
>
> Special tokens are part of the vocabulary and functional — sequence start and end, padding, chat role delimiters, tool-call markers. A real bug class is user content colliding with a special token's literal form, which is why providers escape or reserve them.
>
> One inference cost worth noting: every generated token requires a softmax over the full vocabulary, so a 256k vocabulary is a meaningful share of decode compute per token, beyond the parameter cost.
>
> And the vocabulary is fixed after training. You can extend it for domain adaptation by adding tokens and fine-tuning, but the new tokens start poorly represented, so it's only worth it when the domain vocabulary is genuinely unrepresented and high-volume."

## 8. Likely Follow-ups

**Q: What's the trade-off in vocabulary size?**
Larger means shorter sequences and better multilingual coverage, but a much bigger embedding table and output projection — at d_model 4096, a 256k vocabulary is about a billion parameters each — plus a more expensive softmax per generated token. Smaller means fewer parameters but longer sequences and English bias.

**Q: Why have vocabularies grown?**
Mainly multilingual coverage. A small English-trained vocabulary fragments other scripts into many tokens, making them cost two to three times more and fill context faster. A larger vocabulary affords dedicated tokens for more languages. Sequence-length efficiency is the secondary driver, since shorter sequences mean lower cost per request.

**Q: What are special tokens?**
Reserved vocabulary entries with functional meaning — sequence start and end, padding, chat role delimiters like the message-start and message-end markers, and tool-call markers. They're how structure is communicated to the model. A real bug class is user content containing text that collides with their literal form.

**Q: Can you add tokens to a pretrained model?**
Yes — initialize embeddings for the new tokens and fine-tune. It's done for domain adaptation when specialized terminology tokenizes poorly. The caveat is that new tokens start with poorly-learned embeddings and need enough training data to become useful, so it's only worth it for genuinely unrepresented high-volume vocabulary.

**Q: What are tied embeddings?**
Sharing the input embedding matrix with the output projection, since both map between token space and hidden space in opposite directions. It halves that parameter cost — significant when the vocabulary is large — at a small quality cost. More common in smaller models where the proportional saving is larger.

## 9. Common Mistakes

- Not knowing the vocabulary contributes substantial parameters via embedding and output layers.
- Missing the multilingual cost implication of vocabulary composition.
- Treating special tokens as inert rather than functional.
- Assuming vocabulary can be extended freely without training.
- Comparing token costs across providers without accounting for vocabulary differences.

## 10. What to Remember

- **32k–256k tokens; fixed after training.** Determines embedding and output layer size.
- **`vocab × d_model` twice** — at 256k and d=4096, roughly a billion parameters each.
- **Larger vocabularies are driven by multilingual coverage** — smaller ones make non-English 2–3× more expensive.
- **Special tokens are functional**; user content colliding with them is a real bug class.
- **Softmax over the full vocabulary per generated token** is a real inference cost.
