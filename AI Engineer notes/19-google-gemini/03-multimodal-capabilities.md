# Multimodal Capabilities

> **Phase 19 · GOOGLE GEMINI · Topic 03**

## 1. Definition

Gemini's ability to accept text, images, video, audio, and PDFs in a single request and reason across them, without separate encoders or preprocessing pipelines per modality.

## 2. Simple Explanation

You put a scanned document, a chart, and a question into one request, and the model answers using all of them.

The capability is genuine. The engineering judgment is knowing where it beats a specialized service and where it doesn't.

## 3. How It Works

```python
response = model.generate_content([
    Part.from_uri("gs://bucket/statement.pdf",
                  mime_type="application/pdf"),
    "Which transactions on this statement incurred an "
    "international transfer fee, and what was the total?",
])
```

**Inputs are `Part` objects** — text, inline bytes, or a Cloud Storage URI. Files can be referenced from GCS directly, which avoids moving large documents through your application.

**Modalities can be interleaved**, so a request can be: instruction, image, follow-up instruction, second image, question.

## 4. Practical Example

**Where Gemini multimodal wins:**

```
· ad-hoc document Q&A — "what does this statement show?"
· understanding charts and diagrams in documentation
· reasoning that spans a document's text AND its layout
· low-volume, varied document types where building a
  per-type extractor isn't worth it
```

**Where a specialized service wins:**

```
DOCUMENT AI for high-volume structured extraction
  · purpose-built for forms, tables, and known document types
  · returns structured fields with confidence scores
  · cheaper per page at volume
  · deterministic schema output

If I'm extracting the same twelve fields from ten thousand
statements a day, that's Document AI. If I'm answering
arbitrary questions about an arbitrary document, that's
Gemini.

Volume and variability decide it, not capability.
```

**That framing is the answer to give** — "use Gemini for everything multimodal" misses the cost and determinism argument entirely.

**The combined pattern that's often best:**

```
Document AI   → extract structured fields and layout
Gemini        → reason over the extracted structure plus
                the question

You get deterministic extraction with confidence scores,
and flexible reasoning on top. For banking documents that's
usually stronger than either alone.
```

**Cost awareness:** images and video consume substantial token counts — a PDF page or a video second is not one token. Sending a fifty-page statement is a large input, and cost scales with it.

## 5. Why It Matters

- **Volume and variability decide** between Gemini and Document AI, not capability.
- **The combined pattern** — extract with Document AI, reason with Gemini — is often strongest.
- **Multimodal input is token-expensive**, which surprises people.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **High token cost per page/second** | Large documents are expensive inputs |
| **Non-deterministic extraction** | No schema guarantee without structured output |
| **No confidence scores per field** | Unlike Document AI |
| **Small text in scans** | Resolution limits what's legible |
| **Latency on large inputs** | Scales with content volume |
| **PII in images** | Redaction is harder than for text |

**On PII:** a scanned statement contains account numbers, names, and addresses as pixels. Text redaction pipelines don't see them, so sending images to a model means sending unredacted PII. On Vertex AI that stays in-project, which is the mitigation — but it's a reason the Vertex AI versus Gemini API decision matters even more for multimodal workloads.

**On determinism:** for extraction feeding a downstream system, use structured output with a response schema so fields come back in a fixed shape. Free-text extraction that a parser then interprets is fragile and the failure is silent.

## 7. Interview Answer

> "Gemini accepts text, images, video, audio, and PDFs in one request and reasons across them. Inputs are Part objects — text, inline bytes, or a Cloud Storage URI — so large documents can be referenced from GCS rather than moved through the application.
>
> The capability is real. The judgment is knowing where it beats a specialized service.
>
> Gemini wins for ad-hoc document Q&A, understanding charts and diagrams, reasoning that spans a document's text and its layout, and low-volume varied document types where building a per-type extractor isn't worth it.
>
> Document AI wins for high-volume structured extraction. It's purpose-built for forms and tables, returns structured fields with per-field confidence scores, is cheaper per page at volume, and gives deterministic schema output. So if I'm extracting the same twelve fields from ten thousand statements a day, that's Document AI. If I'm answering arbitrary questions about an arbitrary document, that's Gemini. Volume and variability decide it, not capability — and 'use Gemini for everything multimodal' misses the cost and determinism argument.
>
> The pattern that's often strongest is combining them: Document AI extracts structured fields and layout, Gemini reasons over that structure plus the question. You get deterministic extraction with confidence scores and flexible reasoning on top, which for banking documents usually beats either alone.
>
> Two things to be careful about. Cost — images and video consume substantial tokens; a PDF page isn't one token, so a fifty-page statement is a large and expensive input, and latency scales with it too.
>
> And PII. A scanned statement has account numbers and names as pixels, so text redaction pipelines don't see them — sending images means sending unredacted PII. On Vertex AI that stays in-project, which is the mitigation, and it's a reason the Vertex AI versus Gemini API decision matters even more for multimodal workloads than for text.
>
> And for extraction feeding a downstream system I'd use structured output with a response schema, so fields come back in a fixed shape rather than as free text a parser has to interpret — that failure is silent and awkward to catch."

## 8. Likely Follow-ups

**Q: Gemini or Document AI for document processing?**
Volume and variability decide. High-volume extraction of known fields from known document types is Document AI — deterministic, cheaper per page, with per-field confidence scores. Arbitrary questions about arbitrary documents is Gemini. Neither is generally better.

**Q: Can you combine them?**
Yes, and it's often the strongest option. Document AI extracts structured fields and layout deterministically with confidence scores; Gemini reasons over that structure plus the question. That gives reliable extraction and flexible reasoning, which beats either alone for banking documents.

**Q: What's the cost consideration?**
Images and video consume substantial token counts — a PDF page isn't one token. A fifty-page statement is a large input, and both cost and latency scale with it. That makes multimodal requests noticeably more expensive than they look when reasoning about budgets.

**Q: Any privacy concerns with images?**
A significant one. Account numbers and names in a scanned statement are pixels, so text redaction pipelines don't detect them and the PII goes to the model unredacted. Using Vertex AI keeps that in-project, which makes the access-path decision matter even more for multimodal work.

**Q: How do you make extraction reliable?**
Structured output with a response schema, so fields return in a fixed shape rather than as free text. Parsing free-text extraction is fragile and fails silently, whereas a schema-constrained response either conforms or the failure is visible.

## 9. Common Mistakes

- Using Gemini for high-volume structured extraction.
- Not considering the Document AI plus Gemini combination.
- Underestimating token cost for images and video.
- Assuming text redaction covers PII in scanned images.
- Parsing free-text extraction instead of using a response schema.

## 10. What to Remember

- **Text, images, video, audio, PDFs in one request**, via GCS URIs.
- **Volume and variability decide** Gemini versus Document AI.
- **Extract with Document AI, reason with Gemini** — often the strongest pattern.
- **Images and video are token-expensive**; latency scales too.
- **PII in scans evades text redaction** — another reason for Vertex AI.
