# How Embedding Models Work

> **Phase 06 · EMBEDDINGS · Topic 03**

## 1. Definition

A transformer encoder that processes text into per-token representations, pools them into a single vector, and normalizes it — trained contrastively so that semantically related texts end up close in the resulting space.

## 2. Simple Explanation

Architecturally it's a transformer, usually an encoder. What makes it an *embedding* model is the training objective, not the architecture.

A model trained to predict the next token produces representations optimized for generation. A model trained contrastively — pull related pairs together, push unrelated apart — produces representations optimized for similarity. Same building blocks, different purpose.

## 3. How It Works

```
text
  ↓ tokenize
  ↓ transformer encoder (bidirectional attention)
  ↓ per-token vectors
  ↓ POOL → one vector
  ↓ NORMALIZE to unit length
  ↓
embedding
```

**Pooling strategies — and the requirement to match training:**

| Strategy | Used by |
|---|---|
| `[CLS]` token | BERT-style models |
| Mean pooling | Most sentence-embedding models |
| Last-token pooling | Decoder-derived embedding models |

**Using the wrong pooling for a model degrades quality with no error.** It's a real and easily-made bug.

**The training objective — this is what matters:**

```
Contrastive loss (InfoNCE-style) on triples:
  (query, positive passage, negative passages)

  pull   sim(query, positive)   ↑
  push   sim(query, negative)   ↓

The vector space's usefulness comes entirely from this.
```

## 4. Practical Example

**Hard negatives are what determine quality:**

```
Easy negative:
  query    "international wire fee"
  negative "how to bake sourdough bread"
  → trivially separated. Teaches almost nothing.

Hard negative:
  query    "international wire fee"
  negative "domestic wire fee"
  → superficially similar, actually irrelevant
  → THIS is what teaches fine discrimination

Embedding model quality depends heavily on hard negative mining.
It's also why a general model may separate YOUR domain's jargon
poorly — it never saw hard negatives from your domain.
```

**Query-document asymmetry:**

```
Queries are short and interrogative; passages are long and
declarative. Several models are trained to encode them
differently:

  Vertex AI:  task_type="RETRIEVAL_QUERY" / "RETRIEVAL_DOCUMENT"
  E5 family:  "query: ..." / "passage: ..." prefixes

Using the wrong one — or neither — costs real recall with
no error message. It's the most common silent bug.
```

**Fine-tuning an embedding model:**

```
More tractable than it sounds. You need (query, positive,
negative) triples — which production logs supply:
  · queries with human-confirmed correct chunks → positives
  · chunks that ranked highly but were wrong → HARD negatives

A few thousand domain triples can meaningfully improve
retrieval when a general model underperforms on your jargon.
```

## 5. Why It Matters

- **The objective, not the architecture, makes it an embedding model** — that's the clean conceptual point.
- **Hard negatives explain both quality and poor domain transfer.**
- **Pooling mismatch and asymmetry** are the two silent bugs worth knowing by name.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Wrong pooling strategy** | Degrades quality, no error |
| **Ignoring query/document asymmetry** | Real recall loss, no error |
| **Chunk exceeds max input** | Silent truncation from the vector |
| **General model on specialized jargon** | Poor separation; never saw domain hard negatives |
| **Not normalizing** | Metric mismatch changes rankings |
| **Mixing models** | Vectors from different models are incomparable |

**On decoder-derived embedding models:** several current models adapt decoder architectures with contrastive fine-tuning and last-token pooling. They work well, so "embeddings need an encoder" is too strong. The accurate statement is that the *training objective* determines quality, and raw hidden states from a generative model — without contrastive adaptation — are weaker than a purpose-trained embedding model of either architecture.

## 7. Interview Answer

> "Architecturally it's a transformer encoder — bidirectional attention over the input, producing per-token representations, which get pooled into one vector and normalized.
>
> But what makes it an embedding model is the training objective, not the architecture. A model trained for next-token prediction produces representations optimized for generation. An embedding model is trained contrastively — on triples of query, relevant passage, and irrelevant passage, with a loss that pulls related pairs together and pushes unrelated ones apart. The vector space's usefulness comes entirely from that.
>
> Hard negatives are what determine quality within that. A negative like 'how to bake bread' against a query about international wire fees is trivially separated and teaches almost nothing. A negative like 'domestic wire fee' is superficially similar and actually irrelevant — that's what teaches fine discrimination. It's also why a general model may separate my domain's jargon poorly: it never saw hard negatives from banking.
>
> Two silent bugs worth naming. Pooling strategy has to match how the model was trained — BERT uses the CLS token, most sentence-embedding models use mean pooling, decoder-derived ones use last-token. Using the wrong one degrades quality with no error. And query-document asymmetry: several models expect different task types or prefixes for queries versus passages, and ignoring that costs real recall silently.
>
> On fine-tuning: it's more tractable than people assume, because production logs supply the triples. Queries with human-confirmed correct chunks give positives, and chunks that ranked highly but were wrong give hard negatives — which are exactly the negatives you want. A few thousand domain triples can meaningfully improve retrieval when a general model underperforms.
>
> One correction I'd offer: several current embedding models are decoder-derived with contrastive fine-tuning and last-token pooling, and they work well. So 'embeddings need an encoder' is too strong — the objective matters more than the architecture."

## 8. Likely Follow-ups

**Q: What makes a model an embedding model?**
The training objective. Architecturally it's a transformer, often an encoder — but a next-token-prediction model produces representations optimized for generation, while contrastive training produces representations optimized for similarity. Same building blocks, different purpose, and the objective is what determines whether cosine similarity is meaningful.

**Q: What is contrastive learning here?**
Training on triples of query, relevant passage, and irrelevant passage, with a loss that increases similarity for the relevant pair and decreases it for irrelevant ones. That's what makes the geometry correspond to semantic relatedness — it's the explicit objective rather than an emergent property.

**Q: Why do hard negatives matter?**
Because easy negatives are trivially separated and teach little. A negative that's superficially similar but actually irrelevant — "domestic wire fee" against an international wire query — is what teaches fine discrimination. Quality depends heavily on hard negative mining, and it's why domain jargon often separates poorly in general models.

**Q: What is pooling and why must it match training?**
Combining per-token vectors into one sequence vector — `[CLS]`, mean, or last-token. It has to match how the model was trained, because that's what the training objective optimized. Using mean pooling on a `[CLS]`-trained model degrades quality with no error, which makes it a silent bug.

**Q: Can you fine-tune an embedding model?**
Yes, and it's more tractable than people assume because production logs supply the training data. Queries with confirmed-correct chunks are positives; chunks that ranked highly but were wrong are hard negatives — exactly the negatives you want. A few thousand domain triples can meaningfully improve retrieval on specialized vocabulary.

## 9. Common Mistakes

- Attributing embedding quality to architecture rather than training objective.
- Using a pooling strategy that doesn't match the model's training.
- Ignoring query-document asymmetry.
- Not knowing that hard negatives drive quality.
- Claiming decoder architectures can't produce good embeddings.

## 10. What to Remember

- **The objective makes it an embedding model**, not the architecture.
- **Contrastive training on (query, positive, negative) triples** is what makes cosine meaningful.
- **Hard negatives drive quality** and explain poor domain transfer.
- **Pooling must match training**; asymmetry must be respected. Both fail silently.
- **Production logs supply fine-tuning triples** — confirmed-correct as positives, ranked-but-wrong as hard negatives.
