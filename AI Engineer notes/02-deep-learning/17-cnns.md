# CNNs (Convolutional Neural Networks)

> **Phase 02 · DEEP LEARNING · Topic 17**

## 1. Definition

Networks whose layers apply small learned filters across the input rather than connecting everything to everything. The filter weights are shared across positions, which makes them efficient and translation-invariant.

## 2. Simple Explanation

Instead of one weight per input-output pair, a CNN learns a small filter — say 3×3 — and slides it across the whole image. The same filter detects the same pattern wherever it appears.

That weight sharing is the entire idea: far fewer parameters, and a feature learned in one location transfers to every other.

## 3. How It Works

```
Input image ─▶ [conv + ReLU] ─▶ [pool] ─▶ ... ─▶ [dense] ─▶ output

CONV   slide a k×k filter over the input; each position
       produces one output value
POOL   downsample (max or average) — reduces spatial size,
       adds tolerance to small shifts
DEPTH  early layers learn edges; later layers combine them
       into textures, then parts, then objects
```

**The parameter saving is dramatic:**

```
Dense layer on a 224×224×3 image → 1024 outputs:
  150,528 × 1024  ≈ 154,000,000 parameters

Conv layer, 64 filters of 3×3×3:
  64 × 27 + 64    =         1,792 parameters

Five orders of magnitude. That's why dense layers were never
going to work for images.
```

## 4. Practical Example

**Why CNNs are still worth knowing in an LLM-centric role:**

```
1. MULTIMODAL MODELS
   Vision encoders feed image features into language models.
   Some use CNNs; Vision Transformers now dominate, but the
   CNN concepts explain what they replaced and why.

2. DOCUMENT PROCESSING
   Layout analysis, table detection, and OCR preprocessing in
   a document pipeline — directly relevant to RAG over
   scanned banking documents.

3. THE INDUCTIVE BIAS ARGUMENT
   CNNs bake in locality and translation invariance.
   Transformers don't — they learn spatial relationships from
   data, which is why Vision Transformers need much more data
   to match a CNN, and why CNNs remain competitive on smaller
   datasets.
```

**That third point is the substantive one.** It's a clean illustration of a general principle: architectural inductive bias substitutes for data, and removing it buys flexibility at the cost of needing more examples.

**Where CNNs remain the practical choice:** limited training data, edge deployment where they're cheaper, and tasks where translation invariance is genuinely the right assumption.

## 5. Why It Matters

- **Weight sharing and locality** are the general lesson, applicable beyond vision.
- **The inductive-bias-versus-data trade-off** is a principle that explains ViTs, and more.
- **Document-processing pipelines** use them, which is directly relevant to RAG ingestion.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Limited receptive field** | Long-range relations need depth or dilation |
| **Translation invariance assumed** | Wrong when absolute position matters |
| **Not suited to sequences** | Fixed window; attention handles this better |
| **Beaten by ViTs at scale** | Given enough data, learned attention wins |

**On receptive field:** each conv layer sees only a small neighbourhood, so relating distant parts of an image requires stacking many layers or using dilated convolutions. Attention connects any two positions in one step, which is the fundamental architectural difference and the same argument that applies to sequences.

**On CNNs versus Vision Transformers:** ViTs win with large-scale pretraining; CNNs remain competitive or better with limited data, because their built-in assumptions do the work that data would otherwise have to. Framing it as a data-regime question rather than "ViTs are better" is the accurate answer.

## 7. Interview Answer

> "A CNN applies small learned filters across the input instead of connecting everything to everything, and the filter weights are shared across positions. That's the whole idea: far fewer parameters, and a feature learned in one location works everywhere.
>
> The saving is dramatic. A dense layer on a 224 by 224 colour image producing a thousand outputs needs about a hundred and fifty million parameters. A convolutional layer with sixty-four three-by-three filters needs under two thousand. Five orders of magnitude — dense layers were never going to work for images.
>
> Structurally it's convolution plus activation, pooling to downsample, repeated with depth. Early layers learn edges, later layers combine them into textures, parts, and objects — the hierarchical feature learning that depth buys.
>
> In an LLM-focused role I'd justify knowing this three ways. Multimodal models use vision encoders — increasingly Vision Transformers, but CNN concepts explain what they replaced. Document processing pipelines use them for layout analysis and table detection, which is directly relevant to RAG over scanned banking documents. And the inductive bias argument.
>
> That last one is the substantive point. CNNs bake in locality and translation invariance as architectural assumptions. Transformers don't — they learn spatial relationships from data. That's why Vision Transformers need far more data to match a CNN, and why CNNs remain competitive or better on smaller datasets. It's a clean illustration of a general principle: architectural inductive bias substitutes for data, and removing it buys flexibility at the cost of needing more examples. So 'CNNs versus ViTs' is really a data-regime question, not a verdict.
>
> The structural limitation is receptive field. Each conv layer sees only a small neighbourhood, so relating distant parts of an image needs many stacked layers or dilated convolutions. Attention connects any two positions in one step — which is exactly the same argument that made transformers replace RNNs for sequences."

## 8. Likely Follow-ups

**Q: Why are CNNs efficient for images?**
Weight sharing. The same small filter slides across all positions instead of learning separate weights per location, so parameter count drops by orders of magnitude and a feature learned in one place transfers everywhere. It also encodes translation invariance directly into the architecture.

**Q: CNNs or Vision Transformers?**
It depends on the data regime. ViTs win with large-scale pretraining because they learn spatial relationships rather than assuming them. CNNs remain competitive or better with limited data, since their built-in locality and translation invariance do work that data would otherwise have to supply.

**Q: What's the inductive bias point?**
CNNs assume locality and translation invariance architecturally; transformers assume almost nothing and learn it. Baked-in assumptions substitute for data, so removing them buys flexibility at the cost of needing more examples. That principle explains ViT data requirements and generalizes well beyond vision.

**Q: What's the receptive field limitation?**
Each convolutional layer only sees a small neighbourhood, so relating distant parts of an input requires stacking many layers or using dilated convolutions. Attention connects any two positions in a single step, which is the same structural advantage that displaced RNNs for sequences.

**Q: Why would a RAG engineer care about CNNs?**
Document ingestion. Layout analysis, table detection, and OCR preprocessing for scanned documents commonly use convolutional models, and parsing quality is the first and most consequential stage of a RAG pipeline over banking documents.

## 9. Common Mistakes

- Saying ViTs are simply better without the data-regime caveat.
- Not being able to explain why weight sharing saves parameters.
- Forgetting the receptive field limitation.
- Dismissing CNNs as irrelevant to an LLM role.
- Confusing pooling with convolution.

## 10. What to Remember

- **Shared small filters slid across the input** — orders of magnitude fewer parameters.
- **Hierarchical features:** edges → textures → parts → objects.
- **Inductive bias substitutes for data** — why ViTs need more of it.
- **Limited receptive field**; attention connects distant positions in one step.
- **Still used in document processing**, which matters for RAG ingestion.
