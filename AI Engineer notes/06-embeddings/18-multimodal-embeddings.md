# Multimodal Embeddings

> **Phase 06 · EMBEDDINGS · Topic 18**

## 1. Definition

Embeddings that place different modalities — text, images, audio, video — into one shared vector space, so a text query can retrieve an image, or an image can retrieve related text.

## 2. Simple Explanation

A multimodal model embeds a photograph of a cheque and the phrase "cheque deposit slip" into the same space, near each other.

That means you can search images with text, find similar images, or retrieve mixed-modality results from one index — without OCR or captioning as an intermediate step.

## 3. How It Works

**CLIP-style contrastive training is the canonical approach:**

```
Train on (image, caption) pairs:
  pull   matching image-caption pairs together
  push   non-matching pairs apart

Two encoders — one for images, one for text — projecting
into a SHARED space.

At inference:
  text query  → text encoder  → vector
  image       → image encoder → vector
  compare with cosine, as usual
```

**Google Cloud:** Vertex AI provides a multimodal embedding API supporting image and text (and video) in a shared space, which is the natural fit for a GCP-based system.

## 4. Practical Example

**Where it's genuinely useful in a banking context:**

```
· Retrieve scanned documents by semantic description rather
  than by OCR'd text — "cheque with a visible endorsement"
· Find similar ID documents for fraud pattern matching
· Search product imagery and marketing assets
· Retrieve architecture diagrams from technical documentation
  by describing what they show
```

**The practical alternative that often wins:**

```
Instead of multimodal embeddings:

  image → vision LLM → text description → TEXT embedding

  · reuses your existing text pipeline entirely
  · descriptions are inspectable and debuggable
  · often better retrieval quality, because the description
    captures what matters for YOUR use case
  · costs an LLM call per image at ingestion

For a document-heavy corpus where images are diagrams, tables,
and scanned pages — which is most banking content — describing
them into text usually outperforms embedding them directly.
```

**That's the recommendation I'd actually give**, and it's worth stating because "use multimodal embeddings" sounds more sophisticated while often being worse for this content type.

**The modality gap:**

```
In CLIP-style spaces, image embeddings and text embeddings
occupy somewhat SEPARATE regions — images cluster with images,
text with text — even when they correspond.

Consequence: within-modality similarities are systematically
higher than cross-modality ones. A single threshold across
both doesn't work; comparisons need to be calibrated per
modality pair.
```

## 5. Why It Matters

- **It's the direction the field is moving**, with Gemini and similar models natively multimodal.
- **The describe-then-embed alternative** is the practically better answer for document-heavy corpora, and knowing when to prefer it is the judgment.
- **The modality gap** is a real technical detail that breaks naive thresholding.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Modality gap** | Cross-modal similarities systematically lower than within-modal |
| **Text-in-image handled poorly** | CLIP-style models are weak at reading text in images |
| **Weaker than specialized text models** | For text-only retrieval, a text model wins |
| **Higher storage and compute** | Image embeddings and encoding cost more |
| **Harder to debug** | You can't read an image embedding the way you can read a description |
| **Domain gap** | Trained on natural images; scanned documents are out of distribution |

**On text-in-image:** this matters a lot for banking documents. CLIP-style models are trained on natural images with captions, not on reading dense text in scanned pages. For a scanned policy document, OCR plus text embedding — or a vision LLM describing and transcribing it — substantially outperforms direct multimodal embedding.

**On debuggability:** with describe-then-embed you can read the generated description and immediately see why retrieval failed. With a direct image embedding you get a number and no explanation. For an iterating system that's a real operational advantage.

## 7. Interview Answer

> "Multimodal embeddings place text, images, and other modalities into one shared vector space, so a text query can retrieve an image directly. The canonical approach is CLIP-style contrastive training on image-caption pairs — two encoders projecting into a shared space, with matching pairs pulled together.
>
> On Google Cloud, Vertex AI provides a multimodal embedding API for image, text, and video in a shared space, which is the natural fit for a GCP system.
>
> But the recommendation I'd actually give for a banking corpus is usually the alternative: describe the image with a vision LLM, then embed the description with your existing text model. That reuses the whole text pipeline, the descriptions are inspectable so you can debug why retrieval failed, and it often gives better quality — because the description captures what matters for your use case rather than a generic visual representation. The cost is an LLM call per image at ingestion.
>
> The reason that usually wins for banking is content type. Our images are scanned pages, tables, diagrams, and forms — dense with text. CLIP-style models are trained on natural images with captions and are weak at reading text within images, so a scanned policy document is out of distribution for them. OCR plus text embedding, or a vision LLM transcribing and describing, substantially outperforms direct multimodal embedding on that content.
>
> One technical detail worth knowing is the modality gap: in CLIP-style spaces, image embeddings and text embeddings occupy somewhat separate regions even when they correspond, so within-modality similarities are systematically higher than cross-modality ones. A single similarity threshold across both doesn't work — comparisons need calibrating per modality pair, which is easy to miss.
>
> Where direct multimodal embedding genuinely fits is natural imagery — product photos, marketing assets, finding visually similar ID documents for fraud patterns. That's a real use case, it's just not most of a banking document corpus."

## 8. Likely Follow-ups

**Q: How do multimodal embeddings work?**
CLIP-style contrastive training on image-caption pairs — two encoders, one per modality, projecting into a shared space, with matching pairs pulled together and non-matching pushed apart. At inference each modality goes through its encoder and comparison is ordinary cosine similarity in the shared space.

**Q: What's the alternative to direct multimodal embedding?**
Describe the image with a vision LLM, then embed the description with your existing text model. It reuses the text pipeline, produces inspectable descriptions you can debug, and often gives better retrieval quality because the description captures what matters for your use case. The cost is an LLM call per image at ingestion.

**Q: Which would you use for a banking corpus?**
Describe-then-embed, usually. Banking images are scanned pages, forms, tables, and diagrams — dense with text and out of distribution for CLIP-style models trained on natural images with captions. Those models are specifically weak at reading text within images, which is exactly what matters here.

**Q: What is the modality gap?**
In CLIP-style spaces, image and text embeddings occupy somewhat separate regions even when they correspond semantically. So within-modality similarities are systematically higher than cross-modality ones, and a single threshold applied across both doesn't work. Comparisons need to be calibrated per modality pair.

**Q: When is direct multimodal embedding the right choice?**
Natural imagery where the visual content is what matters — product photos, marketing assets, finding visually similar images for fraud pattern matching. It's a genuine use case. It's just not most of a document-heavy enterprise corpus, where the images are text-bearing scans and diagrams.

## 9. Common Mistakes

- Using multimodal embeddings for text-bearing scanned documents.
- Applying a single similarity threshold across modality pairs.
- Not considering describe-then-embed as the simpler alternative.
- Assuming CLIP-style models can read text in images.
- Overlooking the debuggability advantage of text descriptions.

## 10. What to Remember

- **Shared space across modalities**, via CLIP-style contrastive training on paired data.
- **Describe-then-embed often wins** for document corpora — reuses the text pipeline, inspectable, better quality.
- **CLIP-style models are weak at text in images** — which is most banking content.
- **The modality gap** means cross-modal similarities are systematically lower; calibrate per pair.
- **Direct multimodal fits natural imagery**, not text-bearing scans.
